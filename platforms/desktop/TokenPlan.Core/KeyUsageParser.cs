using System.Globalization;
using System.Text.Json;

namespace TokenPlan.Core;

/// Mirrors the native provider mappers. Missing fields never become a fabricated zero balance.
public static class KeyUsageParser
{
    public static UsageSnapshot Parse(string id, string json, DateTimeOffset now)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var data = Field(root, "data");
        var windows = new List<UsageWindow>();
        void Money(JsonElement source, string field, string label, string currency)
        { if (Number(source, field) is { } value) windows.Add(new(label, 0, null, Math.Max(0, value), currency)); }
        void Percent(string label, double? value, DateTimeOffset? reset = null)
        { if (value is >= 0) windows.Add(new(label, value.Value, reset)); }
        switch (id)
        {
            case "deepseek":
                var balances = Field(root, "balance_infos");
                if (balances.ValueKind != JsonValueKind.Array) throw new InvalidDataException();
                foreach (var balance in balances.EnumerateArray())
                {
                    var currency = UsageParser.String(balance, "currency")?.ToUpperInvariant();
                    if (currency is not ("CNY" or "USD" or "RMB") || Number(balance, "total_balance") == null) continue;
                    currency = currency == "RMB" ? "CNY" : currency;
                    Money(balance, "total_balance", "Balance", currency);
                    Money(balance, "topped_up_balance", "Topped Up", currency);
                    Money(balance, "granted_balance", "Granted", currency);
                    break;
                }
                break;
            case "moonshot":
                if (Field(root, "status").ValueKind == JsonValueKind.False) throw new InvalidDataException();
                if (Number(data, "available_balance") == null) throw new InvalidDataException();
                Money(data, "available_balance", "Balance", "CNY");
                Money(data, "cash_balance", "Cash", "CNY");
                Money(data, "voucher_balance", "Voucher", "CNY");
                break;
            case "siliconflow":
                if (Number(root, "code") is { } code && code != 20000 && code != 0) throw new InvalidDataException();
                var gift = Number(data, "balance"); var charged = Number(data, "chargeBalance");
                var total = Number(data, "totalBalance") ?? (gift != null || charged != null ? (gift ?? 0) + (charged ?? 0) : null);
                if (total == null) throw new InvalidDataException();
                windows.Add(new("Balance", 0, null, Math.Max(0, total.Value), "CNY"));
                Money(data, "chargeBalance", "Topped Up", "CNY"); Money(data, "balance", "Granted", "CNY");
                break;
            case "minimax":
                if (Number(Field(root, "base_resp"), "status_code") is { } status && status != 0) throw new InvalidDataException();
                var models = Field(root, "model_remains");
                if (models.ValueKind != JsonValueKind.Array) throw new InvalidDataException();
                var model = models.EnumerateArray().FirstOrDefault(m => UsageParser.String(m, "model_name")?.StartsWith("minimax-m", StringComparison.OrdinalIgnoreCase) == true);
                foreach (var (label, prefix, end) in new[] { ("Session", "current_interval", "end_time"), ("Weekly", "current_weekly", "weekly_end_time") })
                {
                    if (Number(model, prefix + "_status") == 3) continue;
                    double? used = null;
                    if (Number(model, prefix + "_remaining_percent") is >= 0 and var remaining) used = Math.Clamp(100 - remaining, 0, 100);
                    else if (Number(model, prefix + "_total_count") is > 0 and var limit && Number(model, prefix + "_usage_count") is >= 0 and var count)
                        used = Math.Clamp((limit - count) / limit * 100, 0, 100);
                    var reset = Milliseconds(model, end);
                    Percent(label, used, reset > now ? reset : null);
                }
                break;
            case "openrouter":
                if (Number(data, "total_usage") is { } spent && Number(data, "total_credits") is { } credits)
                {
                    if (credits > 0) Percent("Credits", Math.Max(0, spent) / credits * 100);
                    windows.Add(new("Balance", 0, null, Math.Max(0, credits - spent), "USD"));
                }
                Money(data, "usage_daily", "Today", "USD");
                Money(data, "usage_weekly", "This Week", "USD");
                Money(data, "usage_monthly", "This Month", "USD");
                if (Number(data, "limit") is > 0 and var keyLimit && Number(data, "limit_remaining") is { } keyRemaining)
                    Percent("Key Limit", Math.Max(0, keyLimit - keyRemaining) / keyLimit * 100);
                break;
            case "zai":
                if (Field(root, "success").ValueKind == JsonValueKind.False) throw new InvalidDataException();
                var limits = Field(data.ValueKind == JsonValueKind.Object ? data : root, "limits");
                if (limits.ValueKind != JsonValueKind.Array) throw new InvalidDataException();
                foreach (var entry in limits.EnumerateArray())
                {
                    var type = UsageParser.String(entry, "type") ?? UsageParser.String(entry, "name");
                    if (type is "CREDIT_LIMIT" or "TOKENS_LIMIT")
                    {
                        var unit = Number(entry, "unit");
                        if (unit is not (3 or 6)) continue;
                        Percent(unit == 6 ? "Weekly" : "Session", Number(entry, "percentage"), Milliseconds(entry, "nextResetTime"));
                    }
                    else if (type == "TIME_LIMIT" && Number(entry, "total") is > 0 and var quota && Number(entry, "usage") is >= 0 and var used)
                        Percent("Web Searches", used / quota * 100, Milliseconds(entry, "nextResetTime"));
                }
                break;
            default: throw new ArgumentException("Unknown key provider");
        }
        if (windows.Count == 0) throw new InvalidDataException();
        return new(id, ProviderCatalog.Get(id).Name, null, windows, now);
    }
    internal static JsonElement Field(JsonElement source, string name) => source.ValueKind == JsonValueKind.Object && source.TryGetProperty(name, out var value) ? value : default;
    internal static double? Number(JsonElement source, string name)
    {
        var value = Field(source, name); double number;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out number) && double.IsFinite(number)) return number;
        if (value.ValueKind == JsonValueKind.String && double.TryParse(value.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out number) && double.IsFinite(number)) return number;
        return null;
    }
    internal static DateTimeOffset? Milliseconds(JsonElement source, string name) => Number(source, name) is > 0 and < 253402300800000 and var n ? DateTimeOffset.FromUnixTimeMilliseconds((long)n) : null;
}

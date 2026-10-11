using System.Text.Json;
namespace TokenPlan.Core;
public static partial class UsageParser
{
    static void AddSupplemental(string provider, JsonElement root, List<UsageWindow> rows, DateTimeOffset now)
    {
        if (provider == "claude")
        {
            var limits = KeyUsageParser.Field(root, "limits");
            if (limits.ValueKind == JsonValueKind.Array) foreach (var entry in limits.EnumerateArray())
            {
                if (String(entry, "kind") != "weekly_scoped") continue;
                var model = String(KeyUsageParser.Field(KeyUsageParser.Field(entry, "scope"), "model"), "display_name");
                if (model is not ("Fable" or "Sonnet") || rows.Any(r => r.Label == model)) continue;
                if (KeyUsageParser.Number(entry, "percent") is >= 0 and var percent)
                    rows.Add(new(model, percent, DateTimeOffset.TryParse(String(entry, "resets_at"), out var reset) ? reset : null));
            }
            var extra = KeyUsageParser.Field(root, "extra_usage");
            if (KeyUsageParser.Field(extra, "is_enabled").ValueKind == JsonValueKind.True && KeyUsageParser.Number(extra, "used_credits") is >= 0 and var spent)
            {
                var cap = KeyUsageParser.Number(extra, "monthly_limit");
                rows.Add(new("Extra usage spent", cap > 0 ? spent / cap.Value * 100 : 0, null, spent / 100, "USD", cap > 0 ? cap / 100 : null));
            }
        }
        if (provider == "claude")
        {
            var grant = KeyUsageParser.Field(root, "cedar_ember");
            if (grant.ValueKind == JsonValueKind.Object)
            {
                var expiries = new List<DateTimeOffset>(); double count = 0;
                var grants = KeyUsageParser.Field(grant, "grants");
                if (KeyUsageParser.Field(grant, "eligible").ValueKind == JsonValueKind.True && grants.ValueKind == JsonValueKind.Array)
                    foreach (var item in grants.EnumerateArray().Take(128))
                    {
                        if (KeyUsageParser.Number(item, "resets_left") is not >= 1) continue;
                        var left = Math.Min(128, Math.Floor(KeyUsageParser.Number(item, "resets_left")!.Value));
                        DateTimeOffset? expiry = DateTimeOffset.TryParse(String(item, "ends_at"), out var date) ? date : null;
                        if (expiry <= now) continue; count += left;
                        if (expiry != null) expiries.AddRange(Enumerable.Repeat(expiry.Value, (int)left));
                    }
                rows.Add(new("Rate Limit Resets", 0, null, count, "COUNT", Expiries: expiries.Order().Take(128).ToArray()));
            }
        }
        if (provider == "codex")
        {
            var additional = KeyUsageParser.Field(root, "additional_rate_limits");
            if (additional.ValueKind == JsonValueKind.Array)
                foreach (var entry in additional.EnumerateArray())
                {
                    if (!(String(entry, "limit_name") ?? String(entry, "metered_feature") ?? "").Contains("spark", StringComparison.OrdinalIgnoreCase)) continue;
                    var rate = KeyUsageParser.Field(entry, "rate_limit"); var extra = new List<UsageWindow>();
                    AddCodex(rate, "primary_window", "Session", now, extra); AddCodex(rate, "secondary_window", "Weekly", now, extra);
                    rows.AddRange(extra.Select(w => w with { Label = w.Label == "Weekly" ? "Spark Weekly" : "Spark" })); break;
                }
            var credits = KeyUsageParser.Field(root, "credits");
            if (KeyUsageParser.Number(credits, "balance") is { } balance) rows.Add(new("Credits", 0, null, Math.Floor(Math.Max(0, balance)) * 0.04, "USD"));
            var reset = KeyUsageParser.Field(root, "rate_limit_reset_credits");
            if (KeyUsageParser.Number(reset, "available_count") is >= 0 and var count)
            {
                var expiries = new List<DateTimeOffset>();
                var list = KeyUsageParser.Field(reset, "credits");
                if (list.ValueKind == JsonValueKind.Array) foreach (var credit in list.EnumerateArray().Take(128))
                {
                    if (String(credit, "status") is { } status && status != "available") continue;
                    if (DateTimeOffset.TryParse(String(credit, "expires_at"), out var date)) expiries.Add(date);
                    else if (KeyUsageParser.Number(credit, "expires_at") is > 0 and < 253402300800 and var epoch) expiries.Add(DateTimeOffset.FromUnixTimeSeconds((long)epoch));
                }
                rows.Add(new("Rate Limit Resets", 0, null, Math.Floor(count), "COUNT", Expiries: expiries.Order().ToArray()));
            }
        }
    }
}

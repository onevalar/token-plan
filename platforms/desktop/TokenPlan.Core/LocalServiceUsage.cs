using System.Text.Json;

namespace TokenPlan.Core;

public static class LocalServiceUsage
{
    public static UsageSnapshot Parse(string id, string json, DateTimeOffset now)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement; var rows = new List<UsageWindow>(); string? plan = null;
        JsonElement Field(JsonElement e, string name) => KeyUsageParser.Field(e, name);
        double? Number(JsonElement e, string name) => KeyUsageParser.Number(e, name);
        DateTimeOffset? Date(JsonElement e, string name) => DateTimeOffset.TryParse(UsageParser.String(e, name), out var date) ? date : null;
        DateTimeOffset? Unix(JsonElement e, string name) => Number(e, name) is >= 0 and < 253402300800 and var n ? DateTimeOffset.FromUnixTimeSeconds((long)n) : null;
        if (id == "opencode")
        {
            var usage = Field(root, "usage");
            foreach (var (key, label) in new[] { ("rolling", "Session"), ("weekly", "Weekly"), ("monthly", "Monthly") })
            {
                var window = Field(usage, key);
                var percent = Number(window, "percent") ?? throw new InvalidDataException();
                DateTimeOffset? reset = Date(window, "resetsAt") ?? throw new InvalidDataException();
                if (UsageParser.String(window, "status")?.Trim() == "rate-limited") percent = 100;
                if (key == "rolling" && percent == 0 && Math.Abs((reset.Value - now).TotalSeconds - 18000) <= 2) reset = null;
                rows.Add(new(label, Math.Clamp(percent, 0, 100), reset));
            }
            plan = "Go";
        }
        else if (id == "copilot")
        {
            plan = UsageParser.String(root, "copilot_plan"); var reset = Date(root, "quota_reset_date") ?? Date(root, "limited_user_reset_date");
            var quotas = Field(root, "quota_snapshots");
            foreach (var (key, label) in new[] { ("premium_interactions", "Credits"), ("chat", "Chat"), ("completions", "Completions") })
            {
                var window = Field(quotas, key); var total = Number(window, "entitlement"); var left = Number(window, "remaining");
                if (Field(window, "unlimited").ValueKind == JsonValueKind.True || total is -1 or 0 || left == -1) continue;
                double? used = Number(window, "percent_remaining") is { } remaining ? 100 - remaining : total is > 0 && left != null ? 100 - left / total * 100 : null;
                if (used != null) rows.Add(new(label, Math.Clamp(used.Value, 0, 100), reset));
            }
            if (rows.Count == 0)
                foreach (var (key, label) in new[] { ("chat", "Chat"), ("completions", "Completions") })
                    if (Number(Field(root, "monthly_quotas"), key) is > 0 and var total && Number(Field(root, "limited_user_quotas"), key) is { } left)
                        rows.Add(new(label, Math.Clamp(100 - left / total * 100, 0, 100), reset));
        }
        else if (id == "devin")
        {
            var status = Field(Field(root, "userStatus"), "planStatus"); var info = Field(status, "planInfo");
            plan = UsageParser.String(info, "planName");
            var hideDaily = Field(info, "hideDailyQuota").ValueKind == JsonValueKind.True;
            var daily = Number(status, "dailyQuotaRemainingPercent");
            var weekly = Number(status, "weeklyQuotaRemainingPercent");
            if (Field(status, "weeklyQuotaRemainingPercent").ValueKind != JsonValueKind.Undefined && weekly == null) throw new InvalidDataException();
            var reset = Unix(status, "weeklyQuotaResetAtUnix");
            if (!hideDaily && daily != null) rows.Add(new("Daily quota", Math.Clamp(100 - daily.Value, 0, 100), Unix(status, "dailyQuotaResetAtUnix")));
            weekly ??= reset != null ? 0 : hideDaily ? daily : null;
            if (weekly != null) rows.Add(new("Weekly quota", Math.Clamp(100 - weekly.Value, 0, 100), reset));
            if (Number(status, "overageBalanceMicros") is { } micros) rows.Add(new("Extra usage balance", 0, null, Math.Max(0, micros) / 1000000, "USD"));
        }
        else if (id == "grok")
        {
            var config = Field(root, "config"); var period = Field(config, "currentPeriod");
            var start = Date(period, "start"); var end = Date(period, "end");
            if (start == null || end == null || end <= start) throw new InvalidDataException();
            var raw = Field(config, "creditUsagePercent");
            var used = raw.ValueKind == JsonValueKind.Undefined ? 0 : Number(config, "creditUsagePercent") ?? throw new InvalidDataException();
            var type = UsageParser.String(period, "type");
            if (type == "USAGE_PERIOD_TYPE_WEEKLY") rows.Add(new("Weekly", Math.Clamp(used, 0, 100), end));
        }
        if (id == "copilot" && rows.Count == 0 && Field(root, "token_based_billing").ValueKind == JsonValueKind.True)
        {
            var premium = Field(Field(root, "quota_snapshots"), "premium_interactions");
            if (Number(premium, "credits_used") is >= 0 and var used) rows.Add(new("Credits", 0, null, used, "COUNT"));
            return new(id, ProviderCatalog.Get(id).Name, plan, rows, now);
        }
        if (rows.Count == 0) throw new InvalidDataException();
        return new(id, ProviderCatalog.Get(id).Name, plan, rows, now);
    }
}

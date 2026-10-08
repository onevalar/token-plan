using System.Text.Json;

namespace TokenPlan.Core;

public static class CursorUsageParser
{
    public static UsageSnapshot Parse(string usage, string? membership, DateTimeOffset now, string? summary = null, string? requestUsage = null)
    {
        using var primary = JsonDocument.Parse(usage);
        var root = primary.RootElement;
        if (root.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        if (root.TryGetProperty("enabled", out var enabled) && enabled.ValueKind == JsonValueKind.False) throw new InvalidDataException("No active Cursor subscription.");
        var windows = new List<UsageWindow>();
        var reset = EpochMilliseconds(root, "billingCycleEnd");
        var plan = Object(root, "planUsage");
        if (plan is { } p)
        {
            var total = Number(p, "totalPercentUsed");
            var auto = Number(p, "autoPercentUsed");
            var api = Number(p, "apiPercentUsed");
            var spend = Number(p, "totalSpend");
            var limit = Number(p, "limit");
            var remaining = Number(p, "remaining");
            var teamUsage = Object(root, "spendLimitUsage");
            var isTeam = membership?.Equals("team", StringComparison.OrdinalIgnoreCase) == true || teamUsage is { } team && (UsageParser.String(team, "limitType") == "team" || Number(team, "pooledLimit") > 0);
            var hasPools = auto >= 0 && api >= 0 && (auto > 0 || api > 0 || spend == 0 || spend == null && remaining == limit);
            // Modern Teams pool percentages supersede legacy dollar allowances.
            if (total == null && !(isTeam && hasPools) && limit > 0)
            {
                var used = spend ?? (remaining is >= 0 && remaining <= limit ? limit - remaining : null);
                if (used >= 0) total = used / limit * 100;
            }
            Add(windows, "Total usage", total, reset);
            if (hasPools)
            {
                Add(windows, "Cursor Models", auto, reset);
                Add(windows, "Other Models", api, reset);
            }
        }
        if (windows.Count > 0) return new("cursor", "Cursor", membership, windows, now);
        using var summaryDocument = summary == null ? null : JsonDocument.Parse(summary);
        using var requestsDocument = requestUsage == null ? null : JsonDocument.Parse(requestUsage);
        var summaryRoot = summaryDocument?.RootElement;
        var requestsRoot = requestsDocument?.RootElement;
        if (summaryRoot is { ValueKind: JsonValueKind.Object } s)
        {
            reset = DateTimeOffset.TryParse(UsageParser.String(s, "billingCycleEnd"), out var date) ? date : reset;
            membership ??= UsageParser.String(s, "membershipType");
        }
        // A request allowance takes precedence on legacy Enterprise accounts, as on macOS.
        var requestPlan = requestsRoot is { ValueKind: JsonValueKind.Object } r ? Object(r, "gpt-4") : null;
        if (requestPlan is { } request && Number(request, "maxRequestUsage") is > 0 and var cap)
        {
            var count = Number(request, "numRequests") ?? Number(request, "numRequestsTotal");
            if (count >= 0) Add(windows, "Total usage", count / cap * 100, reset);
        }
        if (summaryRoot is { ValueKind: JsonValueKind.Object } sr)
        {
            var individual = Object(sr, "individualUsage");
            var team = Object(sr, "teamUsage");
            var individualPlan = individual is { } i ? Object(i, "plan") : null;
            if (windows.Count == 0)
            {
                var pooled = team is { } t ? Object(t, "pooled") : null;
                var overall = individual is { } j ? Object(j, "overall") : null;
                var total = UsageParser.String(sr, "limitType") == "team" ? DollarPercent(pooled) : null;
                total ??= individualPlan is { } ip ? Number(ip, "totalPercentUsed") : null;
                total ??= DollarPercent(overall) ?? DollarPercent(pooled);
                Add(windows, "Total usage", total, reset);
            }
            if (individualPlan is { } sp)
            {
                Add(windows, "Cursor Models", Number(sp, "autoPercentUsed"), reset);
                Add(windows, "Other Models", Number(sp, "apiPercentUsed"), reset);
            }
        }
        if (windows.Count == 0) throw new InvalidDataException("Total usage limit missing from API response.");
        return new("cursor", "Cursor", membership, windows, now);
    }
    static void Add(List<UsageWindow> windows, string label, double? used, DateTimeOffset? reset)
    {
        if (used is >= 0 && double.IsFinite(used.Value)) windows.Add(new(label, used.Value, reset));
    }
    static double? DollarPercent(JsonElement? bucket)
    {
        if (bucket is not { } b || b.TryGetProperty("enabled", out var enabled) && enabled.ValueKind == JsonValueKind.False || Number(b, "limit") is not > 0) return null;
        var cap = Number(b, "limit")!.Value;
        var used = Number(b, "used");
        var remaining = Number(b, "remaining");
        if (!(used > 0) && remaining is >= 0 && remaining <= cap) used = cap - remaining;
        return used >= 0 ? used / cap * 100 : null;
    }
    static JsonElement? Object(JsonElement root, string key) => root.TryGetProperty(key, out var child) && child.ValueKind == JsonValueKind.Object ? child : null;
    static double? Number(JsonElement root, string key) => root.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) && double.IsFinite(number) ? number : null;
    static DateTimeOffset? EpochMilliseconds(JsonElement root, string key)
    {
        try { return Number(root, key) is { } value ? DateTimeOffset.FromUnixTimeMilliseconds(checked((long)value)) : null; }
        catch (Exception e) when (e is OverflowException or ArgumentOutOfRangeException) { return null; }
    }
}

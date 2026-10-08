using System.Text.Json;

namespace TokenPlan.Core;

public record UsageWindow(string Label, double UsedPercent, DateTimeOffset? ResetsAt)
{
    public double RemainingPercent => Math.Max(0, 100 - UsedPercent);
}
public record UsageSnapshot(string Id, string Name, string? Plan, IReadOnlyList<UsageWindow> Windows, DateTimeOffset FetchedAt);
public record ProviderResult(string Id, string Name, UsageSnapshot? Snapshot, string? ErrorKey, string? CredentialFingerprint = null)
{
    public ProviderResult PreserveLastSuccess(ProviderResult? previous) => Snapshot == null && ErrorKey != null && CredentialFingerprint != null && previous?.Id == Id && previous.CredentialFingerprint == CredentialFingerprint && previous.Snapshot != null ? this with { Snapshot = previous.Snapshot } : this;
}

public static class UsageParser
{
    public static UsageSnapshot Parse(string provider, string json, DateTimeOffset now)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object) throw new InvalidDataException("Invalid usage document");
        var windows = new List<UsageWindow>();
        string? plan = null;
        if (provider == "codex")
        {
            plan = String(root, "plan_type");
            if (root.TryGetProperty("rate_limit", out var limits) && limits.ValueKind == JsonValueKind.Object)
            {
                AddCodex(limits, "primary_window", "Session", now, windows);
                AddCodex(limits, "secondary_window", "Weekly", now, windows);
            }
        }
        else if (provider == "claude")
        {
            foreach (var (field, label) in new[] { ("five_hour", "Session"), ("seven_day", "Weekly"), ("seven_day_sonnet", "Sonnet") })
            {
                if (!root.TryGetProperty(field, out var window) || window.ValueKind != JsonValueKind.Object) continue;
                if (Number(window, "utilization") is not { } used || used < 0) continue;
                DateTimeOffset? reset = DateTimeOffset.TryParse(String(window, "resets_at"), out var date) ? date : null;
                windows.Add(new(label, used, reset));
            }
        }
        else throw new ArgumentException("Unknown provider");
        if (windows.Count == 0) throw new InvalidDataException("No valid usage windows");
        return new(provider, provider == "codex" ? "Codex" : "Claude", plan, windows, now);
    }
    static void AddCodex(JsonElement root, string field, string fallback, DateTimeOffset now, List<UsageWindow> windows)
    {
        if (!root.TryGetProperty(field, out var window) || window.ValueKind != JsonValueKind.Object) return;
        if (Number(window, "used_percent") is not { } used || used < 0) return;
        var seconds = Number(window, "limit_window_seconds");
        var label = seconds == 604800 ? "Weekly" : seconds == 18000 ? "Session" : fallback;
        DateTimeOffset? reset = null;
        try
        {
            if (Number(window, "reset_at") is { } unix) reset = DateTimeOffset.FromUnixTimeSeconds(checked((long)unix));
            else if (Number(window, "reset_after_seconds") is { } after && after >= 0) reset = now.AddSeconds(after);
        }
        catch (ArgumentOutOfRangeException) { }
        catch (OverflowException) { }
        var item = new UsageWindow(label, used, reset);
        var existing = windows.FindIndex(w => w.Label == label);
        if (existing < 0) windows.Add(item);
        else windows[existing] = item;
        windows.Sort((a, b) => a.Label == b.Label ? 0 : a.Label == "Session" ? -1 : 1);
    }
    public static string? String(JsonElement value, string key) => value.ValueKind == JsonValueKind.Object && value.TryGetProperty(key, out var item) && item.ValueKind == JsonValueKind.String ? item.GetString() : null;
    static double? Number(JsonElement value, string key) => value.TryGetProperty(key, out var item) && item.ValueKind == JsonValueKind.Number && item.TryGetDouble(out var number) && double.IsFinite(number) ? number : null;
}

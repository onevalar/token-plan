namespace TokenPlan.Core;

public static class TrayReadings
{
    public static IReadOnlyList<UsageWindow> Select(ProviderResult account, string[]? pins)
    {
        var windows = account.Snapshot?.Windows ?? [];
        var selected = pins == null ? windows.Take(2).ToArray()
            : pins.Select(label => windows.FirstOrDefault(w => w.Label == label)).OfType<UsageWindow>().Take(2).ToArray();
        if (selected.Length > 0) return selected;
        var preferred = account.Id == "claude" ? "Session" : account.Id == "codex"
            ? account.Snapshot?.Plan?.StartsWith("pro", StringComparison.OrdinalIgnoreCase) == true ? "Weekly" : "Session" : null;
        var primary = windows.FirstOrDefault(w => w.Label == preferred && !w.IsBalance)
            ?? windows.Where(w => !w.IsBalance).OrderByDescending(w => w.UsedPercent).FirstOrDefault()
            ?? windows.FirstOrDefault();
        return primary == null ? [] : [primary];
    }
}

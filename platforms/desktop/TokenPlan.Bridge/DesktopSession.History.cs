using TokenPlan.Core;
namespace TokenPlan.Bridge;

public sealed partial class DesktopSession
{
    async Task RefreshHistory(string provider, CancellationToken cancellation)
    {
        try
        {
            if (scanners.TryGetValue(provider, out var scanner))
                trends[provider] = await scanner.Scan(DateTimeOffset.UtcNow, TimeZoneInfo.Local, cancellation);
            else if (provider == "cursor")
                trends[provider] = await service.RefreshCursorTokens(DateTimeOffset.UtcNow, TimeZoneInfo.Local, cancellation);
            else if (provider == "grok")
                trends[provider] = await GrokTokenUsage.Scan(
                    Environment.GetEnvironmentVariable("GROK_HOME") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".grok"),
                    DateTimeOffset.UtcNow, TimeZoneInfo.Local, cancellation);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            DiagnosticLog.Write("desktop-history", e.GetType().Name);
            trends[provider] = new([], true, DateTimeOffset.UtcNow, "Local token logs could not be read. Try refreshing again.");
        }
    }
}

public sealed partial class DesktopSession
{
    readonly Dictionary<string, UsageHistory> quotaHistories = new();
    readonly HashSet<string> failedHistories = new();
    string HistoryFile(ProviderResult account) => account.AccountKey is { } key
        ? Path.Combine(Path.GetDirectoryName(file)!, "accounts", key.Replace(':', '-') + ".json")
        : Path.Combine(Path.GetDirectoryName(file)!, "quota-history.json");
    UsageHistory QuotaHistory(ProviderResult account)
    {
        var path = HistoryFile(account);
        if (!quotaHistories.TryGetValue(path, out var history))
            try { quotaHistories[path] = history = UsageHistory.Load(path, DateTimeOffset.UtcNow); }
            catch (Exception e) when (e is IOException or InvalidDataException or System.Text.Json.JsonException or UnauthorizedAccessException)
            { failedHistories.Add(path); DiagnosticLog.Write("desktop-history", e.GetType().Name); history = new(); }
        return history;
    }
    void ObserveQuota(ProviderResult account)
    {
        var history = QuotaHistory(account);
        if (failedHistories.Contains(HistoryFile(account))) return;
        history.Observe(account, DateTimeOffset.UtcNow);
        try { history.Save(HistoryFile(account)); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        { failedHistories.Add(HistoryFile(account)); DiagnosticLog.Write("desktop-history", e.GetType().Name); }
    }
    object[] Observations(ProviderResult account) => QuotaHistory(account)
        .Read(new Dictionary<string, ProviderResult> { [account.Id] = account }, preferences, DateTimeOffset.UtcNow.AddDays(-30), DateTimeOffset.UtcNow)
        .SelectMany(r => r.Windows.Select(w => (object)new {
            date = r.FetchedAt.ToString("O"), label = w.Label,
            value = w.IsBalance ? w.Amount : w.UsedPercent,
            unit = w.IsBalance ? w.Currency : "percent"
        })).Take(2400).ToArray();
}

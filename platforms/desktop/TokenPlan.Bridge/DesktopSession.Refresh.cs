using TokenPlan.Core;
namespace TokenPlan.Bridge;
public sealed partial class DesktopSession
{
    async Task RefreshAccounts(bool discover, string? family)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(110));
        var ids = preferences.OrderedProviders.Where(p => preferences.IsEnabled(p) || (discover && p is ("claude" or "codex"))).Where(p => family == null || p == family).ToArray();
        try
        {
            await Parallel.ForEachAsync(ids, new ParallelOptions { MaxDegreeOfParallelism = 2, CancellationToken = timeout.Token }, async (provider, cancellation) =>
            {
                if (!discover && nextRefresh.GetValueOrDefault(provider) > DateTimeOffset.UtcNow) return;
                nextRefresh[provider] = DateTimeOffset.UtcNow.AddMinutes(preferences.RefreshMinutes); Persist();
                try
                {
                    var fresh = await service.Refresh(provider, cancellation);
                    fresh = RememberAccount(fresh);
                    lock (persistenceLock) ObserveQuota(fresh);
                    var extras = await service.RefreshAdditionalAccounts(provider, cancellation);
                    foreach (var extra in extras)
                    {
                        var remembered = RememberAccount(extra);
                        lock (persistenceLock) ObserveQuota(remembered);
                    }
                    if (provider is "claude" or "codex") {
                        var identities = extras.Append(fresh).Select(a => a.AccountIdentity).Where(i => i != null).ToHashSet();
                        foreach (var saved in results.Values.Where(a => a.Id == provider && a.AccountIdentity != null && !identities.Contains(a.AccountIdentity)))
                            results[saved.SettingsKey] = saved with { Snapshot = null, ErrorKey = "Account saved. Reconnect its login, then detect accounts again." };
                    }
                    await RefreshHistory(provider, cancellation);
                }
                catch (OperationCanceledException)
                {
                    if (results.TryGetValue(provider, out var previous))
                        results[provider] = previous with { ErrorKey = "The connection timed out. Try again later." };
                }
                finally { Persist(); }
            });
        }
        catch (OperationCanceledException) { DiagnosticLog.Write("desktop-refresh", "Refresh deadline reached"); }
    }
}

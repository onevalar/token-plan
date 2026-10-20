using TokenPlan.Core;
namespace TokenPlan.Bridge;
public sealed partial class DesktopSession
{
    async Task RefreshAccounts(bool discover, string? family)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(110));
        var ids = preferences.OrderedProviders.Where(preferences.IsEnabled).Where(p => family == null || p == family).ToArray();
        try
        {
            await Parallel.ForEachAsync(ids, new ParallelOptions { MaxDegreeOfParallelism = 2, CancellationToken = timeout.Token }, async (provider, cancellation) =>
            {
                if (!discover && nextRefresh.GetValueOrDefault(provider) > DateTimeOffset.UtcNow) return;
                nextRefresh[provider] = DateTimeOffset.UtcNow.AddMinutes(preferences.RefreshMinutes); Persist();
                try
                {
                    var fresh = await service.Refresh(provider, cancellation);
                    results[provider] = fresh.PreserveLastSuccess(results.GetValueOrDefault(provider));
                    lock (persistenceLock) ObserveQuota(fresh);
                    foreach (var extra in await service.RefreshAdditionalAccounts(provider, cancellation))
                    {
                        results[extra.SettingsKey] = extra.PreserveLastSuccess(results.GetValueOrDefault(extra.SettingsKey));
                        lock (persistenceLock) ObserveQuota(extra);
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

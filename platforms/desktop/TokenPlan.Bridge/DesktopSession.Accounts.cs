using System.Security.Cryptography;
using System.Text;
using TokenPlan.Core;
namespace TokenPlan.Bridge;
public sealed partial class DesktopSession
{
    // Persist defaults only once usable metrics exist. Empty saved arrays are explicit choices.
    void InitializePins(ProviderResult account)
    {
        if (!preferences.PinnedMetrics.ContainsKey(account.SettingsKey) && account.Snapshot?.Windows is { Count: > 0 } windows)
            preferences = preferences with { PinnedMetrics = new(preferences.PinnedMetrics) {
                [account.SettingsKey] = windows.Take(2).Select(w => w.Label).ToArray()
            } };
    }
    // A default login directory can change owners. Never let that replace a saved identity.
    ProviderResult RememberAccount(ProviderResult fresh)
    {
        lock (persistenceLock)
        {
            if (fresh.Id is not ("claude" or "codex")) {
                InitializePins(fresh);
                return results[fresh.SettingsKey] = fresh.PreserveLastSuccess(results.GetValueOrDefault(fresh.SettingsKey));
            }
            if (string.IsNullOrEmpty(fresh.AccountIdentity)) {
                if (results.TryGetValue(fresh.SettingsKey, out var saved) && saved.AccountIdentity != null) {
                    results[saved.SettingsKey] = saved with { Snapshot = null, ErrorKey = fresh.ErrorKey ?? "Account kept. Its login could not be identified. Check the configuration directory and access permissions, then detect again." };
                } else results[fresh.SettingsKey] = fresh;
                return results[fresh.SettingsKey];
            }
            var existing = results.Values.FirstOrDefault(a => a.Id == fresh.Id && a.AccountIdentity == fresh.AccountIdentity);
            if (existing != null) fresh = fresh with { AccountKey = existing.AccountKey };
            else if (results.TryGetValue(fresh.SettingsKey, out var previous) && previous.AccountIdentity != null && previous.AccountIdentity != fresh.AccountIdentity) {
                results[previous.SettingsKey] = previous with { Snapshot = null, ErrorKey = "Another account is currently connected. This saved account is kept; connect its configuration directory or sign in to it." };
                fresh = fresh with { AccountKey = fresh.Id + ":" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(fresh.AccountIdentity))).ToLowerInvariant()[..16] };
            }
            InitializePins(fresh);
            return results[fresh.SettingsKey] = fresh.PreserveLastSuccess(existing);
        }
    }
}

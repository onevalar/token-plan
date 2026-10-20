using TokenPlan.Core;
namespace TokenPlan.Bridge;
public sealed partial class DesktopSession
{
    IEnumerable<ProviderResult> Accounts()
    {
        var all = preferences.OrderedProviders.SelectMany(family =>
            new[] { results.GetValueOrDefault(family) ?? new ProviderResult(family, ProviderCatalog.Get(family).Name, null, null) }
                .Concat(results.Values.Where(r => r.Id == family && r.AccountKey != null)));
        return all.Where(a => !preferences.IsAccountRemoved(a))
            .OrderBy(a => { var index = accountOrder.IndexOf(a.SettingsKey); return index < 0 ? int.MaxValue : index; });
    }
    object Snapshot() => new {
        schema = "tokenplan.desktop.v1",
        settings = new { notifications, shortcut, showRemaining = preferences.ShowRemaining, locale = System.Globalization.CultureInfo.CurrentUICulture.Name, appearance = preferences.Appearance, language = preferences.Language, trayStyle, autoUpdates, refreshMinutes = preferences.RefreshMinutes, autoRefresh = preferences.AutoRefresh },
        accounts = Accounts().Select(a => new {
            id = a.SettingsKey, family = a.Id, name = ProviderCatalog.Get(a.Id).Name,
            email = a.AccountEmail ?? "", plan = a.Snapshot?.Plan ?? "",
            enabled = preferences.IsEnabled(a.Id) && preferences.AccountVisibility.GetValueOrDefault(a.SettingsKey, true),
            tray = preferences.TrayServices.GetValueOrDefault(a.Id, true) && preferences.TrayAccounts.GetValueOrDefault(a.SettingsKey, true),
            removable = Preferences.AccountRemovalKey(a) != null, apiKey = ProviderCatalog.Get(a.Id).EnvironmentKey != null,
            note = preferences.ProviderNotes.GetValueOrDefault(a.SettingsKey, ""), error = a.ErrorKey ?? "",
            fetchedAt = a.Snapshot?.FetchedAt.ToString("O") ?? "",
            metrics = preferences.OrderedMetrics(a.SettingsKey, a.Snapshot?.Windows ?? []).Select(w => new {
                id = w.Label, label = w.Label, placement = preferences.Placement(a.SettingsKey, w.Label).ToString().ToLowerInvariant(),
                pinned = (preferences.PinnedMetrics.GetValueOrDefault(a.SettingsKey) ?? a.Snapshot!.Windows.Take(2).Select(x => x.Label).ToArray()).Contains(w.Label),
                pinnable = true, hasData = true, unit = w.Currency == "USD" ? "dollars" : w.Currency == "CNY" ? "yuan" : w.Currency == "COUNT" ? "count" : "percent",
                percent = w.IsBalance ? (double?)null : preferences.ShowRemaining ? Math.Max(0, 100 - w.UsedPercent) : w.UsedPercent, amount = w.Amount,
                notStarted = w.PeriodSeconds == 18000 && w.UsedPercent == 0 && w.ResetsAt == null, expiries = w.Expiries?.Select(d => d.ToString("O")).ToArray() ?? [], chart = Array.Empty<object>(),
                resetsAt = w.ResetsAt?.ToString("O"), periodSeconds = w.PeriodSeconds, values = Array.Empty<object>()
            }),
            history = a.AccountKey == null && trends.TryGetValue(a.Id, out var trend)
                ? trend.Days.Select(d => new { date = d.Date.ToString("yyyy-MM-dd"), tokens = d.Tokens.Total, cost = d.Cost is { Priced: > 0 } cost ? (double?)cost.Dollars : null, models = (d.Models ?? []).Select(m => new { model = m.Model, tokens = m.Tokens.Total, cost = m.Cost.Unpriced > 0 ? (double?)null : m.Cost.Dollars, variants = Array.Empty<object>() }).ToArray() }).ToArray() : [],
            observations = Observations(a),
            historyScope = a.Id == "cursor" ? "account" : "device", historyPartial = failedHistories.Contains(HistoryFile(a)) || ((trends.GetValueOrDefault(a.Id)?.Partial ?? false) || (trends.GetValueOrDefault(a.Id)?.Days.Any(d => d.Cost?.Unpriced > 0) ?? false))
        }).ToArray()
    };
}

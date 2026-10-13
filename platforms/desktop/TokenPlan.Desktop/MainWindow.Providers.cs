using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Templates;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Styling;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    string historyProvider = "all";
    (string Provider, long Hour)? historySelection;
    sealed record HistoryItem(HistoryReading Reading, string Label) { public override string ToString() => Label; }
    static string ProviderName(string id) => ProviderCatalog.Get(id).Name;
    Control ProvidersPage()
    {
        var body = UtilityBody("Service Configuration");
        body.Children.Add(SpendOverview());
        if (selectedSpendDate != null) return new ScrollViewer { Content = body };
        body.Children.Add(Text(L.T("Manage Providers"), 18));
        body.Children.Add(Text(L.T("Choose which accounts appear in your overview and refresh automatically."), 13, true));
        if (Program.Fixture) body.Children.Add(Note(L.T("Interface review uses example data. No accounts are connected.")));
        foreach (var id in preferences.OrderedProviders)
        {
            var result = results.GetValueOrDefault(id);
            var enabled = preferences.IsEnabled(id);
            var card = Stack(12);
            var heading = new Grid { ColumnDefinitions = new ColumnDefinitions("Auto,*,Auto,Auto") };
            Add(heading, new Border { Width = 36, Height = 36, Background = Canvas, CornerRadius = new CornerRadius(8), Child = ProviderMark(id) });
            var title = Stack(3); title.Margin = new Thickness(12, 0);
            title.Children.Add(Text(ProviderName(id), 17));
            var status = !enabled ? L.T("Disabled") : Program.Fixture ? L.T("Example Data") : result?.ErrorKey != null ? L.T("Needs Attention") : result?.Snapshot != null ? L.T("Connected") : L.T("Waiting for the first update…");
            title.Children.Add(Text(status, 12, true)); Add(heading, title, 0, 1);
            var toggle = new ToggleSwitch { Name = "tokenplan-provider-" + id, OnContent = "", OffContent = "", IsChecked = enabled, IsEnabled = refresh == null, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) };
            Avalonia.Automation.AutomationProperties.SetName(toggle, ProviderName(id) + " · " + L.T("Enabled"));
            toggle.IsCheckedChanged += (_, _) => {
                preferences = preferences.WithEnabled(id, toggle.IsChecked == true);
                if (!preferences.IsEnabled(id)) results.Remove(id);
                if (!preferences.IsEnabled(id)) tokenTrends.Remove(id);
                Save(); Render();
                if (preferences.IsEnabled(id)) _ = Refresh(id);
            };
            var refreshOne = Action("Refresh", () => _ = Refresh(id)); refreshOne.Name = "tokenplan-provider-refresh-" + id; refreshOne.IsEnabled = enabled && refresh == null; refreshOne.VerticalAlignment = VerticalAlignment.Center;
            Add(heading, refreshOne, 0, 2); Add(heading, toggle, 0, 3); card.Children.Add(heading);
            card.Children.Add(Text(id switch {
                "claude" => L.T("Sign in with Claude Code, then refresh."), "codex" => L.T("Sign in with the Codex CLI, then refresh."),
                "cursor" => L.T("Sign in with the Cursor desktop app, then refresh."),
                _ => L.T(ProviderCatalog.Get(id).EnvironmentKey != null ? "Add an API key in service settings, then refresh." : "Sign in with the service app, then refresh.") }, 13, true));
            var controls = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
            controls.Children.Add(Action("Settings", () => { OpenDetail(id); detailSettings = true; Render(); }));
            var order = preferences.OrderedProviders.ToArray();
            var up = Action("Move Up", () => { preferences = preferences.MoveProvider(id, -1); Save(); Render(); }); up.IsEnabled = order[0] != id;
            var down = Action("Move Down", () => { preferences = preferences.MoveProvider(id, 1); Save(); Render(); }); down.IsEnabled = order[^1] != id;
            controls.Children.Add(up); controls.Children.Add(down); card.Children.Add(controls);
            if (enabled && result?.ErrorKey is { } error) card.Children.Add(Text(L.T(error), 12, true));
            if (enabled && result?.Snapshot is { } snapshot)
                card.Children.Add(Text(L.T(result.ErrorKey == null ? "Updated" : "Last Successful Update") + " " + snapshot.FetchedAt.ToLocalTime().ToString("g"), 11, true));
            body.Children.Add(new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(20), Child = card });
        }
        foreach (var account in additionalAccounts.Values.SelectMany(v => v).Where(a => preferences.IsEnabled(a.Id)))
        {
            var row = Stack(8);
            var visible = Switch(preferences.AccountVisibility.GetValueOrDefault(account.SettingsKey, true), value => { preferences = preferences with { AccountVisibility = new(preferences.AccountVisibility) { [account.SettingsKey] = value } }; Save(); Render(); });
            visible.Name = "account-visible-" + account.SettingsKey;
            row.Children.Add(SettingRow(account.AccountEmail ?? account.Name, visible));
            row.Children.Add(Action("Settings", () => { OpenAccountDetail(account); detailSettings = true; Render(); }));
            body.Children.Add(Section("Account", row));
        }
        body.Children.Add(Note(L.T("Disabling a provider stops its requests. Its existing login remains unchanged.")));
        return new ScrollViewer { Content = body, HorizontalScrollBarVisibility = Avalonia.Controls.Primitives.ScrollBarVisibility.Disabled };
    }

    Control QuotaHistoryPage()
    {
        var body = new Grid { RowDefinitions = new RowDefinitions("Auto,Auto,Auto,Auto,*"), Margin = new Thickness(20, 16), MaxWidth = 780 };
        var heading = Stack(8);
        heading.Children.Add(Action("Back", () => Navigate(settingsOrigin)));
        heading.Children.Add(Text(L.T("History"), 28));
        heading.Children.Add(Text(L.T("Local quota readings from the last 30 days. The most recent successful reading per hour is kept."), 13, true));
        Add(body, heading);
        if (Program.Fixture) Add(body, new Border { Margin = new Thickness(0, 14, 0, 0), Child = Note(L.T("Interface review uses example data. No accounts are connected.")) }, 1);
        if (notice != null) Add(body, new Border { Margin = new Thickness(0, 14, 0, 0), Child = Note(L.T(notice)) }, 2);
        var filters = new WrapPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 20, 0, 16) };
        var days = new ComboBox { Name = "tokenplan-history-days", ItemsSource = new[] { L.T("Last 7 Days"), L.T("Last 30 Days") }, SelectedIndex = preferences.HistoryDays == 7 ? 0 : 1, MinWidth = 150, Margin = new Thickness(0, 0, 12, 0) };
        Avalonia.Automation.AutomationProperties.SetName(days, L.T("Date Range"));
        days.SelectionChanged += (_, _) => { if (days.SelectedIndex < 0) return; preferences = preferences with { HistoryDays = days.SelectedIndex == 0 ? 7 : 30 }; scrollPositions["history"] = default; historySelection = null; Save(); Render(); };
        filters.Children.Add(days);
        var ids = new[] { "all" }.Concat(ProviderIDs.Where(preferences.IsEnabled)).ToArray();
        if (!ids.Contains(historyProvider)) historyProvider = "all";
        var provider = new ComboBox { Name = "tokenplan-history-provider", ItemsSource = ids.Select(id => id == "all" ? L.T("All Providers") : ProviderName(id)).ToArray(), SelectedIndex = Array.IndexOf(ids, historyProvider), MinWidth = 160 };
        Avalonia.Automation.AutomationProperties.SetName(provider, L.T("Providers"));
        provider.SelectionChanged += (_, _) => { if (provider.SelectedIndex < 0) return; historyProvider = ids[provider.SelectedIndex]; scrollPositions["history"] = default; historySelection = null; Render(); };
        filters.Children.Add(provider); Add(body, filters, 3);
        var now = DateTimeOffset.UtcNow;
        var since = new DateTimeOffset(now.ToLocalTime().Date.AddDays(1 - preferences.HistoryDays));
        var readings = history.Read(results, preferences, since, now).Where(r => historyProvider == "all" || r.Provider == historyProvider).ToArray();
        if (readings.Length == 0) Add(body, Note(L.T("No readings in this range. Successful refreshes will appear here.")), 4);
        else
        {
            // ListBox virtualizes the month of observations; never build thousands of row controls.
            var items = readings.Select(r => new HistoryItem(r, ProviderName(r.Provider) + " · " + r.FetchedAt.ToLocalTime().ToString("g"))).ToArray();
            var list = new ListBox { Name = "tokenplan-history-readings", Focusable = true, ItemsSource = items, Background = Brushes.Transparent, BorderThickness = new Thickness(0),
                // Clearing a virtualized container calls the template with null during Home/End navigation.
                ItemTemplate = new FuncDataTemplate<HistoryItem>((item, _) => item == null ? null : HistoryRow(item.Reading), supportsRecycling: false) };
            if (historySelection is { } selected) list.SelectedItem = items.FirstOrDefault(item => item.Reading.Provider == selected.Provider && item.Reading.FetchedAt.ToUnixTimeSeconds() / 3600 == selected.Hour);
            list.SelectionChanged += (_, _) => { if (list.SelectedItem is HistoryItem item) historySelection = (item.Reading.Provider, item.Reading.FetchedAt.ToUnixTimeSeconds() / 3600); };
            list.Styles.Add(new Avalonia.Styling.Style(x => x.OfType<ListBoxItem>()) { Setters = { new Avalonia.Styling.Setter(ListBoxItem.HorizontalContentAlignmentProperty, HorizontalAlignment.Stretch), new Avalonia.Styling.Setter(ListBoxItem.PaddingProperty, new Thickness(0)), new Avalonia.Styling.Setter(ListBoxItem.MarginProperty, new Thickness(0, 0, 0, 10)) } });
            Add(body, list, 4);
        }
        return body;
    }

    Control HistoryRow(HistoryReading reading)
    {
        var row = Stack(10);
        var title = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
        Add(title, Text(ProviderName(reading.Provider), 15));
        Add(title, Text(reading.FetchedAt.ToLocalTime().ToString("g"), 11, true), 0, 1); row.Children.Add(title);
        foreach (var window in reading.Windows)
        {
            var line = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
            Add(line, Text(L.T(window.Label), 12, true));
            Add(line, Text(MetricValue(window), 12), 0, 1); row.Children.Add(line);
            if (window.ResetsAt is { } reset) row.Children.Add(Text(L.T("Resets") + " " + reset.ToLocalTime().ToString("g"), 11, true));
        }
        return new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(18), Child = row };
    }
    void SaveHistory()
    {
        if (Program.Fixture) return;
        try { history.Save(historyFile); }
        catch (Exception e) when (e is IOException or InvalidDataException or UnauthorizedAccessException) { notice = "Usage history could not be saved. Check the app data folder permissions."; DiagnosticLog.Write("history", notice); }
    }
    static UsageHistory ExampleHistory()
    {
        var data = new UsageHistory(); var now = DateTimeOffset.UtcNow;
        foreach (var id in ProviderIDs)
            for (var day = 10; day >= 1; day--)
            {
                var example = Example(id); var snapshot = example.Snapshot!;
                var date = now.AddDays(-day);
                data.Observe(example with { Snapshot = snapshot with { FetchedAt = date, Windows = snapshot.Windows.Select(w => w with { UsedPercent = Math.Max(0, w.UsedPercent - day * 2), ResetsAt = w.ResetsAt?.AddDays(-day) }).ToArray() } }, now);
            }
        return data;
    }
}

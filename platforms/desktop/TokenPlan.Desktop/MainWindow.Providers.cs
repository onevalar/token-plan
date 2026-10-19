using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Controls.Templates;
using Avalonia.Styling;
using Avalonia.Layout;
using Avalonia.Media;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

/// <summary>
/// Service Configuration (the macOS Customize list) and Usage History. The list is a usage overview
/// followed by one row per service — mark, name, connection state, on/off switch, chevron — while the
/// history screen keeps the spend ring and the recorded quota readings.
/// </summary>
public sealed partial class MainWindow
{
    string historyProvider = "all";
    (string Provider, long Hour)? historySelection;
    sealed record HistoryItem(HistoryReading Reading, string Label) { public override string ToString() => Label; }
    static string ProviderName(string id) => ProviderCatalog.Get(id).Name;

    Control ProvidersPage()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        var overview = SpendOverview();
        if (selectedSpendDate != null) return Page("Service Configuration", overview);

        body.Children.Add(Section("Usage Overview", CardSurface(overview)));

        var manage = new StretchStack { Spacing = 4 };
        manage.Children.Add(ControlRowLabel("Manage Providers"));
        manage.Children.Add(Label(L.T("Choose which accounts appear in your overview and refresh automatically."), D.CaptionSize, T.Secondary));
        body.Children.Add(manage);
        if (Program.Fixture) body.Children.Add(Note("Interface review uses example data. No accounts are connected."));

        var services = new StretchStack { Spacing = 0 };
        var first = true;
        foreach (var id in preferences.OrderedProviders)
        {
            if (!first) services.Children.Add(Hairline());
            first = false;
            services.Children.Add(ProviderRow(id));
        }
        body.Children.Add(CardSurface(services));

        var accounts = additionalAccounts.Values.SelectMany(v => v)
            .Where(a => preferences.IsEnabled(a.Id) && !preferences.IsAccountRemoved(a)).ToArray();
        if (accounts.Length > 0)
        {
            var rows = new StretchStack { Spacing = 0 };
            for (var index = 0; index < accounts.Length; index++)
            {
                if (index > 0) rows.Children.Add(Hairline());
                var account = accounts[index];
                var visible = Switch(preferences.AccountVisibility.GetValueOrDefault(account.SettingsKey, true), value => { preferences = preferences with { AccountVisibility = new(preferences.AccountVisibility) { [account.SettingsKey] = value } }; Save(); Render(); });
                visible.Name = "account-visible-" + account.SettingsKey;
                var open = Chevron(account.Name + " · " + L.T("Details"), () => { OpenAccountDetail(account); detailSettings = true; Render(); });
                var cell = new Grid { ColumnDefinitions = new("*,Auto,Auto") };
                Add(cell, Label(account.AccountEmail ?? account.Name, D.RowLabelSize));
                Add(cell, visible, 0, 1);
                Add(cell, open, 0, 2);
                cell.Margin = new Thickness(12, D.ControlRowPadding - 3, 6, D.ControlRowPadding - 3);
                rows.Children.Add(cell);
            }
            body.Children.Add(Section("Account", CardSurface(rows)));
        }

        body.Children.Add(new Border { Padding = new Thickness(8, 0), Child = Label(L.T("Disabling a provider stops its requests. Its existing login remains unchanged."), D.CaptionSize, T.Secondary) });
        return Page("Service Configuration", body);
    }

    Control ProviderRow(string id)
    {
        var result = results.GetValueOrDefault(id);
        var enabled = preferences.IsEnabled(id);
        var row = new Grid { ColumnDefinitions = new("Auto,*,Auto,Auto"), Margin = new Thickness(12, 7, 4, 7) };
        var mark = new Border { Width = 18, Height = 18, Child = ProviderMark(id), VerticalAlignment = VerticalAlignment.Center, Opacity = enabled ? 1 : 0.5 };
        Add(row, mark);
        var identity = new StackPanel { Spacing = 0, Margin = new Thickness(8, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center };
        identity.Children.Add(Label(ProviderName(id), D.RowLabelSize, enabled ? T.Ink : T.Secondary));
        var status = !enabled ? L.T("Disabled") : Program.Fixture ? L.T("Example Data") : result?.ErrorKey != null ? L.T("Needs Attention") : result?.Snapshot != null ? L.T("Connected") : L.T("Waiting for the first update…");
        identity.Children.Add(Label(status, D.CaptionSize, T.Secondary));
        Add(row, identity, 0, 1);
        var toggle = new ToggleSwitch
        {
            Name = "tokenplan-provider-" + id,
            OnContent = "",
            OffContent = "",
            IsChecked = enabled,
            IsEnabled = refresh == null,
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(8, 0, 4, 0)
        };
        AutomationProperties.SetName(toggle, ProviderName(id) + " · " + L.T("Enabled"));
        toggle.IsCheckedChanged += (_, _) =>
        {
            preferences = preferences.WithEnabled(id, toggle.IsChecked == true);
            if (!preferences.IsEnabled(id)) results.Remove(id);
            if (!preferences.IsEnabled(id)) tokenTrends.Remove(id);
            Save(); Render();
            if (preferences.IsEnabled(id)) _ = Refresh(id);
        };
        Add(row, toggle, 0, 2);
        var open = Chevron(ProviderName(id) + " · " + L.T("Details"), () => { OpenDetail(id); detailSettings = true; Render(); });
        Add(row, open, 0, 3);
        return row;
    }

    Control HistoryPage()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        body.Children.Add(SpendOverview());
        body.Children.Add(QuotaReadings());
        return Page("Usage History", body);
    }

    /// <summary>The recorded quota observations for the selected range and provider.</summary>
    Control QuotaReadings()
    {
        var body = new StretchStack { Spacing = 10 };
        var caption = Label(L.T("Quota Readings"), D.CaptionSize, T.Secondary, Avalonia.Media.FontWeight.SemiBold);
        caption.Margin = new Thickness(8, 0, 0, 0);
        body.Children.Add(caption);
        var filters = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        var days = Field(new ComboBox { Name = "tokenplan-history-days", ItemsSource = new[] { L.T("Last 7 Days"), L.T("Last 30 Days") }, SelectedIndex = preferences.HistoryDays == 7 ? 0 : 1, MinWidth = 120 });
        AutomationProperties.SetName(days, L.T("Date Range"));
        days.SelectionChanged += (_, _) => { if (days.SelectedIndex < 0) return; preferences = preferences with { HistoryDays = days.SelectedIndex == 0 ? 7 : 30 }; scrollPositions["history"] = default; historySelection = null; Save(); Render(); };
        filters.Children.Add(days);
        var ids = new[] { "all" }.Concat(ProviderIDs.Where(preferences.IsEnabled)).ToArray();
        if (!ids.Contains(historyProvider)) historyProvider = "all";
        var provider = Field(new ComboBox { Name = "tokenplan-history-provider", ItemsSource = ids.Select(id => id == "all" ? L.T("All Providers") : ProviderName(id)).ToArray(), SelectedIndex = Array.IndexOf(ids, historyProvider), MinWidth = 120 });
        AutomationProperties.SetName(provider, L.T("Providers"));
        provider.SelectionChanged += (_, _) => { if (provider.SelectedIndex < 0) return; historyProvider = ids[provider.SelectedIndex]; scrollPositions["history"] = default; historySelection = null; Render(); };
        filters.Children.Add(provider);
        body.Children.Add(filters);

        var now = DateTimeOffset.UtcNow;
        var since = new DateTimeOffset(now.ToLocalTime().Date.AddDays(1 - preferences.HistoryDays));
        var readings = history.Read(results, preferences, since, now).Where(r => historyProvider == "all" || r.Provider == historyProvider).ToArray();
        body.Children.Add(Label(L.T("Local quota readings from the last 30 days. The most recent successful reading per hour is kept."), D.CaptionSize, T.Secondary));
        if (readings.Length == 0)
        {
            body.Children.Add(Note("No readings in this range. Successful refreshes will appear here."));
            return body;
        }
        // ListBox virtualizes the month of observations; never build thousands of row controls.
        var items = readings.Select(r => new HistoryItem(r, ProviderName(r.Provider) + " · " + r.FetchedAt.ToLocalTime().ToString("g"))).ToArray();
        var list = new ListBox
        {
            Name = "tokenplan-history-readings", Focusable = true, ItemsSource = items,
            Background = Brushes.Transparent, BorderThickness = default,
            // Clearing a virtualized container calls the template with null during Home/End navigation.
            ItemTemplate = new FuncDataTemplate<HistoryItem>((item, _) => item == null ? null : HistoryRow(item.Reading), supportsRecycling: false)
        };
        if (historySelection is { } selected) list.SelectedItem = items.FirstOrDefault(item => item.Reading.Provider == selected.Provider && item.Reading.FetchedAt.ToUnixTimeSeconds() / 3600 == selected.Hour);
        list.SelectionChanged += (_, _) => { if (list.SelectedItem is HistoryItem item) historySelection = (item.Reading.Provider, item.Reading.FetchedAt.ToUnixTimeSeconds() / 3600); };
        list.Styles.Add(new Avalonia.Styling.Style(x => x.OfType<ListBoxItem>()) { Setters = { new Avalonia.Styling.Setter(ListBoxItem.HorizontalContentAlignmentProperty, HorizontalAlignment.Stretch), new Avalonia.Styling.Setter(ListBoxItem.PaddingProperty, new Thickness(0)), new Avalonia.Styling.Setter(ListBoxItem.MarginProperty, new Thickness(0, 0, 0, 8)) } });
        body.Children.Add(list);
        return body;
    }

    Control HistoryRow(HistoryReading reading)
    {
        var row = new StackPanel { Spacing = 6, Margin = new Thickness(12, 9, 12, 9) };
        var title = new Grid { ColumnDefinitions = new("*,Auto") };
        Add(title, Label(ProviderName(reading.Provider), D.RowLabelSize));
        Add(title, Label(reading.FetchedAt.ToLocalTime().ToString("g"), D.CaptionSize, T.Secondary), 0, 1);
        row.Children.Add(title);
        foreach (var window in reading.Windows)
        {
            var line = new Grid { ColumnDefinitions = new("*,Auto") };
            Add(line, Label(MetricTitle(reading.Provider, window.Label), D.CaptionSize, T.Secondary));
            Add(line, Label(MetricValue(window), D.CaptionSize, T.Ink), 0, 1);
            row.Children.Add(line);
            if (window.ResetsAt is { } reset) row.Children.Add(Label(L.T("Resets") + " " + reset.ToLocalTime().ToString("g"), D.CaptionSize, T.Tertiary));
        }
        return CardSurface(row);
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

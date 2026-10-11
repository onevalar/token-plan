using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Styling;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    bool tokenDetailsExpanded;
    static string Count(long value) => value >= 1_000_000 ? (value / 1_000_000d).ToString("0.##") + "M" : value >= 1000 ? (value / 1000d).ToString("0.##") + "K" : value.ToString("N0");
    string TokenStatus() => TokenProvider == "cursor" ? L.T("Some Cursor export rows were invalid. Totals may be incomplete.") : tokenTrend?.ScanningPending == true ? L.T("Local token totals are incomplete. Refresh again to continue scanning.") : L.T("Some local token logs were skipped or could not be read. Totals may be incomplete.");
    string TokenLoading() => TokenProvider == "cursor" ? L.T("Loading Cursor token history…") : L.T("Reading local token logs…");
    Control TokenPanel()
    {
        var body = Stack(10);
        var heading = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
        Add(heading, Text(L.T("Token Usage"), 18));
        var range = new TabStrip { Name = "tokenplan-token-days", ItemsSource = new[] { L.T("Last 7 Days"), L.T("Last 30 Days") }, SelectedIndex = preferences.TokenDays == 7 ? 0 : 1, IsEnabled = ProviderCatalog.TokenLogProviders.Any(preferences.IsEnabled) };
        Avalonia.Automation.AutomationProperties.SetName(range, L.T("Date Range"));
        range.Styles.Add(new Style(x => x.OfType<TabStripItem>()) { Setters = { new Setter(TabStripItem.FontSizeProperty, 13d), new Setter(TabStripItem.PaddingProperty, new Thickness(10, 6)), new Setter(TabStripItem.MinHeightProperty, 32d) } });
        range.SelectionChanged += (_, _) => { if (range.SelectedIndex < 0) return; preferences = preferences with { TokenDays = range.SelectedIndex == 0 ? 7 : 30 }; Save(); Render(); };
        Add(heading, range, 0, 1); body.Children.Add(heading);
        var sourceIDs = ProviderCatalog.TokenLogProviders.Where(preferences.IsEnabled).ToArray();
        var source = new ComboBox { Name = "tokenplan-token-provider", ItemsSource = sourceIDs.Select(ProviderName).ToArray(), SelectedIndex = Array.IndexOf(sourceIDs, TokenProvider), MinWidth = 160, IsEnabled = sourceIDs.Length > 0 };
        Avalonia.Automation.AutomationProperties.SetName(source, L.T("Providers"));
        source.SelectionChanged += (_, _) => { if (source.SelectedIndex < 0) return; preferences = preferences with { TokenProvider = sourceIDs[source.SelectedIndex] }; Save(); Render(); };
        body.Children.Add(source);
        body.Children.Add(Text(TokenProvider == "cursor" ? L.T("From the signed-in Cursor account's usage export. Only reported token counts are included.") : TokenProvider == "grok" ? L.T("From completed Grok CLI turns on this device.") : TokenProvider == "claude" ? L.T("Claude Code logs on this device. Includes logs from different sign-ins, not the current account's complete usage.") : L.T("Codex CLI logs on this device. Includes logs from different sign-ins, not the current account's complete usage."), 12, true));
        if (sourceIDs.Length == 0) body.Children.Add(Note(L.T("Enable a provider to view token history.")));
        else if (tokenTrend?.ErrorKey is { } error) body.Children.Add(Note(L.T(error)));
        else if (tokenTrend == null || tokenTrend.Days.Count == 0)
            body.Children.Add(Note(tokensLoading ? TokenLoading() : tokenTrend?.Partial == true ? TokenStatus() : TokenProvider == "cursor" ? L.T("No reported token usage was found in the Cursor export.") : L.T("No recorded token usage was found in the local logs.")));
        else
        {
            var days = tokenTrend.Range(preferences.TokenDays, DateOnly.FromDateTime(DateTime.Now));
            var total = days.Aggregate(TokenCounts.Zero, (sum, day) => sum.Plus(day.Tokens));
            body.Children.Add(Text(Count(total.Total) + " " + L.T("Tokens"), 26));
            var cost = days.Aggregate(new CostTotal(), (sum, day) => sum.Plus(day.Cost ?? new(0, day.Tokens.Total > 0 ? 1 : 0)));
            body.Children.Add(Text(L.T("Estimated API Cost") + "  " + (cost.Priced == 0 && cost.Unpriced > 0 ? "—" : "$" + cost.Dollars.ToString("N2")), 18));
            body.Children.Add(Text(L.T(cost.Unpriced > 0 ? "Some models could not be priced. This estimate is incomplete." : "Estimated from model token rates, not your subscription bill."), 12, true));
            var values = days.Select(day => day.Tokens.Total).ToArray();
            var chart = new Grid { ColumnDefinitions = new ColumnDefinitions("52,*"), Height = 120 };
            var axis = new Grid { RowDefinitions = new RowDefinitions("*,*,*") };
            Add(axis, Text(Count(values.Max()), 11, true));
            Add(axis, new Border { VerticalAlignment = VerticalAlignment.Center, Child = Text(Count(values.Max() / 2), 11, true) }, 1);
            Add(axis, new Border { VerticalAlignment = VerticalAlignment.Bottom, Child = Text("0", 11, true) }, 2);
            Add(chart, axis);
            var color = ((ISolidColorBrush)Accent).Color;
            Add(chart, new TokenTrendChart(values, Accent, Line, new SolidColorBrush(Color.FromArgb(24, color.R, color.G, color.B))) { Height = 120 }, 0, 1);
            body.Children.Add(chart);
            var dates = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto"), Margin = new Thickness(60, -8, 8, 0) };
            Add(dates, Text(days[0].Date.ToString("M/d"), 11, true)); Add(dates, Text(days[^1].Date.ToString("M/d"), 11, true), 0, 1); body.Children.Add(dates);
            var buckets = new List<(string, long)> { (L.T("Input"), total.Input), (L.T("Output"), total.Output), (L.T("Cache Read"), total.CacheRead) };
            if (TokenProvider != "codex") buckets.Add((L.T("Cache Write"), total.CacheWrite));
            if (total.Other > 0) buckets.Add((L.T("Other Reported Tokens"), total.Other));
            var metrics = new WrapPanel { Orientation = Orientation.Horizontal };
            foreach (var (label, value) in buckets) { var metric = Stack(4); metric.MinWidth = 105; metric.Margin = new Thickness(0, 0, 16, 8); metric.Children.Add(Text(label, 11, true)); metric.Children.Add(Text(Count(value), 17)); metrics.Children.Add(metric); }
            body.Children.Add(metrics);
            if (tokenTrend.Partial) body.Children.Add(Note(TokenStatus()));
            body.Children.Add(Text(tokensLoading ? TokenLoading() : L.T("Updated") + " " + tokenTrend.ScannedAt.ToLocalTime().ToString("g"), 11, true));
            var daily = Stack(8);
            foreach (var day in days.Reverse()) { var row = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") }; Add(row, Text(day.Date.ToString("d"), 12, true)); Add(row, Text(day.Tokens.Total.ToString("N0") + " " + L.T("Tokens"), 12), 0, 1); daily.Children.Add(row); }
            var disclosure = new Expander { Name = "tokenplan-token-details", Header = L.T("Daily Details"), Content = daily, IsExpanded = tokenDetailsExpanded, HorizontalAlignment = HorizontalAlignment.Stretch };
            disclosure.Expanded += (_, _) => tokenDetailsExpanded = true; disclosure.Collapsed += (_, _) => tokenDetailsExpanded = false;
            body.Children.Add(disclosure);
        }
        return new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(20), Child = body };
    }
    async Task RefreshTokens(string? only, CancellationToken cancellation)
    {
        var ids = ProviderCatalog.TokenLogProviders.Where(id => preferences.IsEnabled(id) && (only == null || only == id)).ToArray();
        if (ids.Length == 0) return;
        if (ids.Contains("cursor")) tokenTrends.Remove("cursor");
        tokensLoading = true; Render();
        try
        {
            foreach (var id in ids)
            {
                cancellation.ThrowIfCancellationRequested();
                try
                {
                    var trend = Program.Fixture ? ExampleTokens(id) : id == "cursor" ? await providers.RefreshCursorTokens(DateTimeOffset.UtcNow, TimeZoneInfo.Local, cancellation) : id == "grok" ? await GrokTokenUsage.Scan(Environment.GetEnvironmentVariable("GROK_HOME") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".grok"), DateTimeOffset.UtcNow, TimeZoneInfo.Local, cancellation) : await localTokens[id].Scan(DateTimeOffset.UtcNow, TimeZoneInfo.Local, cancellation);
                    if (ready && !cancellation.IsCancellationRequested) { tokenTrends[id] = trend; Render(); }
                }
                catch (OperationCanceledException) { throw; }
                catch (Exception) { var error = id == "cursor" ? "Cursor token history could not be loaded. Try refreshing again." : "Local token logs could not be read. Try refreshing again."; tokenTrends[id] = new(Array.Empty<TokenDay>(), true, DateTimeOffset.UtcNow, error); DiagnosticLog.Write("token-history", error); }
            }
        }
        catch (OperationCanceledException) { }
        finally { tokensLoading = false; if (ready) Render(); }
    }
    static TokenTrend ExampleTokens(string provider)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        return new(Enumerable.Range(0, 30).Select(i => new TokenDay(today.AddDays(i - 29), new TokenCounts(14000 + (i * 7919) % 100000, 6000 + (i * 4751) % 50000, 26000 + (i * 10429) % 180000, CacheWrite: provider != "codex" ? 7000 + i * 379 : 0))).ToArray(), false, DateTimeOffset.UtcNow, CredentialFingerprint: provider == "cursor" ? new string('C', 64) : null);
    }
}

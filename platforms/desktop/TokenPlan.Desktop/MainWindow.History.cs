using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

/// <summary>
/// The cross-provider usage overview: a metric picker, a capsule period switcher, a donut ring with
/// the total in its center and a ranked legend beside it, then a per-day drill-down. Mirrors the
/// macOS Usage History card.
/// </summary>
public sealed partial class MainWindow
{
    DateOnly? selectedSpendDate;

    Control SpendOverview()
    {
        var body = new StretchStack { Spacing = 12 };
        body.Name = "tokenplan-usage-overview";
        if (selectedSpendDate is { } selected)
        {
            body.Children.Add(Action("Back to History", () => { selectedSpendDate = null; Render(); }));
            body.Children.Add(Label(selected.ToString("D"), D.HeaderSize, T.Ink, Avalonia.Media.FontWeight.SemiBold));
            foreach (var id in ProviderCatalog.TokenLogProviders.Where(preferences.IsEnabled).Where(id => historyProvider == "all" || historyProvider == id))
            {
                var day = tokenTrends.GetValueOrDefault(id)?.Days.FirstOrDefault(d => d.Date == selected);
                if (day == null) continue;
                var detail = new StackPanel { Spacing = 2, Margin = new Thickness(12, 9, 12, 9) };
                detail.Children.Add(Label(ProviderName(id), D.RowLabelSize, T.Ink, Avalonia.Media.FontWeight.SemiBold));
                detail.Children.Add(Label(preferences.HideValues ? "•••" : day.Tokens.Total.ToString("N0") + " " + L.T("Tokens"), D.SupportingSize));
                detail.Children.Add(CostLabel(day.Cost));
                detail.Children.Add(Label(preferences.HideValues ? "•••" : L.T("Input") + " " + Count(day.Tokens.Input) + " · " + L.T("Output") + " " + Count(day.Tokens.Output) + " · " + L.T("Cache Read") + " " + Count(day.Tokens.CacheRead), D.CaptionSize, T.Secondary));
                body.Children.Add(CardSurface(detail));
            }
            return body;
        }

        var ids = new[] { "all" }.Concat(ProviderCatalog.TokenLogProviders.Where(preferences.IsEnabled)).ToArray();
        if (!ids.Contains(historyProvider)) historyProvider = "all";

        var metric = Choice(new[] { "Cost", "Cost/MTok", "Tokens" }, preferences.SpendMetric);
        metric.Name = "spend-metric";
        metric.MinWidth = 104;
        metric.MaxWidth = 120;
        metric.HorizontalAlignment = HorizontalAlignment.Left;
        metric.SelectionChanged += (_, _) => { if (metric.SelectedIndex < 0) return; preferences = preferences with { SpendMetric = metric.SelectedIndex }; Save(); Render(); };
        body.Children.Add(metric);

        var periods = new[] { "Today", "Yesterday", "Last 30 Days" };
        var tabs = new TabStrip { Name = "spend-period", ItemsSource = periods.Select(L.T).ToArray(), SelectedIndex = preferences.SpendPeriod };
        tabs.SelectionChanged += (_, _) => { if (tabs.SelectedIndex < 0) return; preferences = preferences with { SpendPeriod = tabs.SelectedIndex }; Save(); Render(); };
        body.Children.Add(Segments(tabs));

        var today = DateOnly.FromDateTime(DateTime.Now);
        bool InPeriod(TokenDay day) => preferences.SpendPeriod == 0 ? day.Date == today : preferences.SpendPeriod == 1 ? day.Date == today.AddDays(-1) : day.Date >= today.AddDays(-29) && day.Date <= today;
        var trends = ids.Skip(1).Where(id => historyProvider == "all" || historyProvider == id).Select(id => tokenTrends.GetValueOrDefault(id)).Where(t => t != null).Cast<TokenTrend>().ToArray();
        var slices = ids.Skip(1).Where(id => historyProvider == "all" || historyProvider == id).Select(id =>
        {
            var days = tokenTrends.GetValueOrDefault(id)?.Days.Where(InPeriod).ToArray() ?? [];
            var tokens = days.Sum(d => d.Tokens.Total); var cost = days.Sum(d => d.Cost?.Dollars ?? 0);
            var unpriced = days.Any(d => d.Cost == null || d.Cost.Unpriced > 0);
            return (Id: id, Tokens: tokens, Cost: cost, Unpriced: unpriced, Priced: days.Any(d => d.Cost?.Priced > 0), Value: preferences.SpendMetric == 2 ? tokens : preferences.SpendMetric == 1 ? (tokens > 0 ? cost / tokens * 1000000 : 0) : cost);
        }).Where(s => s.Tokens > 0).OrderByDescending(s => s.Value).ToArray();

        if (slices.Length == 0)
        {
            body.Children.Add(Note("No recorded token usage was found in the local logs."));
            body.Children.Add(Label(L.T("Estimated from model token rates, not your subscription bill."), D.CaptionSize, T.Tertiary));
            return body;
        }

        var totalTokens = slices.Sum(s => s.Tokens); var totalCost = slices.Sum(s => s.Cost);
        var total = preferences.SpendMetric == 2 ? Count(totalTokens) : !slices.Any(s => s.Priced) ? "—" : "$" + (preferences.SpendMetric == 1 ? totalCost / totalTokens * 1000000 : totalCost).ToString("N2");
        var overview = new Grid { ColumnDefinitions = new("136,*"), Margin = new Thickness(4, 6, 4, 6) };

        var ring = new Grid { Width = 128, Height = 128, VerticalAlignment = VerticalAlignment.Center };
        ring.Children.Add(new SpendRing(preferences.HideValues ? [] : slices.Select(s => (s.Value, SpendColor(s.Id))).ToArray()));
        ring.Children.Add(new TextBlock { Text = preferences.HideValues ? "•••" : total, Foreground = Ink, FontSize = 16, FontWeight = Avalonia.Media.FontWeight.SemiBold, VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center });
        Add(overview, ring);
        var legend = new StackPanel { Spacing = 6, VerticalAlignment = VerticalAlignment.Center };
        foreach (var slice in slices)
        {
            var line = new Grid { ColumnDefinitions = new("*,Auto") };
            Add(line, Label(ProviderName(slice.Id), D.SupportingSize));
            var value = Label(preferences.HideValues ? "•••" : preferences.SpendMetric == 2 ? Count(slice.Tokens) : !slice.Priced ? "—" : "$" + slice.Value.ToString("N2"), D.SupportingSize, T.Ink, Avalonia.Media.FontWeight.SemiBold);
            value.HorizontalAlignment = HorizontalAlignment.Right;
            Add(line, value, 0, 1);
            legend.Children.Add(line);
        }
        Add(overview, legend, 0, 1);
        body.Children.Add(new Border { Background = T.SubtleFill, CornerRadius = new CornerRadius(T.Radius), Padding = new Thickness(8, 6), Child = overview });
        if (slices.Any(s => s.Unpriced) && preferences.SpendMetric != 2) body.Children.Add(Label(L.T("Some models could not be priced. This estimate is incomplete."), D.CaptionSize, T.Secondary));

        var days2 = trends.SelectMany(t => t.Days).Where(InPeriod).GroupBy(d => d.Date).OrderByDescending(g => g.Key);
        var dailyRows = new StretchStack { Spacing = 0 };
        var firstDay = true;
        foreach (var day in days2)
        {
            if (!firstDay) dailyRows.Children.Add(Hairline());
            firstDay = false;
            var date = day.Key;
            var button = new Button
            {
                Background = Avalonia.Media.Brushes.Transparent,
                BorderThickness = default,
                Padding = new Thickness(12, 8),
                HorizontalAlignment = HorizontalAlignment.Stretch,
                HorizontalContentAlignment = HorizontalAlignment.Stretch,
                CornerRadius = new CornerRadius(0)
            };
            var line = new Grid { ColumnDefinitions = new("*,Auto,Auto") };
            Add(line, Label(date.ToString("d"), D.SupportingSize));
            var tokens = Label(preferences.HideValues ? "•••" : Count(day.Sum(d => d.Tokens.Total)) + " " + L.T("Tokens"), D.SupportingSize, T.Secondary);
            tokens.HorizontalAlignment = HorizontalAlignment.Right;
            Add(line, tokens, 0, 1);
            var chevron = Label("›", D.SupportingSize, T.Tertiary);
            chevron.Margin = new Thickness(6, 0, 0, 0);
            Add(line, chevron, 0, 2);
            button.Content = line;
            button.Click += (_, _) => { selectedSpendDate = date; Render(); };
            dailyRows.Children.Add(button);
        }
        if (dailyRows.Children.Count > 0) body.Children.Add(CardSurface(dailyRows));

        if (trends.Any(t => t.Partial || t.ErrorKey != null)) body.Children.Add(Note("Some local token logs were skipped or could not be read. Totals may be incomplete."));
        body.Children.Add(Label(L.T("Estimated from model token rates, not your subscription bill."), D.CaptionSize, T.Tertiary));
        return body;
    }

    string SpendColor(string id) => id switch
    {
        "claude" => "#DE7356",
        "codex" => IsDark ? "#ECECF1" : "#202123",
        "cursor" => IsDark ? "#B0B0B8" : "#636366",
        "antigravity" => "#4285F4",
        "grok" => IsDark ? "#98989D" : "#8E8E93",
        "opencode" => IsDark ? "#AEAEB2" : "#6E6E73",
        "amp" => "#F34E3F",
        _ => "#6467F2"
    };

    Control CostLabel(CostTotal? cost)
    {
        var body = new StackPanel { Spacing = 2 };
        body.Children.Add(Label(L.T("Estimated API Cost") + "  " + (preferences.HideValues ? "•••" : (cost == null || cost.Priced == 0 && cost.Unpriced > 0) ? "—" : "$" + cost.Dollars.ToString("N2")), D.SupportingSize));
        if (cost?.Unpriced > 0) body.Children.Add(Label(L.T("Some models could not be priced. This estimate is incomplete."), D.CaptionSize, T.Secondary));
        return body;
    }
}

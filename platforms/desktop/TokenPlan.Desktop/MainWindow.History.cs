using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using TokenPlan.Core;
namespace TokenPlan.Desktop;
public sealed partial class MainWindow
{
    DateOnly? selectedSpendDate;
    Control SpendOverview()
    {
        var body = Stack(16); body.Name = "tokenplan-usage-overview";
        body.Children.Add(Text(L.T("Usage Overview"), 18));
        if (selectedSpendDate is { } selected)
        {
            body.Children.Add(Action("Back to History", () => { selectedSpendDate = null; Render(); }));
            body.Children.Add(Text(selected.ToString("D"), 20));
            foreach (var id in ProviderCatalog.TokenLogProviders.Where(preferences.IsEnabled).Where(id => historyProvider == "all" || historyProvider == id))
            {
                var day = tokenTrends.GetValueOrDefault(id)?.Days.FirstOrDefault(d => d.Date == selected);
                if (day == null) continue;
                body.Children.Add(Section(ProviderName(id), Text(preferences.HideValues ? "•••" : day.Tokens.Total.ToString("N0") + " " + L.T("Tokens"), 19), CostLabel(day.Cost),
                    Text(preferences.HideValues ? "•••" : L.T("Input") + " " + Count(day.Tokens.Input) + " · " + L.T("Output") + " " + Count(day.Tokens.Output) + " · " + L.T("Cache Read") + " " + Count(day.Tokens.CacheRead), 13, true)));
            }
            return body;
        }
        var ids = new[] { "all" }.Concat(ProviderCatalog.TokenLogProviders.Where(preferences.IsEnabled)).ToArray();
        if (!ids.Contains(historyProvider)) historyProvider = "all";
        var picker = new ComboBox { ItemsSource = ids.Select(id => id == "all" ? L.T("All Providers") : ProviderName(id)).ToArray(), SelectedIndex = Array.IndexOf(ids, historyProvider), MinWidth = 160 };
        picker.SelectionChanged += (_, _) => { if (picker.SelectedIndex < 0) return; historyProvider = ids[picker.SelectedIndex]; Render(); };
        body.Children.Add(picker);
        var periods = new[] { "Today", "Yesterday", "Last 30 Days" };
        var tabs = new TabStrip { Name = "spend-period", ItemsSource = periods.Select(L.T).ToArray(), SelectedIndex = preferences.SpendPeriod };
        tabs.SelectionChanged += (_, _) => { if (tabs.SelectedIndex < 0) return; preferences = preferences with { SpendPeriod = tabs.SelectedIndex }; Save(); Render(); };
        body.Children.Add(tabs);
        var metric = Choice(new[] { "Cost", "Cost/MTok", "Tokens" }, preferences.SpendMetric); metric.Name = "spend-metric";
        metric.SelectionChanged += (_, _) => { if (metric.SelectedIndex < 0) return; preferences = preferences with { SpendMetric = metric.SelectedIndex }; Save(); Render(); }; body.Children.Add(metric);
        var today = DateOnly.FromDateTime(DateTime.Now);
        bool InPeriod(TokenDay day) => preferences.SpendPeriod == 0 ? day.Date == today : preferences.SpendPeriod == 1 ? day.Date == today.AddDays(-1) : day.Date >= today.AddDays(-29) && day.Date <= today;
        var trends = ids.Skip(1).Where(id => historyProvider == "all" || historyProvider == id).Select(id => tokenTrends.GetValueOrDefault(id)).Where(t => t != null).Cast<TokenTrend>().ToArray();
        var slices = ids.Skip(1).Where(id => historyProvider == "all" || historyProvider == id).Select(id => {
            var days = tokenTrends.GetValueOrDefault(id)?.Days.Where(InPeriod).ToArray() ?? [];
            var tokens = days.Sum(d => d.Tokens.Total); var cost = days.Sum(d => d.Cost?.Dollars ?? 0);
            var unpriced = days.Any(d => d.Cost == null || d.Cost.Unpriced > 0);
            return (Id: id, Tokens: tokens, Cost: cost, Unpriced: unpriced, Priced: days.Any(d => d.Cost?.Priced > 0), Value: preferences.SpendMetric == 2 ? tokens : preferences.SpendMetric == 1 ? (tokens > 0 ? cost / tokens * 1000000 : 0) : cost);
        }).Where(s => s.Tokens > 0).OrderByDescending(s => s.Value).ToArray();
        if (slices.Length == 0) body.Children.Add(Note(L.T("No recorded token usage was found in the local logs.")));
        else
        {
            var totalTokens = slices.Sum(s => s.Tokens); var totalCost = slices.Sum(s => s.Cost);
            var total = preferences.SpendMetric == 2 ? Count(totalTokens) : !slices.Any(s => s.Priced) ? "—" : "$" + (preferences.SpendMetric == 1 ? totalCost / totalTokens * 1000000 : totalCost).ToString("N2");
            var overview = new Grid { ColumnDefinitions = new("200,*"), MinHeight = 200 };

            var ring = new Grid { Width = 190, Height = 190 };
            ring.Children.Add(new SpendRing(preferences.HideValues ? [] : slices.Select(s => (s.Value, SpendColor(s.Id))).ToArray()));
            ring.Children.Add(new TextBlock { Text = preferences.HideValues ? "•••" : total, Foreground = Ink, FontSize = 22, VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center }); Add(overview, ring);
            var legend = Stack(10); legend.VerticalAlignment = VerticalAlignment.Center;
            foreach (var slice in slices) legend.Children.Add(SettingRow(ProviderName(slice.Id), Text(preferences.HideValues ? "•••" : preferences.SpendMetric == 2 ? Count(slice.Tokens) : !slice.Priced ? "—" : "$" + slice.Value.ToString("N2"), 14)));
            Add(overview, legend, 0, 1); body.Children.Add(Section(periods[preferences.SpendPeriod], overview));
            if (slices.Any(s => s.Unpriced) && preferences.SpendMetric != 2) body.Children.Add(Text(L.T("Some models could not be priced. This estimate is incomplete."), 12, true));
            var days = trends.SelectMany(t => t.Days).Where(InPeriod).GroupBy(d => d.Date).OrderByDescending(g => g.Key);
            foreach (var day in days)
            {
                var button = Action(day.Key.ToString("d"), () => { selectedSpendDate = day.Key; Render(); });
                button.Content = day.Key.ToString("d") + "     " + (preferences.HideValues ? "•••" : Count(day.Sum(d => d.Tokens.Total)) + " " + L.T("Tokens")) + "   ›";
                button.HorizontalAlignment = HorizontalAlignment.Stretch; body.Children.Add(button);
            }
        }
        if (trends.Any(t => t.Partial || t.ErrorKey != null)) body.Children.Add(Note(L.T("Some local token logs were skipped or could not be read. Totals may be incomplete.")));
        body.Children.Add(Text(L.T("Estimated from model token rates, not your subscription bill."), 12, true));
        return body;
    }
    string SpendColor(string id) => id switch {
        "claude" => "#DE7356", "codex" => IsDark ? "#ECECF1" : "#202123",
        "cursor" => IsDark ? "#B0B0B8" : "#636366", "antigravity" => "#4285F4",
        "grok" => IsDark ? "#98989D" : "#8E8E93", "opencode" => IsDark ? "#AEAEB2" : "#6E6E73",
        "amp" => "#F34E3F", _ => "#6467F2"
    };
    Control CostLabel(CostTotal? cost)
    {
        var body = Stack(4); body.Children.Add(Text(L.T("Estimated API Cost") + "  " + (preferences.HideValues ? "•••" : (cost == null || cost.Priced == 0 && cost.Unpriced > 0) ? "—" : "$" + cost.Dollars.ToString("N2")), 15));
        if (cost?.Unpriced > 0) body.Children.Add(Text(L.T("Some models could not be priced. This estimate is incomplete."), 12, true));
        return body;
    }
}

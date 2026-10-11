using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using TokenPlan.Core;
namespace TokenPlan.Desktop;
public sealed partial class MainWindow
{
    Control MetricRow(UsageWindow metric)
    {
        var body = Stack(6);
        var row = new Grid { ColumnDefinitions = new(metric.IsBalance ? "*,Auto" : "86,*,Auto,80"), MinHeight = preferences.Compact ? 26 : 32 };
        var label = Text(L.T(metric.Label), 13); label.VerticalAlignment = VerticalAlignment.Center; label.TextWrapping = Avalonia.Media.TextWrapping.NoWrap; label.TextTrimming = Avalonia.Media.TextTrimming.CharacterEllipsis; label.Margin = new Thickness(0, 0, 6, 0); Add(row, label);
        var value = Text(preferences.HideValues ? "•••" : metric.Amount != null ? metric.FormattedAmount : (preferences.ShowRemaining ? metric.RemainingPercent : metric.UsedPercent).ToString("0.#") + "%", 13);
        value.MinWidth = 54; value.Margin = new Thickness(8, 0, 0, 0); value.TextWrapping = Avalonia.Media.TextWrapping.NoWrap;
        value.HorizontalAlignment = HorizontalAlignment.Right; value.VerticalAlignment = VerticalAlignment.Center;
        if (metric.IsBalance) Add(row, value, 0, 1);
        else
        {
            var progress = new ProgressBar { Minimum = 0, Maximum = 100, Value = preferences.HideValues ? 0 : Math.Clamp(preferences.ShowRemaining ? metric.RemainingPercent : metric.UsedPercent, 0, 100), Height = 6, MinHeight = 0, MaxHeight = 6, Background = Line, Foreground = metric.UsedPercent >= 90 ? Avalonia.Media.Brush.Parse("#DE7650") : Accent, CornerRadius = new CornerRadius(3), ClipToBounds = true, VerticalAlignment = VerticalAlignment.Center };
            Avalonia.Automation.AutomationProperties.SetName(progress, L.T(metric.Label)); Add(row, progress, 0, 1); Add(row, value, 0, 2);
            var reset = Text(preferences.HideValues ? "•••" : ResetLabel(metric.ResetsAt), 11, true); reset.HorizontalAlignment = HorizontalAlignment.Right; reset.VerticalAlignment = VerticalAlignment.Center; Add(row, reset, 0, 3);
        }
        body.Children.Add(row);
        if (metric.Expiries != null) foreach (var expiry in metric.Expiries) body.Children.Add(SettingRow("Expires", Text(expiry.ToLocalTime().ToString("g"), 12, true)));
        return body;
    }
    static string ResetLabel(DateTimeOffset? reset)
    {
        if (reset == null) return L.T("Not started");
        var remaining = reset.Value - DateTimeOffset.Now;
        if (remaining <= TimeSpan.Zero) return L.T("Resetting");
        return remaining.TotalDays >= 1 ? $"{(int)remaining.TotalDays}d {remaining.Hours}h" : remaining.TotalHours >= 1 ? $"{(int)remaining.TotalHours}h {remaining.Minutes}m" : $"{Math.Max(1, remaining.Minutes)}m";
    }
    Control ServiceSpendRows(string id)
    {
        var body = Stack(4); var today = DateOnly.FromDateTime(DateTime.Now);
        for (var period = 0; period < 3; period++)
        {
            var selected = period;
            var days = tokenTrends.GetValueOrDefault(id)?.Days.Where(d => period == 0 ? d.Date == today : period == 1 ? d.Date == today.AddDays(-1) : d.Date >= today.AddDays(-29) && d.Date <= today).ToArray() ?? [];
            var value = days.Length == 0 ? "—" : preferences.HideValues ? "•••" : (days.Any(d => d.Cost?.Priced > 0) ? "$" + days.Sum(d => d.Cost?.Dollars ?? 0).ToString("N2") : "—") + " · " + Count(days.Sum(d => d.Tokens.Total)) + " " + L.T("Tokens");
            var button = Action(new[] { "Today", "Yesterday", "Last 30 Days" }[period], () => { historyProvider = id; preferences = preferences with { SpendPeriod = selected }; selectedSpendDate = null; Save(); OpenUtility("history"); });
            button.Content = SettingRow(new[] { "Today", "Yesterday", "Last 30 Days" }[period], Text(value + "  ›", 12, true)); button.HorizontalAlignment = HorizontalAlignment.Stretch; button.HorizontalContentAlignment = HorizontalAlignment.Stretch; body.Children.Add(button);
        }
        return body;
    }
}

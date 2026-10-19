using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using TokenPlan.Core;
namespace TokenPlan.Desktop;
public sealed partial class MainWindow
{
    static string MetricTitle(string? id, string label) => (id, label) switch {
        ("opencode", "Session" or "5 Hours") => "5h",
        ("opencode" or "antigravity", "Weekly") => "1w",
        ("opencode", "Monthly") => "30d",
        ("antigravity", "Session") => "5h",
        ("antigravity", "Argon Weekly") => "Argon · 1w",
        ("antigravity", "Claude Weekly") => "Claude · 1w",
        _ => L.T(label)
    };
    Control ServiceSpendRows(string id)
    {
        var body = new StretchStack { Spacing = 0 };
        var today = DateOnly.FromDateTime(DateTime.Now);
        for (var period = 0; period < 3; period++)
        {
            if (period > 0) body.Children.Add(Hairline());
            var selected = period;
            var days = tokenTrends.GetValueOrDefault(id)?.Days.Where(d => period == 0 ? d.Date == today : period == 1 ? d.Date == today.AddDays(-1) : d.Date >= today.AddDays(-29) && d.Date <= today).ToArray() ?? [];
            var value = days.Length == 0 ? "—" : preferences.HideValues ? "•••" : (days.Any(d => d.Cost?.Priced > 0) ? "$" + days.Sum(d => d.Cost?.Dollars ?? 0).ToString("N2") : "—") + " · " + Count(days.Sum(d => d.Tokens.Total)) + " " + L.T("Tokens");
            var label = new[] { "Today", "Yesterday", "Last 30 Days" }[period];
            var button = new Button
            {
                Background = Avalonia.Media.Brushes.Transparent,
                BorderThickness = default,
                Padding = new Thickness(12, 7),
                HorizontalAlignment = HorizontalAlignment.Stretch,
                HorizontalContentAlignment = HorizontalAlignment.Stretch,
                CornerRadius = new CornerRadius(0)
            };
            var line = new Grid { ColumnDefinitions = new("*,Auto,Auto") };
            Add(line, Label(L.T(label), D.SupportingSize));
            var text = Label(value, D.CaptionSize, T.Secondary);
            text.HorizontalAlignment = HorizontalAlignment.Right;
            Add(line, text, 0, 1);
            var chevron = Label("›", D.CaptionSize, T.Tertiary);
            chevron.Margin = new Thickness(5, 0, 0, 0);
            Add(line, chevron, 0, 2);
            button.Content = line;
            button.Click += (_, _) => { historyProvider = id; preferences = preferences with { SpendPeriod = selected }; selectedSpendDate = null; Save(); OpenUtility("history"); };
            body.Children.Add(button);
        }
        return body;
    }
}

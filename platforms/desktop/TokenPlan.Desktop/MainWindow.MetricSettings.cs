using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using TokenPlan.Core;
namespace TokenPlan.Desktop;
public sealed partial class MainWindow
{
    Control MetricSettings(string id, UsageSnapshot? snapshot)
    {
        var body = Stack(8);
        var pins = preferences.PinnedMetrics.GetValueOrDefault(id) ?? snapshot?.Windows.Take(2).Select(w => w.Label).ToArray() ?? [];
        var heading = new Grid { ColumnDefinitions = new("*,Auto") };
        Add(heading, Text(L.T("Display Content"), 18));
        Add(heading, Text(L.T("System Tray") + $"  {pins.Length}/2", 12, true), 0, 1); body.Children.Add(heading);
        if (snapshot == null) { body.Children.Add(Text(L.T("No usage yet. Refresh after signing in."), 13, true)); return body; }
        var rows = Stack(6);
        Grid Row() => new() { ColumnDefinitions = new("*,150,52,64"), MinHeight = preferences.Compact ? 36 : 44 };
        var labels = Row(); Add(labels, Text(L.T("Content Item"), 12, true)); var locationLabel = Text(L.T("Display Configuration"), 12, true); locationLabel.HorizontalAlignment = HorizontalAlignment.Center; Add(labels, locationLabel, 0, 1); Add(labels, Text(L.T("System Tray"), 11, true), 0, 2); rows.Children.Add(labels);
        body.Children.Add(Text(L.T("Choose where each item appears. System Tray shows up to two values; uncheck one before choosing a replacement."), 12, true));
        var metrics = preferences.OrderedMetrics(id, snapshot.Windows);
        foreach (var metric in metrics)
        {
            var row = Row(); var label = Text(L.T(metric.Label), 13); label.VerticalAlignment = VerticalAlignment.Center; Add(row, label);
            var placement = preferences.Placement(id, metric.Label);
            var lastHome = placement == MetricPlacement.Home && metrics.Count(w => preferences.Placement(id, w.Label) == MetricPlacement.Home) == 1;
            var values = lastHome ? new[] { MetricPlacement.Home } : Enum.GetValues<MetricPlacement>();
            var status = new ComboBox { Name = "metric-status-" + metric.Label, ItemsSource = values.Select(p => L.T(p switch { MetricPlacement.Home => "Show on Home", MetricPlacement.Details => "Details Only", _ => "Hidden" })).ToArray(), SelectedIndex = Array.IndexOf(values, placement), Width = 138, MinWidth = 138, MaxWidth = 138 };
            Avalonia.Automation.AutomationProperties.SetName(status, L.T("Display Configuration") + ": " + L.T(metric.Label));
            status.SelectionChanged += (_, _) => { if (status.SelectedIndex < 0) return; preferences = preferences.PlaceMetric(id, metric.Label, values[status.SelectedIndex], metrics); Save(); Render(); };
            Add(row, status, 0, 1);
            var pin = new CheckBox { Name = "metric-pin-" + metric.Label, IsChecked = pins.Contains(metric.Label), IsEnabled = pins.Contains(metric.Label) || pins.Length < 2, HorizontalAlignment = HorizontalAlignment.Center };
            Avalonia.Automation.AutomationProperties.SetName(pin, L.T("System Tray") + ": " + L.T(metric.Label));
            pin.IsCheckedChanged += (_, _) => { preferences = (preferences with { PinnedMetrics = new(preferences.PinnedMetrics) { [id] = pins } }).Pin(id, metric.Label, pin.IsChecked == true); Save(); Render(); }; Add(row, pin, 0, 2);
            var order = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 2 };
            foreach (var delta in new[] { -1, 1 })
            {
                var move = Action(delta < 0 ? "Move Up" : "Move Down", () => { preferences = preferences.MoveMetric(id, metric.Label, delta, metrics); Save(); Render(); });
                move.Content = delta < 0 ? "↑" : "↓"; move.Padding = new Thickness(6, 4); move.MinHeight = 30;
                move.IsEnabled = delta < 0 ? metric != metrics.First() : metric != metrics.Last();
                Avalonia.Automation.AutomationProperties.SetName(move, L.T(delta < 0 ? "Move Up" : "Move Down") + ": " + L.T(metric.Label)); order.Children.Add(move);
            }
            Add(row, order, 0, 3); rows.Children.Add(row);
        }
        body.Children.Add(new Border { Child = rows, Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(12) });
        return body;
    }
    async void Confirm(string title, string message, Action confirmed)
    {
        var dialog = new Window { Title = L.T(title), Width = 440, Height = 230, CanResize = false, WindowStartupLocation = WindowStartupLocation.CenterOwner, Background = Surface, RequestedThemeVariant = ActualThemeVariant };
        var body = Stack(18); body.Margin = new Thickness(24); body.Children.Add(Text(L.T(message), 14));
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10, HorizontalAlignment = HorizontalAlignment.Right };
        buttons.Children.Add(Action("Cancel", () => dialog.Close(false))); buttons.Children.Add(Action("Restore", () => dialog.Close(true))); body.Children.Add(buttons); dialog.Content = body;
        if (await dialog.ShowDialog<bool>(this)) confirmed();
    }
}

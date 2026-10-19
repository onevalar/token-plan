using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Layout;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    /// <summary>
    /// The Display Content table: each metric's placement (Show on Home / Details Only / Hidden), its
    /// menu-bar pin and its order. Rendered as rows inside a card, matching the macOS Customize detail.
    /// </summary>
    Control MetricSettings(string id, UsageSnapshot? snapshot)
    {
        var body = new StretchStack { Spacing = 0 };
        var pins = preferences.PinnedMetrics.GetValueOrDefault(id) ?? snapshot?.Windows.Take(2).Select(w => w.Label).ToArray() ?? [];
        var heading = new Grid { ColumnDefinitions = new("*,Auto"), Margin = new Thickness(12, 10, 12, 2) };
        Add(heading, Label(L.T("Content Item"), D.CaptionSize, T.Secondary, Avalonia.Media.FontWeight.SemiBold));
        Add(heading, Label(L.T("System Tray") + $"  {pins.Length}/2", D.CaptionSize, T.Secondary), 0, 1);
        body.Children.Add(heading);
        if (snapshot == null)
        {
            var empty = Label(L.T("No usage yet. Refresh after signing in."), D.SupportingSize, T.Secondary);
            empty.Margin = new Thickness(12, 4, 12, 10);
            body.Children.Add(empty);
            return body;
        }

        var metrics = preferences.OrderedMetrics(id, snapshot.Windows);
        foreach (var metric in metrics)
        {
            var row = new Grid { ColumnDefinitions = new("*,136,32,44"), MinHeight = 24, Margin = new Thickness(12, D.ControlRowPadding - 3, 12, D.ControlRowPadding - 3) };
            var label = Label(MetricTitle(id, metric.Label), D.RowLabelSize);
            label.TextTrimming = Avalonia.Media.TextTrimming.CharacterEllipsis;
            label.TextWrapping = Avalonia.Media.TextWrapping.NoWrap;
            Add(row, label);
            var placement = preferences.Placement(id, metric.Label);
            var values = Enum.GetValues<MetricPlacement>();
            var status = Field(new ComboBox
            {
                Name = "metric-status-" + metric.Label,
                ItemsSource = values.Select(p => L.T(p switch { MetricPlacement.Home => "Show on Home", MetricPlacement.Details => "Details Only", _ => "Hidden" })).ToArray(),
                SelectedIndex = Array.IndexOf(values, placement),
                Width = 136,
                MinWidth = 136,
                MaxWidth = 136
            });
            AutomationProperties.SetName(status, L.T("Display Configuration") + ": " + MetricTitle(id, metric.Label));
            status.SelectionChanged += (_, _) => { if (status.SelectedIndex < 0) return; preferences = preferences.PlaceMetric(id, metric.Label, values[status.SelectedIndex], metrics); Save(); Render(); };
            Add(row, status, 0, 1);
            var pin = new CheckBox
            {
                Name = "metric-pin-" + metric.Label,
                IsChecked = pins.Contains(metric.Label),
                IsEnabled = pins.Contains(metric.Label) || pins.Length < 2,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            AutomationProperties.SetName(pin, L.T("System Tray") + ": " + MetricTitle(id, metric.Label));
            pin.IsCheckedChanged += (_, _) => { preferences = (preferences with { PinnedMetrics = new(preferences.PinnedMetrics) { [id] = pins } }).Pin(id, metric.Label, pin.IsChecked == true); Save(); Render(); };
            Add(row, pin, 0, 2);
            var order = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 0, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Center };
            foreach (var delta in new[] { -1, 1 })
            {
                var move = Action(delta < 0 ? "Move Up" : "Move Down", () => { preferences = preferences.MoveMetric(id, metric.Label, delta, metrics); Save(); Render(); });
                move.Content = delta < 0 ? "↑" : "↓";
                move.Padding = new Thickness(4, 2);
                move.MinHeight = 24;
                move.FontSize = D.SupportingSize;
                move.Background = Avalonia.Media.Brushes.Transparent;
                move.Foreground = T.Secondary;
                move.IsEnabled = delta < 0 ? metric != metrics.First() : metric != metrics.Last();
                AutomationProperties.SetName(move, L.T(delta < 0 ? "Move Up" : "Move Down") + ": " + MetricTitle(id, metric.Label));
                order.Children.Add(move);
            }
            Add(row, order, 0, 3);
            body.Children.Add(row);
            if (metric != metrics.Last()) body.Children.Add(new Border { Height = 0.5, Background = T.Divider, Margin = new Thickness(12, 0, 12, 0) });
        }
        return body;
    }

    async void Confirm(string title, string message, Action confirmed, string confirmLabel = "Restore")
    {
        var dialog = new Window
        {
            Title = L.T(title), Width = 380, Height = 210, CanResize = false,
            WindowStartupLocation = WindowStartupLocation.CenterOwner, Background = Canvas,
            RequestedThemeVariant = ActualThemeVariant
        };
        var body = new StackPanel { Spacing = 18, Margin = new Thickness(20) };
        body.Children.Add(Label(L.T(message), D.RowLabelSize));
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8, HorizontalAlignment = HorizontalAlignment.Right };
        buttons.Children.Add(Action("Cancel", () => dialog.Close(false)));
        buttons.Children.Add(Action(confirmLabel, () => dialog.Close(true)));
        body.Children.Add(buttons);
        dialog.Content = body;
        if (await dialog.ShowDialog<bool>(this)) confirmed();
    }
}

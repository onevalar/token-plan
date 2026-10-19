using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Presenters;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Styling;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    void ConfigureControls()
    {
        Styles.Add(new Style(x => x.OfType<Window>().Class("reduce-motion").Descendant().OfType<Control>()) { Setters = { new Setter(Avalonia.Animation.Animatable.TransitionsProperty, new Avalonia.Animation.Transitions()) } });

        // Capsule segmented switchers (Usage/Settings, Today/Yesterday/30 Days) follow macOS: a quiet
        // 5.5% track with the selected segment on a raised surface.
        Styles.Add(new Style(x => x.OfType<TabStrip>()) { Setters = {
            new Setter(TemplatedControl.BackgroundProperty, Avalonia.Media.Brushes.Transparent),
            new Setter(TemplatedControl.PaddingProperty, new Thickness(0)),
            new Setter(TemplatedControl.MinHeightProperty, 24d),
            new Setter(TemplatedControl.CornerRadiusProperty, new CornerRadius(6))
        } });
        Styles.Add(new Style(x => x.OfType<TabStripItem>()) { Setters = {
            new Setter(TemplatedControl.FontSizeProperty, 11d),
            new Setter(TemplatedControl.MinHeightProperty, 24d),
            new Setter(TemplatedControl.PaddingProperty, new Thickness(10, 3)),
            new Setter(TemplatedControl.CornerRadiusProperty, new CornerRadius(6)),
        } });
        // The theme's tab item draws a colored selection pipe; macOS segments are just pills on a
        // quiet track, so the item template is replaced by a bordered content presenter.
        Styles.Add(new Style(x => x.OfType<TabStripItem>()) { Setters = {
            new Setter(TemplatedControl.TemplateProperty, new Avalonia.Controls.Templates.FuncControlTemplate<TabStripItem>((item, _) => {
                var presenter = new ContentPresenter { VerticalAlignment = VerticalAlignment.Center };
                presenter.Bind(ContentPresenter.ContentProperty, item.GetObservable(ContentControl.ContentProperty));
                var border = new Border { Child = presenter, VerticalAlignment = VerticalAlignment.Stretch };
                border.Bind(Border.BackgroundProperty, item.GetObservable(TemplatedControl.BackgroundProperty));
                border.Bind(Border.CornerRadiusProperty, item.GetObservable(TemplatedControl.CornerRadiusProperty));
                border.Bind(Border.PaddingProperty, item.GetObservable(TemplatedControl.PaddingProperty));
                return border;
            }))
        } });
        Styles.Add(new Style(x => x.OfType<TabStripItem>().Class(":selected")) { Setters = {
            new Setter(TemplatedControl.BackgroundProperty, Tokens.For(IsDark).Elevated),
            new Setter(TemplatedControl.ForegroundProperty, Tokens.For(IsDark).Ink),
            new Setter(TemplatedControl.FontWeightProperty, Avalonia.Media.FontWeight.Medium)
        } });

        Styles.Add(new Style(x => x.OfType<ComboBox>()) { Setters = {
            new Setter(ComboBox.MinHeightProperty, 26d), new Setter(ComboBox.FontSizeProperty, 12d),
            new Setter(ComboBox.MaxWidthProperty, 180d),
            new Setter(ComboBox.HorizontalAlignmentProperty, HorizontalAlignment.Right),
            new Setter(ComboBox.VerticalContentAlignmentProperty, VerticalAlignment.Center),
            new Setter(ComboBox.CornerRadiusProperty, new CornerRadius(6)),
            new Setter(ComboBox.PaddingProperty, new Thickness(8, 3)),
        } });
        Styles.Add(new Style(x => x.OfType<TextBox>()) { Setters = {
            new Setter(TextBox.MinHeightProperty, 28d), new Setter(TextBox.FontSizeProperty, 12d),
            new Setter(TextBox.CornerRadiusProperty, new CornerRadius(6)),
            new Setter(TextBox.PaddingProperty, new Thickness(8, 6)),
        } });
        Styles.Add(new Style(x => x.OfType<CheckBox>()) { Setters = {
            new Setter(CheckBox.MinHeightProperty, 24d), new Setter(CheckBox.FontSizeProperty, 12d)
        } });
        Styles.Add(new Style(x => x.OfType<ToggleSwitch>()) { Setters = {
            new Setter(ToggleSwitch.MinHeightProperty, 24d), new Setter(ToggleSwitch.FontSizeProperty, 12d)
        } });
    }
}

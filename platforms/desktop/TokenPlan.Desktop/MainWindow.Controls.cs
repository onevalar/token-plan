using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Styling;
namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    void ConfigureControls()
    {
        Styles.Add(new Style(x => x.OfType<Window>().Class("reduce-motion").Descendant().OfType<Control>()) { Setters = { new Setter(Avalonia.Animation.Animatable.TransitionsProperty, new Avalonia.Animation.Transitions()) } });
        Styles.Add(new Style(x => x.OfType<TabStripItem>()) { Setters = {
            new Setter(TabStripItem.FontSizeProperty, 14d), new Setter(TabStripItem.MinHeightProperty, 36d),
            new Setter(TabStripItem.PaddingProperty, new Thickness(16, 8))
        } });
        Styles.Add(new Style(x => x.OfType<ComboBox>()) { Setters = {
            new Setter(ComboBox.MinHeightProperty, 36d), new Setter(ComboBox.MaxWidthProperty, 320d),
            new Setter(ComboBox.HorizontalAlignmentProperty, HorizontalAlignment.Left),
            new Setter(ComboBox.VerticalContentAlignmentProperty, VerticalAlignment.Center),
            new Setter(ComboBox.CornerRadiusProperty, new CornerRadius(7)),
            new Setter(ComboBox.PaddingProperty, new Thickness(10, 6))
        } });
        Styles.Add(new Style(x => x.OfType<TextBox>()) { Setters = {
            new Setter(TextBox.MinHeightProperty, 36d), new Setter(TextBox.CornerRadiusProperty, new CornerRadius(7)),
            new Setter(TextBox.PaddingProperty, new Thickness(10, 8))
        } });
        Styles.Add(new Style(x => x.OfType<CheckBox>()) { Setters = {
            new Setter(CheckBox.MinHeightProperty, 32d), new Setter(CheckBox.FontSizeProperty, 14d)
        } });
    }
}

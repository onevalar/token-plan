using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Media;

namespace TokenPlan.Desktop;

/// <summary>
/// Shared chrome for the popover: the dashboard header, the back/title bar sub-screens use, and the
/// small building blocks (cards, control rows, pills, chevrons) every page composes. Sizes follow the
/// macOS client: 14pt page insets, a 44pt top bar, an 8pt rounded card, and 5.5%-primary fills.
/// </summary>
public sealed partial class MainWindow
{
    const double PageInset = 14;
    const double TopBarHeight = 44;

    Tokens T => Tokens.For(IsDark);
    Density D => new(preferences.Compact);

    /// <summary>Gives a pull-down or text field the quiet card surface and hairline border.</summary>
    TControl Field<TControl>(TControl control) where TControl : TemplatedControl
    {
        control.Background = T.Field;
        control.BorderBrush = T.Separator;
        control.BorderThickness = new Thickness(0.5);
        control.Foreground = T.Ink;
        return control;
    }

    TextBlock Label(string text, double size, IBrush? foreground = null, FontWeight? weight = null) => new()
    {
        Text = text,
        FontSize = size,
        Foreground = foreground ?? T.Ink,
        FontWeight = weight ?? FontWeight.Normal,
        TextWrapping = TextWrapping.Wrap,
        VerticalAlignment = VerticalAlignment.Center
    };

    /// <summary>App mark + name, the Refresh pill and the Options menu.</summary>
    Control Header()
    {
        var row = new Grid { ColumnDefinitions = new("Auto,*,Auto"), Margin = new Thickness(0, 0, 0, D.CardGutter * 2) };
        var brand = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 6, VerticalAlignment = VerticalAlignment.Center };
        using (var stream = typeof(MainWindow).Assembly.GetManifestResourceStream("TokenPlan.AppIcon.png")!)
            brand.Children.Add(new Image { Source = new Avalonia.Media.Imaging.Bitmap(stream), Width = 20, Height = 20, VerticalAlignment = VerticalAlignment.Center });
        brand.Children.Add(Label("TokenPlan", 17, weight: FontWeight.SemiBold));
        Add(row, brand);

        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 6, VerticalAlignment = VerticalAlignment.Center };
        var refreshAll = Pill(refresh == null ? "Refresh" : "Stop", refreshGlyph: refresh == null ? "↻" : "■", action: () => { if (refresh != null) refresh.Cancel(); else _ = Refresh(); });
        refreshAll.Name = "tokenplan-refresh-all";
        actions.Children.Add(refreshAll);
        actions.Children.Add(MoreMenu());
        Add(row, actions, 0, 2);
        return row;
    }

    /// <summary>The 44pt navigation bar: a leading chevron and a centered title.</summary>
    Control TopBar(string title)
    {
        var bar = new Grid { ColumnDefinitions = new("Auto,*,Auto"), Height = TopBarHeight };
        var back = new Button
        {
            Name = "tokenplan-back",
            Content = "‹",
            Background = Brushes.Transparent,
            BorderThickness = default,
            Foreground = T.Secondary,
            FontSize = 20,
            Padding = new Thickness(6, 0),
            Width = 28,
            Height = 28,
            HorizontalContentAlignment = HorizontalAlignment.Center,
            VerticalContentAlignment = VerticalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            CornerRadius = new CornerRadius(6)
        };
        AutomationProperties.SetName(back, L.T("Back"));
        back.Click += (_, _) => Navigate(utilityOrigins.GetValueOrDefault(page, settingsOrigin));
        Add(bar, back);
        var titleText = Label(L.T(title), 13, weight: FontWeight.SemiBold);
        titleText.HorizontalAlignment = HorizontalAlignment.Center;
        titleText.TextAlignment = TextAlignment.Center;
        Add(bar, titleText, 0, 1);
        return bar;
    }

    /// <summary>Scrollable page body with the shared insets, under an optional fixed top bar.</summary>
    Control Page(string? title, Control body)
    {
        body.Margin = new Thickness(PageInset, title == null ? D.ContentTopPadding : 2, PageInset, 12);
        var root = new DockPanel();
        if (title != null)
        {
            var bar = TopBar(title);
            bar.Margin = new Thickness(PageInset - 6, 6, PageInset, 0);
            DockPanel.SetDock(bar, Dock.Top);
            root.Children.Add(bar);
        }
        var scroll = new ScrollViewer
        {
            Content = body,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalContentAlignment = HorizontalAlignment.Stretch
        };
        root.Children.Add(scroll);
        return root;
    }

    /// <summary>A rounded grouped card, as used by detail and settings screens.</summary>
    Control CardSurface(Control content) => new Border
    {
        Background = T.Group,
        BorderBrush = T.Separator,
        BorderThickness = new Thickness(0.5),
        CornerRadius = new CornerRadius(T.Radius),
        Child = content
    };

    /// <summary>Caption above a grouped card, matching the macOS settings sections.</summary>
    Control Section(string caption, Control content)
    {
        var stack = new StretchStack { Spacing = 6 };
        var label = Label(L.T(caption), D.CaptionSize, T.Secondary, FontWeight.SemiBold);
        label.Margin = new Thickness(8, 0, 0, 0);
        stack.Children.Add(label);
        stack.Children.Add(content);
        return stack;
    }

    Control StackCard(params Control[] rows)
    {
        var stack = new StretchStack { Spacing = 0 };
        for (var index = 0; index < rows.Length; index++)
        {
            if (index > 0) stack.Children.Add(Hairline());
            stack.Children.Add(rows[index]);
        }
        return CardSurface(stack);
    }

    Control Hairline() => new Border { Height = 0.5, Background = T.Divider, Margin = new Thickness(12, 0, 12, 0) };

    /// <summary>Label left, control trailing — the System Settings row shape every screen uses.</summary>
    Control ControlRow(string label, Control control)
    {
        var row = new Grid { ColumnDefinitions = new("*,Auto"), MinHeight = 24, Margin = new Thickness(12, D.ControlRowPadding, 12, D.ControlRowPadding) };
        var text = Label(L.T(label), D.RowLabelSize);
        text.Margin = new Thickness(0, 0, 10, 0);
        control.HorizontalAlignment = HorizontalAlignment.Right;
        control.VerticalAlignment = VerticalAlignment.Center;
        AutomationProperties.SetName(control, L.T(label));
        Add(row, text);
        Add(row, control, 0, 1);
        return row;
    }

    /// <summary>A 28pt-high fill button: secondary text on a 5.5%-primary background.</summary>
    Button Pill(string label, string? refreshGlyph, Action action)
    {
        var content = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 5, VerticalAlignment = VerticalAlignment.Center };
        if (refreshGlyph != null) content.Children.Add(Label(refreshGlyph, 11, T.Secondary));
        content.Children.Add(Label(L.T(label), D.SupportingSize, T.Secondary, FontWeight.Medium));
        var button = new Button
        {
            Content = content,
            Background = T.SubtleFill,
            Foreground = T.Secondary,
            BorderThickness = default,
            CornerRadius = new CornerRadius(T.Radius),
            Height = 28,
            Padding = new Thickness(9, 0),
            HorizontalContentAlignment = HorizontalAlignment.Center,
            VerticalContentAlignment = VerticalAlignment.Center
        };
        button.Click += (_, _) => action();
        return button;
    }

    /// <summary>The 26pt trailing chevron that opens a service's details.</summary>
    Button Chevron(string label, Action action)
    {
        var button = new Button
        {
            Content = "›",
            Background = Brushes.Transparent,
            BorderThickness = default,
            Foreground = T.Secondary,
            FontSize = 18,
            Width = 26,
            Height = 26,
            Padding = default,
            HorizontalContentAlignment = HorizontalAlignment.Center,
            VerticalContentAlignment = VerticalAlignment.Center,
            CornerRadius = new CornerRadius(6)
        };
        AutomationProperties.SetName(button, label);
        button.Click += (_, _) => action();
        return button;
    }

    Control Note(string message, IBrush? tint = null) => new Border
    {
        Background = T.SubtleFill,
        CornerRadius = new CornerRadius(T.Radius),
        Padding = new Thickness(10, 8),
        Child = Label(L.T(message), D.SupportingSize, tint ?? T.Secondary)
    };

    /// <summary>Wraps a TabStrip in the capsule background the macOS segmented pickers use.</summary>
    Control Segments(TabStrip tabs)
    {
        tabs.HorizontalAlignment = HorizontalAlignment.Stretch;
        tabs.MinHeight = 28;
        return new Border
        {
            Background = T.SubtleFill,
            CornerRadius = new CornerRadius(T.Radius),
            Padding = new Thickness(2),
            HorizontalAlignment = HorizontalAlignment.Left,
            Child = tabs
        };
    }
}

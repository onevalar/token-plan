using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;

namespace TokenPlan.Desktop;

/// <summary>
/// Design tokens ported from the macOS client so both clients read as one product. Values come from
/// <c>Sources/OpenUsage/Support/Theme.swift</c> (surfaces, accent, severity) and
/// <c>Sources/OpenUsage/Stores/DensitySetting.swift</c> (type sizes, row rhythm, section spacing).
/// </summary>
sealed class Tokens
{
    public static Tokens For(bool dark) => dark ? Dark : Light;
    static readonly Tokens Light = new(false);
    static readonly Tokens Dark = new(true);

    Tokens(bool dark)
    {
        IsDark = dark;
        Canvas = Solid(dark ? "#080909" : "#F4F5F6");
        Group = Solid(dark ? "#0F1010" : "#FFFFFF");
        Field = Solid(dark ? "#121314" : "#FFFFFF");
        Ink = Solid(dark ? "#E4E4E7" : "#191B20");
        Secondary = Solid(dark ? "#8C919B" : "#515661");
        Tertiary = Solid(dark ? "#6E737D" : "#7A808B");
        Separator = Solid(dark ? "#1FFFFFFF" : "#12000000");
        Divider = Solid(dark ? "#14FFFFFF" : "#0F000000");
        SubtleFill = Solid(dark ? "#0EFFFFFF" : "#0E000000");
        Track = Solid(dark ? "#1FFFFFFF" : "#1A000000");
        Accent = Solid(dark ? "#3179EC" : "#2664C7");
        Warning = Solid(dark ? "#C4A04A" : "#F0BF00");
        Danger = Solid(dark ? "#C75C55" : "#EB5757");
        Elevated = Solid(dark ? "#2A2C30" : "#FFFFFF");
    }

    static IBrush Solid(string hex) => new SolidColorBrush(Color.Parse(hex));

    public bool IsDark { get; }
    /// <summary>The popover surface behind every screen.</summary>
    public IBrush Canvas { get; }
    /// <summary>Rounded cards used by detail and settings screens.</summary>
    public IBrush Group { get; }
    public IBrush Field { get; }
    public IBrush Ink { get; }
    public IBrush Secondary { get; }
    public IBrush Tertiary { get; }
    /// <summary>The 7%-primary hairline around cards and fields.</summary>
    public IBrush Separator { get; }
    public IBrush Divider { get; }
    public IBrush SubtleFill { get; }
    public IBrush Track { get; }
    public IBrush Accent { get; }
    public IBrush Warning { get; }
    public IBrush Danger { get; }
    /// <summary>The raised segment/knob surface on a subtle track.</summary>
    public IBrush Elevated { get; }
    public double Radius => 8;
}

/// <summary>
/// Density follows the macOS setting: Default breathes, Compact steps type down one point and pulls
/// rows and sections together. The panel width never changes with density.
/// </summary>
readonly record struct Density(bool Compact)
{
    public double SupportingSize => Compact ? 11 : 12;
    public double RowLabelSize => Compact ? 12 : 13;
    public double HeaderSize => Compact ? 13 : 14;
    public double HeaderIcon => Compact ? 14 : 16;
    public double PlanSize => Compact ? 10 : 11;
    public double CaptionSize => Compact ? 10 : 11;
    public double MeterHeight => Compact ? 4 : 5;
    public double BarRowPadding => Compact ? 8 : 10;
    public double TextRowPadding => Compact ? 4 : 6;
    public double RowInnerSpacing => Compact ? 3 : 4;
    public double SectionSpacing => Compact ? 14 : 18;
    public double CardGutter => Compact ? 3 : 5;
    public double ControlRowPadding => Compact ? 6 : 9;
    public double ContentTopPadding => Compact ? 10 : 14;
}

/// <summary>
/// The 5pt capsule quota track: a hairline bar whose fill follows Used/Left and whose color follows
/// the actual remaining quota. A plain composite instead of a ProgressBar, so the track keeps the
/// exact width its row column gives it under every theme.
/// </summary>
public sealed class QuotaMeter : Border
{
    public double Value { get; }

    public QuotaMeter(double value, IBrush fill, IBrush track, double height)
    {
        Name = "quota-bar";
        Value = value;
        Height = height;
        MinHeight = height;
        MaxHeight = height;
        CornerRadius = new CornerRadius(height / 2);
        Background = track;
        ClipToBounds = true;
        var fillGrid = new Grid();
        var clamped = Math.Max(0, Math.Min(100, value));
        fillGrid.ColumnDefinitions.Add(new ColumnDefinition(clamped, GridUnitType.Star));
        fillGrid.ColumnDefinitions.Add(new ColumnDefinition(Math.Max(0.0001, 100 - clamped), GridUnitType.Star));
        var bar = new Border { Background = fill, CornerRadius = new CornerRadius(height / 2) };
        Grid.SetColumn(bar, 0);
        fillGrid.Children.Add(bar);
        Child = fillGrid;
    }
}

/// <summary>
/// A vertical stack that arranges each child across the full width it was offered, honoring that
/// child's own horizontal alignment. Avalonia's StackPanel arranges children at their desired width,
/// which made grouped cards shrink to their content instead of filling the panel like macOS cards.
/// </summary>
public sealed class StretchStack : StackPanel
{
    protected override Size ArrangeOverride(Size finalSize)
    {
        var y = 0.0;
        foreach (var child in Children)
        {
            var desired = child.DesiredSize;
            var width = child.HorizontalAlignment switch
            {
                HorizontalAlignment.Stretch => Math.Max(desired.Width, finalSize.Width),
                HorizontalAlignment.Center => desired.Width,
                HorizontalAlignment.Right => desired.Width,
                _ => desired.Width
            };
            var x = child.HorizontalAlignment switch
            {
                HorizontalAlignment.Center => Math.Max(0, (finalSize.Width - width) / 2),
                HorizontalAlignment.Right => Math.Max(0, finalSize.Width - width),
                _ => 0
            };
            child.Arrange(new Rect(x, y, width, desired.Height));
            y += desired.Height + Spacing;
        }
        return finalSize;
    }
}

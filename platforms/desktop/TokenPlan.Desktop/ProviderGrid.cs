using Avalonia;
using Avalonia.Controls;

namespace TokenPlan.Desktop;

/// Quota cards share a row at desktop widths and stack naturally in a narrow window.
sealed class ProviderGrid : Panel
{
    const double Gap = 12;
    int columns = 1;
    double[] heights = Array.Empty<double>();
    protected override Size MeasureOverride(Size availableSize)
    {
        var width = double.IsFinite(availableSize.Width) ? availableSize.Width : 740;
        columns = Math.Min(Math.Max(1, Children.Count), width >= 700 ? 3 : width >= 500 ? 2 : 1);
        var itemWidth = Math.Max(0, (width - Gap * (columns - 1)) / columns);
        heights = new double[(Children.Count + columns - 1) / columns];
        for (var i = 0; i < Children.Count; i++)
        {
            Children[i].Measure(new Size(itemWidth, double.PositiveInfinity));
            heights[i / columns] = Math.Max(heights[i / columns], Children[i].DesiredSize.Height);
        }
        return new(width, heights.Sum() + Gap * Math.Max(0, heights.Length - 1));
    }
    protected override Size ArrangeOverride(Size finalSize)
    {
        var itemWidth = Math.Max(0, (finalSize.Width - Gap * (columns - 1)) / columns);
        var y = 0d;
        for (var row = 0; row < heights.Length; row++)
        {
            for (var column = 0; column < columns && row * columns + column < Children.Count; column++)
                Children[row * columns + column].Arrange(new Rect(column * (itemWidth + Gap), y, itemWidth, heights[row]));
            y += heights[row] + Gap;
        }
        return finalSize;
    }
}

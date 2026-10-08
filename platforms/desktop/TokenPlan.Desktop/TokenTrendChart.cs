using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace TokenPlan.Desktop;

sealed class TokenTrendChart(IReadOnlyList<long> values, IBrush accent, IBrush grid, IBrush fill) : Control
{
    public override void Render(DrawingContext context)
    {
        base.Render(context);
        if (values.Count < 2 || Bounds.Width <= 16 || Bounds.Height <= 16) return;
        var max = Math.Max(1, values.Max());
        var bottom = Bounds.Height - 8;
        for (var i = 0; i < 3; i++) context.DrawLine(new Pen(grid, 1), new Point(8, 8 + (bottom - 8) * i / 2), new Point(Bounds.Width - 8, 8 + (bottom - 8) * i / 2));
        var points = values.Select((value, i) => new Point(8 + (Bounds.Width - 16) * i / (values.Count - 1), bottom - (bottom - 8) * value / max)).ToArray();
        var area = new StreamGeometry();
        using (var path = area.Open())
        {
            path.BeginFigure(new Point(points[0].X, bottom), true);
            foreach (var point in points) path.LineTo(point);
            path.LineTo(new Point(points[^1].X, bottom)); path.EndFigure(true);
        }
        context.DrawGeometry(fill, null, area);
        var line = new StreamGeometry();
        using (var path = line.Open()) { path.BeginFigure(points[0], false); foreach (var point in points.Skip(1)) path.LineTo(point); path.EndFigure(false); }
        context.DrawGeometry(null, new Pen(accent, 2), line);
        context.DrawEllipse(accent, null, points[^1], 3, 3);
    }
}

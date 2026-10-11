using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
namespace TokenPlan.Desktop;
sealed class SpendRing((double Value, string Color)[] slices) : Control
{
    public override void Render(DrawingContext context)
    {
        base.Render(context);
        var center = new Point(Bounds.Width / 2, Bounds.Height / 2); var radius = Math.Max(0, Math.Min(Bounds.Width, Bounds.Height) / 2 - 16);
        context.DrawEllipse(null, new Pen(Brush.Parse("#30808080"), 18), center, radius, radius);
        var total = slices.Sum(s => s.Value); if (total <= 0) return;
        var angle = -Math.PI / 2;
        foreach (var slice in slices.Where(s => s.Value > 0))
        {
            var sweep = slice.Value / total * 2 * Math.PI;
            var pen = new Pen(Brush.Parse(slice.Color), 18);
            if (sweep >= 2 * Math.PI - 0.001) context.DrawEllipse(null, pen, center, radius, radius);
            else
            {
                Point At(double value) => new(center.X + Math.Cos(value) * radius, center.Y + Math.Sin(value) * radius);
                var path = new StreamGeometry(); using (var builder = path.Open()) { builder.BeginFigure(At(angle), false); builder.ArcTo(At(angle + sweep), new Size(radius, radius), 0, sweep > Math.PI, SweepDirection.Clockwise); builder.EndFigure(false); }
                context.DrawGeometry(null, pen, path);
            }
            angle += sweep;
        }
    }
}

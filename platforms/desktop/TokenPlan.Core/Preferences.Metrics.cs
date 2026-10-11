namespace TokenPlan.Core;
public enum MetricPlacement { Home, Details, Hidden }
public partial record Preferences
{
    public MetricPlacement Placement(string id, string label) => (HiddenMetrics.GetValueOrDefault(id) ?? []).Contains(label) ? MetricPlacement.Hidden : (ExpandedMetrics.GetValueOrDefault(id) ?? []).Contains(label) ? MetricPlacement.Details : MetricPlacement.Home;
    public IReadOnlyList<UsageWindow> OrderedMetrics(string id, IEnumerable<UsageWindow> metrics)
    {
        var values = metrics.ToArray(); var order = MetricOrder.GetValueOrDefault(id) ?? [];
        return values.OrderBy(w => { var n = Array.IndexOf(order, w.Label); return n < 0 ? int.MaxValue : n; }).ToArray();
    }
    public Preferences PlaceMetric(string id, string label, MetricPlacement placement, IReadOnlyList<UsageWindow> metrics)
    {
        if (placement != MetricPlacement.Home && Placement(id, label) == MetricPlacement.Home && !metrics.Any(w => w.Label != label && Placement(id, w.Label) == MetricPlacement.Home)) return this;
        var hidden = (HiddenMetrics.GetValueOrDefault(id) ?? []).ToHashSet();
        var details = (ExpandedMetrics.GetValueOrDefault(id) ?? []).ToHashSet();
        hidden.Remove(label); details.Remove(label);
        if (placement == MetricPlacement.Hidden) hidden.Add(label);
        if (placement == MetricPlacement.Details) details.Add(label);
        return this with { HiddenMetrics = new(HiddenMetrics) { [id] = hidden.ToArray() }, ExpandedMetrics = new(ExpandedMetrics) { [id] = details.ToArray() } };
    }
    public Preferences MoveMetric(string id, string label, int offset, IReadOnlyList<UsageWindow> metrics)
    {
        var order = OrderedMetrics(id, metrics).Select(w => w.Label).ToList(); var index = order.IndexOf(label); var next = index + offset;
        if (index < 0 || next < 0 || next >= order.Count) return this;
        (order[index], order[next]) = (order[next], order[index]);
        return this with { MetricOrder = new(MetricOrder) { [id] = order.ToArray() } };
    }
    public Preferences RestoreMetrics(string id)
    {
        var hidden = new Dictionary<string,string[]>(HiddenMetrics); hidden.Remove(id);
        var details = new Dictionary<string,string[]>(ExpandedMetrics); details.Remove(id);
        var order = new Dictionary<string,string[]>(MetricOrder); order.Remove(id);
        var pins = new Dictionary<string,string[]>(PinnedMetrics); pins.Remove(id);
        return this with { HiddenMetrics = hidden, ExpandedMetrics = details, MetricOrder = order, PinnedMetrics = pins };
    }
}

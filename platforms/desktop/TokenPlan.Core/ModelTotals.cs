namespace TokenPlan.Core;
// Retain only per-day aggregates, never prompts or log records.
internal sealed class ModelTotals
{
    readonly Dictionary<DateOnly, Dictionary<string, TokenModel>> days = new();
    public void Add(DateOnly date, TokenEvent value)
    {
        if (!days.TryGetValue(date, out var models)) days[date] = models = new(StringComparer.Ordinal);
        var name = string.IsNullOrWhiteSpace(value.Model) ? "Unattributed" : value.Model;
        if (name.Length > 200 || models.Count >= 256 && !models.ContainsKey(name)) name = "Other";
        var prior = models.GetValueOrDefault(name) ?? new(name, TokenCounts.Zero, new());
        models[name] = new(name, prior.Tokens.Plus(value.Tokens), prior.Cost.Add(value.EstimatedCost));
    }
    public IReadOnlyList<TokenModel> Read(DateOnly date) => days.TryGetValue(date, out var models) ? models.Values.OrderByDescending(m => m.Tokens.Total).ToArray() : [];
    public void Remove(DateOnly date) => days.Remove(date);
    public void Merge(ModelTotals source, DateOnly since)
    {
        foreach (var (date, models) in source.days.Where(d => d.Key >= since))
        {
            if (!days.TryGetValue(date, out var destination)) days[date] = destination = new(StringComparer.Ordinal);
            foreach (var (rawName, value) in models)
            {
                var name = destination.Count >= 256 && !destination.ContainsKey(rawName) ? "Other" : rawName;
                var prior = destination.GetValueOrDefault(name) ?? new(name, TokenCounts.Zero, new());
                destination[name] = new(name, prior.Tokens.Plus(value.Tokens), prior.Cost.Plus(value.Cost));
            }
        }
    }
}

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    // Local-only state. Keys are credential fingerprints, never credentials.
    // Sharing the aggregate also protects newly discovered account services after restart.
    public Dictionary<string, DateTimeOffset> ExportCooldowns()
    {
        var output = cooldowns.Where(p => p.Value > DateTimeOffset.UtcNow).ToDictionary();
        foreach (var child in accountServices.Values)
            foreach (var pair in child.ExportCooldowns())
                if (pair.Value > output.GetValueOrDefault(pair.Key)) output[pair.Key] = pair.Value;
        return output;
    }

    public void RestoreCooldowns(IReadOnlyDictionary<string, DateTimeOffset> saved)
    {
        foreach (var pair in saved.Take(1024))
            if (pair.Key.Length <= 128 && pair.Value > DateTimeOffset.UtcNow && pair.Value < DateTimeOffset.UtcNow.AddDays(7))
                cooldowns[pair.Key] = pair.Value;
    }
}

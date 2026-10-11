namespace TokenPlan.Core;

/// Session-local edge detection: a refresh above the threshold is not a new alert.
public sealed class UsageAlerts
{
    readonly Dictionary<string, bool> above = new();
    public IReadOnlyList<string> Observe(ProviderResult result, int threshold)
    {
        if (result.ErrorKey != null || result.Snapshot == null || result.CredentialFingerprint == null) return Array.Empty<string>();
        var alerts = new List<string>();
        foreach (var metric in result.Snapshot.Windows.Where(w => !w.IsBalance))
        {
            var key = result.Id + ":" + result.CredentialFingerprint + ":" + metric.Label;
            var reached = metric.UsedPercent >= threshold;
            if (reached && !above.GetValueOrDefault(key)) alerts.Add(metric.Label);
            above[key] = reached;
        }
        return alerts;
    }
}

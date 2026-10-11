namespace TokenPlan.Core;
public record QuotaAlert(string Metric, string Title);
public record QuotaAlertBatch(IReadOnlyList<QuotaAlert> Alerts, Action Commit);
public sealed class QuotaAlerts
{
    record State(DateTimeOffset? Reset, int Bucket, bool UnderTen, bool Primed);
    readonly Dictionary<string, State> states = new();
    public QuotaAlertBatch Evaluate(ProviderResult result, Preferences preferences, DateTimeOffset now)
    {
        var alerts = new List<QuotaAlert>(); var updates = new Dictionary<string, State>();
        if (result.ErrorKey != null || result.Snapshot == null || result.CredentialFingerprint == null) return new(alerts, () => {});
        foreach (var metric in result.Snapshot.Windows.Where(w => !w.IsBalance))
        {
            var key = result.Id + ":" + result.CredentialFingerprint + ":" + metric.Label;
            var old = states.GetValueOrDefault(key) ?? new(null, -1, false, false);
            if (metric.ResetsAt is { } reset && (old.Reset == null || (reset - old.Reset.Value).TotalSeconds > 1)) old = old with { Bucket = -1, UnderTen = false, Reset = reset };
            var bucket = Bucket(metric, now); var under = metric.RemainingPercent < 10;
            if (!old.Primed) { updates[key] = new(metric.ResetsAt, bucket, under, true); continue; }
            var previous = old.Bucket; var wasUnder = old.UnderTen;
            if (bucket == 1 && previous < 1 && preferences.NotifyCuttingClose) { alerts.Add(new(metric.Label, "Cutting It Close")); previous = bucket; }
            if (bucket == 2 && previous < 2 && preferences.NotifyWillRunOut) { alerts.Add(new(metric.Label, "Will Run Out")); previous = bucket; }
            if (bucket >= 0 && bucket <= previous) previous = bucket;
            if (under && !wasUnder && preferences.NotifyAlmostOut) { alerts.Add(new(metric.Label, "Almost Out")); wasUnder = true; }
            if (!under) wasUnder = false;
            updates[key] = new(metric.ResetsAt ?? old.Reset, previous, wasUnder, true);
        }
        void Commit() { foreach (var (key, value) in updates) states[key] = value; }
        if (alerts.Count == 0) Commit();
        return new(alerts, Commit);
    }
    public static int Bucket(UsageWindow metric, DateTimeOffset now)
    {
        if (metric.UsedPercent >= 100) return 2;
        var duration = metric.PeriodSeconds ?? (metric.Label is "Session" or "5h" ? 18000 : metric.Label is "Weekly" or "1w" ? 604800 : (double?)null);
        if (duration is not > 0 || metric.ResetsAt is not { } reset || reset <= now || metric.UsedPercent <= 0) return -1;
        var elapsed = duration.Value - (reset - now).TotalSeconds;
        if (elapsed < Math.Max(60, duration.Value * 0.01)) return -1;
        var projected = metric.UsedPercent / elapsed * duration.Value;
        if (projected <= 90) return 0;
        if (metric.UsedPercent < 5) return -1;
        return projected <= 99.5 ? 1 : 2;
    }
}

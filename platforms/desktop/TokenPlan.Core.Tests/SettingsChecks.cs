using TokenPlan.Core;
static class SettingsChecks
{
    public static void Run(DateTimeOffset now, Action<bool,string> check)
    {
        UsageWindow[] metrics = [new("Session",20,now.AddHours(2.5)),new("Weekly",30,null),new("Sonnet",10,null)];
        var p = new Preferences { ProviderNotes = new() { ["claude"] = "keep" } };
        p = p.PlaceMetric("claude","Weekly",MetricPlacement.Details,metrics).PlaceMetric("claude","Sonnet",MetricPlacement.Hidden,metrics);
        check(p.Placement("claude","Weekly") == MetricPlacement.Details && p.Placement("claude","Sonnet") == MetricPlacement.Hidden,"Detail-only and hidden are distinct placements");
        check(p.PlaceMetric("claude","Session",MetricPlacement.Hidden,metrics).Placement("claude","Session") == MetricPlacement.Hidden,"Can hide the last home metric without removing the account");
        p = p.MoveMetric("claude","Weekly",-1,metrics).Pin("claude","Session",true);
        check(p.OrderedMetrics("claude",metrics)[0].Label == "Weekly","Metric order is applied to displayed rows");
        p = p.RestoreMetrics("claude");
        check(p.Placement("claude","Weekly") == MetricPlacement.Home && p.PinnedMetrics.Count == 0 && p.ProviderNotes["claude"] == "keep","Restore display defaults keeps notes");
        var alerts = new QuotaAlerts(); p = new() { NotifyAlmostOut = true, NotifyCuttingClose = true, NotifyWillRunOut = true };
        ProviderResult Reading(double used, string account = "one", DateTimeOffset? reset = null) => new("claude","Claude",new("claude","Claude",null,[new("Session",used,reset ?? now.AddHours(2.5),PeriodSeconds:18000)],now),null,account);
        check(alerts.Evaluate(Reading(20),p,now).Alerts.Count == 0,"First observation only primes notification state");
        var close = alerts.Evaluate(Reading(47),p,now);
        check(close.Alerts.Single().Title == "Cutting It Close","Pace alert matches Mac close threshold");
        check(alerts.Evaluate(Reading(47),p,now).Alerts.Count == 1,"Failed notification remains eligible for retry"); close.Commit();
        check(alerts.Evaluate(Reading(47),p,now).Alerts.Count == 0,"Successful notification does not repeat");
        var outSoon = alerts.Evaluate(Reading(60),p,now); check(outSoon.Alerts.Single().Title == "Will Run Out","Pace escalation generates separate alert"); outSoon.Commit();
        var almost = alerts.Evaluate(Reading(91),p,now); check(almost.Alerts.Single().Title == "Almost Out","Below ten percent remaining alerts independently"); almost.Commit();
        check(alerts.Evaluate(Reading(95,"other"),p,now).Alerts.Count == 0,"New account establishes its own baseline");
        check(alerts.Evaluate(Reading(99) with { ErrorKey = "stale" },p,now).Alerts.Count == 0,"Stale data never notifies");
        alerts.Evaluate(Reading(20),p,now);
        check(alerts.Evaluate(Reading(91),p,now).Alerts.Count == 2,"Recovered quota rearms both threshold and pace alerts");
    }
}

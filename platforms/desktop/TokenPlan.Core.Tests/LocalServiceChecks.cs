using Microsoft.Data.Sqlite;
using TokenPlan.Core;

static class LocalServiceChecks
{
    public static void Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var directory = Path.Combine(root, "local-services"); Directory.CreateDirectory(directory);
        Directory.CreateDirectory(Path.Combine(directory, "github-copilot"));
        var apps = Path.Combine(directory, "github-copilot", "apps.json");
        File.WriteAllText(apps, """{"enterprise.example":{"oauth_token":"private-enterprise"},"github.com:editor":{"oauth_token":"public-host"}}""");
        check(LocalServiceAuth.Copilot(directory) == "public-host", "Copilot never sends an enterprise token to github.com");
        File.WriteAllText(apps, """{"enterprise.example":{"oauth_token":"private-enterprise"}}""");
        check(LocalServiceAuth.Copilot(directory) == null, "Enterprise-only Copilot config is not a public host login");
        File.WriteAllText(Path.Combine(directory, "auth.json"), """{"opencode-go":{"key":"legacy-key"}}""");
        check(LocalServiceAuth.OpenCode(directory) == "legacy-key", "OpenCode legacy credential is detected");
        using (var db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(directory, "opencode.db"), Pooling = false }.ToString()))
        {
            db.Open(); using var command = db.CreateCommand();
            command.CommandText = "CREATE TABLE credential(id TEXT, integration_id TEXT, active INTEGER, time_updated INTEGER, value TEXT)"; command.ExecuteNonQuery();
            check(LocalServiceAuth.OpenCode(directory) == null, "OpenCode database logout cannot resurrect the stale legacy credential");
            command.CommandText = "INSERT INTO credential VALUES('1','opencode-go',1,1,'{\"key\":\"database-key\"}')"; command.ExecuteNonQuery();
            check(LocalServiceAuth.OpenCode(directory) == "database-key", "OpenCode reads active database credentials");
        }
        var opencode = LocalServiceUsage.Parse("opencode", """{"usage":{"rolling":{"percent":0,"resetsAt":"2026-10-07T05:00:00Z"},"weekly":{"percent":40,"resetsAt":"2026-10-09T00:00:00Z"},"monthly":{"percent":60,"resetsAt":"2026-11-01T00:00:00Z"}}}""", now);
        var limited = LocalServiceUsage.Parse("opencode", """{"usage":{"rolling":{"status":"rate-limited","percent":0,"resetsAt":"2026-10-07T05:00:00Z"},"weekly":{"status":"ok","percent":40,"resetsAt":"2026-10-09T00:00:00Z"},"monthly":{"status":"rate-limited","percent":62,"resetsAt":"2026-11-01T00:00:00Z"}}}""", now);
        check(limited.Windows[0].UsedPercent == 100 && limited.Windows[0].ResetsAt != null && limited.Windows[1].UsedPercent == 40 && limited.Windows[2].UsedPercent == 100, "Rate-limited OpenCode windows remain exhausted with real reset time");
        check(opencode.Windows.Count == 3 && opencode.Windows[0].ResetsAt == null && opencode.Windows[1].UsedPercent == 40, "OpenCode drops only the untouched session placeholder reset");
        var copilot = LocalServiceUsage.Parse("copilot", """{"copilot_plan":"pro","quota_snapshots":{"premium_interactions":{"entitlement":100,"remaining":65},"chat":{"unlimited":true,"remaining":-1}}}""", now);
        check(copilot.Windows.Count == 1 && copilot.Windows[0].UsedPercent == 35, "Copilot suppresses unlimited buckets");
        var devin = LocalServiceUsage.Parse("devin", """{"userStatus":{"planStatus":{"planInfo":{"hideDailyQuota":true},"weeklyQuotaResetAtUnix":1791331800}}}""", now);
        check(devin.Windows.Single().UsedPercent == 100, "Devin omitted proto zero means exhausted only with a weekly reset");
        var grok = LocalServiceUsage.Parse("grok", """{"config":{"currentPeriod":{"type":"USAGE_PERIOD_TYPE_WEEKLY","start":"2026-10-01T00:00:00Z","end":"2026-10-08T00:00:00Z"}}}""", now);
        check(grok.Windows.Single().UsedPercent == 0, "Grok omitted protobuf percent is zero with a valid period");
        foreach (var id in new[] { "opencode", "copilot", "devin", "grok" })
        {
            try { LocalServiceUsage.Parse(id, "{}", now); throw new Exception("Missing usage accepted"); }
            catch (InvalidDataException) { check(true, id + " missing data is not fabricated zero usage"); }
        }
    }
}

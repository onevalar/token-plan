using System.Text.Json;
using TokenPlan.Core;

static class HistoryChecks
{
    public static void Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var firstAccount = new string('A', 64); var secondAccount = new string('B', 64);
        ProviderResult Reading(DateTimeOffset at, double used = 37, string? account = null) => new("codex", "Codex", new("codex", "Codex", "Private plan must not be stored", new[] { new UsageWindow("Session", used, at.AddHours(2)) }, at), null, account ?? firstAccount);
        var current = new Dictionary<string, ProviderResult> { ["codex"] = Reading(now) };
        var preferences = new Preferences();
        var file = Path.Combine(root, "history", "quota-history.json");
        var history = UsageHistory.Load(file, now);
        IReadOnlyList<HistoryReading> Read(DateTimeOffset? since = null) => history.Read(current, preferences, since ?? now.AddDays(-30), now);
        check(Read().Count == 0, "First launch has no invented quota history");
        history.Observe(Reading(now.AddDays(-31).AddSeconds(-1)), now);
        check(Read(now.AddDays(-100)).Count == 0, "Retention discards expired observations");
        history.Observe(Reading(now.AddDays(-9)), now);
        history.Observe(Reading(now.AddDays(-1)), now);
        history.Observe(Reading(now), now);
        check(Read().Count == 3 && Read(now.AddDays(-7)).Count == 2, "Seven/thirty-day filters use the observation time");
        history.Observe(Reading(now.AddMinutes(-1), 99), now);
        history.Observe(Reading(now, 103), now);
        history.Observe(Reading(now, 103), now);
        // now is an exact UTC hour, so -1 minute belongs to the previous hourly bucket.
        check(Read().Count == 4 && Read()[0].Windows.Single().UsedPercent == 103, "Hourly replacement is idempotent and retains real over-limit values");
        history.Observe(Reading(now.AddMinutes(-30), 44), now);
        check(Read().Count == 4 && Read()[1].Windows.Single().UsedPercent == 99, "An older response cannot overwrite the latest hourly reading");
        check(Read()[0].Windows.Single().ResetsAt == now.AddHours(2), "Observed reset times remain associated with their original reading");
        var failure = Reading(now) with { ErrorKey = "Cannot reach the provider. Check your connection.", Snapshot = null };
        history.Observe(failure, now);
        current["codex"] = failure;
        check(Read().Count == 4, "Same-login temporary failures retain history without generating another observation");
        history.Save(file);
        var contents = File.ReadAllText(file);
        check(!contents.Contains("Private plan") && !contents.Contains("access_token") && !contents.Contains("refresh_token"), "Only quota observations and an opaque scope hash are persisted");
        check(Directory.GetFiles(Path.GetDirectoryName(file)!, "*.tmp").Length == 0, "Atomic history writes clean up temporary files");
        if (!OperatingSystem.IsWindows()) check(File.GetUnixFileMode(file) == (UnixFileMode.UserRead | UnixFileMode.UserWrite), "New local history is private to its owner");
        history = UsageHistory.Load(file, now);
        check(Read().Count == 4, "Local history survives restart for the matching login");
        current.Clear();
        check(Read().Count == 0, "Disk history stays hidden until this session validates a matching login");
        current["codex"] = Reading(now, account: secondAccount);
        check(Read().Count == 0, "A different account cannot see a previous account's cached history");
        history.Observe(current["codex"], now);
        check(Read().Count == 1, "Account changes discard old observations before accepting new data");
        preferences = preferences.WithEnabled("codex", false);
        check(Read().Count == 0 && !preferences.IsEnabled("codex") && preferences.IsEnabled("claude"), "Disabled providers are excluded without disabling other providers");
        preferences = preferences.WithEnabled("codex", true);
        history.Observe(current["codex"] with { Snapshot = null, ErrorKey = "Sign in again", CredentialFingerprint = null }, now);
        check(Read().Count == 0, "A missing/malformed login discards that provider's history");
        history.Save(file);
        check(!File.ReadAllText(file).Contains(secondAccount), "Logout removes the old scope hash from the persisted file");

        var defaultsFile = Path.Combine(root, "legacy-preferences.json");
        File.WriteAllText(defaultsFile, """{"Appearance":"dark","Language":"en","AutoRefresh":false}""");
        var legacy = Preferences.Load(defaultsFile);
        check(legacy.ClaudeEnabled && legacy.CodexEnabled && legacy.CursorEnabled && legacy.HistoryDays == 7, "Existing preferences retain all providers and a seven-day history default");
        var changed = legacy.WithEnabled("cursor", false) with { HistoryDays = 30, TokenDays = 30 };
        changed.Save(defaultsFile);
        check(JsonSerializer.Serialize(Preferences.Load(defaultsFile)) == JsonSerializer.Serialize(changed), "Provider enablement and history range survive restart");
        File.WriteAllText(defaultsFile, """{"HistoryDays":500}""");
        try { Preferences.Load(defaultsFile); throw new Exception("Invalid history range accepted"); } catch (InvalidDataException) { check(true, "Unsupported history ranges are rejected"); }

        foreach (var malformed in new[] { "null", "[]", "{", "{\"Version\":2,\"Accounts\":{},\"Readings\":[]}", "{\"Version\":1,\"Accounts\":null,\"Readings\":[]}", "{\"Version\":1,\"Accounts\":{},\"Readings\":null}" })
        {
            File.WriteAllText(file, malformed);
            try { UsageHistory.Load(file, now); throw new Exception("Malformed history accepted"); }
            catch (Exception e) when (e is JsonException or InvalidDataException) { check(true, "Malformed history fails explicitly"); }
        }
        var valid = new HistoryDocument(1, new() { ["codex"] = firstAccount }, new() { new("codex", now, new[] { new UsageWindow("Session", 12, null) }) });
        var invalid = new[] {
            valid with { Accounts = new() { ["codex"] = "not-a-hash" } },
            valid with { Readings = new() { new("unexpected", now, new[] { new UsageWindow("Session", 12, null) }) } },
            valid with { Readings = new() { new("codex", now.AddDays(1), new[] { new UsageWindow("Session", 12, null) }) } },
            valid with { Readings = new() { new("codex", now, new[] { new UsageWindow("Session", -1, null) }) } },
            valid with { Readings = new() { new("codex", now, new[] { new UsageWindow("Injected metric", 12, null) }) } },
            valid with { Readings = new() { new("codex", default, new[] { new UsageWindow("Session", 12, null) }) } },
            valid with { Readings = new() { valid.Readings[0], valid.Readings[0] } },
            valid with { Readings = new() { new("codex", now, new[] { new UsageWindow("Session", 12, null), new UsageWindow("Session", 14, null) }) } }
        };
        foreach (var value in invalid)
        {
            File.WriteAllText(file, JsonSerializer.Serialize(value));
            try { UsageHistory.Load(file, now); throw new Exception("Invalid history accepted"); }
            catch (InvalidDataException) { check(true, "Invalid history observations are rejected at the file boundary"); }
        }
        File.WriteAllText(file, new string(' ', 2 * 1024 * 1024 + 1));
        try { UsageHistory.Load(file, now); throw new Exception("Oversized history accepted"); }
        catch (InvalidDataException) { check(true, "History loading has a hard byte limit"); }
        var many = new UsageHistory();
        for (var hour = 32 * 24; hour >= 0; hour--)
            foreach (var id in new[] { "claude", "codex", "cursor" })
                many.Observe(Reading(now.AddHours(-hour)) with { Id = id }, now);
        var manyCurrent = new[] { "claude", "codex", "cursor" }.ToDictionary(id => id, id => Reading(now) with { Id = id });
        var retained = many.Read(manyCurrent, new(), now.AddDays(-100), now);
        check(retained.Count <= 2400 && retained.Min(r => r.FetchedAt) >= now.AddDays(-31), "Retention remains bounded across all three providers");
    }
}

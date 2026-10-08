using System.Text;
using System.Text.Json;
using TokenPlan.Core;

static class ClaudeTokenChecks
{
    static string Line(string message = "msg", string request = "req", bool sidechain = false, int output = 20, string at = "2026-10-06T12:00:00Z") => JsonSerializer.Serialize(new {
        type = "assistant", timestamp = at, requestId = request, isSidechain = sidechain,
        message = new { id = message, model = "claude-test-model", content = "private conversation sentinel", usage = new {
            input_tokens = 100, output_tokens = output, cache_read_input_tokens = 60, cache_creation_input_tokens = 15
        }}
    });
    static IReadOnlyList<ClaudeTokenEntry> Parse(string value) => new ClaudeTokenParser().Parse(Encoding.UTF8.GetBytes(value));
    public static async Task Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var entry = Parse(Line()).Single();
        check(entry.Event.Tokens == new TokenCounts(100, 20, 60, CacheWrite: 15) && entry.Event.Tokens.Total == 195, "Claude cache reads and writes are separate additive buckets");
        check(entry.MessageHash?.Length == 64 && entry.RequestHash?.Length == 64 && !entry.ToString().Contains("private conversation"), "Claude retains only counters and opaque message/request hashes");
        var split = Parse(Line().Replace("\"cache_creation_input_tokens\":15", "\"cache_creation_input_tokens\":999,\"cache_creation\":{\"ephemeral_5m_input_tokens\":10,\"ephemeral_1h_input_tokens\":5}"));
        check(split.Single().Event.Tokens.CacheWrite == 15, "Structured Claude cache writes take precedence over the legacy aggregate");
        var dedup = ClaudeTokenParser.Deduplicate(Parse(Line(output: 10)).Concat(Parse(Line())).Concat(Parse(Line(request: "replay", sidechain: true, output: 999))));
        check(dedup.Count == 1 && dedup[0].Event.Tokens.Total == 195, "Streaming updates keep the final larger usage, and sidechain parent replays do not inflate it");
        var parentWins = ClaudeTokenParser.Deduplicate(Parse(Line(request: "replay", sidechain: true, output: 999)).Concat(Parse(Line())));
        check(parentWins.Single().Event.Tokens.Total == 195, "A later parent record replaces a larger replayed sidechain record");
        check(ClaudeTokenParser.Deduplicate(Parse(Line()).Concat(Parse(Line(request: "another-live-request")))).Count == 2, "Distinct live request IDs are retained for a shared message ID");
        var advisor = Parse(Line().Replace("\"cache_creation_input_tokens\":15", "\"cache_creation_input_tokens\":15,\"iterations\":[{\"type\":\"message\",\"input_tokens\":999,\"output_tokens\":999},{\"type\":\"advisor_message\",\"model\":\"advisor\",\"input_tokens\":7,\"output_tokens\":3}]"));
        check(advisor.Count == 2 && advisor.Sum(e => e.Event.Tokens.Total) == 205, "Advisor work is counted separately while ordinary iterations already in parent usage are excluded");
        foreach (var bad in new[] { Line().Replace("\"input_tokens\":100", "\"input_tokens\":-1"), Line().Replace("\"output_tokens\":20", "\"output_tokens\":null"), Line(at: "not a date"), "{\"usage\":" })
        {
            var parser = new ClaudeTokenParser();
            check(parser.Parse(Encoding.UTF8.GetBytes(bad)).Count == 0 && parser.HadInvalidRecords, "Malformed Claude usage stays unavailable and flags incomplete coverage");
        }
        var home = Path.Combine(root, "claude-token-home");
        var projects = Path.Combine(home, "projects", "local-project"); Directory.CreateDirectory(projects);
        var file = Path.Combine(projects, "session.jsonl");
        await File.WriteAllTextAsync(file, Line() + "\n" + Line(sidechain: true, request: "replay", output: 999) + "\n");
        var original = await File.ReadAllBytesAsync(file);
        var credential = Path.Combine(home, ".credentials.json"); await File.WriteAllTextAsync(credential, "credential sentinel");
        var scan = new LocalTokenUsage("", claudeHomes: new[] { home, Path.Combine(home, "projects") });
        var trend = await scan.Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(!trend.Partial && trend.Days.Single().Tokens.Total == 195, "Claude discovers project logs and deduplicates overlapping configured homes");
        check((await scan.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 195, "Repeated Claude scans are idempotent");
        check((await File.ReadAllBytesAsync(file)).SequenceEqual(original) && await File.ReadAllTextAsync(credential) == "credential sentinel", "Claude scanning leaves both conversations and credentials byte-for-byte unchanged");
        var otherHome = Path.Combine(root, "another-claude-home"); Directory.CreateDirectory(Path.Combine(otherHome, "projects"));
        await File.WriteAllTextAsync(Path.Combine(otherHome, "projects", "copy.jsonl"), Line() + "\n");
        check((await new LocalTokenUsage("", claudeHomes: new[] { home, otherHome }).Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 195, "Copied Claude messages deduplicate across separate config roots");
        await File.AppendAllTextAsync(file, Line(message: "next", request: "next"));
        check((await scan.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 195, "An incomplete Claude JSONL tail waits for a newline");
        await File.AppendAllTextAsync(file, "\n");
        check((await scan.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 390, "Claude scans resume after complete-line boundaries without recounting earlier turns");
        await File.WriteAllTextAsync(file, Line(at: "2026-10-06T18:00:00Z") + "\n");
        var zone = TimeZoneInfo.CreateCustomTimeZone("Claude-test-UTC+8", TimeSpan.FromHours(8), "UTC+8", "UTC+8");
        check((await scan.Scan(now, zone, CancellationToken.None)).Days.Single().Date == new DateOnly(2026, 10, 7), "Claude daily totals follow the device calendar and reset after log replacement");
        await File.WriteAllTextAsync(file, string.Join("\n", Enumerable.Range(0, 10).Select(i => Line(message: "msg" + i, request: "req" + i))) + "\n");
        var bounded = new LocalTokenUsage("", byteBudget: 512, claudeHomes: new[] { home });
        var pending = await bounded.Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(pending.Partial && pending.ScanningPending, "Claude scans preserve explicit incomplete state under work limits");
        for (var pass = 0; pass < 20 && pending.ScanningPending; pass++) pending = await bounded.Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(!pending.Partial && pending.Days.Single().Tokens.Total == 1950, "Bounded Claude scans resume and converge to exact totals");
        await File.AppendAllTextAsync(file, Line().Replace("\"input_tokens\":100", "\"input_tokens\":-1") + "\n");
        check((await bounded.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Partial, "Skipped malformed Claude counters produce a visible coverage warning");
        using var cancelled = new CancellationTokenSource(); cancelled.Cancel();
        try { await bounded.Scan(now, TimeZoneInfo.Utc, cancelled.Token); throw new Exception("Ignored cancellation"); }
        catch (OperationCanceledException) { check(true, "Claude local scanning supports Stop"); }
        var preferences = Path.Combine(root, "claude-token-preferences.json");
        (new Preferences(TokenProvider: "claude", TokenDays: 30)).Save(preferences);
        check(Preferences.Load(preferences).TokenProvider == "claude" && Preferences.Load(preferences).TokenDays == 30, "Token source and date range survive restart");
        check(!Preferences.Load(preferences).KeepRunningWhenClosed, "Existing and new settings close normally until background mode is explicitly enabled");
        (Preferences.Load(preferences) with { KeepRunningWhenClosed = true }).Save(preferences);
        check(Preferences.Load(preferences).KeepRunningWhenClosed, "The explicit background-mode preference survives restart");
    }
}

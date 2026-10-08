using System.Text;
using TokenPlan.Core;

static class TokenChecks
{
    static string Event(string at, long input, long cached, long output, string? last = null) => "{\"timestamp\":\"" + at + "\",\"type\":\"event_msg\",\"payload\":{\"type\":\"token_count\",\"info\":{\"total_token_usage\":{\"input_tokens\":" + input + ",\"cached_input_tokens\":" + cached + ",\"output_tokens\":" + output + ",\"total_tokens\":" + (input + output) + "}" + (last == null ? "" : ",\"last_token_usage\":" + last) + "}}}";
    static TokenEvent? Parse(CodexTokenParser parser, string line) => parser.Parse(Encoding.UTF8.GetBytes(line));
    public static async Task Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var parser = new CodexTokenParser();
        var first = Parse(parser, Event("2026-10-06T12:00:00Z", 100, 60, 20));
        check(first?.Tokens == new TokenCounts(40, 20, 60) && first.Tokens.Total == 120, "Cached input is a disjoint bucket, never added twice");
        check(Parse(parser, Event("2026-10-06T12:01:00Z", 100, 60, 20)) == null, "Repeated cumulative usage does not represent another turn");
        var delta = Parse(parser, Event("2026-10-06T12:02:00Z", 150, 80, 30));
        check(delta?.Tokens == new TokenCounts(30, 10, 20), "Cumulative-only logs become per-turn deltas");
        var last = Parse(parser, Event("2026-10-06T12:03:00Z", 300, 90, 50, """{"input_tokens":30,"cached_input_tokens":10,"output_tokens":5,"total_tokens":35}"""));
        check(last?.Tokens.Total == 35, "The reported last-turn usage takes precedence over a cumulative delta");
        check(Parse(parser, Event("2026-10-06T12:04:00Z", 300, 90, 50, """{"input_tokens":30,"output_tokens":5}""")) == null, "A repeated cumulative snapshot does not recount last-turn usage");
        var aliases = Parse(new(), """{"timestamp":"2026-10-06T12:00:00Z","type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"prompt_tokens":100,"cache_read_input_tokens":40,"completion_tokens":20,"reasoning_output_tokens":10,"total_tokens":120}}}}""");
        check(aliases?.Tokens == new TokenCounts(60, 20, 40), "Older field spellings work; reasoning already included in output is not added twice");
        var other = Parse(new(), """{"timestamp":"2026-10-06T12:00:00Z","type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":100,"output_tokens":20,"total_tokens":130}}}}""");
        check(other?.Tokens.Other == 10 && other.Tokens.Total == 130, "Extra explicitly reported tokens remain visible without inventing an input/output split");
        foreach (var malformed in new[] {
            "{\"type\":\"token_count\"", Event("not-a-date", 1, 0, 0),
            """{"timestamp":"2026-10-06T12:00:00Z","type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":-1}}}}""",
            """{"timestamp":"2026-10-06T12:00:00Z","type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":"100"}}}}""",
            """{"timestamp":"2026-10-06T12:00:00Z","type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":100,"total_tokens":3}}}}"""
        })
        {
            var invalid = new CodexTokenParser();
            check(Parse(invalid, malformed) == null && invalid.HadInvalidRecords, "Malformed counters are excluded and flagged, never converted to healthy zeros");
        }
        foreach (var childMetadata in new[] { "\"forked_from_id\":\"parent\"", "\"parent_thread_id\":\"parent\"", "\"source\":{\"subagent\":{\"parent_thread_id\":\"parent\"}}", "\"thread_source\":\"subagent\"" })
        {
            var child = new CodexTokenParser();
            Parse(child, "{\"type\":\"session_meta\",\"timestamp\":\"2026-10-06T12:00:00Z\",\"payload\":{\"id\":\"child\"," + childMetadata + "}}");
            check(Parse(child, Event("2026-10-06T11:00:00Z", 100, 40, 20)) == null, "Child sessions skip replayed parent counters");
            Parse(child, """{"type":"event_msg","timestamp":"2026-10-06T11:00:00Z","payload":{"type":"task_started","started_at":1791284400}}""");
            check(Parse(child, Event("2026-10-06T11:01:00Z", 120, 45, 25)) == null, "Replayed parent task starts cannot open the child gate");
            Parse(child, "{\"type\":\"event_msg\",\"timestamp\":\"2026-10-06T12:00:00Z\",\"payload\":{\"type\":\"task_started\",\"started_at\":" + DateTimeOffset.Parse("2026-10-06T12:00:00Z").ToUnixTimeSeconds() + "}}");
            check(Parse(child, Event("2026-10-06T12:01:00Z", 140, 50, 30))?.Tokens.Total == 25, "The child's own live turn uses the replayed totals as its baseline");
        }
        var parent = new CodexTokenParser();
        Parse(parent, """{"type":"session_meta","payload":{"id":"parent","forked_from_id":null}}""");
        check(Parse(parent, Event("2026-10-06T12:00:00Z", 10, 0, 2))?.Tokens.Total == 12, "A null fork marker never classifies a root session as a child");
        var logs = Path.Combine(root, "token-logs"); var sessions = Path.Combine(logs, "sessions");
        Directory.CreateDirectory(sessions);
        var file = Path.Combine(sessions, "rollout.jsonl");
        var meta = """{"type":"session_meta","payload":{"id":"unique-session"}}""" + "\n";
        var content = meta + Event("2026-10-06T12:00:00Z", 100, 60, 20) + "\n" + Event("2026-10-06T12:01:00Z", 150, 80, 30) + "\n";
        await File.WriteAllTextAsync(file, content);
        await File.WriteAllTextAsync(Path.Combine(logs, "auth.json"), "private credentials sentinel: must never be read or changed");
        var scanner = new LocalTokenUsage(logs);
        var trend = await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(!trend.Partial && trend.Days.Single().Tokens.Total == 180, "Complete local rollouts aggregate actual token deltas by day");
        var original = await File.ReadAllBytesAsync(file);
        check((await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 180, "Rescanning an unchanged file is idempotent");
        check((await File.ReadAllBytesAsync(file)).SequenceEqual(original), "Log scanning never changes the rollout");
        await File.AppendAllTextAsync(file, Event("2026-10-06T12:02:00Z", 200, 100, 40));
        check((await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 180, "A partial JSONL tail waits for its terminating newline");
        await File.AppendAllTextAsync(file, "\n");
        check((await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 240, "Appending a complete line resumes from the previous parser baseline");
        var archived = Path.Combine(logs, "archived_sessions"); Directory.CreateDirectory(archived);
        File.Copy(file, Path.Combine(archived, "rollout.jsonl"));
        File.Copy(file, Path.Combine(archived, "renamed-copy.jsonl"));
        check((await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 240, "Archived copies are deduplicated both by relative path and session identity");
        await File.WriteAllTextAsync(file, meta + Event("2026-10-06T12:00:00Z", 7, 3, 2) + "\n");
        check((await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 9, "Truncation/replacement resets the parser instead of preserving obsolete counters");
        check(await File.ReadAllTextAsync(Path.Combine(logs, "auth.json")) == "private credentials sentinel: must never be read or changed", "Token history has no dependency on login data and leaves credentials untouched");
        Directory.Delete(archived, true);
        await File.WriteAllTextAsync(file, meta + Event("2026-10-06T18:00:00Z", 40, 10, 8) + "\n");
        var zone = TimeZoneInfo.CreateCustomTimeZone("TokenPlan-test-UTC+8", TimeSpan.FromHours(8), "UTC+8", "UTC+8");
        check((await scanner.Scan(now, zone, CancellationToken.None)).Days.Single().Date == new DateOnly(2026, 10, 7), "Daily buckets follow the device's calendar, including midnight across UTC offsets");
        check((await scanner.Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Date == new DateOnly(2026, 10, 6), "Changing the time zone rebuilds cached calendar buckets");
        var series = new TokenTrend(new[] { new TokenDay(new(2026, 9, 8), new(1, 0, 0)), new TokenDay(new(2026, 9, 30), new(1, 0, 0)), new TokenDay(new(2026, 10, 1), new(1, 0, 0)), new TokenDay(new(2026, 10, 7), new(1, 0, 0)) }, false, now);
        check(series.Range(7, new(2026, 10, 7)).Count == 7 && series.Range(7, new(2026, 10, 7)).Sum(d => d.Tokens.Total) == 2, "Seven-day totals include today and exactly the previous six dates");
        check(series.Range(30, new(2026, 10, 7)).Sum(d => d.Tokens.Total) == 4, "Thirty-day totals include the complete thirty-day calendar window");
        await File.WriteAllTextAsync(file, meta + Event(now.AddSeconds(1).ToString("O"), 10, 0, 2) + "\n");
        var concurrentWriter = await new LocalTokenUsage(logs).Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(!concurrentWriter.Partial && concurrentWriter.Days.Single().Tokens.Total == 12, "Counters appended just after a scan starts are not permanently lost");
        var small = new LocalTokenUsage(logs, byteBudget: 512);
        var manyLines = meta + string.Join("\n", Enumerable.Range(1, 7).Select(i => Event("2026-10-06T12:00:0" + i + "Z", i * 10, i * 2, i * 3))) + "\n";
        await File.WriteAllTextAsync(file, manyLines);
        var partial = await small.Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(partial.Partial && partial.ScanningPending, "Work limits produce an explicit incomplete result that can resume");
        for (var pass = 0; pass < 10 && partial.Partial; pass++) partial = await small.Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(!partial.Partial && partial.Days.Single().Tokens.Total == 91, "Later refreshes resume at complete-line boundaries and converge without double counting");
        await File.WriteAllTextAsync(file, new string('x', 1024 * 1024 + 20) + "\n" + Event("2026-10-06T12:00:00Z", 10, 0, 2) + "\n");
        var longLine = await new LocalTokenUsage(logs).Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(longLine.Partial && !longLine.ScanningPending && longLine.Days.Single().Tokens.Total == 12, "Skipped oversized lines are distinguished from a scan that can resume");
        await File.WriteAllTextAsync(file, "{\"type\":\"token_count\"\n" + Event("2026-10-06T12:00:00Z", 10, 0, 2) + "\n");
        var broken = await new LocalTokenUsage(logs).Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(broken.Partial && broken.Days.Single().Tokens.Total == 12, "Malformed JSONL records do not hide valid counters or falsely claim complete coverage");
        var missing = await new LocalTokenUsage(Path.Combine(root, "missing-token-home")).Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(missing.Days.Count == 0 && missing.ErrorKey == null, "Missing logs are represented as no data, not a zero usage claim");
        using var cancellation = new CancellationTokenSource(); cancellation.Cancel();
        try { await scanner.Scan(now, TimeZoneInfo.Utc, cancellation.Token); throw new Exception("Token scan ignored cancellation"); }
        catch (OperationCanceledException) { check(true, "Token scanning supports the same Stop action as provider refresh"); }
        var expired = await new LocalTokenUsage(logs, timeBudget: TimeSpan.Zero).Scan(now, TimeZoneInfo.Utc, CancellationToken.None);
        check(expired.Partial, "Time limits preserve an explicit incomplete state instead of blocking the UI indefinitely");
        if (!OperatingSystem.IsWindows())
        {
            var outside = Path.Combine(root, "outside-logs"); Directory.CreateDirectory(outside);
            await File.WriteAllTextAsync(Path.Combine(outside, "other.jsonl"), Event("2026-10-06T12:00:00Z", 999, 0, 1) + "\n");
            Directory.CreateSymbolicLink(Path.Combine(sessions, "linked-other-home"), outside);
            check((await new LocalTokenUsage(logs).Scan(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 12, "Discovery never follows a linked directory into another log home");
        }
    }
}

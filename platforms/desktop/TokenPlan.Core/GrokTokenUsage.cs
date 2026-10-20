using System.Text.Json;
using System.Diagnostics;
namespace TokenPlan.Core;
public record GrokTokenEntry(string? EventID, string Model, TokenEvent Event);
public static class GrokTokenUsage
{
    public static IReadOnlyList<GrokTokenEntry> Parse(string line)
    {
        if (!line.Contains("turn_completed", StringComparison.Ordinal)) return Array.Empty<GrokTokenEntry>();
        using var doc = JsonDocument.Parse(line); var root = doc.RootElement; var parameters = KeyUsageParser.Field(root, "params");
        var update = KeyUsageParser.Field(parameters, "update"); if (update.ValueKind != JsonValueKind.Object) update = KeyUsageParser.Field(root, "update");
        if (UsageParser.String(update, "sessionUpdate") != "turn_completed") return Array.Empty<GrokTokenEntry>();
        var usage = KeyUsageParser.Field(update, "usage"); var models = KeyUsageParser.Field(usage, "modelUsage");
        if (models.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        var meta = KeyUsageParser.Field(parameters, "_meta"); if (meta.ValueKind != JsonValueKind.Object) meta = KeyUsageParser.Field(root, "_meta");
        DateTimeOffset timestamp;
        if (KeyUsageParser.Number(meta, "agentTimestampMs") is > 0 and < 253402300800000 and var milliseconds) timestamp = DateTimeOffset.FromUnixTimeMilliseconds((long)milliseconds);
        else if (KeyUsageParser.Number(root, "timestamp") is > 0 and < 253402300800 and var seconds) timestamp = DateTimeOffset.FromUnixTimeSeconds((long)seconds);
        else if (!DateTimeOffset.TryParse(UsageParser.String(root, "timestamp"), out timestamp)) throw new InvalidDataException();
        var id = UsageParser.String(meta, "eventId"); var result = new List<GrokTokenEntry>();
        long Count(JsonElement value, string name) => (long)Math.Clamp(KeyUsageParser.Number(value, name) ?? 0, 0, 1_000_000_000_000);
        foreach (var model in models.EnumerateObject().Take(200))
        {
            if (model.Name.Length is 0 or > 200 || KeyUsageParser.Number(model.Value, "inputTokens") is not >= 0) continue;
            var input = Count(model.Value, "inputTokens"); var read = Math.Min(input, Count(model.Value, "cachedReadTokens")); var write = Math.Min(input - read, Count(model.Value, "cacheCreationTokens"));
            var counts = new TokenCounts(input - read - write, Count(model.Value, "outputTokens"), read, CacheWrite: write);
            var ticks = KeyUsageParser.Number(model.Value, "costUsdTicks") ?? (models.EnumerateObject().Count() == 1 ? KeyUsageParser.Number(usage, "costUsdTicks") : null);
            var cost = ticks is >= 0 ? ticks / 10_000_000_000d : ModelPricing.Estimate(model.Name, counts);
            result.Add(new(id, model.Name, new(timestamp, counts, cost, model.Name)));
        }
        return result;
    }
    public static Task<TokenTrend> Scan(string home, DateTimeOffset now, TimeZoneInfo zone, CancellationToken cancellation) => Task.Run(() =>
    {
        var directory = Path.Combine(home, "sessions"); if (!Directory.Exists(directory)) return new TokenTrend(Array.Empty<TokenDay>(), false, now);
        var models = new ModelTotals(); var days = new Dictionary<DateOnly, TokenDay>(); var seen = new HashSet<string>(); var watch = Stopwatch.StartNew(); var partial = false; long bytes = 0;
        try
        {
            var files = Directory.EnumerateFiles(directory, "updates.jsonl", new EnumerationOptions { RecurseSubdirectories = true, AttributesToSkip = FileAttributes.ReparsePoint, IgnoreInaccessible = false }).Take(2001).ToArray();
            if (files.Length > 2000) partial = true;
            foreach (var file in files.Take(2000))
            {
                cancellation.ThrowIfCancellationRequested();
                if (watch.Elapsed > TimeSpan.FromSeconds(10) || bytes >= 128 * 1024 * 1024) { partial = true; break; }
                var info = new FileInfo(file); if (info.LastWriteTimeUtc < now.AddDays(-31).UtcDateTime) continue;
                if (info.Length > 8 * 1024 * 1024) { partial = true; continue; } bytes += info.Length;
                using var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                var bounded = new byte[(int)info.Length];
                var length = stream.ReadAtLeast(bounded, bounded.Length, throwOnEndOfStream: false);
                using var reader = new StringReader(System.Text.Encoding.UTF8.GetString(bounded, 0, length));
                string? line;
                while ((line = reader.ReadLine()) != null)
                {
                    cancellation.ThrowIfCancellationRequested(); if (watch.Elapsed > TimeSpan.FromSeconds(10)) { partial = true; break; } if (line.Length > 1024 * 1024) { partial = true; continue; }
                    try
                    {
                        foreach (var entry in Parse(line))
                        {
                            if (entry.Event.Timestamp < now.AddDays(-30) || entry.Event.Timestamp > now.AddMinutes(5)) continue;
                            if (entry.EventID is { Length: > 0 } id && !seen.Add(id + "\0" + entry.Model)) continue;
                            var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(entry.Event.Timestamp, zone).DateTime);
                            models.Add(date, entry.Event);
                            var prior = days.GetValueOrDefault(date) ?? new(date, TokenCounts.Zero, new());
                            days[date] = new(date, prior.Tokens.Plus(entry.Event.Tokens), prior.Cost!.Add(entry.Event.EstimatedCost), models.Read(date));
                        }
                    }
                    catch (Exception e) when (e is JsonException or InvalidDataException or OverflowException) { partial = true; }
                }
            }
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { partial = true; DiagnosticLog.Write("grok", "Some Grok transcripts could not be read."); }
        return new TokenTrend(days.Values.OrderBy(d => d.Date).ToArray(), partial, now);
    }, cancellation);
}

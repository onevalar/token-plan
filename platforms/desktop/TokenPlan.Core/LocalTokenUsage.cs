using System.Diagnostics;
using System.Security.Cryptography;

namespace TokenPlan.Core;

public record TokenDay(DateOnly Date, TokenCounts Tokens, CostTotal? Cost = null);
public record TokenTrend(IReadOnlyList<TokenDay> Days, bool Partial, DateTimeOffset ScannedAt, string? ErrorKey = null, bool ScanningPending = false, string? CredentialFingerprint = null)
{
    public IReadOnlyList<TokenDay> Range(int days, DateOnly today)
    {
        if (days is not (7 or 30)) throw new ArgumentOutOfRangeException(nameof(days));
        var source = Days.ToDictionary(d => d.Date);
        return Enumerable.Range(1 - days, days).Select(offset => { var date = today.AddDays(offset); return source.GetValueOrDefault(date) ?? new TokenDay(date, TokenCounts.Zero, new()); }).ToArray();
    }
}

/// Incremental, memory-only scan of Codex rollouts or Claude Code project logs.
/// This is device history, not usage attributed to the currently logged-in account.
public sealed class LocalTokenUsage(string codexHome, long byteBudget = 128 * 1024 * 1024, TimeSpan? timeBudget = null, IReadOnlyList<string>? claudeHomes = null)
{
    const int MaximumFiles = 2000;
    const int MaximumLine = 1024 * 1024;
    readonly Dictionary<string, CachedFile> files = new(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    readonly SemaphoreSlim gate = new(1);
    string? timeZone;
    int pricingRevision = -1;
    sealed class CachedFile
    {
        public long Offset;
        public long LastLength;
        public DateTime LastWrite;
        public DateTime Created;
        public int PrefixLength;
        public string PrefixHash = "";
        public bool Completed;
        public bool DiscardingLongLine;
        public bool HadSkippedLines;
        public CodexTokenParser Parser = new();
        public ClaudeTokenParser ClaudeParser = new();
        public List<ClaudeTokenEntry> ClaudeEntries = new();
        public Dictionary<DateOnly, TokenCounts> Days = new();
        public Dictionary<DateOnly, CostTotal> Costs = new();
    }
    public async Task<TokenTrend> Scan(DateTimeOffset now, TimeZoneInfo zone, CancellationToken cancellation)
    {
        await gate.WaitAsync(cancellation);
        try { return await Task.Run(() => ScanCore(now, zone, cancellation), cancellation); }
        finally { gate.Release(); }
    }
    TokenTrend ScanCore(DateTimeOffset now, TimeZoneInfo zone, CancellationToken cancellation)
    {
        var watch = Stopwatch.StartNew();
        var duration = timeBudget ?? TimeSpan.FromSeconds(20);
        bool Expired() => watch.Elapsed >= duration;
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, zone).DateTime);
        var since = today.AddDays(-29);
        if (timeZone != zone.Id || pricingRevision != ModelPricing.Revision) { files.Clear(); timeZone = zone.Id; pricingRevision = ModelPricing.Revision; }
        var partial = false;
        var scanningPending = false;
        long remaining = byteBudget;
        var used = new List<CachedFile>();
        try
        {
            var candidates = Discover(now.AddDays(-31), Expired, cancellation, ref partial);
            var paths = candidates.Select(f => f.Path).ToHashSet(files.Comparer);
            foreach (var removed in files.Keys.Where(key => !paths.Contains(key)).ToArray()) files.Remove(removed);
            foreach (var cache in files.Values)
                cache.ClaudeEntries.RemoveAll(e => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(e.Event.Timestamp, zone).DateTime) < since);
            var remainingEntries = Math.Max(0, 200_000 - files.Values.Sum(c => c.ClaudeEntries.Count));
            var sessionIDs = new HashSet<string>(StringComparer.Ordinal);
            var buffer = new byte[32 * 1024]; var line = new byte[MaximumLine];
            foreach (var candidate in candidates)
            {
                cancellation.ThrowIfCancellationRequested();
                if (Expired()) { partial = scanningPending = true; break; }
                try
                {
                    using var stream = new FileStream(candidate.Path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, buffer.Length, FileOptions.SequentialScan);
                    var length = stream.Length;
                    var info = new FileInfo(candidate.Path);
                    files.TryGetValue(candidate.Path, out var cache);
                    var prefixLength = cache?.PrefixLength ?? (int)Math.Min(512, length);
                    var prefix = new byte[prefixLength];
                    var read = stream.ReadAtLeast(prefix, prefix.Length, throwOnEndOfStream: false);
                    var hash = Convert.ToHexString(SHA256.HashData(prefix.AsSpan(0, read)));
                    if (cache == null || cache.Created != info.CreationTimeUtc || length < cache.LastLength || hash != cache.PrefixHash
                        || length == cache.LastLength && info.LastWriteTimeUtc != cache.LastWrite)
                        cache = new() { Created = info.CreationTimeUtc, PrefixLength = (int)Math.Min(512, length), PrefixHash = hash };
                    files[candidate.Path] = cache;
                    if (length != cache.LastLength || info.LastWriteTimeUtc != cache.LastWrite) cache.Completed = false;
                    cache.LastLength = length; cache.LastWrite = info.LastWriteTimeUtc;
                    if (cache.Parser.SessionID is { } knownID && sessionIDs.Contains(knownID)) continue;
                    if (!cache.Completed && remaining > 0 && !Expired())
                    {
                        stream.Position = cache.Offset;
                        ReadFile(stream, cache, buffer, line, now, zone, since, ref remaining, ref remainingEntries, Expired, cancellation);
                    }
                    if (!cache.Completed) partial = scanningPending = true;
                    if (cache.Parser.SessionID is { } id && !sessionIDs.Add(id)) continue;
                    foreach (var old in cache.Days.Keys.Where(day => day < since).ToArray()) { cache.Days.Remove(old); cache.Costs.Remove(old); }
                    partial |= cache.HadSkippedLines || cache.Parser.HadInvalidRecords || cache.ClaudeParser.HadInvalidRecords;
                    used.Add(cache);
                }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException) { partial = true; DiagnosticLog.Write("token-logs", "Some local token logs could not be read. The totals may be incomplete."); }
            }
            var totals = new Dictionary<DateOnly, TokenCounts>();
            var costs = new Dictionary<DateOnly, CostTotal>();
            foreach (var cache in used)
                foreach (var (date, tokens) in cache.Days)
                    { totals[date] = (totals.GetValueOrDefault(date) ?? TokenCounts.Zero).Plus(tokens); costs[date] = (costs.GetValueOrDefault(date) ?? new()).Plus(cache.Costs.GetValueOrDefault(date) ?? new()); }
            if (claudeHomes != null)
                foreach (var entry in ClaudeTokenParser.Deduplicate(used.SelectMany(c => c.ClaudeEntries)))
                {
                    var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(entry.Event.Timestamp, zone).DateTime);
                    totals[date] = (totals.GetValueOrDefault(date) ?? TokenCounts.Zero).Plus(entry.Event.Tokens);
                    costs[date] = (costs.GetValueOrDefault(date) ?? new()).Add(entry.Event.EstimatedCost);
                }
            _ = totals.Values.Aggregate(TokenCounts.Zero, (sum, tokens) => sum.Plus(tokens)).Total;
            if (partial) DiagnosticLog.Write("token-logs", "Some local token logs were skipped or could not be read. Totals may be incomplete.");
            return new(totals.OrderBy(d => d.Key).Select(d => new TokenDay(d.Key, d.Value, costs.GetValueOrDefault(d.Key))).ToArray(), partial, now, ScanningPending: scanningPending || Expired());
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or OverflowException)
        {
            const string error = "Local token logs could not be read. Try refreshing again.";
            DiagnosticLog.Write("token-logs", error);
            return new(Array.Empty<TokenDay>(), true, now, error);
        }
    }
    List<(string Path, DateTime Written, bool Archived)> Discover(DateTimeOffset since, Func<bool> expired, CancellationToken cancellation, ref bool partial)
    {
        var candidates = new List<(string Path, DateTime Written, bool Archived)>();
        if (claudeHomes != null) return DiscoverClaude(since, expired, cancellation, ref partial);
        var root = new DirectoryInfo(codexHome);
        if (!root.Exists) return candidates;
        if (root.LinkTarget != null) root = (DirectoryInfo)(root.ResolveLinkTarget(true) ?? throw new IOException());
        var locations = new[] { Path.Combine(root.FullName, "sessions"), Path.Combine(root.FullName, "archived_sessions") }.Where(Directory.Exists).ToArray();
        if (locations.Length == 0) locations = new[] { root.FullName };
        var relative = new HashSet<string>(files.Comparer);
        var count = 0;
        foreach (var location in locations)
        {
            if (File.GetAttributes(location).HasFlag(FileAttributes.ReparsePoint)) { partial = true; continue; }
            foreach (var path in Directory.EnumerateFiles(location, "*.jsonl", new EnumerationOptions { RecurseSubdirectories = true, IgnoreInaccessible = false, AttributesToSkip = FileAttributes.ReparsePoint }))
            {
                cancellation.ThrowIfCancellationRequested();
                if (++count > 20000 || expired()) { partial = true; break; }
                var key = Path.GetRelativePath(location, path);
                if (!relative.Add(key)) continue; // sessions wins over an archived copy at the same relative path.
                var written = File.GetLastWriteTimeUtc(path);
                if (written >= since.UtcDateTime) candidates.Add((path, written, location.EndsWith("archived_sessions", StringComparison.Ordinal)));
            }
            if (count > 20000 || expired()) break;
        }
        if (candidates.Count > MaximumFiles) partial = true;
        return candidates.OrderBy(f => f.Archived).ThenByDescending(f => f.Written).Take(MaximumFiles).ToList();
    }
    List<(string Path, DateTime Written, bool Archived)> DiscoverClaude(DateTimeOffset since, Func<bool> expired, CancellationToken cancellation, ref bool partial)
    {
        var paths = new Dictionary<string, DateTime>(files.Comparer);
        var count = 0;
        foreach (var home in claudeHomes!)
        {
            var root = new DirectoryInfo(home);
            if (!root.Exists) continue;
            if (root.LinkTarget != null) root = (DirectoryInfo)(root.ResolveLinkTarget(true) ?? throw new IOException());
            var projects = root.Name == "projects" ? root.FullName : Path.Combine(root.FullName, "projects");
            if (!Directory.Exists(projects)) continue;
            if (File.GetAttributes(projects).HasFlag(FileAttributes.ReparsePoint)) { partial = true; continue; }
            foreach (var path in Directory.EnumerateFiles(projects, "*.jsonl", new EnumerationOptions { RecurseSubdirectories = true, IgnoreInaccessible = false, AttributesToSkip = FileAttributes.ReparsePoint }))
            {
                cancellation.ThrowIfCancellationRequested();
                if (++count > 20_000 || expired()) { partial = true; break; }
                var written = File.GetLastWriteTimeUtc(path);
                if (written >= since.UtcDateTime) paths[path] = written;
            }
            if (count > 20_000 || expired()) break;
        }
        if (paths.Count > MaximumFiles) partial = true;
        return paths.OrderByDescending(p => p.Value).ThenBy(p => p.Key, StringComparer.Ordinal).Take(MaximumFiles).Select(p => (p.Key, p.Value, false)).ToList();
    }
    void ReadFile(FileStream stream, CachedFile cache, byte[] buffer, byte[] line, DateTimeOffset now, TimeZoneInfo zone, DateOnly since,
        ref long remaining, ref int remainingEntries, Func<bool> expired, CancellationToken cancellation)
    {
        var length = 0;
        var position = cache.Offset;
        while (remaining > 0 && !expired())
        {
            cancellation.ThrowIfCancellationRequested();
            var read = stream.Read(buffer, 0, (int)Math.Min(buffer.Length, remaining));
            if (read == 0) { cache.Completed = true; return; }
            remaining -= read;
            for (var i = 0; i < read; i++)
            {
                position++;
                if (buffer[i] == (byte)'\n')
                {
                    if (!cache.DiscardingLongLine && length > 0 && claudeHomes != null)
                    {
                        foreach (var entry in cache.ClaudeParser.Parse(line.AsSpan(0, length)))
                        {
                            var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(entry.Event.Timestamp, zone).DateTime);
                            if (date < since) continue;
                            if (remainingEntries <= 0 || entry.Event.Timestamp > now.AddMinutes(5)) { cache.HadSkippedLines = true; continue; }
                            cache.ClaudeEntries.Add(entry); remainingEntries--;
                        }
                    }
                    else if (!cache.DiscardingLongLine && length > 0 && cache.Parser.Parse(line.AsSpan(0, length)) is { } entry)
                    {
                        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(entry.Timestamp, zone).DateTime);
                        // Writers can append after the scan's start time; do not permanently lose those events.
                        if (date >= since && entry.Timestamp <= now.AddMinutes(5))
                            { cache.Days[date] = (cache.Days.GetValueOrDefault(date) ?? TokenCounts.Zero).Plus(entry.Tokens); cache.Costs[date] = (cache.Costs.GetValueOrDefault(date) ?? new()).Add(entry.EstimatedCost); }
                        else if (entry.Timestamp > now.AddMinutes(5)) cache.HadSkippedLines = true;
                    }
                    cache.DiscardingLongLine = false; cache.Offset = position; length = 0;
                }
                else if (cache.DiscardingLongLine) cache.Offset = position;
                else if (length == line.Length) { cache.DiscardingLongLine = true; cache.HadSkippedLines = true; cache.Offset = position; length = 0; }
                else line[length++] = buffer[i];
            }
        }
        // The next scan resumes after the last complete line. An in-progress tail is never counted.
    }
}

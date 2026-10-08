using System.Text.Json;

namespace TokenPlan.Core;

public record HistoryReading(string Provider, DateTimeOffset FetchedAt, IReadOnlyList<UsageWindow> Windows);
public record HistoryDocument(int Version, Dictionary<string, string> Accounts, List<HistoryReading> Readings);

/// Local quota observations, not token counts or a provider's complete usage history.
public sealed class UsageHistory
{
    const int MaximumBytes = 2 * 1024 * 1024;
    const int MaximumReadings = 2400;
    static readonly HashSet<string> Providers = new() { "claude", "codex", "cursor" };
    static readonly HashSet<string> Metrics = new() { "Session", "Weekly", "Sonnet", "Total usage", "Cursor Models", "Other Models" };
    HistoryDocument document = new(1, new(), new());

    public static UsageHistory Load(string file, DateTimeOffset now)
    {
        var history = new UsageHistory();
        if (!File.Exists(file)) return history;
        using var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        var buffer = new byte[MaximumBytes + 1];
        var length = stream.ReadAtLeast(buffer, buffer.Length, throwOnEndOfStream: false);
        if (length > MaximumBytes) throw new InvalidDataException("History exceeds its size limit");
        var value = JsonSerializer.Deserialize<HistoryDocument>(buffer.AsSpan(0, length)) ?? throw new InvalidDataException("Missing history document");
        if (value.Version != 1 || value.Accounts == null || value.Readings == null || value.Accounts.Count > 3 || value.Readings.Count > MaximumReadings
            || value.Accounts.Any(a => !Providers.Contains(a.Key) || !IsFingerprint(a.Value))) throw new InvalidDataException("Invalid history document");
        foreach (var entry in value.Readings)
        {
            if (entry == null || !Providers.Contains(entry.Provider) || !value.Accounts.ContainsKey(entry.Provider)
                || entry.FetchedAt == default || entry.FetchedAt > now.AddMinutes(5) || entry.Windows == null || entry.Windows.Count is < 1 or > 8
                || entry.Windows.Any(w => w == null || !Metrics.Contains(w.Label) || !double.IsFinite(w.UsedPercent) || w.UsedPercent < 0)
                || entry.Windows.Select(w => w.Label).Distinct().Count() != entry.Windows.Count)
                throw new InvalidDataException("Invalid history reading");
        }
        if (value.Readings.GroupBy(r => (r.Provider, Hour(r.FetchedAt))).Any(group => group.Count() > 1)) throw new InvalidDataException("Duplicate hourly readings");
        history.document = value;
        history.Prune(now);
        return history;
    }

    static bool IsFingerprint(string? value) => value?.Length == 64 && value.All(Uri.IsHexDigit);
    static long Hour(DateTimeOffset value) => value.ToUnixTimeSeconds() / 3600;
    void Prune(DateTimeOffset now) => document.Readings.RemoveAll(r => r.FetchedAt < now.AddDays(-31));

    /// A changed/missing login discards that provider's old observations. Tokens are never stored.
    public void Observe(ProviderResult result, DateTimeOffset now)
    {
        if (!Providers.Contains(result.Id)) throw new ArgumentException("Unknown provider");
        var fingerprint = result.CredentialFingerprint;
        if (fingerprint != null && !IsFingerprint(fingerprint)) throw new ArgumentException("Invalid fingerprint");
        if (fingerprint == null || document.Accounts.GetValueOrDefault(result.Id) != fingerprint)
        {
            document.Readings.RemoveAll(r => r.Provider == result.Id);
            document.Accounts.Remove(result.Id);
        }
        if (fingerprint != null) document.Accounts[result.Id] = fingerprint;
        // Failures, including a retained older snapshot, must never create a new reading.
        if (fingerprint != null && result.ErrorKey == null && result.Snapshot is { } snapshot)
        {
            var prior = document.Readings.Find(r => r.Provider == result.Id && Hour(r.FetchedAt) == Hour(snapshot.FetchedAt));
            if (prior == null || prior.FetchedAt <= snapshot.FetchedAt)
            {
                if (prior != null) document.Readings.Remove(prior);
                document.Readings.Add(new(result.Id, snapshot.FetchedAt, snapshot.Windows.ToArray()));
            }
        }
        Prune(now);
        if (document.Readings.Count > MaximumReadings)
        {
            var keep = document.Readings.OrderByDescending(r => r.FetchedAt).Take(MaximumReadings).ToArray();
            document.Readings.Clear(); document.Readings.AddRange(keep);
        }
    }

    public IReadOnlyList<HistoryReading> Read(IReadOnlyDictionary<string, ProviderResult> current, Preferences preferences, DateTimeOffset since, DateTimeOffset now)
        => document.Readings.Where(r => preferences.IsEnabled(r.Provider) && r.FetchedAt >= since && r.FetchedAt <= now
            && current.TryGetValue(r.Provider, out var result) && result.CredentialFingerprint != null
            && document.Accounts.GetValueOrDefault(r.Provider) == result.CredentialFingerprint)
            .OrderByDescending(r => r.FetchedAt).ThenBy(r => r.Provider).ToArray();

    public void Save(string file)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(document);
        if (bytes.Length > MaximumBytes) throw new InvalidDataException("History exceeds its size limit");
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(file))!);
        var temporary = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
            if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            using (var stream = new FileStream(temporary, options))
                stream.Write(bytes);
            File.Move(temporary, file, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}

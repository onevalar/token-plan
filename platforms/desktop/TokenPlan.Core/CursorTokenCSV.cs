using System.Globalization;
using System.Text;

namespace TokenPlan.Core;

/// Matches the macOS Cursor export schema; aggregates counters without retaining models or CSV rows.
public static class CursorTokenCSV
{
    static readonly string[] Required = { "Date", "Model", "Input (w/ Cache Write)", "Input (w/o Cache Write)", "Cache Read", "Output Tokens" };
    enum State { Start, Unquoted, Quoted, Closed }

    public static TokenTrend Parse(string csv, DateTimeOffset now, TimeZoneInfo zone, CancellationToken cancellation = default)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, zone).DateTime);
        var since = today.AddDays(-29);
        var days = new Dictionary<DateOnly, TokenCounts>();
        var costs = new Dictionary<DateOnly, CostTotal>();
        string[]? header = null;
        int[] columns = Array.Empty<int>();
        var partial = false;
        var row = new List<string>();
        var field = new StringBuilder();
        var state = State.Start;
        long total = 0;
        void Field() { row.Add(field.ToString()); field.Clear(); if (row.Count > 64) throw new InvalidDataException(); }
        void Row()
        {
            if (row.All(string.IsNullOrEmpty)) { row.Clear(); return; }
            if (header == null)
            {
                header = row.Select(v => v.Trim().Trim('\uFEFF')).ToArray();
                if (header.Distinct(StringComparer.Ordinal).Count() != header.Length) throw new InvalidDataException();
                columns = Required.Select(key => Array.IndexOf(header, key)).ToArray();
                if (columns.Any(index => index < 0)) throw new InvalidDataException();
                row.Clear(); return;
            }
            try
            {
                if (row.Count != header.Length || !TryDate(row[columns[0]].Trim(), zone, out var at) || string.IsNullOrWhiteSpace(row[columns[1]])) throw new InvalidDataException();
                var tokens = new TokenCounts(Number(row[columns[3]]), Number(row[columns[5]]), Number(row[columns[4]]), CacheWrite: Number(row[columns[2]]));
                var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(at, zone).DateTime);
                if (date < since) { row.Clear(); return; }
                if (at > now || date > today) throw new InvalidDataException();
                var nextTotal = checked(total + tokens.Total);
                days[date] = (days.GetValueOrDefault(date) ?? TokenCounts.Zero).Plus(tokens);
                costs[date] = (costs.GetValueOrDefault(date) ?? new()).Add(ModelPricing.Estimate(row[columns[1]], tokens, applyLongContext: false));
                total = nextTotal;
            }
            catch (Exception e) when (e is InvalidDataException or OverflowException or ArgumentException) { partial = true; }
            row.Clear();
        }
        for (var i = 0; i < csv.Length; i++)
        {
            if (i % 4096 == 0) cancellation.ThrowIfCancellationRequested();
            var c = csv[i];
            if (state == State.Quoted)
            {
                if (c == '"')
                {
                    if (i + 1 < csv.Length && csv[i + 1] == '"') { field.Append('"'); i++; }
                    else state = State.Closed;
                }
                else field.Append(c);
                continue;
            }
            if (c == ',') { Field(); state = State.Start; continue; }
            if (c is '\r' or '\n')
            {
                Field(); Row(); state = State.Start;
                if (c == '\r' && i + 1 < csv.Length && csv[i + 1] == '\n') i++;
                continue;
            }
            if (state == State.Closed) throw new InvalidDataException();
            if (c == '"') { if (state != State.Start) throw new InvalidDataException(); state = State.Quoted; }
            else { field.Append(c); state = State.Unquoted; }
        }
        if (state == State.Quoted) throw new InvalidDataException();
        if (field.Length > 0 || row.Count > 0 || state == State.Closed) { Field(); Row(); }
        if (header == null) throw new InvalidDataException();
        cancellation.ThrowIfCancellationRequested();
        return new(days.OrderBy(d => d.Key).Select(d => new TokenDay(d.Key, d.Value, costs.GetValueOrDefault(d.Key))).ToArray(), partial, now);
    }
    static long Number(string raw)
    {
        var value = raw.Trim();
        if (value.Length == 0) return 0; // Empty numeric cells are valid zeroes in Cursor's export.
        var groups = value.Split(',');
        if (groups.Any(group => group.Length == 0 || group.Any(c => !char.IsAsciiDigit(c)))
            || groups.Length > 1 && (groups[0].Length > 3 || groups.Skip(1).Any(group => group.Length != 3))) throw new InvalidDataException();
        return long.TryParse(string.Concat(groups), NumberStyles.None, CultureInfo.InvariantCulture, out var count) ? count : throw new InvalidDataException();
    }
    static bool TryDate(string raw, TimeZoneInfo zone, out DateTimeOffset at)
    {
        if (DateTime.TryParseExact(raw, "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var local))
        { at = new(TimeZoneInfo.ConvertTimeToUtc(local, zone)); return true; }
        return DateTimeOffset.TryParseExact(raw, new[] { "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFFzzz", "yyyy-MM-dd'T'HH:mm:sszzz" },
            CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out at);
    }
}

using System.Text.Json;

namespace TokenPlan.Core;

public record TokenCounts(long Input, long Output, long CacheRead, long Other = 0, long CacheWrite = 0)
{
    public long Total => checked(Input + Output + CacheRead + Other + CacheWrite);
    public TokenCounts Plus(TokenCounts other) => new(checked(Input + other.Input), checked(Output + other.Output), checked(CacheRead + other.CacheRead), checked(Other + other.Other), checked(CacheWrite + other.CacheWrite));
    public static TokenCounts Zero => new(0, 0, 0);
}
public record TokenEvent(DateTimeOffset Timestamp, TokenCounts Tokens);

/// Mirrors the macOS rollout parser's cumulative counters and child replay gate.
/// Only session metadata and token counters are retained; prompts and responses are discarded.
public sealed class CodexTokenParser
{
    Raw? previous;
    TokenEvent? lastEvent;
    bool sawMeta;
    bool childReplay;
    double? createdAt;
    public string? SessionID { get; private set; }
    public bool HadInvalidRecords { get; private set; }
    public TokenEvent? Parse(ReadOnlySpan<byte> line)
    {
        // Most rollout lines are conversation text. Do not deserialize those records.
        if (line.IndexOf("token_count"u8) < 0 && line.IndexOf("session_meta"u8) < 0 && line.IndexOf("task_started"u8) < 0) return null;
        try
        {
            using var document = JsonDocument.Parse(line.ToArray());
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("payload", out var payload) || payload.ValueKind != JsonValueKind.Object) return null;
            var type = UsageParser.String(root, "type");
            if (type == "session_meta" && !sawMeta)
            {
                sawMeta = true;
                var id = UsageParser.String(payload, "id");
                if (id?.Length is > 0 and <= 128) SessionID = id;
                childReplay = Present(payload, "forked_from_id") || Present(payload, "parent_thread_id") || UsageParser.String(payload, "thread_source") == "subagent"
                    || payload.TryGetProperty("source", out var source) && source.ValueKind == JsonValueKind.Object && Present(source, "subagent");
                if (DateTimeOffset.TryParse(UsageParser.String(root, "timestamp"), out var creation)) createdAt = Math.Floor(creation.ToUnixTimeMilliseconds() / 1000d);
                return null;
            }
            if (type != "event_msg") return null;
            var eventType = UsageParser.String(payload, "type");
            if (eventType == "task_started")
            {
                if (childReplay && payload.TryGetProperty("started_at", out var start) && start.TryGetDouble(out var started) && double.IsFinite(started))
                {
                    var gate = createdAt;
                    if (gate == null && DateTimeOffset.TryParse(UsageParser.String(root, "timestamp"), out var lineTime)) gate = Math.Floor(lineTime.ToUnixTimeMilliseconds() / 1000d);
                    if (gate != null && started >= gate) childReplay = false;
                }
                return null;
            }
            if (eventType != "token_count") return null;
            if (!DateTimeOffset.TryParse(UsageParser.String(root, "timestamp"), out var timestamp)) { HadInvalidRecords = true; return null; }
            if (!payload.TryGetProperty("info", out var info) || info.ValueKind is JsonValueKind.Null) return null; // Codex emits null info for rate-limit-only events.
            if (info.ValueKind != JsonValueKind.Object) { HadInvalidRecords = true; return null; }
            var totals = Read(info, "total_token_usage");
            if (childReplay) { if (totals != null) previous = totals; return null; }
            if (totals != null && totals == previous) return null;
            var usage = Read(info, "last_token_usage") ?? totals?.Subtract(previous);
            if (totals != null) previous = totals;
            if (usage == null) return null;
            var cached = Math.Min(usage.Cached, usage.Input);
            var entry = new TokenEvent(timestamp, new(usage.Input - cached, usage.Output, cached, Math.Max(0, usage.Total - usage.Input - usage.Output)));
            if (entry == lastEvent) return null;
            lastEvent = entry;
            return entry;
        }
        catch (Exception e) when (e is JsonException or InvalidDataException or OverflowException or InvalidOperationException) { HadInvalidRecords = true; return null; }
    }
    static bool Present(JsonElement value, string key) => value.TryGetProperty(key, out var item) && item.ValueKind is not (JsonValueKind.Null or JsonValueKind.Undefined)
        && (item.ValueKind != JsonValueKind.String || !string.IsNullOrWhiteSpace(item.GetString()));
    static Raw? Read(JsonElement info, string key)
    {
        if (!info.TryGetProperty(key, out var value) || value.ValueKind == JsonValueKind.Null) return null;
        if (value.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        var input = Number(value, "input_tokens", "prompt_tokens", "input");
        var cached = Number(value, "cached_input_tokens", "cache_read_input_tokens", "cached_tokens");
        var output = Number(value, "output_tokens", "completion_tokens", "output");
        var reasoning = Number(value, "reasoning_output_tokens", "reasoning_tokens");
        var total = Number(value, "total_tokens");
        if (input == null && cached == null && output == null && total == null) return null;
        var baseTotal = checked((input ?? 0) + (output ?? 0));
        if (total != null && total < baseTotal) throw new InvalidDataException();
        return new(input ?? 0, cached ?? 0, output ?? 0, reasoning ?? 0, total ?? baseTotal);
    }
    static long? Number(JsonElement value, params string[] keys)
    {
        foreach (var key in keys)
            if (value.TryGetProperty(key, out var number))
            {
                if (number.ValueKind != JsonValueKind.Number || !number.TryGetInt64(out var count) || count < 0 || count > 1_000_000_000_000) throw new InvalidDataException();
                return count;
            }
        return null;
    }
    sealed record Raw(long Input, long Cached, long Output, long Reasoning, long Total)
    {
        public Raw Subtract(Raw? prior) => new(Math.Max(0, Input - (prior?.Input ?? 0)), Math.Max(0, Cached - (prior?.Cached ?? 0)), Math.Max(0, Output - (prior?.Output ?? 0)), Math.Max(0, Reasoning - (prior?.Reasoning ?? 0)), Math.Max(0, Total - (prior?.Total ?? 0)));
    }
}

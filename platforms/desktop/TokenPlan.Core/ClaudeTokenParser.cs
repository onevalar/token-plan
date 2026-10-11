using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace TokenPlan.Core;

public record ClaudeTokenEntry(TokenEvent Event, string? MessageHash, string? RequestHash, bool Sidechain, bool HasSpeed);

/// Keeps counters and opaque deduplication keys only, never conversation content.
public sealed class ClaudeTokenParser
{
    public bool HadInvalidRecords { get; private set; }
    public IReadOnlyList<ClaudeTokenEntry> Parse(ReadOnlySpan<byte> line)
    {
        if (line.IndexOf("\"usage\""u8) < 0) return Array.Empty<ClaudeTokenEntry>();
        try
        {
            using var document = JsonDocument.Parse(line.ToArray());
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("message", out var message)
                || message.ValueKind != JsonValueKind.Object || !message.TryGetProperty("usage", out var usage)) return Array.Empty<ClaudeTokenEntry>();
            if (!DateTimeOffset.TryParse(UsageParser.String(root, "timestamp"), out var at)) throw new InvalidDataException();
            var messageID = Identity(message, "id");
            var requestID = Identity(root, "requestId");
            _ = Identity(root, "sessionId");
            _ = Identity(message, "model");
            var sidechain = root.TryGetProperty("isSidechain", out var side) && side.ValueKind == JsonValueKind.True;
            var entries = new List<ClaudeTokenEntry> { Read(usage, at, messageID, requestID, sidechain, UsageParser.String(message, "model")) };
            if (usage.TryGetProperty("iterations", out var iterations) && iterations.ValueKind == JsonValueKind.Array)
            {
                var index = 0;
                foreach (var iteration in iterations.EnumerateArray())
                {
                    if (iteration.ValueKind != JsonValueKind.Object || UsageParser.String(iteration, "type") != "advisor_message"
                        || string.IsNullOrEmpty(UsageParser.String(iteration, "model"))) continue;
                    entries.Add(Read(iteration, at, messageID == null ? null : Hash(messageID + ":advisor:" + index++), requestID, sidechain, UsageParser.String(iteration, "model")));
                }
            }
            return entries;
        }
        catch (Exception e) when (e is JsonException or InvalidDataException or InvalidOperationException or OverflowException)
        { HadInvalidRecords = true; return Array.Empty<ClaudeTokenEntry>(); }
    }
    static ClaudeTokenEntry Read(JsonElement usage, DateTimeOffset at, string? message, string? request, bool sidechain, string? model)
    {
        if (usage.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        var input = Number(usage, "input_tokens", required: true);
        var output = Number(usage, "output_tokens", required: true);
        var read = Number(usage, "cache_read_input_tokens");
        var write = Number(usage, "cache_creation_input_tokens");
        long oneHourWrites = 0;
        if (usage.TryGetProperty("cache_creation", out var split))
        {
            if (split.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
            oneHourWrites = Number(split, "ephemeral_1h_input_tokens");
            write = checked(Number(split, "ephemeral_5m_input_tokens") + oneHourWrites);
        }
        var hasSpeed = usage.TryGetProperty("speed", out var speed);
        if (hasSpeed && (speed.ValueKind != JsonValueKind.String || speed.GetString() is not ("fast" or "standard"))) throw new InvalidDataException();
        var tokens = new TokenCounts(input, output, read, CacheWrite: write);
        _ = tokens.Total;
        return new(new(at, tokens, ModelPricing.Estimate(model, tokens, hasSpeed && speed.GetString() == "fast", oneHourWrites)), message, request, sidechain, hasSpeed);
    }
    static long Number(JsonElement value, string key, bool required = false)
    {
        if (!value.TryGetProperty(key, out var item)) return !required ? 0 : throw new InvalidDataException();
        if (item.ValueKind != JsonValueKind.Number || !item.TryGetInt64(out var count) || count < 0 || count > 1_000_000_000_000) throw new InvalidDataException();
        return count;
    }
    static string? Identity(JsonElement value, string key)
    {
        if (!value.TryGetProperty(key, out var item)) return null;
        if (item.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(item.GetString()) || item.GetString()!.Length > 512) throw new InvalidDataException();
        return Hash(item.GetString()!);
    }
    static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    public static IReadOnlyList<ClaudeTokenEntry> Deduplicate(IEnumerable<ClaudeTokenEntry> source)
    {
        var entries = new List<ClaudeTokenEntry>();
        var exact = new Dictionary<(string, string?), int>();
        var messages = new Dictionary<string, List<int>>();
        foreach (var entry in source)
        {
            if (entry.MessageHash is not { } message) { entries.Add(entry); continue; }
            var key = (message, entry.RequestHash);
            int? collision = exact.TryGetValue(key, out var found) ? found : null;
            if (collision == null && messages.TryGetValue(message, out var candidates))
                foreach (var index in candidates)
                    if (entry.Sidechain || entries[index].Sidechain) { collision = index; break; }
            if (collision is { } duplicate)
            {
                var old = entries[duplicate];
                var replace = entry.Sidechain != old.Sidechain ? !entry.Sidechain : entry.Event.Tokens.Total != old.Event.Tokens.Total
                    ? entry.Event.Tokens.Total > old.Event.Tokens.Total : entry.HasSpeed && !old.HasSpeed;
                if (replace) { exact.Remove((message, old.RequestHash)); entries[duplicate] = entry; exact[key] = duplicate; }
                continue;
            }
            exact[key] = entries.Count;
            if (!messages.TryGetValue(message, out var indices)) messages[message] = indices = new();
            indices.Add(entries.Count); entries.Add(entry);
        }
        return entries;
    }
}

using System.Text;
using System.Text.Json;
namespace TokenPlan.Core;

public record AntigravityLogin(string? AccessToken, string? RefreshToken, DateTimeOffset? ExpiresAt);
public static class AntigravityUsage
{
    public static AntigravityLogin ParseLogin(string raw)
    {
        raw = raw.Trim().Trim('\uFEFF');
        if (raw.StartsWith("go-keyring-base64:")) raw = Encoding.UTF8.GetString(Convert.FromBase64String(raw["go-keyring-base64:".Length..]));
        using var json = JsonDocument.Parse(raw);
        var root = json.RootElement;
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("token", out var token) && token.ValueKind == JsonValueKind.Object) root = token;
        var access = UsageParser.String(root, "access_token") ?? UsageParser.String(root, "accessToken");
        var refresh = UsageParser.String(root, "refresh_token") ?? UsageParser.String(root, "refreshToken");
        if (string.IsNullOrWhiteSpace(access) && string.IsNullOrWhiteSpace(refresh)) throw new InvalidDataException();
        return new(access, refresh, DateTimeOffset.TryParse(UsageParser.String(root, "expiry"), out var expiry) ? expiry : null);
    }
    public static UsageSnapshot Parse(string json, DateTimeOffset now, string? plan = null)
    {
        using var document = JsonDocument.Parse(json); var root = document.RootElement;
        if (root.TryGetProperty("response", out var response)) root = response;
        if (!root.TryGetProperty("groups", out var groups) || groups.ValueKind != JsonValueKind.Array) throw new InvalidDataException();
        var values = new Dictionary<string, UsageWindow>();
        var labels = new[] { ("gemini-5h", "Session"), ("gemini-weekly", "Weekly"), ("3p-5h", "Claude"), ("3p-weekly", "Claude Weekly") };
        foreach (var group in groups.EnumerateArray())
        {
            if (!group.TryGetProperty("buckets", out var buckets) || buckets.ValueKind != JsonValueKind.Array) continue;
            foreach (var bucket in buckets.EnumerateArray())
            {
                var id = UsageParser.String(bucket, "bucketId");
                if (id == null || !labels.Any(p => p.Item1 == id) || values.ContainsKey(id)) continue;
                if (!bucket.TryGetProperty("remainingFraction", out var fraction) || fraction.ValueKind != JsonValueKind.Number || !fraction.TryGetDouble(out var remaining) || !double.IsFinite(remaining)) continue;
                values[id] = new(labels.First(p => p.Item1 == id).Item2, Math.Round((1 - Math.Clamp(remaining, 0, 1)) * 100), DateTimeOffset.TryParse(UsageParser.String(bucket, "resetTime"), out var reset) ? reset : null);
            }
        }
        return new("antigravity", "Antigravity", plan, labels.Where(p => values.ContainsKey(p.Item1)).Select(p => values[p.Item1]).ToArray(), now);
    }
}

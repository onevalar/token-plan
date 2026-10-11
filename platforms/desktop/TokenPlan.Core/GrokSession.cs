using System.Text.Json;
namespace TokenPlan.Core;

public record GrokSession(string AccessToken, string? RefreshToken, string ClientID, DateTimeOffset? Expiry, string AccountKey = "")
{
    public static void SaveRefresh(string home, GrokSession original, GrokSession refreshed)
    {
        var file = Path.Combine(home, ".grok", "auth.json");
        if (new FileInfo(file).Length > 2 * 1024 * 1024) throw new InvalidDataException();
        var originalText = File.ReadAllText(file);
        var document = System.Text.Json.Nodes.JsonNode.Parse(originalText) as System.Text.Json.Nodes.JsonObject ?? throw new InvalidDataException();
        if (document[original.AccountKey] is not System.Text.Json.Nodes.JsonObject entry || entry["key"]?.GetValue<string>() != original.AccessToken) throw new IOException("Grok login changed during refresh");
        entry["key"] = refreshed.AccessToken; entry["refresh_token"] = refreshed.RefreshToken; entry["expires_at"] = refreshed.Expiry?.ToString("O");
        var temporary = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
            if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            using (var stream = new FileStream(temporary, options)) JsonSerializer.Serialize(stream, document);
            // A second read guards against an account switch while encoding the replacement.
            var latestText = File.ReadAllText(file); if (latestText != originalText) throw new IOException("Grok login changed during refresh");
            using var latest = JsonDocument.Parse(latestText);
            if (!latest.RootElement.TryGetProperty(original.AccountKey, out var value) || UsageParser.String(value, "key") != original.AccessToken) throw new IOException("Grok login changed during refresh");
            File.Move(temporary, file, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
    public static GrokSession? Load(string home)
    {
        var file = Path.Combine(home, ".grok", "auth.json");
        if (!File.Exists(file)) return null;
        if (new FileInfo(file).Length > 2 * 1024 * 1024) throw new InvalidDataException();
        using var json = JsonDocument.Parse(File.ReadAllText(file));
        if (json.RootElement.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        foreach (var account in json.RootElement.EnumerateObject())
        {
            var token = UsageParser.String(account.Value, "key"); if (string.IsNullOrWhiteSpace(token)) continue;
            var refresh = UsageParser.String(account.Value, "refresh_token") ?? UsageParser.String(account.Value, "refresh");
            var client = UsageParser.String(account.Value, "oidc_client_id") ?? (account.Name.Contains("::") ? account.Name.Split("::").Last() : "b1a00492-073a-47ea-816f-4c329264a828");
            var raw = UsageParser.String(account.Value, "expires_at") ?? UsageParser.String(account.Value, "expires");
            return new(token, refresh, client, DateTimeOffset.TryParse(raw, out var expiry) ? expiry : null, account.Name);
        }
        return null;
    }
}

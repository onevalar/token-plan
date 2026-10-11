using Microsoft.Data.Sqlite;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TokenPlan.Core;

public static class LocalServiceAuth
{
    static string Read(string file)
    {
        if (new FileInfo(file).Length > 2 * 1024 * 1024) throw new InvalidDataException();
        return File.ReadAllText(file);
    }
    public static string? Copilot(string config)
    {
        foreach (var name in new[] { "apps.json", "hosts.json" })
        {
            var file = Path.Combine(config, "github-copilot", name);
            if (!File.Exists(file)) continue;
            using var json = JsonDocument.Parse(Read(file));
            if (json.RootElement.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
            foreach (var entry in json.RootElement.EnumerateObject())
                if ((entry.Name == "github.com" || entry.Name.StartsWith("github.com:", StringComparison.Ordinal)) && UsageParser.String(entry.Value, "oauth_token") is { Length: > 0 } token) return token;
        }
        var hosts = Path.Combine(config, "gh", "hosts.yml");
        if (!File.Exists(hosts)) return null;
        var inHost = false;
        foreach (var line in Read(hosts).Split('\n'))
        {
            if (line.Length > 0 && !char.IsWhiteSpace(line[0])) inHost = line.Trim() == "github.com:";
            else if (inHost && line.TrimStart().StartsWith("oauth_token:", StringComparison.Ordinal)) return line.Trim().Split(':', 2)[1].Trim().Trim('\'', '"');
        }
        return null;
    }
    public static string? OpenCode(string directory)
    {
        var hasTable = false;
        if (Directory.Exists(directory)) foreach (var file in Directory.EnumerateFiles(directory, "opencode*.db").Order())
        {
            using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = file, Mode = SqliteOpenMode.ReadOnly, Pooling = false, DefaultTimeout = 1 }.ToString());
            connection.Open();
            using var exists = connection.CreateCommand(); exists.CommandText = "SELECT 1 FROM sqlite_master WHERE type='table' AND name='credential'";
            if (exists.ExecuteScalar() == null) continue;
            hasTable = true;
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT json_extract(value,'$.key') FROM credential WHERE integration_id='opencode-go' AND (active IS NULL OR active=1) AND length(value)<=16384 ORDER BY active DESC,time_updated DESC,id DESC LIMIT 1";
            if (command.ExecuteScalar() is string key && !string.IsNullOrWhiteSpace(key)) return key.Trim();
        }
        // Once imported, the old auth.json must not resurrect a logged-out database credential.
        if (hasTable) return null;
        var auth = Path.Combine(directory, "auth.json");
        if (!File.Exists(auth)) return null;
        using var json = JsonDocument.Parse(Read(auth));
        return UsageParser.String(KeyUsageParser.Field(json.RootElement, "opencode-go"), "key");
    }
    public static string? DevinDesktop(string config)
    {
        var database = Path.Combine(config, "Devin", "User", "globalStorage", "state.vscdb");
        if (!File.Exists(database)) return null;
        using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = database, Mode = SqliteOpenMode.ReadOnly, Pooling = false, DefaultTimeout = 1 }.ToString()); connection.Open();
        using var command = connection.CreateCommand(); command.CommandText = "SELECT value FROM ItemTable WHERE key='windsurfAuthStatus' AND length(value)<=65536 LIMIT 1";
        if (command.ExecuteScalar() is not string value) return null;
        using var json = JsonDocument.Parse(value); return UsageParser.String(json.RootElement, "apiKey");
    }
    public static string DevinServer(string dataHome)
    {
        var file = Path.Combine(dataHome, "devin", "credentials.toml");
        if (!File.Exists(file)) return "https://server.codeium.com";
        var match = Regex.Match(Read(file), "(?m)^api_server_url\\s*=\\s*[\"']([^\"']+)[\"']");
        if (!match.Success) return "https://server.codeium.com";
        if (!Uri.TryCreate(match.Groups[1].Value.Trim(), UriKind.Absolute, out var uri) || uri.Scheme != "https" || uri.UserInfo.Length != 0 || uri.Query.Length != 0 || uri.Fragment.Length != 0) throw new InvalidDataException();
        return uri.AbsoluteUri.TrimEnd('/');
    }
    public static string? Devin(string dataHome)
    {
        var file = Path.Combine(dataHome, "devin", "credentials.toml");
        if (!File.Exists(file)) return null;
        var match = Regex.Match(Read(file), "(?m)^windsurf_api_key\\s*=\\s*[\"']([^\"']+)[\"']");
        return match.Success ? match.Groups[1].Value : null;
    }
    public static string? Grok(string home)
    {
        var file = Path.Combine(home, ".grok", "auth.json");
        if (!File.Exists(file)) return null;
        using var json = JsonDocument.Parse(Read(file));
        if (json.RootElement.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        return json.RootElement.EnumerateObject().Select(e => UsageParser.String(e.Value, "key")).FirstOrDefault(k => !string.IsNullOrWhiteSpace(k));
    }
}

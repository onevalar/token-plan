using System.Text.Json;
namespace TokenPlan.Core;

public record ClaudeAccountMetadata(string Identity, string? Email)
{
    public static ClaudeAccountMetadata? Read(string directory, string userHome)
    {
        var comparer = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        var isDefault = string.Equals(Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar), Path.Combine(userHome, ".claude"), comparer);
        var path = isDefault ? Path.Combine(userHome, ".claude.json") : Path.Combine(directory, ".claude.json");
        try
        {
            if (!File.Exists(path) || new FileInfo(path).Length > 2 * 1024 * 1024) return null;
            using var json = JsonDocument.Parse(File.ReadAllText(path));
            if (!json.RootElement.TryGetProperty("oauthAccount", out var account) || account.ValueKind != JsonValueKind.Object) return null;
            if (!Guid.TryParse(UsageParser.String(account, "accountUuid"), out var user)) return null;
            var identity = user.ToString("D");
            if (Guid.TryParse(UsageParser.String(account, "organizationUuid"), out var organization)) identity += "|" + organization.ToString("D");
            var email = UsageParser.String(account, "emailAddress")?.Trim();
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@') || email.Any(char.IsWhiteSpace)) email = null;
            return new(identity, email);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException or InvalidOperationException)
        { DiagnosticLog.Write("claude", "Account metadata could not be read."); return null; }
    }
}

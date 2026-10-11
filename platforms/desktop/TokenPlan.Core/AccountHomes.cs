using System.Text.Json;
namespace TokenPlan.Core;

public record AccountHome(string Home, string Label, string? AuthFile = null, bool Encoded = false);
public static class AccountHomes
{
    public static IReadOnlyList<AccountHome> Discover(string family, string home, string defaultHome, Func<string, string?>? environment = null)
    {
        environment ??= Environment.GetEnvironmentVariable;
        var candidates = new List<AccountHome>();
        if (family == "claude")
        {
            foreach (var path in (environment("CLAUDE_CONFIG_DIR") ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                if (Path.IsPathFullyQualified(path)) candidates.Add(new(path, Path.GetFileName(path)));
        }
        if (family == "claude")
        {
            var vault = Path.Combine(home, ".claude-swap-backup"); var sequence = Path.Combine(vault, "sequence.json");
            if (File.Exists(sequence))
            {
                if (new FileInfo(sequence).Length > 2 * 1024 * 1024) throw new InvalidDataException();
                using var json = JsonDocument.Parse(File.ReadAllText(sequence));
                foreach (var account in json.RootElement.GetProperty("accounts").EnumerateObject())
                {
                    var email = UsageParser.String(account.Value, "email");
                    if (account.Name.Length == 0 || !account.Name.All(char.IsAsciiDigit) || string.IsNullOrWhiteSpace(email) || email.IndexOfAny(new[] { '/', '\\', '\0' }) >= 0) continue;
                    if (!Guid.TryParse(UsageParser.String(account.Value, "uuid"), out _) || !Guid.TryParse(UsageParser.String(account.Value, "organizationUuid"), out _)) continue;
                    var credential = Path.Combine(vault, "credentials", ".creds-" + account.Name + "-" + email + ".enc");
                    if (File.Exists(credential)) candidates.Add(new(vault, UsageParser.String(account.Value, "organizationName") ?? email, credential, true));
                }
            }
        }
        if (family == "codex")
        {
            foreach (var path in (environment("TOKENPLAN_CODEX_HOMES") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
                if (Path.IsPathFullyQualified(path)) candidates.Add(new(path, Path.GetFileName(path)));
            var registry = Path.Combine(environment("XSWAP_HOME") ?? Path.Combine(environment("XDG_DATA_HOME") ?? Path.Combine(home, ".local", "share"), "codex-swap"), "accounts.json");
            if (File.Exists(registry))
            {
                if (new FileInfo(registry).Length > 2 * 1024 * 1024) throw new InvalidDataException();
                using var json = JsonDocument.Parse(File.ReadAllText(registry));
                if (!json.RootElement.TryGetProperty("schemaVersion", out var schema) || schema.GetInt32() != 1) throw new InvalidDataException();
                foreach (var account in json.RootElement.GetProperty("accounts").EnumerateArray())
                {
                    var path = UsageParser.String(account, "home");
                    if (!string.IsNullOrWhiteSpace(path) && Path.IsPathFullyQualified(path)) candidates.Add(new(path, UsageParser.String(account, "alias") ?? Path.GetFileName(path)));
                }
            }
        }
        var comparer = OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal;
        return candidates.Where(c => !comparer.Equals(Path.GetFullPath(c.Home).TrimEnd(Path.DirectorySeparatorChar), Path.GetFullPath(defaultHome).TrimEnd(Path.DirectorySeparatorChar)))
            .DistinctBy(c => Path.GetFullPath(c.AuthFile ?? c.Home), comparer).Take(20).ToArray();
    }
}

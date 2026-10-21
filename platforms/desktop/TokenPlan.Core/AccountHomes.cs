using System.Text.Json;
namespace TokenPlan.Core;

public record AccountHome(string Home, string Label, string? AuthFile = null, bool Encoded = false, bool CanRefresh = true, string? Identity = null);
public static class AccountHomes
{
    public static IReadOnlyList<AccountHome> Discover(string family, string home, string defaultHome, Func<string, string?>? environment = null)
    {
        environment ??= Environment.GetEnvironmentVariable;
        var candidates = new List<AccountHome>();
        var registrations = Path.Combine(home, ".tokenplan-account-directories.json");
        if (File.Exists(registrations)) {
            if (new FileInfo(registrations).Length > 1024 * 1024) throw new InvalidDataException();
            var saved = JsonSerializer.Deserialize<Dictionary<string, string[]>>(File.ReadAllText(registrations)) ?? [];
            foreach (var path in saved.GetValueOrDefault(family, []).Take(64))
                if (Path.IsPathFullyQualified(path)) candidates.Add(new(path, Path.GetFileName(path)));
        }
        if (family == "claude")
        {
            foreach (var path in (environment("CLAUDE_CONFIG_DIR") ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                if (Path.IsPathFullyQualified(path)) candidates.Add(new(path, Path.GetFileName(path)));
        }
        if (family == "claude")
        {
            if (Directory.Exists(home))
                foreach (var directory in Directory.EnumerateDirectories(home).Order(StringComparer.Ordinal))
                {
                    var name = Path.GetFileName(directory);
                    if (name != ".claude" && !name.StartsWith(".claude-", StringComparison.Ordinal)) continue;
                    if ((File.GetAttributes(directory) & FileAttributes.ReparsePoint) != 0) continue;
                    if (ClaudeAccountMetadata.Read(directory, home) is { } metadata)
                        candidates.Add(new(directory, metadata.Email ?? name));
                }
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
                    if (File.Exists(credential)) candidates.Add(new(vault, email, credential, true, Identity: Guid.Parse(UsageParser.String(account.Value, "uuid")!).ToString("D") + "|" + Guid.Parse(UsageParser.String(account.Value, "organizationUuid")!).ToString("D")));
                }
            }
        }
        if (family == "codex")
        {
            if (Directory.Exists(home))
                foreach (var directory in Directory.EnumerateDirectories(home, ".codex-*").Order(StringComparer.Ordinal))
                    if ((File.GetAttributes(directory) & FileAttributes.ReparsePoint) == 0) candidates.Add(new(directory, Path.GetFileName(directory)));

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
                    if (!string.IsNullOrWhiteSpace(path) && Path.IsPathFullyQualified(path)) candidates.Add(new(path, UsageParser.String(account, "alias") ?? Path.GetFileName(path), CanRefresh: false));
                }
            }
        }
        var comparer = OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal;
        return candidates.Where(c => !comparer.Equals(Path.GetFullPath(c.Home).TrimEnd(Path.DirectorySeparatorChar), Path.GetFullPath(defaultHome).TrimEnd(Path.DirectorySeparatorChar)))
            .GroupBy(c => Path.GetFullPath(c.AuthFile ?? c.Home), comparer)
            .Select(group => group.OrderBy(c => c.CanRefresh).First()).Take(20).ToArray();
    }
}

using System.Net;
using System.Text.Json;
using TokenPlan.Core;

static class ClaudeAccountChecks
{
    public static async Task Run(Action<bool, string> check)
    {
        var root = Path.Combine(Path.GetTempPath(), "tokenplan-accounts-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var primary = Path.Combine(root, ".claude");
            var second = Path.Combine(root, ".claude-account2");
            var copy = Path.Combine(root, ".claude-copy");
            var unrelated = Path.Combine(root, ".claude-empty");
            foreach (var dir in new[] { primary, second, copy, unrelated }) Directory.CreateDirectory(dir);
            string Metadata(string user, string org, string email) => JsonSerializer.Serialize(new { oauthAccount = new { accountUuid = user, organizationUuid = org, emailAddress = email, organizationName = email + "'s Organization" } });
            var firstData = Metadata("11111111-1111-1111-1111-111111111111", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "first@example.com");
            File.WriteAllText(Path.Combine(root, ".claude.json"), firstData);
            File.WriteAllText(Path.Combine(copy, ".claude.json"), firstData);
            File.WriteAllText(Path.Combine(second, ".claude.json"), Metadata("22222222-2222-2222-2222-222222222222", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "second@example.com"));
            string Credentials(string token) => JsonSerializer.Serialize(new { claudeAiOauth = new { accessToken = token, subscriptionType = "pro" } });
            File.WriteAllText(Path.Combine(primary, ".credentials.json"), Credentials("first-token"));
            File.WriteAllText(Path.Combine(second, ".credentials.json"), Credentials("second-token"));
            var discovered = AccountHomes.Discover("claude", root, primary, _ => null);
            check(discovered.Count == 2 && discovered.All(a => a.Home != unrelated), "Claude scans only named account homes and excludes primary");
            check(discovered.Single(a => a.Home == second).Label == "second@example.com", "Claude email excludes organization metadata");
            var tokens = new List<string?>();
            using var handler = new Stub((request, _) => {
                tokens.Add(request.Headers.Authorization?.Parameter);
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"five_hour":{"utilization":16}}""") });
            });
            using var service = new ProviderService(primary, primary, handler, (_, _) => {}, userHome: root);
            var current = await service.Refresh("claude", CancellationToken.None);
            var accounts = await service.RefreshAdditionalAccounts("claude", CancellationToken.None);
            check(accounts.Count == 1 && tokens.SequenceEqual(new[] { "first-token", "second-token" }), "Separate credentials and default identity deduplication");
            check(current.AccountEmail == "first@example.com" && accounts[0].AccountEmail == "second@example.com" && accounts[0].Snapshot?.Plan == "Pro", "Default and additional accounts expose email and plan");
            var stableKey = accounts[0].AccountKey;
            File.WriteAllText(Path.Combine(second, ".credentials.json"), Credentials("rotated-second-token"));
            accounts = await service.RefreshAdditionalAccounts("claude", CancellationToken.None);
            check(accounts[0].AccountKey == stableKey, "Account settings and history survive token rotation");
            File.Delete(Path.Combine(second, ".credentials.json"));
            var count = tokens.Count;
            accounts = await service.RefreshAdditionalAccounts("claude", CancellationToken.None);
            check(accounts[0].Snapshot == null && accounts[0].ErrorKey != null && tokens.Count == count, "Missing separate credentials cannot fall back to primary account");
            File.WriteAllText(Path.Combine(copy, ".credentials.json"), Credentials("independent-first-token"));
            File.WriteAllText(Path.Combine(root, ".tokenplan-account-directories.json"), JsonSerializer.Serialize(new { claude = new[] { copy } }));
            accounts = await service.RefreshAdditionalAccounts("claude", CancellationToken.None);
            var independent = accounts.Single(a => a.AccountIdentity == current.AccountIdentity);
            check(independent.LoginDirectory == copy && independent.Snapshot != null && tokens.Last() == "independent-first-token", "Registered independent login remains available alongside the default identity");
        }
        finally { Directory.Delete(root, true); }
    }
}

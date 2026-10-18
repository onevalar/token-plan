namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    string? accountIdentityHint;
    public Func<ProviderResult, bool> IsAccountRemoved { get; set; } = _ => false;
    readonly Dictionary<string, ProviderService> accountServices = new();
    public async Task<IReadOnlyList<ProviderResult>> RefreshAdditionalAccounts(string family, CancellationToken cancellation)
    {
        if (family is not ("claude" or "codex")) return Array.Empty<ProviderResult>();
        var home = userHome;
        var sources = AccountHomes.Discover(family, home, family == "claude" ? claudeHome : codexHome);
        var output = new List<ProviderResult>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        if (family == "claude" && ClaudeAccountMetadata.Read(claudeHome, userHome) is { } primary) seen.Add(primary.Identity);
        foreach (var source in sources)
        {
            var metadata = family == "claude" && source.AuthFile == null ? ClaudeAccountMetadata.Read(source.Home, userHome) : null;
            if (metadata != null && !seen.Add(metadata.Identity)) continue;
            var key = family + "\0" + (source.AuthFile ?? source.Home);
            if (!accountServices.TryGetValue(key, out var service))
            {
                service = new(family == "codex" ? source.Home : codexHome, family == "claude" ? source.Home : claudeHome, handler: accountHandler, log: log, keys: Keys, userHome: userHome, alternateAuthFile: source.AuthFile, encodedAuth: source.Encoded, requestTimeout: http.Timeout, allowAuthRefresh: allowAuthRefresh && source.CanRefresh);
                accountServices[key] = service;
            }
            service.accountIdentityHint = source.Identity;
            service.IsAccountRemoved = IsAccountRemoved;
            var result = await service.Refresh(family, cancellation);
            if (IsAccountRemoved(result)) continue;
            output.Add(result with { Name = ProviderCatalog.Get(family).Name + " · " + source.Label, AccountKey = family + ":" + Fingerprint(result.AccountIdentity ?? key), AccountEmail = result.AccountEmail ?? (source.Encoded ? source.Label : null) });
        }
        return output.DistinctBy(r => r.CredentialFingerprint ?? r.Name).ToArray();
    }
}

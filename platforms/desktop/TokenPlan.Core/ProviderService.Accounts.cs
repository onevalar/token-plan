namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    readonly Dictionary<string, ProviderService> accountServices = new();
    public async Task<IReadOnlyList<ProviderResult>> RefreshAdditionalAccounts(string family, CancellationToken cancellation)
    {
        if (family is not ("claude" or "codex")) return Array.Empty<ProviderResult>();
        var home = userHome;
        var sources = AccountHomes.Discover(family, home, family == "claude" ? claudeHome : codexHome);
        var output = new List<ProviderResult>();
        foreach (var source in sources)
        {
            var key = family + "\0" + (source.AuthFile ?? source.Home);
            if (!accountServices.TryGetValue(key, out var service))
            {
                service = new(family == "codex" ? source.Home : codexHome, family == "claude" ? source.Home : claudeHome, log: log, keys: Keys, alternateAuthFile: source.AuthFile, encodedAuth: source.Encoded);
                accountServices[key] = service;
            }
            var result = await service.Refresh(family, cancellation);
            output.Add(result with { Name = ProviderCatalog.Get(family).Name + " · " + source.Label });
        }
        return output.DistinctBy(r => r.CredentialFingerprint ?? r.Name).ToArray();
    }
}

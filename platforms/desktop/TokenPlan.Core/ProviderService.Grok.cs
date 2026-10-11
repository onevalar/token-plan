using System.Net.Http.Headers;
using System.Text.Json;
namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    readonly Dictionary<string, GrokSession> grokSessions = new();
    async Task<ProviderResult> RefreshGrok(CancellationToken cancellation)
    {
        var source = GrokSession.Load(userHome) ?? throw new ProviderFailure("Grok not logged in. Run `grok login`.");
        var identity = Fingerprint(source.AccessToken); var cooldown = "grok" + identity; CheckCooldown(cooldown); attemptIdentities["grok"] = identity;
        var current = grokSessions.GetValueOrDefault(identity) ?? source;
        async Task Renew()
        {
            if (string.IsNullOrWhiteSpace(current.RefreshToken)) throw new ProviderFailure("Grok auth expired. Run `grok login` again.");
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://auth.x.ai/oauth2/token");
            request.Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "refresh_token", ["refresh_token"] = current.RefreshToken, ["client_id"] = current.ClientID });
            using var response = JsonDocument.Parse(await Fetch(request, cooldown, cancellation));
            var access = UsageParser.String(response.RootElement, "access_token"); if (string.IsNullOrWhiteSpace(access)) throw new InvalidDataException();
            var lifetime = Math.Clamp(KeyUsageParser.Number(response.RootElement, "expires_in") ?? 3600, 0, 86400);
            current = new(access, UsageParser.String(response.RootElement, "refresh_token") ?? current.RefreshToken, current.ClientID, DateTimeOffset.UtcNow.AddSeconds(lifetime), source.AccountKey);
            GrokSession.SaveRefresh(userHome, source, current);
            grokSessions.Clear(); grokSessions[identity] = current;
        }
        if (current.Expiry < DateTimeOffset.UtcNow.AddMinutes(5)) await Renew();
        async Task<string> Billing()
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://cli-chat-proxy.grok.com/v1/billing?format=credits");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", current.AccessToken); request.Headers.Add("X-XAI-Token-Auth", "xai-grok-cli");
            return await Fetch(request, cooldown, cancellation);
        }
        string body;
        try { body = await Billing(); }
        catch (ProviderFailure e) when (e.Message == "Your session has expired. Sign in with the CLI again.") { await Renew(); body = await Billing(); }
        return new("grok", "Grok", LocalServiceUsage.Parse("grok", body, DateTimeOffset.UtcNow), null, identity);
    }
}

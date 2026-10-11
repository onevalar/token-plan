using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    readonly Dictionary<string, (string Token, DateTimeOffset Expiry)> antigravityTokens = new();
    async Task<ProviderResult> RefreshAntigravity(CancellationToken cancellation)
    {
        string? raw;
        try { raw = await credentialReader("gemini", "antigravity", cancellation); }
        catch (IOException) { throw new ProviderFailure("System credentials could not be read. Unlock your login keyring and try again."); }
        if (raw == null) throw new ProviderFailure("Sign in with Antigravity, then refresh.");
        var login = AntigravityUsage.ParseLogin(raw);
        var fingerprint = Fingerprint(login.RefreshToken ?? login.AccessToken!); attemptIdentities["antigravity"] = fingerprint; var cooldown = "antigravity" + fingerprint; CheckCooldown(cooldown);
        var access = login.AccessToken;
        if (antigravityTokens.TryGetValue(fingerprint, out var cached) && cached.Expiry > DateTimeOffset.UtcNow.AddSeconds(60)) access = cached.Token;
        else if (string.IsNullOrWhiteSpace(access) || login.ExpiresAt < DateTimeOffset.UtcNow.AddSeconds(60)) access = await Renew();
        async Task<string> Renew()
        {
            if (string.IsNullOrWhiteSpace(login.RefreshToken)) throw new ProviderFailure("Sign in with Antigravity, then refresh.");
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");
            // Installed-app client values also shipped by the Mac implementation; not user credentials.
            request.Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["client_id"] = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com", ["client_secret"] = "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", ["refresh_token"] = login.RefreshToken, ["grant_type"] = "refresh_token" });
            using var payload = JsonDocument.Parse(await Fetch(request, cooldown, cancellation));
            var token = UsageParser.String(payload.RootElement, "access_token");
            if (string.IsNullOrWhiteSpace(token)) throw new InvalidDataException();
            var lifetime = payload.RootElement.TryGetProperty("expires_in", out var expires) && expires.TryGetDouble(out var seconds) && double.IsFinite(seconds) ? Math.Clamp(seconds, 0, 86400) : 3600;
            antigravityTokens.Clear(); antigravityTokens[fingerprint] = (token, DateTimeOffset.UtcNow.AddSeconds(lifetime)); return token;
        }
        async Task<string> Call(string path, string body, CancellationToken? metadataToken = null)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://cloudcode-pa.googleapis.com/v1internal:" + path);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
            request.Headers.UserAgent.ParseAdd(path == "loadCodeAssist" ? "agy" : "antigravity");
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");
            return await Fetch(request, metadataToken.HasValue ? cooldown + ":metadata" : cooldown, metadataToken ?? cancellation);
        }
        string summary;
        try { summary = await Call("retrieveUserQuotaSummary", "{}"); }
        catch (ProviderFailure e) when (e.Message == "Your session has expired. Sign in with the CLI again.") { access = await Renew(); summary = await Call("retrieveUserQuotaSummary", "{}"); }
        var snapshot = AntigravityUsage.Parse(summary, DateTimeOffset.UtcNow);
        using var metadataDeadline = OptionalMetadataDeadline(cancellation);
        try
        {
            using var profile = JsonDocument.Parse(await Call("loadCodeAssist", "{}", metadataDeadline.Token));
            var root = profile.RootElement;
            snapshot = snapshot with { Plan = UsageParser.String(KeyUsageParser.Field(root, "paidTier"), "name") ?? UsageParser.String(KeyUsageParser.Field(root, "currentTier"), "name") };
        }
        catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { log("antigravity", "Account plan timed out; keeping quota."); }
        catch (Exception e) when (e is ProviderFailure or JsonException or HttpRequestException or InvalidDataException) { log("antigravity", "Plan name could not be fetched; quota is available."); }
        return new("antigravity", "Antigravity", snapshot, null, fingerprint);
    }
}

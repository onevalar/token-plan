namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    async Task<ProviderResult> RefreshOllama(CancellationToken cancellation)
    {
        var file = Path.Combine(userHome, ".ollama", "id_ed25519");
        if (!File.Exists(file)) throw new ProviderFailure("No Ollama key found. Install Ollama and run `ollama signin` to track cloud usage.");
        if (new FileInfo(file).Length > 16384) throw new InvalidDataException();
        using var key = OllamaSigningKey.Parse(await File.ReadAllTextAsync(file, cancellation));
        var fingerprint = Fingerprint(key.PublicKey); attemptIdentities["ollama"] = fingerprint; var cooldown = "ollama" + fingerprint; CheckCooldown(cooldown);
        var uri = "/api/usage?ts=" + DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://ollama.com" + uri);
        request.Headers.TryAddWithoutValidation("Authorization", key.Authorization("GET", uri));
        try
        {
            var snapshot = OllamaUsage.Parse(await Fetch(request, cooldown, cancellation), DateTimeOffset.UtcNow);
            using var metadataDeadline = OptionalMetadataDeadline(cancellation);
            try
            {
                var accountURI = "/api/me?ts=" + DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                using var account = new HttpRequestMessage(HttpMethod.Post, "https://ollama.com" + accountURI);
                account.Headers.TryAddWithoutValidation("Authorization", key.Authorization("POST", accountURI));
                using var profile = System.Text.Json.JsonDocument.Parse(await Fetch(account, cooldown + ":metadata", metadataDeadline.Token));
                snapshot = snapshot with { Plan = UsageParser.String(profile.RootElement, "Plan") ?? UsageParser.String(profile.RootElement, "plan") };
            }
            catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { log("ollama", "Account plan timed out; keeping cloud usage."); }
            catch (Exception e) when (e is ProviderFailure or HttpRequestException or System.Text.Json.JsonException or InvalidDataException) { log("ollama", "Account plan could not be fetched; cloud usage is available."); }
            return new("ollama", "Ollama", snapshot, null, fingerprint);
        }
        catch (ProviderFailure e) when (e.Message == "Your session has expired. Sign in with the CLI again.") { throw new ProviderFailure("Not signed in to Ollama Cloud. Run `ollama signin` to see usage."); }
    }
}

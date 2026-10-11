using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    async Task<string> WithCodexResetCredits(string original, string token, string? account, string cooldown, CancellationToken cancellation)
    {
        using var metadataDeadline = OptionalMetadataDeadline(cancellation);
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            if (!string.IsNullOrWhiteSpace(account)) request.Headers.Add("ChatGPT-Account-Id", account);
            var json = await Fetch(request, cooldown + ":metadata", metadataDeadline.Token);
            using var reset = JsonDocument.Parse(json);
            if (KeyUsageParser.Number(reset.RootElement, "available_count") is not >= 0) return original;
            var body = JsonNode.Parse(original) as JsonObject ?? throw new InvalidDataException();
            body["rate_limit_reset_credits"] = JsonNode.Parse(json); return body.ToJsonString();
        }
        catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { return original; }
        catch (Exception e) when (e is ProviderFailure or HttpRequestException or JsonException or InvalidDataException)
        { log("codex", "Reset credits unavailable; keeping live usage and embedded grants."); return original; }
    }
}

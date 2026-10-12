using System.Text;
using System.Text.Json;
namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    async Task<ProviderResult?> RefreshAntigravityLocal(CancellationToken cancellation)
    {
        using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        budget.CancelAfter(TimeSpan.FromSeconds(5));
        try
        {
            var endpoints = await Task.Run(() => antigravityDiscovery(budget.Token), budget.Token);
            using var handler = new HttpClientHandler { AllowAutoRedirect = false, UseProxy = false,
                // Self-signed certificates are accepted only for the fixed loopback LS transport.
                ServerCertificateCustomValidationCallback = (request, _, _, _) => request.RequestUri?.Host == "127.0.0.1" };
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(1) };
            foreach (var endpoint in endpoints)
            {
                budget.Token.ThrowIfCancellationRequested();
                if (endpoint.Port is < 1 or > 65535) continue;
                try
                {
                    using var attempt = CancellationTokenSource.CreateLinkedTokenSource(budget.Token);
                    attempt.CancelAfter(TimeSpan.FromSeconds(1));
                    using var request = new HttpRequestMessage(HttpMethod.Post, $"{(endpoint.Https ? "https" : "http")}://127.0.0.1:{endpoint.Port}/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary");
                    request.Headers.Add("Connect-Protocol-Version", "1");
                    if (endpoint.Csrf.Length > 0) request.Headers.Add("x-codeium-csrf-token", endpoint.Csrf);
                    request.Content = new StringContent("""{"metadata":{"ideName":"antigravity","extensionName":"antigravity","ideVersion":"unknown","locale":"en"}}""", Encoding.UTF8, "application/json");
                    using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, attempt.Token);
                    if (!response.IsSuccessStatusCode) continue;
                    await using var stream = await response.Content.ReadAsStreamAsync(attempt.Token);
                    var bytes = await ReadBounded(stream, attempt.Token);
                    var snapshot = AntigravityUsage.Parse(Encoding.UTF8.GetString(bytes), DateTimeOffset.UtcNow);
                    // Local server responses have no verified account identifier. Do not retain account history.
                    return new("antigravity", "Antigravity", snapshot, null);
                }
                catch (OperationCanceledException) when (!budget.IsCancellationRequested) { }
                catch (Exception e) when (e is HttpRequestException or IOException or JsonException or InvalidDataException) { }
            }
            if (endpoints.Count > 0) log("antigravity", "Local quota service unavailable; trying system credentials.");
        }
        catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { log("antigravity", "Local quota discovery timed out; trying system credentials."); }
        return null;
    }
}

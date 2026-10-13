using System.Diagnostics;
using System.Net;
using System.Text;

namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    const string AccessDenied = "The provider denied access (403). Check account permissions or network restrictions; signing in again may not help.";
    const string ProxyDenied = "The proxy requires authentication. Check the desktop app's proxy settings.";
    const string NetworkTimeout = "The connection timed out. Check whether the desktop app can use your proxy or VPN, then retry.";
    static string NetworkError(HttpRequestException error) => error.HttpRequestError switch
    {
        HttpRequestError.NameResolutionError => "The provider address could not be resolved. Check DNS and proxy settings.",
        HttpRequestError.SecureConnectionError => "A secure connection could not be established. Check the system clock, certificates, and HTTPS proxy.",
        HttpRequestError.ProxyTunnelError => "The proxy connection failed. Check proxy access and authentication.",
        _ => "Cannot reach the provider. Check the desktop app's network, proxy, or VPN connection."
    };
    sealed record NetworkResponse(HttpStatusCode Status, string Body, DateTimeOffset? RetryAfter);
    async Task<NetworkResponse> SendReadDiagnosed(HttpRequestMessage request, CancellationToken ct)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(http.Timeout);
        var clock = Stopwatch.StartNew();
        // Deliberately exclude URL paths, queries, proxy addresses, headers and exception messages.
        var host = request.RequestUri?.Host ?? "unknown";
        var stage = "headers";
        var proxy = "unknown";
        try { proxy = request.RequestUri == null || HttpClient.DefaultProxy.IsBypassed(request.RequestUri) ? "direct" : "configured"; }
        catch { /* Proxy discovery is diagnostic only. */ }
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            log("network", $"host={host} status={(int)response.StatusCode} elapsedMs={clock.ElapsedMilliseconds} proxy={proxy}");
            stage = "body";
            // Error bodies aren't necessary outside the OAuth exchange, and may be large HTML proxy pages.
            var needsBody = response.IsSuccessStatusCode || request.RequestUri?.AbsolutePath == "/v1/oauth/token" || request.RequestUri?.AbsolutePath == "/oauth/token";
            var body = "";
            if (needsBody)
            {
                if (response.Content.Headers.ContentLength > 2 * 1024 * 1024) throw new InvalidDataException();
                await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
                body = Encoding.UTF8.GetString(await ReadBounded(stream, deadline.Token));
            }
            var retry = response.Headers.RetryAfter;
            return new(response.StatusCode, body, retry?.Date ?? (retry?.Delta is { } delta ? DateTimeOffset.UtcNow.Add(delta) : null));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            log("network", $"host={host} stage={stage} result=timeout elapsedMs={clock.ElapsedMilliseconds} proxy={proxy}");
            throw new ProviderFailure(NetworkTimeout);
        }
        catch (HttpRequestException error)
        {
            log("network", $"host={host} stage={stage} result={error.HttpRequestError} elapsedMs={clock.ElapsedMilliseconds} proxy={proxy}");
            throw;
        }
    }
}

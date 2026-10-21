using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace TokenPlan.Core;

public sealed partial class ProviderService : IDisposable
{
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, string> attemptIdentities = new();
    readonly HttpClient http;
    readonly HttpMessageHandler? accountHandler;
    readonly string userHome;
    readonly string? alternateAuthFile;
    readonly bool encodedAuth;
    readonly bool allowAuthRefresh;
    readonly Func<string, string, CancellationToken, Task<string?>> credentialReader;
    readonly Func<CancellationToken, IReadOnlyList<AntigravityEndpoint>> antigravityDiscovery;
    readonly string codexHome;
    readonly string claudeHome;
    readonly string cursorDatabase;
    readonly Action<string, string> log;
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTimeOffset> cooldowns = new();
    public ProviderService(string codexHome, string claudeHome, HttpMessageHandler? handler = null, Action<string, string>? log = null, TimeSpan? requestTimeout = null, string? cursorDatabase = null, APIKeyStore? keys = null, string? userHome = null, Func<string, string, CancellationToken, Task<string?>>? credentialReader = null, string? alternateAuthFile = null, bool encodedAuth = false, Func<CancellationToken, IReadOnlyList<AntigravityEndpoint>>? antigravityDiscovery = null, bool allowAuthRefresh = true)
    {
        Keys = keys ?? new();
        this.allowAuthRefresh = allowAuthRefresh;
        accountHandler = handler;
        this.antigravityDiscovery = antigravityDiscovery ?? (handler == null ? AntigravityLocalService.Discover : _ => []);
        this.alternateAuthFile = alternateAuthFile; this.encodedAuth = encodedAuth;
        this.userHome = userHome ?? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        this.credentialReader = credentialReader ?? SystemCredentialStore.Read;
        this.codexHome = codexHome;
        this.claudeHome = claudeHome.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault() ?? claudeHome;
        this.cursorDatabase = cursorDatabase ?? CursorAuth.DefaultDatabase;
        this.log = log ?? DiagnosticLog.Write;
        var timeout = requestTimeout ?? TimeSpan.FromSeconds(20);
        if (timeout <= TimeSpan.Zero || timeout > TimeSpan.FromSeconds(20)) throw new ArgumentOutOfRangeException(nameof(requestTimeout));
        http = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect = false }, disposeHandler: handler == null) { Timeout = timeout };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("TokenPlan/desktop");
    }
    public async Task<ProviderResult> Refresh(string id, CancellationToken cancellationToken)
    {
        var name = ProviderCatalog.Get(id).Name;
        // ResponseHeadersRead ends HttpClient's timeout at the headers; bound the body too.
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(id is "claude" or "codex" ? TimeSpan.FromMilliseconds(http.Timeout.TotalMilliseconds * 4 + 3000) : http.Timeout);
        var operationToken = deadline.Token;
        string? fingerprint = null;
        var metadata = id == "claude" && alternateAuthFile == null ? ClaudeAccountMetadata.Read(claudeHome, userHome) : null;
        attemptIdentities.TryRemove(id, out _);
        ProviderResult Fail(string key) { log(id, key); return new(id, name, null, key, fingerprint ?? attemptIdentities.GetValueOrDefault(id), AccountEmail: metadata?.Email, AccountIdentity: metadata?.Identity); }
        try
        {
            if (id == "grok") return await RefreshGrok(operationToken);
            if (id is "copilot" or "opencode" or "devin") return await RefreshLocal(id, operationToken);
            if (id == "ollama") return await RefreshOllama(operationToken);
            if (id == "antigravity") return await RefreshAntigravity(operationToken);
            if (id == "amp") return await RefreshAmp(operationToken);
            if (IsKeyProvider(id))
            {
                var apiKey = Keys.Load(id);
                if (apiKey == null) return Fail("Add an API key in service settings, then refresh.");
                fingerprint = Fingerprint(apiKey);
                CheckCooldown(id + fingerprint);
                return new(id, name, await FetchKeyUsage(id, apiKey, id + fingerprint, operationToken), null, fingerprint);
            }
            if (id is not ("claude" or "codex" or "cursor"))
                return Fail("This service integration is not available in this build.");
            if (id == "cursor")
            {
                var login = await Task.Run(() => CursorAuth.Load(cursorDatabase, operationToken), operationToken);
                if (login == null) return Fail("Sign in with the Cursor desktop app, then refresh.");
                fingerprint = Fingerprint(login.AccessToken);
                var cursorCooldown = id + fingerprint;
                CheckCooldown(cursorCooldown);
                using var usageRequest = new HttpRequestMessage(HttpMethod.Post, "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage");
                usageRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
                usageRequest.Headers.Add("Connect-Protocol-Version", "1");
                usageRequest.Content = new StringContent("{}", Encoding.UTF8, "application/json");
                var usage = await Fetch(usageRequest, cursorCooldown, operationToken);
                UsageSnapshot cursorSnapshot;
                try { cursorSnapshot = CursorUsageParser.Parse(usage, login.Membership, DateTimeOffset.UtcNow); }
                catch (InvalidDataException e)
                {
                    if (e.Message == "No active Cursor subscription.") return Fail(e.Message);
                    var user = CursorAuth.SessionUser(login.AccessToken);
                    if (user == null) return Fail("Total usage limit missing from API response.");
                    var cookie = "WorkosCursorSessionToken=" + Uri.EscapeDataString(user) + "%3A%3A" + Uri.EscapeDataString(login.AccessToken);
                    using var summaryRequest = new HttpRequestMessage(HttpMethod.Get, "https://cursor.com/api/usage-summary");
                    summaryRequest.Headers.Add("Cookie", cookie);
                    var summary = await Fetch(summaryRequest, cursorCooldown, operationToken, allowMissing: true);
                    using var requestsRequest = new HttpRequestMessage(HttpMethod.Get, "https://cursor.com/api/usage?user=" + Uri.EscapeDataString(user));
                    requestsRequest.Headers.Add("Cookie", cookie);
                    var requests = await Fetch(requestsRequest, cursorCooldown, operationToken, allowMissing: true);
                    try { cursorSnapshot = CursorUsageParser.Parse(usage, login.Membership, DateTimeOffset.UtcNow, summary, requests); }
                    catch (InvalidDataException) { return Fail("Total usage limit missing from API response."); }
                }
                return new(id, name, cursorSnapshot, null, fingerprint);
            }
            return await RefreshOAuth(id, operationToken);
        }
        catch (ProviderFailure e) { return Fail(e.Message == "Your session has expired. Sign in with the CLI again." && id == "cursor" ? "Your Cursor session has expired. Sign in with Cursor again." : e.Message); }
        catch (Microsoft.Data.Sqlite.SqliteException) { return Fail("Usage or login data could not be read. Check credential file permissions and format, then retry."); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (OperationCanceledException) { return Fail(id is "claude" or "codex" ? NetworkTimeout : "The connection timed out. Try again later."); }
        catch (HttpRequestException e) { return Fail(NetworkError(e)); }
        catch (Exception e) when (e is JsonException or InvalidDataException or FormatException or ArgumentException or IOException or UnauthorizedAccessException or InvalidOperationException or CryptographicException)
        {
            return Fail("Usage or login data could not be read. Check credential file permissions and format, then retry.");
        }
    }
    CancellationTokenSource OptionalMetadataDeadline(CancellationToken cancellation)
    {
        var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        deadline.CancelAfter(TimeSpan.FromMilliseconds(Math.Min(3000, http.Timeout.TotalMilliseconds / 4)));
        return deadline;
    }
    static string Fingerprint(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    void CheckCooldown(string key)
    {
        if (cooldowns.GetValueOrDefault(key) > DateTimeOffset.UtcNow) throw new ProviderFailure("Usage queries are temporarily rate limited. Data may be out of date. Retrying automatically later.");
    }
    async Task<string> Fetch(HttpRequestMessage request, string cooldownKey, CancellationToken operationToken, bool allowMissing = false)
    {
        var response = await SendReadDiagnosed(request, operationToken);
        if (allowMissing && response.Status == HttpStatusCode.NotFound) return "{}";
        if (response.Status == HttpStatusCode.Unauthorized) throw new ProviderFailure("Your session has expired. Sign in with the CLI again.", response.Status);
        if (response.Status == HttpStatusCode.Forbidden) throw new ProviderFailure(AccessDenied, response.Status);
        if (response.Status == HttpStatusCode.ProxyAuthenticationRequired) throw new ProviderFailure(ProxyDenied, response.Status);
        if (response.Status == HttpStatusCode.TooManyRequests)
        {
            var next = response.RetryAfter ?? DateTimeOffset.UtcNow.AddMinutes(5);
            cooldowns[cooldownKey] = next > DateTimeOffset.UtcNow.AddMinutes(1) ? next : DateTimeOffset.UtcNow.AddMinutes(1);
            throw new ProviderFailure("Usage queries are temporarily rate limited. Data may be out of date. Retrying automatically later.", response.Status);
        }
        if ((int)response.Status is < 200 or >= 300) throw new ProviderFailure("The provider could not return usage. Try again later.", response.Status);
        return response.Body;
    }

    static async Task<byte[]> ReadBounded(Stream stream, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[8192];
        int count;
        while ((count = await stream.ReadAsync(chunk, cancellationToken)) > 0)
        {
            if (buffer.Length + count > 2 * 1024 * 1024) throw new InvalidDataException();
            buffer.Write(chunk, 0, count);
        }
        return buffer.ToArray();
    }
    public void Dispose() { http.Dispose(); foreach (var service in accountServices.Values) service.Dispose(); accountServices.Clear(); }
    sealed class ProviderFailure(string key, HttpStatusCode? status = null) : Exception(key) { public HttpStatusCode? Status { get; } = status; }
}

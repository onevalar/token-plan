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
    readonly Func<string, string, CancellationToken, Task<string?>> credentialReader;
    readonly Func<CancellationToken, IReadOnlyList<AntigravityEndpoint>> antigravityDiscovery;
    readonly string codexHome;
    readonly string claudeHome;
    readonly string cursorDatabase;
    readonly Action<string, string> log;
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTimeOffset> cooldowns = new();
    public ProviderService(string codexHome, string claudeHome, HttpMessageHandler? handler = null, Action<string, string>? log = null, TimeSpan? requestTimeout = null, string? cursorDatabase = null, APIKeyStore? keys = null, string? userHome = null, Func<string, string, CancellationToken, Task<string?>>? credentialReader = null, string? alternateAuthFile = null, bool encodedAuth = false, Func<CancellationToken, IReadOnlyList<AntigravityEndpoint>>? antigravityDiscovery = null)
    {
        Keys = keys ?? new();
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
        deadline.CancelAfter(http.Timeout);
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
            var filename = alternateAuthFile ?? Path.Combine(id == "codex" ? codexHome : claudeHome, id == "codex" ? "auth.json" : ".credentials.json");
            if (!File.Exists(filename)) return Fail(id == "codex" ? "Sign in with the Codex CLI, then refresh." : "Sign in with Claude Code, then refresh.");
            var file = new FileInfo(filename);
            if (file.Length > 2 * 1024 * 1024) throw new InvalidDataException();
            byte[] authBytes;
            // Release the login file before networking; CLI login/rotation must remain possible.
            await using (var authStream = new FileStream(filename, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 8192, FileOptions.Asynchronous | FileOptions.SequentialScan))
                authBytes = await ReadBounded(authStream, operationToken);
            if (encodedAuth) authBytes = Convert.FromBase64String(Encoding.UTF8.GetString(authBytes).Trim());
            using var auth = JsonDocument.Parse(authBytes);
            var key = id == "codex" ? "tokens" : "claudeAiOauth";
            if (auth.RootElement.ValueKind != JsonValueKind.Object || !auth.RootElement.TryGetProperty(key, out var tokens) || tokens.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
            var token = UsageParser.String(tokens, id == "codex" ? "access_token" : "accessToken");
            if (string.IsNullOrWhiteSpace(token)) throw new InvalidDataException();
            fingerprint = Fingerprint(token + "\0" + UsageParser.String(tokens, "account_id"));
            var cooldownKey = id + fingerprint;
            CheckCooldown(cooldownKey);
            using var request = new HttpRequestMessage(HttpMethod.Get, id == "codex" ? "https://chatgpt.com/backend-api/wham/usage" : "https://api.anthropic.com/api/oauth/usage");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Headers.Accept.ParseAdd("application/json");
            if (id == "codex" && UsageParser.String(tokens, "account_id") is { Length: > 0 } account) request.Headers.Add("ChatGPT-Account-Id", account);
            if (id == "claude") request.Headers.Add("anthropic-beta", "oauth-2025-04-20");
            var usageJSON = await Fetch(request, cooldownKey, operationToken);
            if (id == "codex") usageJSON = await WithCodexResetCredits(usageJSON, token, UsageParser.String(tokens, "account_id"), cooldownKey, operationToken);
            var snapshot = UsageParser.Parse(id, usageJSON, DateTimeOffset.UtcNow);
            if (id == "claude" && snapshot.Plan == null && UsageParser.String(tokens, "subscriptionType") is { Length: > 0 } plan)
                snapshot = snapshot with { Plan = plan.ToLowerInvariant() switch { "pro" => "Pro", "max" => "Max", "team" => "Team", "enterprise" => "Enterprise", "free" => "Free", _ => plan } };
            return new(id, name, snapshot, null, fingerprint, AccountEmail: metadata?.Email, AccountIdentity: metadata?.Identity);
        }
        catch (ProviderFailure e) { return Fail(e.Message == "Your session has expired. Sign in with the CLI again." && id == "cursor" ? "Your Cursor session has expired. Sign in with Cursor again." : e.Message); }
        catch (Microsoft.Data.Sqlite.SqliteException) { return Fail(id == "cursor" ? "Cursor login could not be read. Open Cursor and sign in again." : "Usage or login data could not be read. Sign in again."); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (OperationCanceledException) { return Fail("The connection timed out. Try again later."); }
        catch (HttpRequestException) { return Fail("Cannot reach the provider. Check your connection."); }
        catch (Exception e) when (e is JsonException or InvalidDataException or FormatException or ArgumentException or IOException or UnauthorizedAccessException or InvalidOperationException or CryptographicException)
        {
            return Fail("Usage or login data could not be read. Sign in again.");
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
        if (cooldowns.GetValueOrDefault(key) > DateTimeOffset.UtcNow) throw new ProviderFailure("Rate limited. Wait before refreshing again.");
    }
    async Task<string> Fetch(HttpRequestMessage request, string cooldownKey, CancellationToken operationToken, bool allowMissing = false)
    {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, operationToken);
            if (allowMissing && response.StatusCode == HttpStatusCode.NotFound) return "{}";
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden) throw new ProviderFailure("Your session has expired. Sign in with the CLI again.");
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var next = response.Headers.RetryAfter?.Date ?? DateTimeOffset.UtcNow.Add(response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMinutes(5));
                cooldowns[cooldownKey] = next > DateTimeOffset.UtcNow.AddMinutes(1) ? next : DateTimeOffset.UtcNow.AddMinutes(1);
                throw new ProviderFailure("Rate limited. Wait before refreshing again.");
            }
            if (!response.IsSuccessStatusCode) throw new ProviderFailure("The provider could not return usage. Try again later.");
            if (response.Content.Headers.ContentLength > 2 * 1024 * 1024) throw new InvalidDataException();
            await using var stream = await response.Content.ReadAsStreamAsync(operationToken);
            return Encoding.UTF8.GetString(await ReadBounded(stream, operationToken));
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
    sealed class ProviderFailure(string key) : Exception(key);
}

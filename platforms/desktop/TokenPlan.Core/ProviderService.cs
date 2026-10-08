using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace TokenPlan.Core;

public sealed partial class ProviderService : IDisposable
{
    readonly HttpClient http;
    readonly string codexHome;
    readonly string claudeHome;
    readonly string cursorDatabase;
    readonly Action<string, string> log;
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTimeOffset> cooldowns = new();
    public ProviderService(string codexHome, string claudeHome, HttpMessageHandler? handler = null, Action<string, string>? log = null, TimeSpan? requestTimeout = null, string? cursorDatabase = null)
    {
        this.codexHome = codexHome;
        this.claudeHome = claudeHome;
        this.cursorDatabase = cursorDatabase ?? CursorAuth.DefaultDatabase;
        this.log = log ?? DiagnosticLog.Write;
        var timeout = requestTimeout ?? TimeSpan.FromSeconds(20);
        if (timeout <= TimeSpan.Zero || timeout > TimeSpan.FromSeconds(20)) throw new ArgumentOutOfRangeException(nameof(requestTimeout));
        http = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = timeout };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("TokenPlan/desktop");
    }
    public async Task<ProviderResult> Refresh(string id, CancellationToken cancellationToken)
    {
        if (id is not ("claude" or "codex" or "cursor")) throw new ArgumentException("Unknown provider", nameof(id));
        var name = id == "claude" ? "Claude" : id == "codex" ? "Codex" : "Cursor";
        // ResponseHeadersRead ends HttpClient's timeout at the headers; bound the body too.
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(http.Timeout);
        var operationToken = deadline.Token;
        string? fingerprint = null;
        ProviderResult Fail(string key) { log(id, key); return new(id, name, null, key, fingerprint); }
        try
        {
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
            var filename = Path.Combine(id == "codex" ? codexHome : claudeHome, id == "codex" ? "auth.json" : ".credentials.json");
            if (!File.Exists(filename)) return Fail(id == "codex" ? "Sign in with the Codex CLI, then refresh." : "Sign in with Claude Code, then refresh.");
            var file = new FileInfo(filename);
            if (file.Length > 2 * 1024 * 1024) throw new InvalidDataException();
            byte[] authBytes;
            // Release the login file before networking; CLI login/rotation must remain possible.
            await using (var authStream = new FileStream(filename, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 8192, FileOptions.Asynchronous | FileOptions.SequentialScan))
                authBytes = await ReadBounded(authStream, operationToken);
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
            var snapshot = UsageParser.Parse(id, await Fetch(request, cooldownKey, operationToken), DateTimeOffset.UtcNow);
            return new(id, name, snapshot, null, fingerprint);
        }
        catch (ProviderFailure e) { return Fail(e.Message == "Your session has expired. Sign in with the CLI again." && id == "cursor" ? "Your Cursor session has expired. Sign in with Cursor again." : e.Message); }
        catch (Microsoft.Data.Sqlite.SqliteException) { return Fail("Cursor login could not be read. Open Cursor and sign in again."); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (OperationCanceledException) { return Fail("The connection timed out. Try again later."); }
        catch (HttpRequestException) { return Fail("Cannot reach the provider. Check your connection."); }
        catch (Exception e) when (e is JsonException or InvalidDataException or FormatException or ArgumentException or IOException or UnauthorizedAccessException)
        {
            return Fail("Usage or login data could not be read. Sign in again.");
        }
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
    public void Dispose() => http.Dispose();
    sealed class ProviderFailure(string key) : Exception(key);
}

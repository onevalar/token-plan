using System.Net;
using System.Text;
using TokenPlan.Core;

if (args.SequenceEqual(new[] { "usage" }) && Environment.GetEnvironmentVariable("TOKENPLAN_AMP_FIXTURE") is { } ampFixture)
{
    if (ampFixture == "error") { Console.Error.WriteLine("not logged in"); Environment.ExitCode = 1; return; }
    Console.WriteLine("Subscription Megawatt: 75% agent usage and 50% orb usage remaining\nIndividual credits: $12.50 USD remaining"); return;
}
var checks = 0;
void Check(bool condition, string message) { if (!condition) throw new Exception(message); checks++; }
void Throws(Action action, string message) { try { action(); } catch (InvalidDataException) { checks++; return; } throw new Exception(message); }
var now = DateTimeOffset.Parse("2026-10-07T00:00:00Z");
const string codex = """{"plan_type":"plus","rate_limit":{"primary_window":{"used_percent":12.5,"limit_window_seconds":18000,"reset_after_seconds":300},"secondary_window":{"used_percent":61,"limit_window_seconds":604800,"reset_at":1791331800}}}""";
var result = UsageParser.Parse("codex", codex, now);
var previous = new ProviderResult("codex", "Codex", result, null, "credential-a");
var stale = new ProviderResult("codex", "Codex", null, "Temporarily unavailable", "credential-a").PreserveLastSuccess(previous);
Check(stale.Snapshot == result && stale.ErrorKey != null && stale.Snapshot.FetchedAt == now, "Same-account failures preserve data with its original timestamp and error");
Check(new ProviderResult("codex", "Codex", null, "Expired", "credential-b").PreserveLastSuccess(previous).Snapshot == null, "Account changes cannot show prior-account data");
Check(new ProviderResult("codex", "Codex", null, "Login missing").PreserveLastSuccess(previous).Snapshot == null, "Missing logins discard old usage");
Check(result.Windows[0].UsedPercent == 12.5 && result.Windows[0].RemainingPercent == 87.5, "Used and remaining must not be inverted");
Check(result.Windows[0].ResetsAt == now.AddSeconds(300), "Relative resets are anchored to fetch time");
Check(result.Windows[1].ResetsAt == DateTimeOffset.FromUnixTimeSeconds(1791331800), "Absolute reset date");
var weeklyOnly = UsageParser.Parse("codex", """{"rate_limit":{"primary_window":{"used_percent":15,"limit_window_seconds":604800}}}""", now);
Check(weeklyOnly.Windows.Single().Label == "Weekly", "A sole weekly window must not be mislabeled Session");
Throws(() => UsageParser.Parse("codex", """{"rate_limit":{"primary_window":{"used_percent":null}}}""", now), "Missing usage must not become zero");
Throws(() => UsageParser.Parse("claude", """{"five_hour":{"utilization":-1}}""", now), "Invalid negative usage");
var claude = UsageParser.Parse("claude", """{"five_hour":{"utilization":101,"resets_at":"2026-10-07T05:00:00Z"},"seven_day":{"utilization":null}}""", now);
Check(claude.Windows.Count == 1 && claude.Windows[0].RemainingPercent == 0, "Over-limit usage retains its actual value; missing windows stay absent");
SettingsChecks.Run(now, Check);
DesktopUpdateChecks.Run(Check, Throws);
var trayAccount = new ProviderResult("claude", "Claude", new("claude", "Claude", "Pro", [new("Weekly", 99, null), new("Session", 12, null)], now), null);
Check(TrayReadings.Select(trayAccount, []).Single().Label == "Session", "Unpinned Claude falls back to its primary session");
Check(TrayReadings.Select(trayAccount, ["Missing"]).Single().Label == "Session", "Unavailable pins fall back without hiding an account");
Check(TrayReadings.Select(trayAccount, ["Weekly"]).Single().Label == "Weekly", "Available explicit pins retain priority");
Check(TrayReadings.Select(trayAccount with { Snapshot = null }, []).Count == 0, "No fabricated quota when an account has no data");
await ClaudeAccountChecks.Run(Check);
await OAuthRenewalChecks.Run(Check);
var root = Path.Combine(Path.GetTempPath(), "tokenplan-core-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
try
{
    var authFile = Path.Combine(root, "auth.json");
    var original = """{"tokens":{"access_token":"test-only-token","refresh_token":"do-not-change","account_id":"test-only-account"}}""";
    await File.WriteAllTextAsync(authFile, original);
    var handler = new Stub((request, _) => {
        using (File.Open(authFile, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) checks++;
        Check(request.RequestUri?.ToString() == "https://chatgpt.com/backend-api/wham/usage", "Only provider endpoint receives credentials");
        Check(request.Headers.Authorization?.Parameter == "test-only-token", "Bearer token is routed to its provider");
        Check(request.Headers.GetValues("ChatGPT-Account-Id").Single() == "test-only-account", "Account header");
        Check(request.Method == HttpMethod.Get && request.Content == null, "Usage refresh never sends notes or mutates the account");
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(codex, Encoding.UTF8, "application/json") });
    });
    using (var service = new ProviderService(root, root, handler, (_, _) => {}))
    {
        var loaded = await service.Refresh("codex", CancellationToken.None);
        Check(loaded.Snapshot?.Windows.Count == 2 && loaded.ErrorKey == null, "Successful live mapping");
        Check((await service.Refresh("claude", CancellationToken.None)).ErrorKey!.StartsWith("Sign in"), "Missing login is actionable");
    }
    Check(await File.ReadAllTextAsync(authFile) == original, "CLI auth and refresh token remain untouched");
    var claudeAuth = """{"claudeAiOauth":{"accessToken":"claude-test-only-token","refreshToken":"unchanged"}}""";
    var claudeFile = Path.Combine(root, ".credentials.json");
    await File.WriteAllTextAsync(claudeFile, claudeAuth);
    using (var service = new ProviderService(root, root, new Stub((request, _) => {
        Check(request.RequestUri?.ToString() == "https://api.anthropic.com/api/oauth/usage", "Claude credential goes only to Anthropic");
        Check(request.Headers.Authorization?.Parameter == "claude-test-only-token" && request.Headers.GetValues("anthropic-beta").Single() == "oauth-2025-04-20", "Claude OAuth headers");
        Check(!request.Headers.Contains("ChatGPT-Account-Id"), "Codex identity never leaks into Claude requests");
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"five_hour":{"utilization":33}}""") });
    }), (_, _) => {}))
    {
        var usage = await service.Refresh("claude", CancellationToken.None);
        Check(usage.Snapshot?.Windows.Single().UsedPercent == 33 && usage.ErrorKey == null, "Claude maps live usage");
    }
    Check(await File.ReadAllTextAsync(claudeFile) == claudeAuth, "Claude-owned credentials remain byte-for-byte unchanged");
    var attempts = 0;
    using (var limited = new ProviderService(root, root, new Stub((_, _) => { attempts++; var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests); response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromMinutes(10)); return Task.FromResult(response); }), (_, _) => {}))
    {
        var first = await limited.Refresh("codex", CancellationToken.None);
        await limited.Refresh("codex", CancellationToken.None);
        Check(attempts == 1, "429 cooldown prevents both automatic and manual repeat calls");
        await File.WriteAllTextAsync(authFile, original.Replace("test-only-account", "different-account"));
        var second = await limited.Refresh("codex", CancellationToken.None);
        Check(attempts == 2 && first.CredentialFingerprint != second.CredentialFingerprint, "An account change invalidates cached usage and prior-account cooldown");
        await File.WriteAllTextAsync(authFile, original);
    }
    Throws(() => UsageParser.Parse("codex", "[]", now), "Unexpected document shapes cannot turn into healthy empty meters");
    foreach (var status in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.TooManyRequests, HttpStatusCode.Redirect, HttpStatusCode.InternalServerError })
    {
        using var service = new ProviderService(root, root, new Stub((_, _) => Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent("private upstream response must not be shown") })), (_, _) => {});
        var failed = await service.Refresh("codex", CancellationToken.None);
        Check(failed.Snapshot == null && failed.ErrorKey != null && !failed.ErrorKey.Contains("private"), "Failures stay explicit and sanitized: " + status);
    }
    var invalidAuthRequests = 0;
    using (var service = new ProviderService(root, root, new Stub((_, _) => { invalidAuthRequests++; throw new Exception("Invalid login must not dispatch"); }), (_, _) => {}))
    {
        foreach (var invalid in new[] { "[]", "null", "42", "\"not-an-object\"", "{\"tokens\":[]}" })
        {
            await File.WriteAllTextAsync(authFile, invalid);
            var failed = await service.Refresh("codex", CancellationToken.None);
            Check(failed.ErrorKey == "Usage or login data could not be read. Check credential file permissions and format, then retry." && failed.CredentialFingerprint == null && failed.PreserveLastSuccess(previous).Snapshot == null, "Malformed login clears prior-account usage: " + invalid);
        }
        Check(invalidAuthRequests == 0, "Malformed login does not dispatch a request");
        await File.WriteAllTextAsync(authFile, original);
    }
    using (var service = new ProviderService(root, root, new Stub((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StreamContent(new StalledBody()) })), (_, _) => {}, TimeSpan.FromMilliseconds(100)))
    {
        var watch = System.Diagnostics.Stopwatch.StartNew();
        var timedOut = await service.Refresh("codex", CancellationToken.None);
        Check(timedOut.ErrorKey == "The connection timed out. Check whether the desktop app can use your proxy or VPN, then retry." && watch.Elapsed < TimeSpan.FromSeconds(5), "Deadline includes stalled response bodies after headers arrive");
    }
    using (var service = new ProviderService(root, root, new Stub(async (_, token) => { await Task.Delay(30000, token); throw new Exception(); }), (_, _) => {}))
    {
        using var cancellation = new CancellationTokenSource();
        var pending = service.Refresh("codex", cancellation.Token);
        cancellation.Cancel();
        try { await pending; throw new Exception("Cancellation was ignored"); } catch (OperationCanceledException) { checks++; }
    }
    var preferencesFile = Path.Combine(root, "settings", "preferences.json");
    Check(System.Text.Json.JsonSerializer.Serialize(Preferences.Load(preferencesFile)) == System.Text.Json.JsonSerializer.Serialize(new Preferences()), "First-launch defaults");
    var preferences = new Preferences("dark", "zh-Hans", false);
    preferences.Save(preferencesFile);
    Check(System.Text.Json.JsonSerializer.Serialize(Preferences.Load(preferencesFile)) == System.Text.Json.JsonSerializer.Serialize(preferences with { AutoRefresh = true }), "Settings survive restart and obsolete refresh-disable migrates to the visible interval");
    await File.WriteAllTextAsync(preferencesFile, """{"Appearance":"invalid","Language":"en"}""");
    Throws(() => Preferences.Load(preferencesFile), "Corrupt appearance is not silently accepted");
    Check(Directory.GetFiles(Path.GetDirectoryName(preferencesFile)!, "*.tmp").Length == 0, "Atomic saves leave no temporary credentials");
    await CursorChecks.Run(root, now, Check);
    HistoryChecks.Run(root, now, Check);
    await ServiceChecks.Run(root, now, Check);
    LocalServiceChecks.Run(root, now, Check);
    await TokenChecks.Run(root, now, Check);
    await ParityChecks.Run(root, now, Check);
    await ProviderBoundaryChecks.Run(root, Check);
    await ServiceContractChecks.Run(root, Check);
    await AmpProcessChecks.Run(root, Check);
    await AdvancedServiceChecks.Run(root, Check);
    await AntigravityLocalChecks.Run(root, Check);
    await ClaudeTokenChecks.Run(root, now, Check);
    await CursorTokenChecks.Run(root, now, Check);
    PricingRefreshChecks.Run(Check);
}
finally { Directory.Delete(root, true); }
Console.WriteLine($"PASS: {checks} desktop core checks");

sealed class Stub(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> action) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => request.RequestUri?.AbsolutePath.EndsWith("/rate-limit-reset-credits") == true ? Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") }) : action(request, cancellationToken);
}

sealed class StalledBody : Stream
{
    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) { await Task.Delay(Timeout.Infinite, cancellationToken); return 0; }
    public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    public override void Flush() => throw new NotSupportedException();
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}

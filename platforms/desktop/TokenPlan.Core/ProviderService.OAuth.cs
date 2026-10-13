using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Nodes;
using System.Collections.Concurrent;

namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    const string AuthMissingRefresh = "This login cannot renew automatically. Open the CLI for this account to refresh its login, then retry.";
    const string AuthSnapshot = "This saved account shares its login with a CLI. Open it in your account switcher to renew safely, then retry.";
    const string AuthRevoked = "The provider rejected the renewal credential. Sign in to this account again.";
    const string AuthRenewFailed = "The provider could not renew the login. Check the connection and try again.";
    const string AuthChanged = "The login changed during refresh. Try refreshing again.";
    const string AuthSaveFailed = "The renewed login could not be saved. Check credential file permissions before retrying.";
    static readonly ConcurrentDictionary<string, SemaphoreSlim> AuthLocks = new(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    static readonly ConcurrentDictionary<string, (byte[] Original, OAuthDocument Renewed)> PendingSaves = new(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    sealed class CredentialChanged : Exception;
    sealed record OAuthDocument(byte[] Bytes, JsonObject Root, JsonObject Tokens, string Access, string? Refresh, string? Account);

    async Task<OAuthDocument> ReadOAuth(string id, string path, CancellationToken ct)
    {
        await using var file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 8192, FileOptions.Asynchronous);
        var bytes = await ReadBounded(file, ct);
        var decoded = encodedAuth ? Convert.FromBase64String(Encoding.UTF8.GetString(bytes).Trim()) : bytes;
        var root = JsonNode.Parse(decoded) as JsonObject ?? throw new InvalidDataException();
        var tokens = root[id == "claude" ? "claudeAiOauth" : "tokens"] as JsonObject ?? throw new InvalidDataException();
        var access = TextValue(tokens, id == "claude" ? "accessToken" : "access_token");
        if (string.IsNullOrWhiteSpace(access)) throw new InvalidDataException();
        return new(bytes, root, tokens, access, TextValue(tokens, id == "claude" ? "refreshToken" : "refresh_token"), TextValue(tokens, "account_id"));
    }
    static string? TextValue(JsonObject obj, string key) => obj[key] is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
    static bool NearExpiry(string id, OAuthDocument doc)
    {
        try
        {
            if (id == "claude" && doc.Tokens["expiresAt"] is JsonValue expiry && expiry.TryGetValue<double>(out var ms))
                return ms <= DateTimeOffset.UtcNow.AddSeconds(60).ToUnixTimeMilliseconds();
            if (id == "codex")
            {
                var parts = doc.Access.Split('.'); if (parts.Length != 3) return false;
                var body = parts[1].Replace('-', '+').Replace('_', '/'); body = body.PadRight((body.Length + 3) / 4 * 4, '=');
                var jwt = JsonNode.Parse(Convert.FromBase64String(body)) as JsonObject;
                return jwt?["exp"] is JsonValue exp && exp.TryGetValue<double>(out var seconds) && seconds <= DateTimeOffset.UtcNow.AddSeconds(60).ToUnixTimeSeconds();
            }
        }
        catch (Exception e) when (e is FormatException or System.Text.Json.JsonException) { }
        return false;
    }
    async Task<ProviderResult> RefreshOAuth(string id, CancellationToken ct)
    {
        var path = alternateAuthFile ?? Path.Combine(id == "codex" ? codexHome : claudeHome, id == "codex" ? "auth.json" : ".credentials.json");
        if (!File.Exists(path)) throw new ProviderFailure(id == "codex" ? "Sign in with the Codex CLI, then refresh." : "Sign in with Claude Code, then refresh.");
        path = new FileInfo(path).ResolveLinkTarget(true)?.FullName ?? Path.GetFullPath(path);
        var gate = AuthLocks.GetOrAdd(Path.GetFullPath(path), _ => new(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            for (var attempt = 0; attempt < 2; attempt++)
            {
                try { return await QueryOAuth(id, path, ct); }
                catch (CredentialChanged) { log(id, "Login changed; reloading the credential source without overwriting it."); }
            }
            throw new ProviderFailure(AuthChanged);
        }
        finally { gate.Release(); }
    }
    async Task<ProviderResult> QueryOAuth(string id, string path, CancellationToken ct)
    {
        var doc = await ReadOAuth(id, path, ct);
        if (PendingSaves.TryGetValue(path, out var pending))
        {
            if (pending.Original.AsSpan().SequenceEqual(doc.Bytes))
            {
                await using var lease = await AcquireAuthLease(path, ct);
                await SaveRenewed(id, path, pending.Original, pending.Renewed);
                doc = pending.Renewed;
            }
            else PendingSaves.TryRemove(path, out _); // A CLI login always takes priority.
        }
        string Identity() => Fingerprint(doc.Access + "\0" + doc.Account);
        attemptIdentities[id] = Identity();
        CheckCooldown(id + Identity());
        var renewed = false;
        if (allowAuthRefresh && alternateAuthFile == null && !string.IsNullOrWhiteSpace(doc.Refresh) && NearExpiry(id, doc))
        { doc = await RenewOAuth(id, path, doc, ct); renewed = true; }
        async Task<string> Usage()
        {
            attemptIdentities[id] = Identity();
            using var request = new HttpRequestMessage(HttpMethod.Get, id == "codex" ? "https://chatgpt.com/backend-api/wham/usage" : "https://api.anthropic.com/api/oauth/usage");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", doc.Access);
            request.Headers.Accept.ParseAdd("application/json");
            if (id == "claude") request.Headers.Add("anthropic-beta", "oauth-2025-04-20");
            else if (!string.IsNullOrWhiteSpace(doc.Account)) request.Headers.Add("ChatGPT-Account-Id", doc.Account);
            return await Fetch(request, id + Identity(), ct);
        }
        string json;
        try { json = await Usage(); }
        catch (ProviderFailure e) when (e.Status == HttpStatusCode.Unauthorized)
        {
            var latest = await ReadOAuth(id, path, ct);
            if (!latest.Bytes.AsSpan().SequenceEqual(doc.Bytes)) throw new CredentialChanged();
            if (renewed) throw new ProviderFailure("The renewed login was rejected by the usage service. Check account access before signing in again.");
            doc = await RenewOAuth(id, path, doc, ct);
            try { json = await Usage(); }
            catch (ProviderFailure again) when (again.Status == HttpStatusCode.Unauthorized)
            { throw new ProviderFailure("The renewed login was rejected by the usage service. Check account access before signing in again."); }
        }
        attemptIdentities[id] = Identity();
        if (id == "codex") json = await WithCodexResetCredits(json, doc.Access, doc.Account, id + Identity(), ct);
        if (!(await ReadOAuth(id, path, ct)).Bytes.AsSpan().SequenceEqual(doc.Bytes)) throw new CredentialChanged();
        var snapshot = UsageParser.Parse(id, json, DateTimeOffset.UtcNow);
        if (id == "claude" && snapshot.Plan == null && TextValue(doc.Tokens, "subscriptionType") is { Length: > 0 } plan)
            snapshot = snapshot with { Plan = plan.ToLowerInvariant() switch { "pro" => "Pro", "max" => "Max", "team" => "Team", "enterprise" => "Enterprise", "free" => "Free", _ => plan } };
        var metadata = id == "claude" && alternateAuthFile == null ? ClaudeAccountMetadata.Read(claudeHome, userHome) : null;
        return new(id, ProviderCatalog.Get(id).Name, snapshot, null, Identity(), AccountEmail: metadata?.Email, AccountIdentity: metadata?.Identity);
    }
    async Task<OAuthDocument> RenewOAuth(string id, string path, OAuthDocument old, CancellationToken ct)
    {
        if (!allowAuthRefresh || alternateAuthFile != null) throw new ProviderFailure(AuthSnapshot);
        if (string.IsNullOrWhiteSpace(old.Refresh)) throw new ProviderFailure(AuthMissingRefresh);
        // Serialize cooperating TokenPlan processes; the CLI may not honor this lock, so compare again before saving.
        await using var lease = await AcquireAuthLease(path, ct);
        if (!(await ReadOAuth(id, path, ct)).Bytes.AsSpan().SequenceEqual(old.Bytes)) throw new CredentialChanged();
        // Check that a private replacement can be created before rotating a one-use refresh token.
        var probe = path + ".tokenplan-probe-" + Guid.NewGuid().ToString("N");
        try { using var writable = new FileStream(probe, PrivateWriteOptions()); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { throw new ProviderFailure(AuthSaveFailed); }
        finally { if (File.Exists(probe)) File.Delete(probe); }
        using var request = new HttpRequestMessage(HttpMethod.Post, id == "claude" ? "https://platform.claude.com/v1/oauth/token" : "https://auth.openai.com/oauth/token");
        if (id == "claude") request.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
            grant_type = "refresh_token", refresh_token = old.Refresh, client_id = "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
            scope = "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload"
        }), Encoding.UTF8, "application/json");
        else request.Content = new FormUrlEncodedContent(new Dictionary<string,string> { ["grant_type"]="refresh_token", ["refresh_token"]=old.Refresh, ["client_id"]="app_EMoamEEZ73f0CkXaXp7hrann" });
        log(id, "Attempting OAuth renewal.");
        var response = await SendReadDiagnosed(request, ct);
        var body = response.Body;
        JsonObject? result;
        try { result = JsonNode.Parse(body) as JsonObject; } catch (System.Text.Json.JsonException) { result = null; }
        if (!(await ReadOAuth(id, path, CancellationToken.None)).Bytes.AsSpan().SequenceEqual(old.Bytes)) throw new CredentialChanged();
        if ((int)response.Status is < 200 or >= 300)
        {
            if (response.Status == HttpStatusCode.TooManyRequests) { cooldowns[id + Fingerprint(old.Access + "\0" + old.Account)] = (response.RetryAfter is { } retry && retry > DateTimeOffset.UtcNow.AddMinutes(1) ? retry : DateTimeOffset.UtcNow.AddMinutes(5)); throw new ProviderFailure("Rate limited. Wait before refreshing again."); }
            var code = result == null ? null : TextValue(result, "error") ?? (result["error"] is JsonObject error ? TextValue(error, "code") : null);
            if (code == "refresh_token_reused") throw new ProviderFailure(AuthChanged);
            if ((response.Status is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized) && (code is "invalid_grant" or "refresh_token_expired" or "refresh_token_invalidated")) throw new ProviderFailure(AuthRevoked);
            if (response.Status == HttpStatusCode.ProxyAuthenticationRequired) throw new ProviderFailure(ProxyDenied);
            if (response.Status == HttpStatusCode.Forbidden) throw new ProviderFailure(AccessDenied);
            throw new ProviderFailure(AuthRenewFailed);
        }
        if (result == null || TextValue(result, "access_token") is not { Length: > 0 } access) throw new ProviderFailure(AuthRenewFailed);
        old.Tokens[id == "claude" ? "accessToken" : "access_token"] = access;
        if (TextValue(result, "refresh_token") is { Length: > 0 } refresh) old.Tokens[id == "claude" ? "refreshToken" : "refresh_token"] = refresh;
        if (id == "codex")
        { if (TextValue(result, "id_token") is { Length: > 0 } identity) old.Tokens["id_token"] = identity; old.Root["last_refresh"] = DateTimeOffset.UtcNow.ToString("O"); }
        else if (result["expires_in"] is JsonValue lifetime && lifetime.TryGetValue<double>(out var seconds) && double.IsFinite(seconds) && seconds > 0 && seconds < 31536000)
            old.Tokens["expiresAt"] = DateTimeOffset.UtcNow.AddSeconds(seconds).ToUnixTimeMilliseconds();
        else old.Tokens.Remove("expiresAt");
        var bytes = Encoding.UTF8.GetBytes(old.Root.ToJsonString());
        var updated = old with { Bytes=bytes, Access=access, Refresh=TextValue(old.Tokens,id=="claude"?"refreshToken":"refresh_token") };
        PendingSaves[path] = (old.Bytes, updated);
        // Once a rotation succeeds, persist it even if the UI has just cancelled its request.
        await SaveRenewed(id, path, old.Bytes, updated);
        log(id, "OAuth renewal saved; retrying usage.");
        return updated;
    }
    static FileStreamOptions PrivateWriteOptions()
    {
        var options = new FileStreamOptions { Mode=FileMode.CreateNew, Access=FileAccess.Write, Share=FileShare.None, Options=FileOptions.Asynchronous };
        if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        return options;
    }
    async Task SaveRenewed(string id, string path, byte[] original, OAuthDocument updated)
    {
        var temp = path + ".tokenplan-" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var output = new FileStream(temp, PrivateWriteOptions())) { await output.WriteAsync(updated.Bytes); output.Flush(true); }
            if (!(await ReadOAuth(id, path, CancellationToken.None)).Bytes.AsSpan().SequenceEqual(original))
            { PendingSaves.TryRemove(path, out _); throw new CredentialChanged(); }
            // Replace preserves the original Windows ACL; Unix replacement is private (0600).
            if (OperatingSystem.IsWindows()) File.Replace(temp, path, null);
            else File.Move(temp, path, overwrite:true);
            PendingSaves.TryRemove(path, out _);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        { log(id, AuthSaveFailed); throw new ProviderFailure(AuthSaveFailed); }
        finally { try { if (File.Exists(temp)) File.Delete(temp); } catch (IOException) { } catch (UnauthorizedAccessException) { } }
    }
    static async Task<FileStream> AcquireAuthLease(string path, CancellationToken ct)
    {
        for (var i=0; ; i++)
        {
            ct.ThrowIfCancellationRequested();
            try {
                var options = new FileStreamOptions { Mode=FileMode.OpenOrCreate, Access=FileAccess.ReadWrite, Share=FileShare.None };
                if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
                return new FileStream(path + ".tokenplan-refresh.lock", options);
            }
            catch (IOException) when (i < 20) { await Task.Delay(100,ct); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { throw new ProviderFailure(AuthSaveFailed); }
        }
    }
}

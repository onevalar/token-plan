using Microsoft.Data.Sqlite;
using System.Net;
using System.Text;
using TokenPlan.Core;

static class CursorChecks
{
    public static async Task Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        const string period = """{"enabled":true,"billingCycleEnd":1791331800000,"planUsage":{"limit":2000,"totalSpend":800,"totalPercentUsed":45,"autoPercentUsed":20,"apiPercentUsed":50}}""";
        var parsed = CursorUsageParser.Parse(period, "pro", now);
        check(parsed.Windows.Count == 3 && parsed.Windows[0].UsedPercent == 45, "Cursor uses the authoritative total percentage before legacy dollars");
        check(parsed.Windows[0].ResetsAt == DateTimeOffset.FromUnixTimeMilliseconds(1791331800000), "Cursor billing dates are milliseconds");
        var team = CursorUsageParser.Parse(period.Replace("\"totalPercentUsed\":45,", ""), "team", now);
        check(team.Windows.Count == 2 && team.Windows.All(w => w.Label != "Total usage"), "Teams model pools do not synthesize a total from stale allowance dollars");
        var legacy = CursorUsageParser.Parse("""{"planUsage":{"limit":2000,"remaining":500}}""", "pro", now);
        check(legacy.Windows.Single().UsedPercent == 75, "Legacy personal allowance uses explicit remaining and limit");
        foreach (var invalid in new[] { "[]", "{\"enabled\":false}", "{\"planUsage\":{\"limit\":2000}}", "{\"planUsage\":{\"totalPercentUsed\":-1}}", "{\"planUsage\":{\"totalPercentUsed\":null}}" })
        {
            try { CursorUsageParser.Parse(invalid, "pro", now); throw new Exception("Accepted missing usage"); }
            catch (InvalidDataException) { check(true, "Missing or invalid Cursor metrics remain unavailable"); }
        }
        const string summary = """{"billingCycleEnd":"2026-11-01T00:00:00Z","membershipType":"enterprise","individualUsage":{"plan":{"totalPercentUsed":70,"autoPercentUsed":20,"apiPercentUsed":50}}}""";
        const string requests = """{"gpt-4":{"maxRequestUsage":1000,"numRequests":600}}""";
        var enterprise = CursorUsageParser.Parse("{}", null, now, summary, requests);
        check(enterprise.Windows[0].UsedPercent == 60 && enterprise.Windows.Count == 3, "Enterprise request allowance wins over summary total and retains structured pools");
        check(enterprise.Windows[0].ResetsAt == DateTimeOffset.Parse("2026-11-01T00:00:00Z") && enterprise.Plan == "enterprise", "Enterprise cycle and plan come from the summary");
        check(CursorUsageParser.Parse("{}", null, now, summary).Windows[0].UsedPercent == 70, "Summary-only accounts remain usable");
        check(CursorUsageParser.Parse("{}", "team", now, """{"limitType":"team","teamUsage":{"pooled":{"used":500,"limit":1000}},"individualUsage":{"plan":{"totalPercentUsed":3}}}""").Windows.Single().UsedPercent == 50, "Team-scoped pooled quota overrides a personal placeholder");
        check(CursorUsageParser.Parse("{}", "team", now, """{"teamUsage":{"pooled":{"used":0,"remaining":100,"limit":1000}}}""").Windows.Single().UsedPercent == 90, "Explicit remaining replaces a legacy zero-spend placeholder");
        try { CursorUsageParser.Parse("{}", "team", now, """{"teamUsage":{"pooled":{"enabled":false,"used":0,"limit":1000}}}"""); throw new Exception("Disabled pooled allowance was accepted"); }
        catch (InvalidDataException) { check(true, "Disabled allowance never becomes a healthy zero"); }
        var token = "header." + Convert.ToBase64String(Encoding.UTF8.GetBytes("""{"sub":"auth0|fixture-user"}""")).TrimEnd('=').Replace('+', '-').Replace('/', '_') + ".signature";
        check(CursorAuth.SessionUser(token) == "fixture-user", "Cursor cookie identity derives from the existing access token");
        check(CursorAuth.SessionUser("not-a-jwt") == null && CursorAuth.SessionUser("a.e30.b") == null, "Malformed JWTs cannot fabricate a session identity");
        var database = Path.Combine(root, "cursor-state.vscdb");
        WriteLogin(database, token);
        var before = await File.ReadAllBytesAsync(database);
        var login = CursorAuth.Load(database, CancellationToken.None);
        check(login?.AccessToken == token && login.Membership == "pro", "Cursor reads the two existing desktop login keys");
        var calls = 0;
        using (var service = Service(database, new Stub(async (request, _) => {
            calls++;
            check(request.RequestUri?.ToString() == "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage", "Cursor token is routed only to its provider");
            check(request.Headers.Authorization?.Parameter == token && !request.Headers.Contains("ChatGPT-Account-Id") && !request.Headers.Contains("Cookie"), "Cursor bearer headers contain no other provider identity");
            check(request.Method == HttpMethod.Post && await request.Content!.ReadAsStringAsync() == "{}" && request.Headers.GetValues("Connect-Protocol-Version").Single() == "1", "Cursor usage POST only sends the read-only API's empty query");
            return Json(period);
        })))
        {
            var loaded = await service.Refresh("cursor", CancellationToken.None);
            check(loaded.ErrorKey == null && loaded.Snapshot?.Windows.Count == 3 && loaded.CredentialFingerprint != null && calls == 1, "Cursor successfully refreshes with no fallback calls");
        }
        check((await File.ReadAllBytesAsync(database)).SequenceEqual(before), "Reading usage never changes Cursor's database or refresh token");
        using (var service = Service(Path.Combine(root, "missing-cursor.vscdb"), new Stub((_, _) => throw new Exception("Missing login dispatched"))))
        {
            var missing = await service.Refresh("cursor", CancellationToken.None);
            check(missing.ErrorKey == "Sign in with the Cursor desktop app, then refresh." && missing.CredentialFingerprint == null, "Cursor absence is actionable and cannot reuse old quota");
            check(!File.Exists(Path.Combine(root, "missing-cursor.vscdb")), "Read-only Cursor lookup never creates a database");
        }
        var fallbackCalls = new List<string>();
        using (var service = Service(database, new Stub((request, _) => {
            var uri = request.RequestUri!.ToString(); fallbackCalls.Add(uri);
            if (uri.Contains("api2.cursor.sh")) return Task.FromResult(Json("{}"));
            check(request.Method == HttpMethod.Get && request.Content == null && request.Headers.Authorization == null, "Cursor REST fallback remains a read-only query without bearer forwarding");
            check(request.Headers.GetValues("Cookie").Single() == "WorkosCursorSessionToken=fixture-user%3A%3A" + token, "Cursor session cookie is scoped to Cursor's fixed dashboard host");
            return Task.FromResult(Json(uri.EndsWith("usage-summary") ? summary : requests));
        })))
        {
            var usage = await service.Refresh("cursor", CancellationToken.None);
            check(usage.ErrorKey == null && usage.Snapshot?.Windows[0].UsedPercent == 60 && fallbackCalls.Count == 3, "Enterprise fallback combines both dashboard sources");
            check(fallbackCalls.Last() == "https://cursor.com/api/usage?user=fixture-user", "Only the token's own user scopes the request query");
        }
        using (var service = Service(database, new Stub((request, _) => Task.FromResult(request.RequestUri!.ToString().EndsWith("usage-summary") ? Json(summary) : request.Method == HttpMethod.Post ? Json("{}") : new HttpResponseMessage(HttpStatusCode.NotFound)))))
            check((await service.Refresh("cursor", CancellationToken.None)).Snapshot?.Windows[0].UsedPercent == 70, "Unavailable legacy request endpoint does not discard valid summary usage");
        foreach (var status in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Redirect, HttpStatusCode.TooManyRequests })
        {
            var attempts = 0;
            using var service = Service(database, new Stub((_, _) => { attempts++; return Task.FromResult(new HttpResponseMessage(status)); }));
            var failed = await service.Refresh("cursor", CancellationToken.None);
            check(failed.ErrorKey != null && failed.Snapshot == null && attempts == 1, "Cursor HTTP failures do not send credentials to a redirect or start extra fallback calls");
            if (status == HttpStatusCode.Unauthorized) check(failed.ErrorKey == "Your Cursor session has expired. Sign in with Cursor again.", "Cursor expiration gives the correct desktop sign-in instruction");
            if (status == HttpStatusCode.TooManyRequests)
            {
                check(failed.ErrorKey == "Usage queries are temporarily rate limited. Data may be out of date. Retrying automatically later.", "Rate limit explains stale data and automatic retry without blaming manual refresh");
                await service.Refresh("cursor", CancellationToken.None);
                check(attempts == 1, "Cursor manual retries obey rate-limit cooldown");
            }
        }
        WriteLogin(database, "");
        check(CursorAuth.Load(database, CancellationToken.None) == null, "Empty desktop access token is not treated as connected");
        await File.WriteAllTextAsync(database, "not a database");
        using (var service = Service(database, new Stub((_, _) => throw new Exception("Corrupt DB dispatched"))))
            check((await service.Refresh("cursor", CancellationToken.None)).ErrorKey == "Usage or login data could not be read. Check credential file permissions and format, then retry.", "Corrupt database reports a read failure rather than falsely asking for sign-in");
        ProviderService Service(string db, HttpMessageHandler handler) => new(root, root, handler, (_, _) => {}, cursorDatabase: db);
    }
    static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
    static void WriteLogin(string filename, string token)
    {
        using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = filename, Pooling = false }.ToString());
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS ItemTable (key TEXT PRIMARY KEY, value TEXT); INSERT OR REPLACE INTO ItemTable VALUES ('cursorAuth/accessToken', $token), ('cursorAuth/stripeMembershipType', 'pro'), ('cursorAuth/refreshToken', 'never-read-or-change'), ('chat/private', 'never-read-or-send');";
        command.Parameters.AddWithValue("$token", token);
        command.ExecuteNonQuery();
    }
}

using Microsoft.Data.Sqlite;
using System.Net;
using System.Text;
using TokenPlan.Core;

static class CursorTokenChecks
{
    const string Header = "Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens";
    const string Row = "2026-10-06T12:00:00Z,model,15,100,60,20";
    public static async Task Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var csv = Header + "\n" + Row;
        var parsed = CursorTokenCSV.Parse(csv, now, TimeZoneInfo.Utc);
        check(parsed.Days.Single().Models is [var model] && model.Model == "model" && model.Tokens.Total == 195 && model.Cost.Unpriced == 1, "Cursor model totals retain unknown pricing instead of zero cost");
        check(!parsed.Partial && parsed.Days.Single().Tokens == new TokenCounts(100, 20, 60, CacheWrite: 15), "Cursor export keeps four disjoint token buckets without inferring counts from quota");
        var quoted = CursorTokenCSV.Parse("\uFEFF" + Header + "\r\n2026-10-06T12:00:00.123Z,\"model, with \"\"quotes\"\"\nextra\",15,\"1,000\",,20\r\n", now, TimeZoneInfo.Utc);
        check(!quoted.Partial && quoted.Days.Single().Tokens == new TokenCounts(1000, 20, 0, CacheWrite: 15), "CSV handles BOM, CRLF, quoted commas/newlines/quotes, grouped counts and empty numeric cells");
        var zone = TimeZoneInfo.CreateCustomTimeZone("Cursor-test-UTC+8", TimeSpan.FromHours(8), "UTC+8", "UTC+8");
        var midnight = CursorTokenCSV.Parse(Header + "\n" + Row.Replace("12:00:00Z", "18:00:00Z"), now, zone);
        check(midnight.Days.Single().Date == new DateOnly(2026, 10, 7), "Cursor export totals follow the device calendar");
        check(CursorTokenCSV.Parse(Header + "\n" + Row.Replace("2026-10-06T12:00:00Z", "2026-10-06 12:00:00"), now, zone).Days.Single().Date == new DateOnly(2026, 10, 6), "Timezone-less dashboard dates follow the local device timezone like the macOS client");
        foreach (var badRow in new[] { Row.Replace(",100,", ",-1,"), Row.Replace(",100,", ",1.5,"), Row.Replace(",100,", ",\"12,34\","), Row.Replace(",100,", ",9223372036854775807,"), "not-a-date,model,1,2,3,4", "2026-10-06T12:00:00Z,,1,2,3,4", Row + ",extra" })
        {
            var partial = CursorTokenCSV.Parse(csv + "\n" + badRow, now, TimeZoneInfo.Utc);
            check(partial.Partial && partial.Days.Single().Tokens.Total == 195, "Invalid CSV counts, dates, models and row widths preserve valid data with a coverage warning");
        }
        foreach (var malformed in new[] { "", "<!doctype html>sign in", Header.Replace("Output Tokens", "Unknown"), Header + ",Model\n" + Row, csv + "\n\"unterminated", csv.Replace("model", "bad\"quote"), csv.Replace("model", "\"model\"junk") })
        {
            try { CursorTokenCSV.Parse(malformed, now, TimeZoneInfo.Utc); throw new Exception("Malformed export accepted"); }
            catch (InvalidDataException) { check(true, "Changed/missing export schema or broken CSV fails visibly instead of claiming healthy zero usage"); }
        }
        check(CursorTokenCSV.Parse(Header, now, TimeZoneInfo.Utc).Days.Count == 0, "A valid empty export is represented as no recorded usage");
        var outside = CursorTokenCSV.Parse(csv + "\n" + Row.Replace("2026-10-06", "2026-01-01") + "\n" + Row.Replace("2026-10-06", "2027-01-01"), now, TimeZoneInfo.Utc);
        check(outside.Partial && outside.Days.Single().Tokens.Total == 195, "Old rows are excluded and future rows are rejected");
        using (var cancelled = new CancellationTokenSource())
        {
            cancelled.Cancel();
            try { CursorTokenCSV.Parse(csv, now, TimeZoneInfo.Utc, cancelled.Token); throw new Exception("Ignored Stop"); }
            catch (OperationCanceledException) { check(true, "CSV parsing respects Stop without publishing partial state"); }
        }
        var token = Token("fixture-user");
        var database = Path.Combine(root, "cursor-token-state.vscdb");
        WriteLogin(database, token);
        var original = await File.ReadAllBytesAsync(database);
        using (var service = Service(new Stub((request, _) => {
            var uri = request.RequestUri!;
            check(uri.Scheme == "https" && uri.Host == "cursor.com" && uri.AbsolutePath == "/api/dashboard/export-usage-events-csv", "History credentials go only to Cursor's fixed HTTPS export endpoint");
            check(request.Method == HttpMethod.Get && request.Content == null && request.Headers.Authorization == null && !request.Headers.Contains("ChatGPT-Account-Id"), "Token history is a read-only export with no other provider's credentials");
            check(request.Headers.GetValues("Cookie").Single() == "WorkosCursorSessionToken=fixture-user%3A%3A" + token && request.Headers.Accept.Single().MediaType == "text/csv", "Cursor session cookie and CSV accept header match the established macOS request");
            var since = new DateTimeOffset(now.UtcDateTime.Date.AddDays(-29)).ToUnixTimeMilliseconds();
            check(uri.Query == "?startDate=" + since + "&endDate=" + now.ToUnixTimeMilliseconds() + "&strategy=tokens", "Export request covers exactly the last thirty local calendar days");
            return Task.FromResult(Response(csv));
        })))
        {
            var loaded = await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None);
            check(loaded.ErrorKey == null && loaded.Days.Single().Tokens.Total == 195 && loaded.CredentialFingerprint?.Length == 64, "A successful Cursor export returns actual counts with an opaque account scope");
            check((await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None)).Days.Single().Tokens.Total == 195, "Repeated Cursor refreshes replace rather than add export totals");
        }
        check((await File.ReadAllBytesAsync(database)).SequenceEqual(original), "History export never writes login, refresh-token or conversation data");
        using (var service = Service(new Stub((_, _) => { WriteLogin(database, Token("different-user")); return Task.FromResult(Response(csv)); })))
        {
            var changed = await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None);
            check(changed.Days.Count == 0 && changed.ErrorKey == "Cursor login changed during refresh. Refresh again for the current account.", "Changing accounts during download discards the former account's history");
        }
        WriteLogin(database, token);
        foreach (var status in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Redirect, HttpStatusCode.TooManyRequests, HttpStatusCode.NotFound })
        {
            var calls = 0;
            using var service = Service(new Stub((_, _) => { calls++; return Task.FromResult(new HttpResponseMessage(status)); }));
            var failed = await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None);
            check(failed.ErrorKey != null && failed.Days.Count == 0 && calls == 1, "Unauthorized, redirect, limited and unavailable export responses never create token totals");
            if (status == HttpStatusCode.TooManyRequests) { await service.Refresh("cursor", CancellationToken.None); check(calls == 1, "Quota and history requests share Cursor's rate-limit cooldown"); }
        }
        using (var service = Service(new Stub((_, _) => Task.FromResult(Response("not valid CSV")))))
            check((await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None)).ErrorKey != null, "Malformed successful response produces a friendly history error");
        using (var service = Service(new Stub((_, _) => {
            var response = Response(csv); response.Content.Headers.ContentLength = 2 * 1024 * 1024 + 1; return Task.FromResult(response);
        })))
            check((await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None)).ErrorKey == "Cursor token export is too large to load. View the full history in Cursor.", "Large exports stop at the response boundary with a clear limit");
        using (var service = Service(new Stub((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StreamContent(new StalledBody()) })), TimeSpan.FromMilliseconds(30)))
            check((await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, CancellationToken.None)).ErrorKey == "The connection timed out. Try again later.", "The history timeout covers response bodies as well as headers");
        using (var cancellation = new CancellationTokenSource())
        using (var service = Service(new Stub(async (_, ct) => { cancellation.Cancel(); await Task.Delay(Timeout.Infinite, ct); return Response(csv); })))
        {
            try { await service.RefreshCursorTokens(now, TimeZoneInfo.Utc, cancellation.Token); throw new Exception("Ignored cancellation"); }
            catch (OperationCanceledException) { check(true, "Stop cancels Cursor export rather than turning it into an empty success"); }
        }
        var file = Path.Combine(root, "cursor-source-preferences.json"); new Preferences(TokenProvider: "cursor").Save(file);
        check(Preferences.Load(file).TokenProvider == "cursor", "Cursor token-source selection survives restart");
        ProviderService Service(HttpMessageHandler handler, TimeSpan? timeout = null) => new(root, root, handler, (_, _) => {}, requestTimeout: timeout, cursorDatabase: database);
    }
    static HttpResponseMessage Response(string body) => new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "text/csv") };
    static string Token(string user) => "header." + Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"sub\":\"auth0|" + user + "\"}")).TrimEnd('=').Replace('+', '-').Replace('/', '_') + ".signature";
    static void WriteLogin(string path, string token)
    {
        using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Pooling = false }.ToString()); connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS ItemTable (key TEXT PRIMARY KEY, value TEXT); INSERT OR REPLACE INTO ItemTable VALUES ('cursorAuth/accessToken',$token), ('cursorAuth/stripeMembershipType','pro'), ('cursorAuth/refreshToken','must-stay-unchanged'), ('chat/private','must-never-be-queried');";
        command.Parameters.AddWithValue("$token", token); command.ExecuteNonQuery();
    }
}

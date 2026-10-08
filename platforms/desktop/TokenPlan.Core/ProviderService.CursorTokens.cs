using System.Globalization;
using System.Net;
using System.Text;

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    public async Task<TokenTrend> RefreshCursorTokens(DateTimeOffset now, TimeZoneInfo zone, CancellationToken cancellationToken)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(http.Timeout);
        var operationToken = deadline.Token;
        string? fingerprint = null;
        TokenTrend Fail(string key) { log("cursor-tokens", key); return new(Array.Empty<TokenDay>(), true, now, key, CredentialFingerprint: fingerprint); }
        try
        {
            var login = await Task.Run(() => CursorAuth.Load(cursorDatabase, operationToken), operationToken);
            if (login == null) return Fail("Sign in with the Cursor desktop app, then refresh.");
            fingerprint = Fingerprint(login.AccessToken);
            var user = CursorAuth.SessionUser(login.AccessToken);
            if (user == null) return Fail("Cursor token history needs a valid desktop session. Sign in with Cursor again.");
            var cooldownKey = "cursor" + fingerprint;
            CheckCooldown(cooldownKey);
            var today = TimeZoneInfo.ConvertTime(now, zone).Date;
            var start = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(today.AddDays(-29), zone));
            var uri = "https://cursor.com/api/dashboard/export-usage-events-csv?startDate=" + start.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture)
                + "&endDate=" + now.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture) + "&strategy=tokens";
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.Add("Cookie", "WorkosCursorSessionToken=" + Uri.EscapeDataString(user) + "%3A%3A" + Uri.EscapeDataString(login.AccessToken));
            request.Headers.Accept.ParseAdd("text/csv");
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, operationToken);
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden) return Fail("Your Cursor session has expired. Sign in with Cursor again.");
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var next = response.Headers.RetryAfter?.Date ?? DateTimeOffset.UtcNow.Add(response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMinutes(5));
                cooldowns[cooldownKey] = next > DateTimeOffset.UtcNow.AddMinutes(1) ? next : DateTimeOffset.UtcNow.AddMinutes(1);
                return Fail("Rate limited. Wait before refreshing again.");
            }
            if (!response.IsSuccessStatusCode) return Fail("Cursor token history could not be loaded. Try refreshing again.");
            if (response.Content.Headers.ContentLength > 2 * 1024 * 1024) return Fail("Cursor token export is too large to load. View the full history in Cursor.");
            await using var stream = await response.Content.ReadAsStreamAsync(operationToken);
            byte[] bytes;
            try { bytes = await ReadBounded(stream, operationToken); }
            catch (InvalidDataException) { return Fail("Cursor token export is too large to load. View the full history in Cursor."); }
            var csv = new UTF8Encoding(false, true).GetString(bytes);
            var trend = await Task.Run(() => CursorTokenCSV.Parse(csv, now, zone, operationToken), operationToken);
            // An account change while downloading cannot publish the previous account's history.
            var current = await Task.Run(() => CursorAuth.Load(cursorDatabase, operationToken), operationToken);
            if (current == null || Fingerprint(current.AccessToken) != fingerprint) return Fail("Cursor login changed during refresh. Refresh again for the current account.");
            if (trend.Partial) log("cursor-tokens", "Some Cursor export rows were invalid. Totals may be incomplete.");
            return trend with { CredentialFingerprint = fingerprint };
        }
        catch (ProviderFailure e) { return Fail(e.Message); }
        catch (Microsoft.Data.Sqlite.SqliteException) { return Fail("Cursor login could not be read. Open Cursor and sign in again."); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (OperationCanceledException) { return Fail("The connection timed out. Try again later."); }
        catch (HttpRequestException) { return Fail("Cannot reach the provider. Check your connection."); }
        catch (Exception e) when (e is InvalidDataException or DecoderFallbackException or FormatException or ArgumentException or IOException or UnauthorizedAccessException or OverflowException)
        { return Fail("Cursor token history could not be loaded. Try refreshing again."); }
    }
}

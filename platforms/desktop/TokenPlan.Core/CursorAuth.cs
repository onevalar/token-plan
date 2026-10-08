using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace TokenPlan.Core;

public record CursorLogin(string AccessToken, string? Membership);

public static class CursorAuth
{
    // Cursor's desktop login is separate from the CLI config directory.
    public static string DefaultDatabase => Path.Combine(
        OperatingSystem.IsMacOS()
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Library", "Application Support")
            : Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "Cursor", "User", "globalStorage", "state.vscdb");

    public static CursorLogin? Load(string filename, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!File.Exists(filename)) return null;
        var options = new SqliteConnectionStringBuilder { DataSource = filename, Mode = SqliteOpenMode.ReadOnly, Pooling = false, DefaultTimeout = 1 };
        using var connection = new SqliteConnection(options.ToString());
        connection.Open();
        using var command = connection.CreateCommand();
        // Read exactly these two known keys, never conversations, refresh tokens or other state.
        command.CommandText = "SELECT key, value FROM ItemTable WHERE key IN ($token, $membership) AND length(value) <= 16384 LIMIT 2";
        command.Parameters.AddWithValue("$token", "cursorAuth/accessToken");
        command.Parameters.AddWithValue("$membership", "cursorAuth/stripeMembershipType");
        using var reader = command.ExecuteReader();
        string? token = null, membership = null;
        while (reader.Read())
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (reader.IsDBNull(1)) continue;
            if (reader.GetFieldType(1) != typeof(string)) throw new InvalidDataException();
            var value = reader.GetString(1).Trim();
            if (reader.GetString(0) == "cursorAuth/accessToken") token = value;
            else membership = value;
        }
        cancellationToken.ThrowIfCancellationRequested();
        return string.IsNullOrWhiteSpace(token) ? null : new(token, membership);
    }

    public static string? SessionUser(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 3 || parts[1].Length > 16384) return null;
        try
        {
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            payload = payload.PadRight((payload.Length + 3) / 4 * 4, '=');
            using var document = JsonDocument.Parse(Convert.FromBase64String(payload));
            var subject = UsageParser.String(document.RootElement, "sub");
            var user = subject?.Split('|').Last();
            return user is { Length: > 0 and <= 256 } && user.All(c => char.IsAsciiLetterOrDigit(c) || c is '_' or '-') ? user : null;
        }
        catch (Exception e) when (e is JsonException or FormatException) { return null; }
    }
}

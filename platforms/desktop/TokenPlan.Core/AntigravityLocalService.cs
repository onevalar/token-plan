using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
namespace TokenPlan.Core;

public record AntigravityEndpoint(int Port, string Csrf, bool Https);

/// Discover only the current user's Antigravity processes and their listening sockets.
/// No credentials or process arguments are written to disk or logs.
public static class AntigravityLocalService
{
    public static string? Flag(string[] args, string name)
    {
        for (var i = 1; i < args.Length; i++)
        {
            if (args[i].StartsWith(name + "=", StringComparison.Ordinal)) return args[i][(name.Length + 1)..];
            if (args[i] == name && i + 1 < args.Length) return args[i + 1];
        }
        return null;
    }
    public static bool Matches(string[] args)
    {
        if (args.Length == 0) return false;
        var name = Path.GetFileName(args[0]);
        if (name == "agy") return true;
        if (!name.StartsWith("language_server", StringComparison.Ordinal)) return false;
        var markers = new[] { "--ide_name", "--override_ide_name", "--app_data_dir" }.Select(f => Flag(args, f)).Where(v => v != null).ToArray();
        return markers.Length > 0 ? markers.Any(v => v is "antigravity" or "antigravity-ide") : args[0].Contains("/antigravity/", StringComparison.OrdinalIgnoreCase);
    }
    public static int[] ListeningPorts(IEnumerable<string> lines, ISet<string> sockets) => lines.Skip(1).Select(line => line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
        .Where(fields => fields.Length > 9 && fields[3] == "0A" && sockets.Contains(fields[9]))
        .Select(fields => int.TryParse(fields[1].Split(':').Last(), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var port) ? port : 0)
        .Where(p => p is > 0 and <= 65535).Distinct().Take(12).ToArray();
    public static IReadOnlyList<AntigravityEndpoint> Discover(CancellationToken cancellation)
    {
        if (!OperatingSystem.IsLinux()) return [];
        var endpoints = new List<AntigravityEndpoint>();
        foreach (var directory in Directory.EnumerateDirectories("/proc").Where(d => int.TryParse(Path.GetFileName(d), out _)).Take(16384))
        {
            cancellation.ThrowIfCancellationRequested();
            try
            {
                var uid = File.ReadLines(Path.Combine(directory, "status")).FirstOrDefault(l => l.StartsWith("Uid:"))?.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
                if (uid == null || uid.Length < 3 || uid[2] != geteuid().ToString(CultureInfo.InvariantCulture)) continue;
                using var stream = File.OpenRead(Path.Combine(directory, "cmdline"));
                var buffer = new byte[65536]; var length = stream.ReadAtLeast(buffer, buffer.Length, false);
                if (length == buffer.Length) continue;
                var args = Encoding.UTF8.GetString(buffer, 0, length).Split('\0', StringSplitOptions.RemoveEmptyEntries);
                if (!Matches(args)) continue;
                var csrf = Flag(args, "--csrf_token") ?? "";
                if (Path.GetFileName(args[0]) != "agy" && csrf.Length == 0) continue;
                var sockets = new HashSet<string>();
                foreach (var fd in Directory.EnumerateFiles(Path.Combine(directory, "fd")).Take(8192))
                {
                    var link = new FileInfo(fd).LinkTarget;
                    if (link?.StartsWith("socket:[") == true && link.EndsWith(']')) sockets.Add(link[8..^1]);
                }
                foreach (var table in new[] { "tcp", "tcp6" })
                    foreach (var port in ListeningPorts(File.ReadLines(Path.Combine(directory, "net", table)), sockets))
                    { endpoints.Add(new(port, csrf, true)); endpoints.Add(new(port, csrf, false)); }
                if (int.TryParse(Flag(args, "--extension_server_port"), out var extension) && extension is > 0 and <= 65535) endpoints.Add(new(extension, csrf, false));
                if (endpoints.Count >= 24) break;
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { /* Process may exit during discovery. */ }
        }
        return endpoints.Distinct().Take(24).ToArray();
    }
    [DllImport("libc")] static extern uint geteuid();
}

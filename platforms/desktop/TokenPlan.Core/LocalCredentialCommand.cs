using System.Diagnostics;
using System.Text;
namespace TokenPlan.Core;

public static class LocalCredentialCommand
{
    public static async Task<string?> GitHubToken(CancellationToken cancellation)
    {
        var name = OperatingSystem.IsWindows() ? "gh.exe" : "gh";
        var path = (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator).Where(Path.IsPathFullyQualified).Select(p => Path.Combine(p, name)).FirstOrDefault(File.Exists);
        if (path == null) return null;
        var start = new ProcessStartInfo(path) { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, RedirectStandardInput = true, CreateNoWindow = true };
        foreach (var arg in new[] { "auth", "token", "--hostname", "github.com" }) start.ArgumentList.Add(arg);
        using var process = Process.Start(start) ?? throw new IOException();
        process.StandardInput.Close();
        try
        {
            var output = Read(process.StandardOutput, cancellation); var error = Read(process.StandardError, cancellation);
            await Task.WhenAll(output, error, process.WaitForExitAsync(cancellation));
            if (process.ExitCode != 0) return null;
            var token = output.Result.Trim();
            if (token.Length > 8192 || token.Any(char.IsControl)) throw new InvalidDataException();
            return token.Length == 0 ? null : token;
        }
        finally { if (!process.HasExited) process.Kill(true); }
    }
    static async Task<string> Read(StreamReader stream, CancellationToken token)
    {
        var text = new StringBuilder(); var buffer = new char[1024]; int size;
        while ((size = await stream.ReadAsync(buffer.AsMemory(), token)) > 0) { if (text.Length + size > 65536) throw new InvalidDataException(); text.Append(buffer, 0, size); }
        return text.ToString();
    }
}

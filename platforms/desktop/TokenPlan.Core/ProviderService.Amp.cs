using System.Diagnostics;
using System.ComponentModel;
using System.Text;
using System.Text.Json;

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    async Task<ProviderResult> RefreshAmp(CancellationToken token)
    {
        var home = userHome;
        var folders = (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator)
            .Where(Path.IsPathFullyQualified).Concat(new[] { Path.Combine(home, ".amp", "bin"), Path.Combine(home, ".local", "bin"), Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "npm") });
        var start = AmpCommand.Find(folders, OperatingSystem.IsWindows());
        if (start == null) throw new ProviderFailure("Amp CLI not found. Install Amp and run amp login in Terminal.");
        var configHome = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME") ?? Path.Combine(home, ".config");
        var settingsFile = Path.Combine(configHome, "amp", "settings.json");
        string? configuredServer = null;
        if (File.Exists(settingsFile))
        {
            if (new FileInfo(settingsFile).Length > 2 * 1024 * 1024) throw new InvalidDataException();
            using var config = JsonDocument.Parse(await File.ReadAllTextAsync(settingsFile, token));
            configuredServer = UsageParser.String(config.RootElement, "amp.url");
        }
        var server = Environment.GetEnvironmentVariable("AMP_URL") ?? configuredServer ?? "https://ampcode.com/";
        var key = Environment.GetEnvironmentVariable("AMP_API_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            var dataHome = Environment.GetEnvironmentVariable("XDG_DATA_HOME") ?? Path.Combine(home, ".local", "share");
            var file = Path.Combine(dataHome, "amp", "secrets.json");
            if (!File.Exists(file)) throw new ProviderFailure("Amp is not logged in. Run amp login in Terminal, then refresh.");
            if (new FileInfo(file).Length > 2 * 1024 * 1024) throw new InvalidDataException();
            using var auth = JsonDocument.Parse(await File.ReadAllTextAsync(file, token));
            key = UsageParser.String(auth.RootElement, "apiKey@" + server);
            if (string.IsNullOrWhiteSpace(key) && Uri.TryCreate(server, UriKind.Absolute, out var uri) && uri.AbsolutePath == "/" && uri.Query.Length == 0 && uri.Fragment.Length == 0)
                key = UsageParser.String(auth.RootElement, "apiKey@" + (server.EndsWith('/') ? server.TrimEnd('/') : server + "/"));
        }
        if (string.IsNullOrWhiteSpace(key)) throw new ProviderFailure("Amp is not logged in. Run amp login in Terminal, then refresh.");
        start.UseShellExecute = false; start.RedirectStandardOutput = true; start.RedirectStandardError = true; start.RedirectStandardInput = true; start.CreateNoWindow = true;
        start.Environment["NO_COLOR"] = "1"; start.Environment["TERM"] = "dumb"; start.Environment["AMP_URL"] = server;
        using var process = new Process { StartInfo = start };
        try
        {
            process.Start(); process.StandardInput.Close();
            var output = ReadTextBounded(process.StandardOutput, token);
            var errors = ReadTextBounded(process.StandardError, token);
            await Task.WhenAll(output, errors, process.WaitForExitAsync(token));
            if (process.ExitCode != 0)
            {
                var failure = (output.Result + errors.Result).ToLowerInvariant();
                throw new ProviderFailure(failure.Contains("amp login") || failure.Contains("not logged in") || failure.Contains("unauthorized")
                    ? "Amp is not logged in. Run amp login in Terminal, then refresh." : "Amp usage failed. Run amp usage in Terminal to check your connection.");
            }
            return new("amp", "Amp", AmpUsage.Parse(output.Result, DateTimeOffset.UtcNow), null, Fingerprint(server + "\0" + key));
        }
        catch (Win32Exception) { throw new ProviderFailure("Amp CLI not found. Install Amp and run amp login in Terminal."); }
        finally
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); }
            catch (InvalidOperationException) { }
        }
    }
    static async Task<string> ReadTextBounded(StreamReader reader, CancellationToken token)
    {
        var result = new StringBuilder(); var buffer = new char[4096]; int count;
        while ((count = await reader.ReadAsync(buffer.AsMemory(), token)) != 0)
        {
            if (result.Length + count > 2 * 1024 * 1024) throw new InvalidDataException();
            result.Append(buffer, 0, count);
        }
        return result.ToString();
    }
}

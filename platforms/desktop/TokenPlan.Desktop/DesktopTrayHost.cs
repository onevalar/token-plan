using System.Diagnostics;
namespace TokenPlan.Desktop;

static class DesktopTrayHost
{
    public static async Task<bool?> Available()
    {
        if (OperatingSystem.IsWindows()) return true;
        if (!OperatingSystem.IsLinux() || !File.Exists("/usr/bin/gdbus")) return null;
        var start = new ProcessStartInfo("/usr/bin/gdbus") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var arg in new[] { "call", "--session", "--dest", "org.kde.StatusNotifierWatcher", "--object-path", "/StatusNotifierWatcher", "--method", "org.freedesktop.DBus.Properties.Get", "org.kde.StatusNotifierWatcher", "IsStatusNotifierHostRegistered" }) start.ArgumentList.Add(arg);
        try
        {
            using var process = Process.Start(start);
            if (process == null) return false;
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            try
            {
                var output = process.StandardOutput.ReadToEndAsync(timeout.Token);
                var error = process.StandardError.ReadToEndAsync(timeout.Token);
                await Task.WhenAll(output, error, process.WaitForExitAsync(timeout.Token));
                return process.ExitCode == 0 && output.Result.Contains("true", StringComparison.Ordinal);
            }
            finally { if (!process.HasExited) process.Kill(); }
        }
        catch (Exception e) when (e is IOException or System.ComponentModel.Win32Exception or OperationCanceledException) { return false; }
    }
}

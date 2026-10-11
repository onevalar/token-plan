using System.Diagnostics;
using System.Text;
using TokenPlan.Core;
namespace TokenPlan.Desktop;

static class DesktopNotifications
{
    public static async Task Send(string title, string body)
    {
        ProcessStartInfo start;
        if (OperatingSystem.IsLinux())
        {
            start = new("/usr/bin/notify-send");
            start.ArgumentList.Add("--app-name=TokenPlan"); start.ArgumentList.Add("--"); start.ArgumentList.Add(title); start.ArgumentList.Add(body);
        }
        else if (OperatingSystem.IsWindows())
        {
            using (var identity = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Classes\AppUserModelId\TokenPlan"))
            { identity.SetValue("DisplayName", "TokenPlan"); if (Environment.ProcessPath is { } path) identity.SetValue("IconUri", path); }
            var xml = "<toast><visual><binding template=\"ToastGeneric\"><text>" + System.Security.SecurityElement.Escape(title) + "</text><text>" + System.Security.SecurityElement.Escape(body) + "</text></binding></visual></toast>";
            var encodedXml = Convert.ToBase64String(Encoding.UTF8.GetBytes(xml));
            // Only Base64 is interpolated; no account or localized text is executable code.
            var script = "$ErrorActionPreference='Stop';[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]>$null;[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]>$null;$x=New-Object Windows.Data.Xml.Dom.XmlDocument;$x.LoadXml([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + encodedXml + "')));$t=[Windows.UI.Notifications.ToastNotification]::new($x);[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('TokenPlan').Show($t)";
            start = new(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe"));
            foreach (var arg in new[] { "-NoProfile", "-NonInteractive", "-EncodedCommand", Convert.ToBase64String(Encoding.Unicode.GetBytes(script)) }) start.ArgumentList.Add(arg);
        }
        else return;
        start.UseShellExecute = false; start.CreateNoWindow = true;
        start.RedirectStandardError = true; start.RedirectStandardOutput = true;
        using var process = Process.Start(start) ?? throw new IOException("Notification process did not start");
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        try
        {
            var output = process.StandardOutput.ReadToEndAsync(timeout.Token); var error = process.StandardError.ReadToEndAsync(timeout.Token);
            await Task.WhenAll(output, error, process.WaitForExitAsync(timeout.Token));
            if (process.ExitCode != 0) throw new IOException("Notification service rejected request");
        }
        finally { if (!process.HasExited) process.Kill(true); }
    }
}

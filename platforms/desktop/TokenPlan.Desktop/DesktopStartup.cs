using Microsoft.Win32;
using System.Runtime.Versioning;
namespace TokenPlan.Desktop;
static class DesktopStartup
{
    const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    static string LinuxFile => Path.Combine(Environment.GetEnvironmentVariable("XDG_CONFIG_HOME") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config"), "autostart", "tokenplan.desktop");
    public static bool Enabled
    {
        get
        {
            if (OperatingSystem.IsWindows()) return ReadWindows();
            return OperatingSystem.IsLinux() && File.Exists(LinuxFile);
        }
    }
    [SupportedOSPlatform("windows")]
    static bool ReadWindows() { using var key = Registry.CurrentUser.OpenSubKey(RunKey); return key?.GetValue("TokenPlan") is string; }
    public static void SetEnabled(bool enabled)
    {
        var executable = Environment.ProcessPath ?? throw new IOException();
        if (OperatingSystem.IsWindows())
        {
            using var key = Registry.CurrentUser.CreateSubKey(RunKey);
            if (enabled) key.SetValue("TokenPlan", "\"" + executable + "\" --background"); else key.DeleteValue("TokenPlan", false);
        }
        else if (OperatingSystem.IsLinux())
        {
            if (!enabled) { File.Delete(LinuxFile); return; }
            Directory.CreateDirectory(Path.GetDirectoryName(LinuxFile)!);
            var quoted = executable.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("`", "\\`").Replace("$", "\\$").Replace("%", "%%");
            File.WriteAllText(LinuxFile, "[Desktop Entry]\nType=Application\nName=TokenPlan\nExec=\"" + quoted + "\" --background\nIcon=tokenplan\nTerminal=false\n");
        }
    }
}

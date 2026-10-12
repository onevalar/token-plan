using System.Diagnostics;
using System.Runtime.InteropServices;
using Avalonia.Controls;
namespace TokenPlan.Desktop;

sealed class DesktopShortcut(MainWindow window) : IDisposable
{
    const int HotKeyId = 0x5450;
    const string Schema = "org.gnome.settings-daemon.plugins.media-keys";
    const string ShortcutPath = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/tokenplan/";
    bool registered;
    public static bool Supported => OperatingSystem.IsWindows() || OperatingSystem.IsLinux() && (Environment.GetEnvironmentVariable("XDG_CURRENT_DESKTOP") ?? "").Contains("GNOME", StringComparison.OrdinalIgnoreCase) && File.Exists("/usr/bin/gsettings");
    public void Apply(bool enabled)
    {
        if (OperatingSystem.IsWindows())
        {
            var handle = window.TryGetPlatformHandle()?.Handle ?? IntPtr.Zero;
            if (registered) { UnregisterHotKey(handle, HotKeyId); Win32Properties.RemoveWndProcHookCallback(window, OnMessage); registered = false; }
            if (enabled)
            {
                if (!RegisterHotKey(handle, HotKeyId, 0x4000 | 0x0002 | 0x0001, 0x55)) throw new IOException();
                Win32Properties.AddWndProcHookCallback(window, OnMessage); registered = true;
            }
        }
        else if (Supported)
        {
            var list = Run("get", Schema, "custom-keybindings");
            var paths = System.Text.RegularExpressions.Regex.Matches(list, "'([^']*)'").Select(m => m.Groups[1].Value).Where(p => p != ShortcutPath).ToList();
            var schema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:" + ShortcutPath;
            if (enabled)
            {
                // GNOME owns registration, focus and Wayland support. Preserve all other shortcuts.
                var executable = (Environment.ProcessPath ?? throw new IOException()).Replace("\\", "\\\\").Replace("\"", "\\\"");
                Run("set", schema, "name", "TokenPlan");
                Run("set", schema, "command", "\"" + executable + "\" --toggle");
                Run("set", schema, "binding", "<Control><Alt>u");
                paths.Add(ShortcutPath);
            }
            Run("set", Schema, "custom-keybindings", "[" + string.Join(", ", paths.Select(p => "'" + p.Replace("'", "\\'") + "'")) + "]");
        }
        else if (enabled) throw new IOException();
    }
    static string Run(params string[] arguments)
    {
        var start = new ProcessStartInfo("/usr/bin/gsettings") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        using var process = Process.Start(start) ?? throw new IOException();
        var output = process.StandardOutput.ReadToEndAsync(); var error = process.StandardError.ReadToEndAsync();
        if (!process.WaitForExit(2000)) { process.Kill(); throw new IOException(); }
        Task.WaitAll(output, error);
        if (process.ExitCode != 0) throw new IOException();
        return output.Result.Trim();
    }
    IntPtr OnMessage(IntPtr handle, uint message, IntPtr wparam, IntPtr lparam, ref bool handled)
    {
        if (message == 0x0312 && wparam.ToInt32() == HotKeyId) { handled = true; window.TogglePanel(); }
        return IntPtr.Zero;
    }
    public void Dispose()
    {
        if (registered) { UnregisterHotKey(window.TryGetPlatformHandle()?.Handle ?? IntPtr.Zero, HotKeyId); Win32Properties.RemoveWndProcHookCallback(window, OnMessage); registered = false; }
    }
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] static extern bool UnregisterHotKey(IntPtr window, int id);
}

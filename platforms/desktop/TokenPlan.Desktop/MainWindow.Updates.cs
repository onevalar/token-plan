using System.Reflection;
using System.Runtime.InteropServices;
using Avalonia.Controls;
using TokenPlan.Core;
namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    DesktopUpdate? availableUpdate;
    DateTimeOffset lastUpdateCheck;
    bool updateBusy;
    string? updateStatus;
    static string InstalledVersion => typeof(MainWindow).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "1.0.0";
    async Task CheckAppUpdate(bool manual)
    {
        if (Program.Fixture || updateBusy || (!manual && DateTimeOffset.UtcNow - lastUpdateCheck < TimeSpan.FromHours(12))) return;
        updateBusy = true; lastUpdateCheck = DateTimeOffset.UtcNow;
        try
        {
            var platform = RuntimeInformation.ProcessArchitecture == Architecture.X64
                ? OperatingSystem.IsWindows() ? "windows-x64" : OperatingSystem.IsLinux() ? "linux-x64" : "unsupported" : "unsupported";
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(15), MaxResponseContentBufferSize = 65536 };
            availableUpdate = DesktopUpdates.Parse(await client.GetStringAsync(DesktopUpdates.Feed), InstalledVersion, platform);
            updateStatus = availableUpdate == null ? "You are up to date." : "Update Available";
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException or InvalidDataException or InvalidOperationException or KeyNotFoundException)
        { DiagnosticLog.Write("updates", "Update check failed."); if (manual) updateStatus = "Could not check for updates. Try again later."; }
        finally { updateBusy = false; if (manual || availableUpdate != null) Render(); }
    }
    async Task InstallAppUpdate()
    {
        if (availableUpdate == null || updateBusy) return;
        updateBusy = true; updateStatus = "Downloading Update…"; Render();
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(15));
            var directory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TokenPlan", "updates");
            var path = await DesktopUpdates.Download(availableUpdate, directory, timeout.Token);
            if (!await Launcher.LaunchUriAsync(new Uri(path))) throw new IOException();
            updateStatus = "Complete the update in the installer.";
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or HttpRequestException or TaskCanceledException or InvalidOperationException)
        { DiagnosticLog.Write("updates", "Update download or installer launch failed."); updateStatus = "Could not install the update. Try again later."; }
        finally { updateBusy = false; Render(); }
    }
    Control UpdateControls()
    {
        var panel = Stack(8);
        var check = Action("Check for Updates", () => _ = CheckAppUpdate(true)); check.IsEnabled = !updateBusy;
        panel.Children.Add(check);
        if (availableUpdate != null)
        {
            panel.Children.Add(Text(availableUpdate.Version, 13, true));
            var install = Action("Download and Install Update", () => _ = InstallAppUpdate()); install.IsEnabled = !updateBusy;
            panel.Children.Add(install);
        }
        if (updateStatus != null) panel.Children.Add(Text(L.T(updateStatus), 12, true));
        return panel;
    }
}

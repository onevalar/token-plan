using System.Reflection;
using System.Runtime.InteropServices;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
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
    /// <summary>The Updates card: a manual check, the available version and its installer action.</summary>
    Control UpdateControls()
    {
        var rows = new StretchStack { Spacing = 0 };
        var check = PlainRow("Check for Updates", () => _ = CheckAppUpdate(true));
        check.IsEnabled = !updateBusy;
        rows.Children.Add(check);
        if (availableUpdate != null)
        {
            rows.Children.Add(Hairline());
            rows.Children.Add(PlainRow(availableUpdate.Version, null, secondary: true));
            rows.Children.Add(Hairline());
            var install = PlainRow("Download and Install Update", () => _ = InstallAppUpdate());
            install.IsEnabled = !updateBusy;
            rows.Children.Add(install);
        }
        if (updateStatus != null)
        {
            rows.Children.Add(Hairline());
            var status = Label(L.T(updateStatus), D.CaptionSize, T.Secondary);
            status.Margin = new Thickness(12, 9, 12, 9);
            rows.Children.Add(status);
        }
        return Section("Updates", CardSurface(rows));
    }

    /// <summary>A full-width text row that behaves like a button, matching the settings link rows.</summary>
    Button PlainRow(string label, Action? action, bool secondary = false)
    {
        var button = new Button
        {
            Content = Label(L.T(label), D.RowLabelSize, secondary ? T.Secondary : T.Ink),
            Background = Avalonia.Media.Brushes.Transparent,
            BorderThickness = default,
            Foreground = secondary ? T.Secondary : T.Ink,
            FontSize = D.RowLabelSize,
            Padding = new Thickness(12, 10),
            HorizontalAlignment = HorizontalAlignment.Stretch,
            HorizontalContentAlignment = HorizontalAlignment.Left,
            CornerRadius = new CornerRadius(0)
        };
        if (action != null) button.Click += (_, _) => action();
        else button.IsEnabled = false;
        return button;
    }
}

using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Styling;
using Avalonia.Themes.Fluent;
using Avalonia.Themes.Simple;

namespace TokenPlan.Desktop;

internal static class Program
{
    public static bool Background { get; private set; }
    public static bool Fixture { get; private set; }
    [STAThread]
    public static void Main(string[] args)
    {
        Fixture = args.Contains("--fixture") || Environment.GetEnvironmentVariable("TOKENPLAN_INTERFACE_REVIEW") == "1";
        Background = args.Contains("--background");
        using var single = DesktopActivation.CreateMutex();
        bool owned;
        try { owned = single.WaitOne(0); } catch (AbandonedMutexException) { owned = true; }
        if (!owned && !Fixture) { DesktopActivation.NotifyExisting(); return; }
        AppBuilder.Configure<App>().UsePlatformDetect().LogToTrace().StartWithClassicDesktopLifetime(args);
    }
}
public sealed class App : Application
{
    public override void Initialize()
    {
        Name = "TokenPlan";
        Styles.Add(new FluentTheme());
        RequestedThemeVariant = ThemeVariant.Default;
    }
    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var window = new MainWindow();
            desktop.MainWindow = window;
            DesktopTray? tray = null;
            DesktopActivation? activation = null;
            // Attach only once the native window/application launch has completed.
            window.Opened += (_, _) => { tray ??= new DesktopTray(this, desktop, window); if (!Program.Fixture) activation ??= new DesktopActivation(window.TogglePanel); };
            desktop.Exit += (_, _) => { activation?.Dispose(); tray?.Dispose(); };
        }
        base.OnFrameworkInitializationCompleted();
    }
}

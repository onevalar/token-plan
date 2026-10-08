using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Styling;
using Avalonia.Themes.Fluent;
using Avalonia.Themes.Simple;

namespace TokenPlan.Desktop;

internal static class Program
{
    public static bool Fixture { get; private set; }
    [STAThread]
    public static void Main(string[] args)
    {
        Fixture = args.Contains("--fixture") || Environment.GetEnvironmentVariable("TOKENPLAN_INTERFACE_REVIEW") == "1";
        AppBuilder.Configure<App>().UsePlatformDetect().LogToTrace().StartWithClassicDesktopLifetime(args);
    }
}
public sealed class App : Application
{
    public override void Initialize()
    {
        Name = "TokenPlan";
        Styles.Add(OperatingSystem.IsLinux() ? new SimpleTheme() : new FluentTheme());
        RequestedThemeVariant = ThemeVariant.Default;
    }
    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var window = new MainWindow();
            desktop.MainWindow = window;
            DesktopTray? tray = null;
            // Attach only once the native window/application launch has completed.
            window.Opened += (_, _) => tray ??= new DesktopTray(this, desktop, window);
            desktop.Exit += (_, _) => tray?.Dispose();
        }
        base.OnFrameworkInitializationCompleted();
    }
}

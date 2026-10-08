using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;

namespace TokenPlan.Desktop;

/// The OS owns tray placement and native menu interaction.
sealed class DesktopTray : IDisposable
{
    readonly Application app;
    readonly IClassicDesktopStyleApplicationLifetime lifetime;
    readonly MainWindow window;
    readonly TrayIcon icon;
    readonly NativeMenu menu = new();
    bool quitting;

    public DesktopTray(Application app, IClassicDesktopStyleApplicationLifetime lifetime, MainWindow window)
    {
        this.app = app; this.lifetime = lifetime; this.window = window;
        // Avalonia's native macOS backend rejects a null tooltip during attachment.
        icon = new TrayIcon { Icon = window.Icon, Menu = menu, ToolTipText = "", IsVisible = true };
        icon.Clicked += (_, _) => Show();
        Update();
        TrayIcon.SetIcons(app, new TrayIcons { icon });
        window.TrayAvailable = icon.NativeMenuExporter != null;
        window.StateChanged += Update;
        window.Closing += OnClosing;
    }
    void Show()
    {
        if (!window.IsVisible) window.Show();
        if (window.WindowState == WindowState.Minimized) window.WindowState = WindowState.Normal;
        window.Activate();
    }
    void OnClosing(object? sender, WindowClosingEventArgs e)
    {
        // Never intercept OS logout/shutdown or a deliberate Quit. Background mode is opt-in.
        if (!quitting && e.CloseReason == WindowCloseReason.WindowClosing && window.TrayAvailable && window.KeepRunningWhenClosed)
        { e.Cancel = true; window.Hide(); }
    }
    void Update()
    {
        // Keep the native menu identity stable; replacing it breaks the macOS exporter.
        menu.Items.Clear();
        var show = new NativeMenuItem(L.T("Show TokenPlan")); show.Click += (_, _) => Show(); menu.Items.Add(show);
        foreach (var summary in window.TraySummaries()) menu.Items.Add(new NativeMenuItem(summary) { IsEnabled = false });
        menu.Items.Add(new NativeMenuItemSeparator());
        var refresh = new NativeMenuItem(L.T("Refresh")); refresh.Click += (_, _) => window.RefreshFromTray(); menu.Items.Add(refresh);
        var quit = new NativeMenuItem(L.T("Quit")); quit.Click += (_, _) => { quitting = true; lifetime.Shutdown(); }; menu.Items.Add(quit);
    }
    public void Dispose()
    {
        window.StateChanged -= Update; window.Closing -= OnClosing;
        TrayIcon.SetIcons(app, null); icon.Dispose();
    }
}

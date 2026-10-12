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
    LinuxTrayInteraction? linuxInteraction;
    Window? contextWindow;
    bool quitting;
    bool disposed;
    bool initialHost = true;
    readonly Avalonia.Threading.DispatcherTimer hostTimer = new() { Interval = TimeSpan.FromSeconds(10) };

    public DesktopTray(Application app, IClassicDesktopStyleApplicationLifetime lifetime, MainWindow window)
    {
        this.app = app; this.lifetime = lifetime; this.window = window;
        // Avalonia's native macOS backend rejects a null tooltip during attachment.
        icon = new TrayIcon { Icon = window.Icon, Menu = menu, ToolTipText = "TokenPlan", IsVisible = true };
        icon.Clicked += (_, _) => Show();
        Update();
        TrayIcon.SetIcons(app, new TrayIcons { icon });
        if (OperatingSystem.IsLinux()) linuxInteraction = new(icon, Show, ShowContextMenu);
        window.ConfigureTrayPanel(OperatingSystem.IsWindows());
        window.Deactivated += OnDeactivated;
        window.StateChanged += Update;
        window.Closing += OnClosing;
        hostTimer.Tick += async (_, _) => await CheckHost();
        hostTimer.Start();
        _ = CheckHost();
    }
    async Task CheckHost()
    {
        var detected = await DesktopTrayHost.Available();
        if (disposed || detected == null) return;
        var available = detected.Value;
        var wasAvailable = window.TrayAvailable;
        window.ConfigureTrayPanel(available);
        if (initialHost) { initialHost = false; if (available && Program.Background) window.Hide(); else if (available && window.IsVisible) window.ShowTrayPage(); }
        if (wasAvailable && !available) window.ShowTrayPage();
    }
    void Show()
    {
        contextWindow?.Hide();
        window.ConfigureTrayPanel(true);
        window.ShowTrayPage();
    }
    void OnDeactivated(object? sender, EventArgs e) => window.DismissTrayPanel();

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
        foreach (var (label, target) in new[] { ("Overview", "overview"), ("Subscription Services", "providers"), ("General Settings", "settings"), ("About", "about") })
        {
            var item = new NativeMenuItem(L.T(label));
            item.Click += (_, _) => { window.ConfigureTrayPanel(true); window.ShowTrayPage(target); };
            menu.Items.Add(item);
        }
        foreach (var summary in window.TraySummaries()) menu.Items.Add(new NativeMenuItem(summary) { IsEnabled = false });
        menu.Items.Add(new NativeMenuItemSeparator());
        var refresh = new NativeMenuItem(L.T("Refresh")); refresh.Click += (_, _) => window.RefreshFromTray(); menu.Items.Add(refresh);
        var quit = new NativeMenuItem(L.T("Quit")); quit.Click += (_, _) => { quitting = true; lifetime.Shutdown(); }; menu.Items.Add(quit);
    }
    void ShowContextMenu(int x, int y)
    {
        contextWindow?.Close();
        var popup = new Window { Title = "TokenPlan", Width = 230, SizeToContent = SizeToContent.Height,
            WindowDecorations = WindowDecorations.None, ShowInTaskbar = false, CanResize = false,
            Topmost = true, WindowStartupLocation = WindowStartupLocation.Manual,
            RequestedThemeVariant = window.ActualThemeVariant };
        var body = new StackPanel { Spacing = 4, Margin = new Thickness(6) };
        void Item(string label, Action action)
        {
            var button = new Button { Content = L.T(label), HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Stretch };
            button.Click += (_, _) => { popup.Hide(); action(); }; body.Children.Add(button);
        }
        Item("Show TokenPlan", Show);
        Item("Subscription Services", () => window.ShowTrayPage("providers"));
        Item("General Settings", () => window.ShowTrayPage("settings"));
        Item("Refresh", window.RefreshFromTray);
        Item("Quit", () => { quitting = true; lifetime.Shutdown(); });
        popup.Content = body;
        popup.Deactivated += (_, _) => popup.Hide();
        popup.KeyDown += (_, e) => { if (e.Key == Avalonia.Input.Key.Escape) popup.Hide(); };
        var pointer = x >= 0 && y >= 0 ? new PixelPoint(x, y) : DesktopPanelPosition.Pointer();
        var screen = pointer is { } point ? window.Screens.ScreenFromPoint(point) : window.Screens.Primary;
        if (screen != null) popup.Position = DesktopPanelPosition.Place(screen.WorkingArea,
            new PixelSize((int)(230 * screen.Scaling), (int)(250 * screen.Scaling)), pointer);
        contextWindow = popup; popup.Show(); popup.Activate();
    }
    public void Dispose()
    {
        disposed = true; hostTimer.Stop();
        linuxInteraction?.Dispose(); contextWindow?.Close();
        window.Deactivated -= OnDeactivated; window.StateChanged -= Update; window.Closing -= OnClosing;
        TrayIcon.SetIcons(app, null); icon.Dispose();
    }
}

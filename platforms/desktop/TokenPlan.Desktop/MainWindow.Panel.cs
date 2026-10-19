using Avalonia;
using Avalonia.Controls;
using Avalonia.Threading;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    DesktopShortcut? shortcut;
    public void TogglePanel() { if (IsTrayPanel && IsVisible && IsActive) Hide(); else ShowTrayPage(); }

    void ApplyShortcut()
    {
        if (Program.Fixture) return;
        shortcut ??= new(this);
        try { shortcut.Apply(preferences.GlobalShortcut); }
        catch (Exception e) when (e is IOException or System.ComponentModel.Win32Exception) { preferences = preferences with { GlobalShortcut = false }; Save(); notice = "The global shortcut could not be registered. Check system keyboard settings."; TokenPlan.Core.DiagnosticLog.Write("shortcut", notice); Render(); }
    }

    public bool IsTrayPanel { get; private set; }

    public void ConfigureTrayPanel(bool available)
    {
        TrayAvailable = available;
        IsTrayPanel = available;
        WindowDecorations = available ? WindowDecorations.None : WindowDecorations.Full;
        ShowInTaskbar = !available;
        CanResize = !available;
        Topmost = available;
        MinWidth = available ? 340 : 320;
        MaxWidth = available ? 340 : double.PositiveInfinity;
        // The macOS panel is as tall as its content (up to the screen); the popover does the same.
        SizeToContent = available ? SizeToContent.Height : SizeToContent.Manual;
        MaxHeight = available ? 720 : double.PositiveInfinity;
    }

    /// <summary>
    /// Shows the popover. In tray mode it takes the macOS panel geometry: 340pt wide, anchored beside
    /// the pointer, and as tall as its content.
    /// </summary>
    public void ShowTrayPage(string? target = null)
    {
        if (target != null) Navigate(target);
        if (IsTrayPanel) { Width = 340; MinWidth = 340; MaxWidth = 340; }
        if (!IsVisible) Show();
        WindowState = WindowState.Normal;
        Activate();
        if (!IsTrayPanel) return;
        Dispatcher.UIThread.Post(() => {
            var pointer = DesktopPanelPosition.Pointer();
            var screen = pointer is { } point ? Screens.ScreenFromPoint(point) : Screens.Primary;
            if (screen == null) return;
            var area = screen.WorkingArea;
            var scale = screen.Scaling;
            Position = DesktopPanelPosition.Place(area, new PixelSize((int)(Width * scale), (int)(Height * scale)), pointer);
            WindowStartupLocation = WindowStartupLocation.Manual;
        }, DispatcherPriority.Loaded);
    }

    /// <summary>Keeps the popover anchored while its content changes height.</summary>
    void RepositionPanel()
    {
        if (!IsTrayPanel || !IsVisible) return;
        var pointer = DesktopPanelPosition.Pointer();
        var screen = pointer is { } point ? Screens.ScreenFromPoint(point) : Screens.Primary;
        if (screen == null) return;
        var area = screen.WorkingArea;
        var scale = screen.Scaling;
        Position = DesktopPanelPosition.Place(area, new PixelSize((int)(Width * scale), (int)(Height * scale)), pointer);
    }

    public void DismissTrayPanel()
    {
        // Owned confirmation windows must remain usable when the panel loses focus.
        Dispatcher.UIThread.Post(() => {
            if (IsTrayPanel && !IsActive && !OwnedWindows.Any(w => w.IsVisible)) Hide();
        }, DispatcherPriority.Background);
    }
}

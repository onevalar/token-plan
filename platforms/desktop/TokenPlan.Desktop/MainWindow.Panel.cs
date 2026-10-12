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
    }
    public void ShowTrayPage(string? target = null)
    {
        if (target != null) Navigate(target);
        if (IsTrayPanel)
        {
            var pointer = DesktopPanelPosition.Pointer();
            var screen = pointer is { } point ? Screens.ScreenFromPoint(point) : Screens.Primary;
            if (screen != null)
            {
                var area = screen.WorkingArea;
                var scale = screen.Scaling;
                Width = Math.Min(560, area.Width / scale);
                Height = Math.Min(720, area.Height / scale);
                MinWidth = Math.Min(480, Width); MinHeight = Math.Min(360, Height);
                Position = DesktopPanelPosition.Place(area, new PixelSize((int)(Width * scale), (int)(Height * scale)), pointer);
                WindowStartupLocation = WindowStartupLocation.Manual;
            }
        }
        if (!IsVisible) Show();
        WindowState = WindowState.Normal;
        Activate();
    }
    public void DismissTrayPanel()
    {
        // Owned confirmation windows must remain usable when the panel loses focus.
        Dispatcher.UIThread.Post(() => {
            if (IsTrayPanel && !IsActive && !OwnedWindows.Any(w => w.IsVisible)) Hide();
        }, DispatcherPriority.Background);
    }
}

using Avalonia;
using System.Runtime.InteropServices;
namespace TokenPlan.Desktop;

public static class DesktopPanelPosition
{
    public static PixelPoint Place(PixelRect area, PixelSize size, PixelPoint? pointer)
    {
        var anchor = pointer ?? new PixelPoint(area.Right, area.Bottom);
        var x = anchor.X - size.Width / 2;
        var y = anchor.Y < area.Y + area.Height / 2 ? area.Y + 8 : area.Bottom - size.Height - 8;
        return new(Math.Clamp(x, area.X, Math.Max(area.X, area.Right - size.Width)), Math.Clamp(y, area.Y, Math.Max(area.Y, area.Bottom - size.Height)));
    }
    public static PixelPoint? Pointer()
    {
        if (OperatingSystem.IsWindows() && GetCursorPos(out var p)) return new(p.X, p.Y);
        if (OperatingSystem.IsLinux())
        {
            try
            {
                var display = XOpenDisplay(IntPtr.Zero);
                if (display == IntPtr.Zero) return null;
                try { if (XQueryPointer(display, XDefaultRootWindow(display), out _, out _, out var x, out var y, out _, out _, out _)) return new(x, y); }
                finally { XCloseDisplay(display); }
            }
            catch (DllNotFoundException) { }
        }
        return null;
    }
    [StructLayout(LayoutKind.Sequential)] struct Point { public int X, Y; }
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] static extern bool GetCursorPos(out Point point);
    [DllImport("libX11.so.6")] static extern IntPtr XOpenDisplay(IntPtr name);
    [DllImport("libX11.so.6")] static extern IntPtr XDefaultRootWindow(IntPtr display);
    [DllImport("libX11.so.6")] [return: MarshalAs(UnmanagedType.Bool)] static extern bool XQueryPointer(IntPtr display, IntPtr window, out IntPtr root, out IntPtr child, out int rootX, out int rootY, out int winX, out int winY, out uint mask);
    [DllImport("libX11.so.6")] static extern int XCloseDisplay(IntPtr display);
}

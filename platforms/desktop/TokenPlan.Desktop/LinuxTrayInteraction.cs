using System.Reflection;
using Avalonia.Controls;
using Avalonia.Threading;
using Tmds.DBus.Protocol;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

// Compatibility shim for the pinned Avalonia 12.1.3 backend: its SNI ContextMenu
// method is a no-op. Preserve its icon, properties, native DBusMenu and lifecycle;
// only supply the missing interaction. Revisit when upgrading Avalonia.
sealed class LinuxTrayInteraction : IDisposable
{
    const BindingFlags Fields = BindingFlags.Instance | BindingFlags.NonPublic;
    readonly TrayIcon icon;
    readonly Action open;
    readonly Action<int, int> contextMenu;
    readonly DispatcherTimer timer = new() { Interval = TimeSpan.FromSeconds(1) };
    DBusConnection? connection;
    IPathMethodHandler? original;
    bool disposed;
    bool failed;

    public LinuxTrayInteraction(TrayIcon icon, Action open, Action<int, int> contextMenu)
    {
        this.icon = icon; this.open = open; this.contextMenu = contextMenu;
        timer.Tick += (_, _) => Install();
        timer.Start(); Install();
    }
    void Install()
    {
        if (disposed || failed) return;
        try
        {
            var impl = typeof(TrayIcon).GetField("_impl", Fields)?.GetValue(icon);
            if (impl == null) return; // Attached after the window opens.
            var type = impl.GetType();
            if (type.FullName != "Avalonia.FreeDesktop.DBusTrayIconImpl")
                throw new NotSupportedException("Unexpected Linux tray backend: " + type.FullName);
            if (type.GetField("_itemExported", Fields)?.GetValue(impl) is not true) return;
            connection = type.GetField("_connection", Fields)?.GetValue(impl) as DBusConnection
                ?? throw new NotSupportedException("Tray connection unavailable");
            original = type.GetField("_statusNotifierItemDbusObj", Fields)?.GetValue(impl) as IPathMethodHandler
                ?? throw new NotSupportedException("Tray method handler unavailable");
            // Reinstall after host restarts too: Avalonia may re-export its handler.
            connection.RemoveMethodHandler(original.Path);
            connection.AddMethodHandler(new Handler(original, open, contextMenu));
        }
        catch (Exception e)
        {
            failed = true; timer.Stop();
            DiagnosticLog.Write("tray", "Linux tray interaction adapter failed: " + e.Message);
        }
    }
    public void Dispose()
    {
        disposed = true; timer.Stop();
        if (connection != null && original != null)
        {
            connection.RemoveMethodHandler(original.Path);
            connection.AddMethodHandler(original);
        }
    }
    internal sealed class Handler(IPathMethodHandler original, Action open, Action<int, int> contextMenu) : IPathMethodHandler
    {
        public string Path => original.Path;
        public bool HandlesChildPaths => original.HandlesChildPaths;
        public ValueTask HandleMethodAsync(MethodContext context)
        {
            var request = context.Request;
            if (request.InterfaceAsString == "org.kde.StatusNotifierItem" && request.SignatureAsString == "ii")
            {
                var member = request.MemberAsString;
                if (member is "Activate" or "SecondaryActivate" or "ContextMenu")
                {
                    var reader = request.GetBodyReader(); var x = reader.ReadInt32(); var y = reader.ReadInt32();
                    Dispatcher.UIThread.Post(() => { if (member == "ContextMenu") contextMenu(x, y); else open(); });
                    using var reply = context.CreateReplyWriter(null);
                    context.Reply(reply.CreateMessage());
                    return ValueTask.CompletedTask;
                }
            }
            return original.HandleMethodAsync(context);
        }
    }
}

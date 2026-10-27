using System.Net;
using System.Runtime.InteropServices;

namespace TokenPlan.Core;

/// Configured before the Linux bridge creates any HttpClient. Desktop launchers
/// and terminal launches therefore share one policy without shell startup files.
public static class DesktopProxy
{
    public static bool HasEnvironmentProxy(Func<string, string?> read) =>
        new[] { "http_proxy", "https_proxy", "all_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY" }
            .Any(key => !string.IsNullOrWhiteSpace(read(key)));

    public static void Configure()
    {
        // Windows keeps .NET's environment/system proxy policy. macOS ships the
        // Swift URLSession helper, which already uses the system configuration.
        if (!OperatingSystem.IsLinux()) return;
        if (HasEnvironmentProxy(Environment.GetEnvironmentVariable))
        {
            DiagnosticLog.Write("network", "proxySource=environment");
            return;
        }
        HttpClient.DefaultProxy = new SystemProxy(Lookup);
        DiagnosticLog.Write("network", "proxySource=desktop-system");
    }

    public sealed class SystemProxy(Func<Uri, string[]> lookup) : IWebProxy
    {
        public ICredentials? Credentials { get; set; } = new UriCredentials();
        public Uri? GetProxy(Uri destination)
        {
            if (destination.IsLoopback) return destination;
            // Desktop routing needs the origin, not provider query strings or paths.
            var origin = new Uri(destination.GetLeftPart(UriPartial.Authority) + "/");
            foreach (var candidate in lookup(origin))
            {
                if (candidate == "direct://") return destination;
                if (Uri.TryCreate(candidate, UriKind.Absolute, out var proxy) &&
                    proxy.Host.Length > 0 && proxy.Scheme is "http" or "https" or "socks4" or "socks4a" or "socks5")
                    return proxy;
            }
            // Never silently try a direct connection when system resolution failed.
            throw new HttpRequestException("System proxy resolution returned no supported route.");
        }
        public bool IsBypassed(Uri host) => GetProxy(host) == host;
    }

    sealed class UriCredentials : ICredentials
    {
        public NetworkCredential? GetCredential(Uri uri, string authType)
        {
            if (string.IsNullOrEmpty(uri.UserInfo)) return null;
            var parts = uri.UserInfo.Split(':', 2);
            return new(Uri.UnescapeDataString(parts[0]), parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : "");
        }
    }

    static string[] Lookup(Uri origin)
    {
        try { return LookupNative(origin); }
        catch (Exception error) when (error is DllNotFoundException or EntryPointNotFoundException)
        {
            // No native error details: they may contain proxy URLs/credentials.
            throw new HttpRequestException("System proxy service is unavailable.");
        }
    }

    static string[] LookupNative(Uri origin)
    {
        var resolver = g_proxy_resolver_get_default(); // borrowed, system-owned reference
        if (resolver == IntPtr.Zero) throw new HttpRequestException("System proxy service is unavailable.");
        var cancellable = g_cancellable_new();
        var timer = new Timer(_ => g_cancellable_cancel(cancellable), null, TimeSpan.FromSeconds(5), Timeout.InfiniteTimeSpan);
        IntPtr values = IntPtr.Zero, error = IntPtr.Zero;
        try
        {
            values = g_proxy_resolver_lookup(resolver, origin.AbsoluteUri, cancellable, out error);
            if (error != IntPtr.Zero || values == IntPtr.Zero)
                throw new HttpRequestException("System proxy resolution failed.");
            var result = new List<string>();
            for (var i = 0; i < 64; i++)
            {
                var item = Marshal.ReadIntPtr(values, i * IntPtr.Size);
                if (item == IntPtr.Zero) break;
                if (Marshal.PtrToStringUTF8(item) is { } value) result.Add(value);
            }
            return result.ToArray();
        }
        finally
        {
            // Wait for a possible timer callback before releasing its native handle.
            timer.DisposeAsync().AsTask().GetAwaiter().GetResult();
            if (values != IntPtr.Zero) g_strfreev(values);
            if (error != IntPtr.Zero) g_error_free(error);
            g_object_unref(cancellable);
        }
    }

    const string Gio = "libgio-2.0.so.0", Glib = "libglib-2.0.so.0", GObject = "libgobject-2.0.so.0";
    [DllImport(Gio)] static extern IntPtr g_proxy_resolver_get_default();
    [DllImport(Gio)] static extern IntPtr g_proxy_resolver_lookup(IntPtr resolver, [MarshalAs(UnmanagedType.LPUTF8Str)] string uri, IntPtr cancellable, out IntPtr error);
    [DllImport(Gio)] static extern IntPtr g_cancellable_new();
    [DllImport(Gio)] static extern void g_cancellable_cancel(IntPtr cancellable);
    [DllImport(Glib)] static extern void g_strfreev(IntPtr values);
    [DllImport(Glib)] static extern void g_error_free(IntPtr error);
    [DllImport(GObject)] static extern void g_object_unref(IntPtr value);
}

using System.Net;
using TokenPlan.Core;

static class ProxyChecks
{
    public static void Run(Action<bool,string> check)
    {
        check(DesktopProxy.HasEnvironmentProxy(k => k == "https_proxy" ? "http://localhost:8000" : null), "Lowercase inherited proxy takes precedence");
        check(DesktopProxy.HasEnvironmentProxy(k => k == "ALL_PROXY" ? "socks5://localhost:8000" : null), "Uppercase inherited SOCKS proxy takes precedence");
        check(!DesktopProxy.HasEnvironmentProxy(k => k == "NO_PROXY" ? "localhost" : null), "A bypass list alone is not a proxy endpoint");
        var destination = new Uri("https://service.example.test/private?token=not-for-proxy-resolution");
        Uri? resolved = null;
        var proxy = new DesktopProxy.SystemProxy(uri => { resolved=uri; return ["http://user:p%40ss@127.0.0.1:8888"]; });
        var route = proxy.GetProxy(destination)!;
        check(route.Port == 8888 && !proxy.IsBypassed(destination), "System HTTP proxy is selected");
        check(resolved!.AbsolutePath == "/" && resolved.Query == "", "Proxy resolver receives no provider path or query");
        check(proxy.Credentials!.GetCredential(route,"Basic")!.Password == "p@ss", "Encoded proxy credentials are retained");
        check(proxy.IsBypassed(new Uri("http://127.0.0.1:9000")) && proxy.IsBypassed(new Uri("http://[::1]:9000")) && proxy.IsBypassed(new Uri("http://localhost:9000")), "Local backends always bypass the system proxy");
        check(new DesktopProxy.SystemProxy(_ => ["direct://"]).IsBypassed(destination), "Explicit system direct route is honored");
        check(new DesktopProxy.SystemProxy(_ => ["socks5://localhost:1080"]).GetProxy(destination)!.Scheme == "socks5", "System SOCKS5 proxy is preserved");
        var rejected=false;
        try { new DesktopProxy.SystemProxy(_ => []).GetProxy(destination); } catch(HttpRequestException) { rejected=true; }
        check(rejected,"Missing system route cannot silently fall back to direct");
    }
}

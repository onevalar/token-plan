using System.Text.Json;
using TokenPlan.Core;
static class DesktopUpdateChecks
{
    public static void Run(Action<bool, string> check, Action<Action, string> rejects)
    {
        var hash = new string('a',64);
        string Feed(string version, string url, string digest, long size) => JsonSerializer.Serialize(new { version, platforms = new Dictionary<string, object> { ["windows-x64"] = new { url, sha256 = digest, size } } });
        var url = "https://github.com/onevalar/token-plan/releases/download/v1.0.2/TokenPlan-Setup-1.0.2.exe";
        var valid = Feed("1.0.2", url, hash, 100);
        check(DesktopUpdates.Parse(valid,"1.0.1","windows-x64")?.Version == "1.0.2", "A newer published version is offered");
        check(DesktopUpdates.Parse(valid,"1.0.2","windows-x64") == null, "Same version is not offered");
        check(DesktopUpdates.Parse(valid,"1.0.3","windows-x64") == null, "Updates never downgrade");
        check(DesktopUpdates.Parse(valid,"1.0.1+commit","windows-x64") != null, "Build metadata does not break version comparison");
        check(DesktopUpdates.Parse(valid,"1.0.1","linux-x64") == null, "Missing platform is not replaced with another installer");
        check(DesktopUpdates.Parse(valid,"1.0.1","unsupported") == null, "Unsupported architecture is not offered an x64 installer");
        rejects(() => DesktopUpdates.Parse(Feed("1.0.2",url.Replace("onevalar/token-plan","attacker/apps"),hash,100),"1.0.1","windows-x64"), "Reject untrusted repository");
        rejects(() => DesktopUpdates.Parse(Feed("1.0.2",url.Replace("https:","http:"),hash,100),"1.0.1","windows-x64"), "Reject insecure download");
        rejects(() => DesktopUpdates.Parse(Feed("1.0.2",url,"invalid",100),"1.0.1","windows-x64"), "Reject invalid digest");
        rejects(() => DesktopUpdates.Parse(Feed("1.0.2",url,hash,0),"1.0.1","windows-x64"), "Reject empty installer");
        rejects(() => DesktopUpdates.Parse(Feed("1.0.2",url,hash,2147483649),"1.0.1","windows-x64"), "Bound installer size");
        rejects(() => DesktopUpdates.Parse(Feed("1.0.2",url.Replace("/v1.0.2/","/v1.0.1/"),hash,100),"1.0.1","windows-x64"), "Reject version/path mismatch");
    }
}

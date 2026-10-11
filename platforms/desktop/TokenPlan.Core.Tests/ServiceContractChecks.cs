using System.Net;
using TokenPlan.Core;

static class ServiceContractChecks
{
    sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    { protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) => Task.FromResult(respond(request)); }
    public static async Task Run(string root, Action<bool, string> check)
    {
        var keys = new APIKeyStore(Path.Combine(root, "contract-keys"), _ => null);
        var fixtures = new Dictionary<string, (string Host, string Body)> {
            ["deepseek"] = ("api.deepseek.com", """{"balance_infos":[{"currency":"USD","total_balance":"12"}]}"""),
            ["moonshot"] = ("api.moonshot.cn", """{"data":{"available_balance":12}}"""),
            ["siliconflow"] = ("api.siliconflow.cn", """{"code":20000,"data":{"totalBalance":"12"}}"""),
            ["minimax"] = ("www.minimaxi.com", """{"model_remains":[{"model_name":"MiniMax-M2","current_interval_remaining_percent":75}]}"""),
            ["zai"] = ("api.z.ai", """{"success":true,"data":{"limits":[{"type":"TOKENS_LIMIT","unit":3,"percentage":25}]}}"""),
            ["openrouter"] = ("openrouter.ai", """{"data":{"total_credits":20,"total_usage":5,"usage_daily":1}}""")
        };
        foreach (var (id, fixture) in fixtures)
        {
            keys.Save(id, "fixture-" + id);
            using (var service = new ProviderService(root, root, new Handler(request => {
                check(request.RequestUri!.Host == fixture.Host && request.Headers.Authorization?.Parameter == "fixture-" + id, id + " only receives its own key at official endpoint");
                return new(HttpStatusCode.OK) { Content = new StringContent(fixture.Body) };
            }), (_, _) => {}, keys: keys))
                check((await service.Refresh(id, default)).Snapshot?.Windows.Count > 0, id + " stored credential to normalized quota");
            foreach (var status in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden, HttpStatusCode.TooManyRequests, HttpStatusCode.InternalServerError, HttpStatusCode.OK })
            {
                using var service = new ProviderService(root, root, new Handler(_ => new(status) { Content = new StringContent(status == HttpStatusCode.OK ? "[]" : "provider-private-error") }), (_, _) => {}, keys: keys);
                var result = await service.Refresh(id, default);
                check(result.Snapshot == null && result.ErrorKey != null && !result.ErrorKey.Contains("private"), id + " sanitizes auth/rate-limit/server/schema failures: " + status);
            }
        }
        var home = Path.Combine(root, "service-contract-home"); var config = Path.Combine(home, ".config"); var data = Path.Combine(home, ".local", "share");
        Directory.CreateDirectory(Path.Combine(config, "github-copilot")); Directory.CreateDirectory(Path.Combine(data, "devin")); Directory.CreateDirectory(Path.Combine(data, "opencode")); Directory.CreateDirectory(Path.Combine(home, ".grok"));
        File.WriteAllText(Path.Combine(config, "github-copilot", "apps.json"), """{"github.com":{"oauth_token":"fixture-copilot"}}""");
        File.WriteAllText(Path.Combine(data, "devin", "credentials.toml"), "windsurf_api_key = \"fixture-devin\"");
        File.WriteAllText(Path.Combine(data, "opencode", "auth.json"), """{"opencode-go":{"key":"fixture-opencode"}}""");
        File.WriteAllText(Path.Combine(home, ".grok", "auth.json"), """{"default":{"key":"fixture-grok"}}""");
        var oldConfig = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME"); var oldData = Environment.GetEnvironmentVariable("XDG_DATA_HOME");
        Environment.SetEnvironmentVariable("XDG_CONFIG_HOME", config); Environment.SetEnvironmentVariable("XDG_DATA_HOME", data);
        try
        {
            var local = new Dictionary<string, (string Host, string Body)> {
                ["copilot"] = ("api.github.com", """{"quota_snapshots":{"premium_interactions":{"entitlement":100,"remaining":75}}}"""),
                ["devin"] = ("server.codeium.com", """{"userStatus":{"planStatus":{"dailyQuotaRemainingPercent":75}}}"""),
                ["opencode"] = ("opencode.ai", """{"usage":{"rolling":{"percent":25,"resetsAt":"2099-01-01T00:00:00Z"},"weekly":{"percent":25,"resetsAt":"2099-01-01T00:00:00Z"},"monthly":{"percent":25,"resetsAt":"2099-01-01T00:00:00Z"}}}"""),
                ["grok"] = ("cli-chat-proxy.grok.com", """{"config":{"creditUsagePercent":25,"currentPeriod":{"type":"USAGE_PERIOD_TYPE_WEEKLY","start":"2026-10-01T00:00:00Z","end":"2026-10-08T00:00:00Z"}}}""")
            };
            foreach (var (id, fixture) in local)
            {
                using (var service = new ProviderService(home, home, new Handler(request => {
                    check(request.RequestUri!.Host == fixture.Host, id + " credential endpoint is scoped");
                    return new(HttpStatusCode.OK) { Content = new StringContent(fixture.Body) };
                }), (_, _) => {}, userHome: home))
                    check((await service.Refresh(id, default)).Snapshot?.Windows[0].UsedPercent == 25, id + " actual file auth to HTTP to used percent");
                foreach (var status in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.TooManyRequests, HttpStatusCode.InternalServerError, HttpStatusCode.OK })
                {
                    using var service = new ProviderService(home, home, new Handler(_ => new(status) { Content = new StringContent("[]") }), (_, _) => {}, userHome: home);
                    var result = await service.Refresh(id, default); check(result.Snapshot == null && result.ErrorKey != null, id + " handles " + status);
                }
            }
        }
        finally { Environment.SetEnvironmentVariable("XDG_CONFIG_HOME", oldConfig); Environment.SetEnvironmentVariable("XDG_DATA_HOME", oldData); }
    }
}

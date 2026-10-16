using TokenPlan.Core;
using System.Net;
using System.Text;

static class ProviderBoundaryChecks
{
    sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> response) : HttpMessageHandler
    { protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation) => Task.FromResult(response(request)); }
    public static async Task Run(string root, Action<bool, string> check)
    {
        var home = Path.Combine(root, "provider-boundaries"); Directory.CreateDirectory(home);
        const string login = """{"token":{"access_token":"fixture-access","refresh_token":"fixture-refresh","expiry":"2099-01-01T00:00:00Z"}}""";
        var calls = new List<string>();
        using (var service = new ProviderService(home, home, new Handler(request => {
            calls.Add(request.RequestUri!.Host + request.RequestUri.AbsolutePath);
            check(request.Headers.Authorization?.Parameter == "fixture-access", "Antigravity uses only scoped OAuth credential");
            check(request.Headers.GetValues("User-Agent").Single() == "antigravity/cli/1.3.6", "CLI product marker selects independent Argon quota");
            var body = request.RequestUri.AbsolutePath.EndsWith("loadCodeAssist") ? """{"cloudaicompanionProject":"fixture-project","paidTier":{"name":"Pro"}}""" : """{"groups":[{"buckets":[{"bucketId":"gemini-argon-wtu-weekly","remainingFraction":0.8}]}]}""";
            return new(HttpStatusCode.OK) { Content = new StringContent(body) };
        }), (_, _) => {}, userHome: home, credentialReader: (_, _, _) => Task.FromResult<string?>(login)))
        {
            var result = await service.Refresh("antigravity", default);
            check(result.ErrorKey == null && result.Snapshot?.Windows.Single().UsedPercent == 20 && result.Snapshot.Windows.Single().Label == "Argon Weekly" && result.Snapshot.Plan == "Pro", "Antigravity credential through HTTP through quota mapping");
            check(calls.All(c => c.StartsWith("daily-cloudcode-pa.googleapis.com/")), "OAuth token never leaves fixed Google endpoint");
        }
        foreach (var code in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.TooManyRequests, HttpStatusCode.InternalServerError })
        {
            var attempts = 0;
            using var service = new ProviderService(home, home, new Handler(_ => { attempts++; return new(code) { Content = new StringContent("{}") }; }), (_, _) => {}, userHome: home, credentialReader: (_, _, _) => Task.FromResult<string?>(login));
            var result = await service.Refresh("antigravity", default);
            check(result.Snapshot == null && result.ErrorKey != null, "Antigravity rejects " + (int)code);
            if (code == HttpStatusCode.TooManyRequests) { await service.Refresh("antigravity", default); check(attempts == 1, "Antigravity cooldown prevents repeated rate-limit requests"); }
        }
        using (var service = new ProviderService(home, home, new Handler(_ => throw new Exception("Missing credential must not send a request")), (_, _) => {}, userHome: home, credentialReader: (_, _, _) => Task.FromResult<string?>(null)))
        {
            check((await service.Refresh("antigravity", default)).ErrorKey == "Sign in with Antigravity, then refresh.", "Antigravity missing credentials actionable");
            check((await service.Refresh("ollama", default)).ErrorKey!.Contains("ollama signin"), "Ollama missing key actionable without networking");
        }
        foreach (var bad in new[] { "{", "[]", "{\"token\":{}}", "go-keyring-base64:%%%" })
        {
            using var service = new ProviderService(home, home, new Handler(_ => throw new Exception("Malformed credential must not be sent")), (_, _) => {}, userHome: home, credentialReader: (_, _, _) => Task.FromResult<string?>(bad));
            check((await service.Refresh("antigravity", default)).ErrorKey != null, "Malformed system credential cannot crash UI");
        }
        var registryRoot = Path.Combine(home, "swap"); Directory.CreateDirectory(registryRoot);
        var saved = Path.Combine(home, "saved account");
        File.WriteAllText(Path.Combine(registryRoot, "accounts.json"), System.Text.Json.JsonSerializer.Serialize(new { schemaVersion = 1, accounts = new[] { new { home = saved, alias = "Work" }, new { home = saved, alias = "duplicate" }, new { home = "relative", alias = "invalid" } } }));
        var accounts = AccountHomes.Discover("codex", home, Path.Combine(home, ".codex"), key => key == "XSWAP_HOME" ? registryRoot : null);
        check(accounts.Count == 1 && accounts[0].Label == "Work", "Multiple accounts require absolute paths and deduplicate source homes");
        var price = ModelPricing.Estimate("gpt-5.4", new(1_000_000, 0, 0));
        check(price is > 0 && ModelPricing.Estimate("not-a-real-model", new(10, 10, 10)) == null, "Known models use shared price catalog; unknown models stay unpriced");
        check(ModelPricing.Estimate("gpt-5.4", new(1_000_000, 0, 0), true) == price * 2, "Fast-mode multiplier matches shared supplement");
    }
}

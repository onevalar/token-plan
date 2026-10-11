using System.Net;
using System.Text.Json;
using TokenPlan.Core;
static class AdvancedServiceChecks
{
    sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> action) : HttpMessageHandler
    { protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) => Task.FromResult(action(request)); }
    sealed class MetadataHandler(bool throttle = false) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("rate-limit-reset-credits"))
            {
                if (throttle) return new(HttpStatusCode.TooManyRequests);
                await Task.Delay(Timeout.Infinite, token);
            }
            return new(HttpStatusCode.OK) { Content = new StringContent("""{"rate_limit":{"primary_window":{"used_percent":42,"limit_window_seconds":18000}}}""") };
        }
    }
    public static async Task Run(string root, Action<bool, string> check)
    {
        var codexHome = Path.Combine(root, "codex-metadata"); Directory.CreateDirectory(codexHome);
        File.WriteAllText(Path.Combine(codexHome, "auth.json"), """{"tokens":{"access_token":"fixture-only"}}""");
        using (var service = new ProviderService(codexHome, codexHome, new MetadataHandler(), (_, _) => {}, requestTimeout: TimeSpan.FromSeconds(1)))
        {
            check((await service.Refresh("codex", default)).Snapshot?.Windows[0].UsedPercent == 42, "Optional metadata timeout preserves live Codex quota");
            using var cancel = new CancellationTokenSource(TimeSpan.FromMilliseconds(30));
            try { await service.Refresh("codex", cancel.Token); throw new Exception("Explicit cancellation ignored"); }
            catch (OperationCanceledException) { check(true, "Explicit cancellation still interrupts metadata request"); }
        }
        using (var service = new ProviderService(codexHome, codexHome, new MetadataHandler(true), (_, _) => {}))
        {
            await service.Refresh("codex", default);
            check((await service.Refresh("codex", default)).Snapshot?.Windows[0].UsedPercent == 42, "Metadata throttling does not block primary quota refresh");
        }
        var home = Path.Combine(root, "grok-refresh"); Directory.CreateDirectory(Path.Combine(home, ".grok"));
        var file = Path.Combine(home, ".grok", "auth.json");
        File.WriteAllText(file, """{"first":{"key":"old-access","refresh_token":"old-refresh","expires_at":"2000-01-01T00:00:00Z","extra":"keep"},"second":{"key":"other-account"}}""");
        var attempts = 0;
        using (var service = new ProviderService(home, home, new Handler(request => {
            attempts++;
            if (request.RequestUri!.Host == "auth.x.ai")
            {
                check(request.Method == HttpMethod.Post && request.RequestUri.AbsolutePath == "/oauth2/token", "Grok refresh sent only to official OAuth endpoint");
                return new(HttpStatusCode.OK) { Content = new StringContent("""{"access_token":"new-access","refresh_token":"new-refresh","expires_in":3600}""") };
            }
            check(request.Headers.Authorization?.Parameter == "new-access", "Grok billing uses renewed token");
            return new(HttpStatusCode.OK) { Content = new StringContent("""{"config":{"creditUsagePercent":25,"currentPeriod":{"type":"USAGE_PERIOD_TYPE_WEEKLY","start":"2026-10-01T00:00:00Z","end":"2026-10-08T00:00:00Z"}}}""") };
        }), (_, _) => {}, userHome: home))
        {
            check((await service.Refresh("grok", default)).Snapshot?.Windows[0].UsedPercent == 25 && attempts == 2, "Expired Grok token renews once then fetches quota");
            check((await service.Refresh("grok", default)).ErrorKey == null && attempts == 3, "Subsequent refresh reuses persisted valid credential");
        }
        using var saved = JsonDocument.Parse(File.ReadAllText(file));
        check(saved.RootElement.GetProperty("second").GetProperty("key").GetString() == "other-account" && saved.RootElement.GetProperty("first").GetProperty("extra").GetString() == "keep", "Grok renewal preserves other accounts and unknown fields");
        var grokLine = """{"timestamp":"2026-10-11T01:00:00Z","params":{"_meta":{"eventId":"fixture-turn"},"update":{"sessionUpdate":"turn_completed","usage":{"modelUsage":{"grok-test":{"inputTokens":100,"cachedReadTokens":20,"cacheCreationTokens":10,"outputTokens":30,"reasoningTokens":10,"costUsdTicks":5000000000}}}}}}""";
        var entry = GrokTokenUsage.Parse(grokLine).Single();
        check(entry.Event.Tokens.Total == 130 && entry.Event.Tokens.Input == 70 && entry.Event.EstimatedCost == 0.5, "Grok cache and reasoning are not counted twice; reported cost wins");
        var sessions = Path.Combine(home, "sessions", "one"); Directory.CreateDirectory(sessions);
        File.WriteAllText(Path.Combine(sessions, "updates.jsonl"), grokLine + "\n" + grokLine + "\n");
        var trend = await GrokTokenUsage.Scan(home, DateTimeOffset.Parse("2026-10-11T02:00:00Z"), TimeZoneInfo.Utc, default);
        check(trend.Days.Single().Tokens.Total == 130 && trend.Days.Single().Cost?.Dollars == 0.5, "Grok copied turn notifications are deduplicated by event and model");
        var shortCost = ModelPricing.Estimate("claude-sonnet-4-5", new(100, 0, 0, CacheWrite: 100), oneHourWrites: 100);
        check(Math.Abs(shortCost!.Value - 0.0009) < 0.0000001, "Claude one-hour writes cost twice input rate");
        var longCost = ModelPricing.Estimate("claude-sonnet-4-5", new(300000, 1000, 0));
        check(Math.Abs(longCost!.Value - 1.8225) < 0.000001, "Long prompts select whole-request long-context prices");
        var org = CopilotBilling.Parse("""{"usageItems":[{"product":"copilot","unitType":"ai-credits","grossQuantity":120,"netAmount":3.5},{"product":"copilot","unitType":"seats","grossQuantity":99,"netAmount":999}]}""");
        check(org[0].Amount == 120 && org[1].Amount == 3.5, "Organization billing excludes seat-fee items");
        var data = Path.Combine(root, "devin-enterprise"); Directory.CreateDirectory(Path.Combine(data, "devin"));
        File.WriteAllText(Path.Combine(data, "devin", "credentials.toml"), "api_server_url = \"https://devin.example/api/\"\nwindsurf_api_key = \"enterprise-only\"");
        check(LocalServiceAuth.DevinServer(data) == "https://devin.example/api", "Enterprise credentials stay on configured HTTPS server");
        File.WriteAllText(Path.Combine(data, "devin", "credentials.toml"), "api_server_url = \"http://unsafe.example\"");
        try { LocalServiceAuth.DevinServer(data); throw new Exception("Insecure enterprise endpoint accepted"); } catch (InvalidDataException) { check(true, "HTTP enterprise auth refused"); }
        var usage = UsageParser.Parse("claude", """{"limits":[{"kind":"weekly_scoped","percent":12,"scope":{"model":{"display_name":"Fable"}}}],"extra_usage":{"is_enabled":true,"used_credits":250,"monthly_limit":1000}}""", DateTimeOffset.UtcNow);
        check(usage.Windows[0].Label == "Fable" && usage.Windows[1].Amount == 2.5 && usage.Windows[1].Limit == 10 && usage.Windows[1].UsedPercent == 25, "Claude scoped model and cents conversion match Mac");
        var codex = UsageParser.Parse("codex", """{"credits":{"balance":"20.9"},"rate_limit_reset_credits":{"available_count":1,"credits":[{"expires_at":"2099-01-01T00:00:00Z"},{"status":"consumed","expires_at":"2099-01-02T00:00:00Z"}]}}""", DateTimeOffset.UtcNow);
        check(codex.Windows[0].Amount == 0.8 && codex.Windows[1].Expiries?.Count == 1, "Codex credits floor before valuation; consumed reset cards excluded");
    }
}

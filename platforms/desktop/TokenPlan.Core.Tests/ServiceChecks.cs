using TokenPlan.Core;
using System.Net;

static class ServiceChecks
{
    public static async Task Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var amp = AmpUsage.Parse("Subscription Megawatt: 32% agent usage and 76% orb usage remaining\nIndividual credits: $1,234.56 USD remaining", now);
        check(amp.Plan == "Megawatt" && amp.Windows[0].UsedPercent == 68 && amp.Windows[1].UsedPercent == 24, "Amp maps remaining to used without inversion");
        check(amp.Windows[2].Amount == 1234.56 && amp.Windows[0].ResetsAt == null, "Amp balance and no invented reset date");
        check(AmpUsage.Parse("Amp Pro Tier: agent usage 9 remaining (20%), orb usage 4 remaining (40%)", now).Windows[0].UsedPercent == 80, "Amp alternate CLI format");
        foreach (var malformed in new[] { "", "Subscription Max: 101% agent usage and 20% orb usage remaining", "Individual credits: unknown" })
        {
            try { AmpUsage.Parse(malformed, now); throw new Exception("Bad Amp output accepted"); }
            catch (InvalidDataException) { check(true, "Amp unknown data fails explicitly"); }
        }
        var keys = new APIKeyStore(Path.Combine(root, "keys"), _ => null);
        check(keys.Load("deepseek") == null, "No fabricated API key");
        keys.Save("deepseek", "test-only-key");
        check(keys.Load("deepseek") == "test-only-key", "API key round trip");
        if (OperatingSystem.IsWindows()) check(!File.ReadAllText(Path.Combine(root, "keys", "deepseek.json")).Contains("test-only-key"), "Windows secrets are protected by DPAPI");
        foreach (var (id, payload) in new[] {
            ("deepseek", """{"balance_infos":[{"currency":"CNY","total_balance":"10.5"}]}"""),
            ("moonshot", """{"data":{"available_balance":10.5}}"""),
            ("siliconflow", """{"code":20000,"data":{"totalBalance":"10.5"}}"""),
            ("openrouter", """{"data":{"total_credits":20,"total_usage":9.5}}""") })
            check(KeyUsageParser.Parse(id, payload, now).Windows.Any(w => w.Amount == 10.5), id + " balance mapping");
        var requests = 0;
        using (var service = new ProviderService(root, root, new Handler(request => {
            requests++;
            check(request.RequestUri!.AbsoluteUri == "https://api.deepseek.com/user/balance", "DeepSeek key goes only to its endpoint");
            check(request.Headers.Authorization?.Parameter == "test-only-key", "Stored key is used by refresh");
            return new(HttpStatusCode.Unauthorized) { Content = new StringContent("private upstream message") };
        }), (_, _) => {}, keys: keys))
        {
            var failed = await service.Refresh("deepseek", CancellationToken.None);
            check(failed.ErrorKey == "The API key was rejected. Check the key in service settings." && failed.Snapshot == null, "API rejection is actionable and sanitized");
            keys.Delete("deepseek");
            var missing = await service.Refresh("deepseek", CancellationToken.None);
            check(missing.ErrorKey == "Add an API key in service settings, then refresh." && requests == 1, "Removing a key stops network requests");
        }
        var pref = new Preferences { ProviderNotes = new() { ["amp"] = "local note" }, HiddenMetrics = new() { ["amp"] = new[] { "Balance" } } }.WithEnabled("amp", true);
        var file = Path.Combine(root, "service-preferences.json"); pref.Save(file); var restored = Preferences.Load(file);
        check(restored.IsEnabled("amp") && restored.ProviderNotes["amp"] == "local note" && restored.HiddenMetrics["amp"].Single() == "Balance", "Notes, visibility and additional providers survive restart");
        var history = new UsageHistory();
        var current = new ProviderResult("amp", "Amp", amp, null, new string('A', 64));
        history.Observe(current, now); var historyFile = Path.Combine(root, "amp-history.json"); history.Save(historyFile);
        check(UsageHistory.Load(historyFile, now).Read(new Dictionary<string, ProviderResult> { ["amp"] = current }, pref, now.AddDays(-1), now).Count == 1, "Amp readings survive history validation");
    }
    sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(respond(request));
    }
}

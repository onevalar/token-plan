using TokenPlan.Core;
using System.Text;
using System.Buffers.Binary;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

static class ParityChecks
{
    public static async Task Run(string root, DateTimeOffset now, Action<bool, string> check)
    {
        var prefs = new Preferences().Pin("claude", "Session", true).Pin("claude", "Weekly", true).Pin("claude", "Sonnet", true);
        check(prefs.PinnedMetrics["claude"].SequenceEqual(new[] { "Session", "Weekly" }), "Tray enforces two-item cap in model");
        check(prefs.Pin("claude", "Weekly", false).Pin("claude", "Sonnet", true).PinnedMetrics["claude"].Contains("Sonnet"), "Unpin re-enables selection");
        prefs = prefs.MoveProvider("codex", -1) with { HideValues = true, NotificationsEnabled = true };
        var file = Path.Combine(root, "parity-settings.json"); prefs.Save(file);
        var loaded = Preferences.Load(file);
        check(loaded.OrderedProviders.First() == "codex" && loaded.HideValues && loaded.NotifyAlmostOut && !loaded.NotificationsEnabled, "Appearance, ordering and notification settings survive restart");
        var alerts = new UsageAlerts();
        ProviderResult Reading(double used, string identity = "one") => new("claude", "Claude", new("claude", "Claude", null, new[] { new UsageWindow("Weekly", used, null) }, now), null, identity);
        check(alerts.Observe(Reading(91), 90).Count == 1 && alerts.Observe(Reading(95), 90).Count == 0, "Above-threshold repeated refresh does not spam notifications");
        alerts.Observe(Reading(20), 90);
        check(alerts.Observe(Reading(91), 90).Count == 1 && alerts.Observe(Reading(91, "two"), 90).Count == 1, "Reset and separate accounts rearm notifications");
        check(alerts.Observe(Reading(99) with { ErrorKey = "stale" }, 90).Count == 0, "Stale usage never triggers alert");
        var login = AntigravityUsage.ParseLogin("go-keyring-base64:" + Convert.ToBase64String(Encoding.UTF8.GetBytes("""{"token":{"access_token":"fixture-only","refresh_token":"refresh-only","expiry":"2026-10-11T00:00:00Z"}}""")));
        check(login.AccessToken == "fixture-only" && login.RefreshToken == "refresh-only", "Antigravity unwraps shared native credential format");
        var argon = AntigravityUsage.Parse("""{"groups":[{"buckets":[{"bucketId":"gemini-argon-wtu-weekly","window":"weekly","remainingFraction":0.28380427,"resetTime":"2026-10-23T02:51:52Z"},{"bucketId":"gemini-5h","remainingFraction":0.99715096}]}]}""", now);
        check(argon.Windows.Count == 2 && argon.Windows[1].Label == "Argon Weekly" && argon.Windows[1].UsedPercent == 72 && argon.Windows[1].ResetsAt == DateTimeOffset.Parse("2026-10-23T02:51:52Z"), "Argon weekly stays independent and uses server reset without invented five-hour quota");
        var ag = AntigravityUsage.Parse("""{"groups":[{"buckets":[{"bucketId":"gemini-5h","remainingFraction":0.7},{"bucketId":"gemini-image-5h","remainingFraction":0.01},{"bucketId":"3p-weekly","remainingFraction":1},{"bucketId":"3p-5h"}]}]}""", now);
        check(ag.Windows.Count == 2 && ag.Windows[0].UsedPercent == 30 && ag.Windows[1].UsedPercent == 0, "Antigravity exact pools; missing quota is not fabricated as zero");
        var periods = AntigravityUsage.Parse("""{"groups":[{"buckets":[{"bucketId":"gemini-5h","remainingFraction":1,"resetTime":"2026-10-23T12:00:00Z"},{"bucketId":"gemini-weekly","remainingFraction":0.7},{"bucketId":"3p-5h","remainingFraction":0.8},{"bucketId":"3p-weekly","remainingFraction":0.9},{"bucketId":"gemini-argon-wtu-weekly","remainingFraction":0.65}]}]}""", now);
        check(periods.Windows.Select(w=>w.PeriodSeconds).SequenceEqual(new double?[]{18000,604800,18000,604800,604800}), "Antigravity propagates the exact bucket periods for all five windows");
        check(periods.Windows[0].UsedPercent==0 && periods.Windows[0].ResetsAt==DateTimeOffset.Parse("2026-10-23T12:00:00Z") && periods.Windows[1].ResetsAt==null, "Antigravity preserves zero quota and actual reset times without inventing a missing reset");
        var ollama = OllamaUsage.Parse("""{"limits":{"session":{"usage":0.349},"weekly":{"usage":0}},"activity":{"cost":"1.25"}}""", now);
        check(Math.Abs(ollama.Windows[0].UsedPercent - 34.9) < 0.001 && ollama.Windows[0].ResetsAt == null && ollama.Windows[2].Amount == 1.25, "Ollama fractions, spend and no invented reset");
        // An independent verifier validates the wire signature, not just its output length.
        var privateKey = new Ed25519PrivateKeyParameters(Enumerable.Range(0, 32).Select(i => (byte)i).ToArray(), 0);
        var publicKey = privateKey.GeneratePublicKey().GetEncoded();
        byte[] Integer(uint i) { var b = new byte[4]; BinaryPrimitives.WriteUInt32BigEndian(b, i); return b; }
        byte[] Block(byte[] b) => Integer((uint)b.Length).Concat(b).ToArray();
        var type = Encoding.ASCII.GetBytes("ssh-ed25519");
        var publicBlob = Block(type).Concat(Block(publicKey)).ToArray();
        var secret = privateKey.GetEncoded().Concat(publicKey).ToArray();
        var inner = Integer(7).Concat(Integer(7)).Concat(Block(type)).Concat(Block(publicKey)).Concat(Block(secret)).ToArray();
        var wire = Encoding.ASCII.GetBytes("openssh-key-v1\0").Concat(Block("none"u8.ToArray())).Concat(Block("none"u8.ToArray())).Concat(Block(Array.Empty<byte>())).Concat(Integer(1)).Concat(Block(publicBlob)).Concat(Block(inner)).ToArray();
        using var signingKey = OllamaSigningKey.Parse(Convert.ToBase64String(wire));
        var auth = signingKey.Authorization("GET", "/api/usage?ts=123").Split(':');
        var verifier = new Ed25519Signer(); verifier.Init(false, new Ed25519PublicKeyParameters(publicKey, 0));
        var message = Encoding.UTF8.GetBytes("GET,/api/usage?ts=123"); verifier.BlockUpdate(message, 0, message.Length);
        check(auth[0] == Convert.ToBase64String(publicBlob) && verifier.VerifySignature(Convert.FromBase64String(auth[1])), "Ollama signature verifies for exact timestamped URI");
        var ollamaHome = Path.Combine(root, "ollama-http"); Directory.CreateDirectory(Path.Combine(ollamaHome, ".ollama"));
        File.WriteAllText(Path.Combine(ollamaHome, ".ollama", "id_ed25519"), Convert.ToBase64String(wire));
        using (var service = new ProviderService(root, root, new SigningHandler(request => {
            check(request.RequestUri!.Host == "ollama.com", "Ollama signing key goes only to Ollama");
            var header = request.Headers.GetValues("Authorization").Single().Split(':');
            var verify = new Ed25519Signer(); verify.Init(false, new Ed25519PublicKeyParameters(publicKey, 0));
            var bytes = Encoding.UTF8.GetBytes(request.Method + "," + request.RequestUri.PathAndQuery); verify.BlockUpdate(bytes, 0, bytes.Length);
            check(verify.VerifySignature(Convert.FromBase64String(header[1])), "Actual Ollama HTTP URI and authorization signature agree");
            return new(System.Net.HttpStatusCode.OK) { Content = new StringContent("{\"limits\":{\"session\":{\"usage\":0.25}}}") };
        }), (_, _) => {}, userHome: ollamaHome)) check((await service.Refresh("ollama", default)).Snapshot?.Windows[0].UsedPercent == 25, "Ollama file through signed HTTP through usage snapshot");
        foreach (var broken in new[] { wire[..10], wire[..^4] }) { try { using var ignored = OllamaSigningKey.Parse(Convert.ToBase64String(broken)); throw new Exception("Truncated key accepted"); } catch (InvalidDataException) { check(true, "Truncated key rejected"); } }
        var npm = Path.Combine(root, "npm with spaces"); var package = Path.Combine(npm, "node_modules", "@sourcegraph", "amp"); Directory.CreateDirectory(package);
        File.WriteAllText(Path.Combine(npm, "node.exe"), "fixture"); File.WriteAllText(Path.Combine(package, "cli.js"), "fixture");
        File.WriteAllText(Path.Combine(package, "package.json"), """{"bin":{"amp":"cli.js"}}""");
        var command = AmpCommand.Find(new[] { npm }, true)!;
        check(command.FileName.EndsWith("node.exe") && command.ArgumentList[0] == Path.Combine(package, "cli.js") && command.ArgumentList[1] == "usage", "npm Amp invoked without cmd quoting or shell injection");
    }
    sealed class SigningHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    { protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation) => Task.FromResult(respond(request)); }
}

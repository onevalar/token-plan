using System.Net;
using System.Net.Sockets;
using System.Text;
using TokenPlan.Core;
static class AntigravityLocalChecks
{
    public static async Task Run(string root, Action<bool, string> check)
    {
        check(AntigravityLocalService.Matches(["/opt/antigravity/language_server_linux_x64", "--ide_name=antigravity", "--csrf_token", "test"]), "Antigravity Linux process supports equals-style flags");
        check(!AntigravityLocalService.Matches(["/opt/other/language_server", "--ide_name", "other"]), "Other language servers are excluded");
        check(AntigravityLocalService.Flag(["agy", "--csrf_token=test"], "--csrf_token") == "test", "CSRF parser preserves equals-style argument");
        check(AntigravityLocalService.ListeningPorts(["header", "0: 0100007F:1234 00000000:0000 0A 0 0 0 0 0 567", "1: 0100007F:4567 00000000:0000 0A 0 0 0 0 0 999"], new HashSet<string> { "567" }).SequenceEqual(new[] { 0x1234 }), "Only sockets owned by matching process are probed");
        check(AntigravityUsage.Parse("{\"groups\":[]}", DateTimeOffset.UtcNow).Windows.Count == 0, "Empty authoritative quota summary does not invent usage");
        var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        try
        {
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            var server = Task.Run(async () => {
                using var socket = await listener.AcceptTcpClientAsync(deadline.Token);
                await using var stream = socket.GetStream();
                var bytes = new List<byte>(); var one = new byte[1];
                while (bytes.Count < 16384 && await stream.ReadAsync(one, deadline.Token) > 0)
                {
                    bytes.Add(one[0]);
                    if (bytes.Count >= 4 && Encoding.ASCII.GetString(bytes.TakeLast(4).ToArray()) == "\r\n\r\n") break;
                }
                var headers = Encoding.ASCII.GetString(bytes.ToArray());
                check(headers.Contains("POST /exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary") && headers.Contains("x-codeium-csrf-token: test-csrf"), "Local RPC receives expected path and CSRF header");
                var body = """{"response":{"groups":[{"buckets":[{"bucketId":"gemini-5h","remainingFraction":0.7}]}]}}""";
                var payload = Encoding.UTF8.GetBytes(body);
                await stream.WriteAsync(Encoding.ASCII.GetBytes($"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {payload.Length}\r\nConnection: close\r\n\r\n"), deadline.Token);
                await stream.WriteAsync(payload, deadline.Token);
            });
            using var service = new ProviderService(root, root, credentialReader: (_, _, _) => throw new Exception("Keyring must not be accessed when LS is available"), antigravityDiscovery: _ => [new(port, "test-csrf", false)]);
            var result = await service.Refresh("antigravity", deadline.Token);
            await server;
            check(result.ErrorKey == null && result.Snapshot?.Windows.Single().UsedPercent == 30, "Linux local quota succeeds independently of system keyring");
            check(result.CredentialFingerprint == null, "Unidentified LS accounts do not mix stored history");
        }
        finally { listener.Stop(); }
        using var missing = new ProviderService(root, root, credentialReader: (_, _, _) => throw new SystemCredentialException("The system credential reader is missing. Install libsecret-tools, or open Antigravity and refresh."), antigravityDiscovery: _ => []);
        check((await missing.Refresh("antigravity", default)).ErrorKey?.Contains("libsecret-tools") == true, "Missing reader has actionable error rather than unlock instruction");
    }
}

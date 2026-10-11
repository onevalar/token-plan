using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    async Task<ProviderResult> RefreshLocal(string id, CancellationToken cancellationToken)
    {
        var home = userHome;
        var config = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME") ?? (OperatingSystem.IsWindows() ? Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) : Path.Combine(home, ".config"));
        var data = Environment.GetEnvironmentVariable("XDG_DATA_HOME") ?? Path.Combine(home, ".local", "share");
        var key = await Task.Run(() => id switch {
            "copilot" => LocalServiceAuth.Copilot(config), "opencode" => LocalServiceAuth.OpenCode(Path.Combine(data, "opencode")),
            "devin" => LocalServiceAuth.Devin(data) ?? LocalServiceAuth.DevinDesktop(config), "grok" => LocalServiceAuth.Grok(home), _ => null
        }, cancellationToken);
        if (id == "copilot" && string.IsNullOrWhiteSpace(key)) key = await LocalCredentialCommand.GitHubToken(cancellationToken);
        if (string.IsNullOrWhiteSpace(key)) throw new ProviderFailure(id switch {
            "copilot" => "Sign in to GitHub Copilot in your editor, or run gh auth login, and try again.",
            "opencode" => "Sign in with the service app, then refresh.",
            "devin" => "Run devin auth login or sign in to Devin and try again.",
            _ => "Grok not logged in. Run `grok login`."
        });
        var fingerprint = Fingerprint(key); attemptIdentities[id] = fingerprint; var cooldown = id + fingerprint; CheckCooldown(cooldown);
        var endpoint = id switch {
            "copilot" => "https://api.github.com/copilot_internal/user", "opencode" => "https://opencode.ai/zen/go/v1/usage",
            "devin" => LocalServiceAuth.DevinServer(data) + "/exa.seat_management_pb.SeatManagementService/GetUserStatus",
            _ => "https://cli-chat-proxy.grok.com/v1/billing?format=credits"
        };
        using var request = new HttpRequestMessage(id == "devin" ? HttpMethod.Post : HttpMethod.Get, endpoint);
        if (id == "devin")
        {
            request.Headers.Add("Connect-Protocol-Version", "1");
            request.Content = new StringContent(JsonSerializer.Serialize(new { metadata = new { apiKey = key, ideName = "devin", ideVersion = "1.108.2", extensionName = "devin", extensionVersion = "1.108.2", locale = "en" } }), Encoding.UTF8, "application/json");
        }
        else request.Headers.Authorization = new AuthenticationHeaderValue(id == "copilot" ? "token" : "Bearer", key);
        if (id == "copilot")
        {
            request.Headers.Add("Editor-Version", "vscode/1.96.2"); request.Headers.Add("Editor-Plugin-Version", "copilot-chat/0.26.7");
            request.Headers.Add("X-Github-Api-Version", "2025-04-01"); request.Headers.UserAgent.ParseAdd("GitHubCopilotChat/0.26.7");
        }
        if (id == "grok") request.Headers.Add("X-XAI-Token-Auth", "xai-grok-cli");
        var body = await Fetch(request, cooldown, cancellationToken);
        var snapshot = LocalServiceUsage.Parse(id, body, DateTimeOffset.UtcNow);
        if (id == "copilot" && CopilotBilling.IsManaged(body) && snapshot.Windows.All(w => w.IsBalance))
        {
            try { snapshot = await CopilotOrgUsage(snapshot, key, cooldown, cancellationToken); }
            catch (OperationCanceledException) { throw; }
            catch (Exception e) when (e is ProviderFailure or JsonException or InvalidDataException or HttpRequestException) { log(id, "Organization billing could not be loaded."); }
        }
        return new(id, ProviderCatalog.Get(id).Name, snapshot, snapshot.Windows.Count == 0 ? "This account does not expose a personal quota. Organization billing requires billing permissions." : null, fingerprint);
    }
}

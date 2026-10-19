using System.Net.Http.Headers;
using System.Text.Json;
namespace TokenPlan.Core;
public sealed partial class ProviderService
{
    async Task<UsageSnapshot> CopilotOrgUsage(UsageSnapshot personal, string key, string cooldown, CancellationToken cancellation)
    {
        async Task<string> Get(string path)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com" + path);
            request.Headers.Authorization = new AuthenticationHeaderValue("token", key); request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
            request.Headers.Accept.ParseAdd("application/vnd.github+json"); return await Fetch(request, cooldown, cancellation);
        }
        using var organizations = JsonDocument.Parse(await Get("/user/orgs?per_page=100"));
        if (organizations.RootElement.ValueKind != JsonValueKind.Array) throw new InvalidDataException();
        foreach (var org in organizations.RootElement.EnumerateArray().Take(100))
        {
            var slug = UsageParser.String(org, "login");
            if (string.IsNullOrWhiteSpace(slug) || !slug.All(c => char.IsAsciiLetterOrDigit(c) || c == '-')) continue;
            try
            {
                var rows = CopilotBilling.Parse(await Get("/orgs/" + slug + "/settings/billing/usage/summary"));
                if (rows.Count > 0) return personal with { Plan = personal.Plan + " · " + slug, Windows = personal.Windows.Concat(rows).ToArray() };
            }
            catch (ProviderFailure e) when (e.Message != "Usage queries are temporarily rate limited. Data may be out of date. Retrying automatically later.") { log("copilot", "Organization billing is not accessible for this login."); }
        }
        return personal;
    }
}

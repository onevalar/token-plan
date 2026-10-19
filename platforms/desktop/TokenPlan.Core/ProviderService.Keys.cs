using System.Net.Http.Headers;

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    public APIKeyStore Keys { get; }
    static bool IsKeyProvider(string id) => ProviderCatalog.Get(id).EnvironmentKey != null;
    async Task<UsageSnapshot> FetchKeyUsage(string id, string key, string cooldown, CancellationToken cancellationToken)
    {
        var endpoints = id switch {
            "deepseek" => new[] { "https://api.deepseek.com/user/balance" },
            "moonshot" => new[] { "https://api.moonshot.cn/v1/users/me/balance", "https://api.moonshot.ai/v1/users/me/balance" },
            "siliconflow" => new[] { "https://api.siliconflow.cn/v1/user/info" },
            "minimax" => new[] { "https://www.minimaxi.com/v1/token_plan/remains", "https://www.minimax.io/v1/token_plan/remains" },
            "zai" => new[] { "https://api.z.ai/api/monitor/usage/quota/limit", "https://open.bigmodel.cn/api/monitor/usage/quota/limit" },
            "openrouter" => new[] { "https://openrouter.ai/api/v1/credits", "https://openrouter.ai/api/v1/key" },
            _ => throw new ArgumentException("Unknown provider")
        };
        var rows = new List<UsageWindow>(); Exception? failure = null;
        for (var index = 0; index < endpoints.Length; index++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, endpoints[index]);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
                var json = await Fetch(request, cooldown, cancellationToken);
                var snapshot = KeyUsageParser.Parse(id, json, DateTimeOffset.UtcNow);
                if (id == "moonshot" && index == 1)
                    snapshot = snapshot with { Windows = snapshot.Windows.Select(w => w with { Currency = "USD" }).ToArray() };
                if (id != "openrouter") return snapshot;
                rows.AddRange(snapshot.Windows);
            }
            catch (ProviderFailure error) when (error.Message == "Your session has expired. Sign in with the CLI again.")
            { failure = new ProviderFailure("The API key was rejected. Check the key in service settings."); }
            catch (InvalidDataException error) { failure = error; }
            catch (ProviderFailure error) when (id == "openrouter" && error.Message != "Usage queries are temporarily rate limited. Data may be out of date. Retrying automatically later.") { failure = error; }
        }
        if (rows.Count > 0)
        {
            if (failure != null) log(id, "Some usage endpoints did not return data.");
            return new(id, ProviderCatalog.Get(id).Name, null, rows, DateTimeOffset.UtcNow);
        }
        throw failure ?? new InvalidDataException();
    }
}

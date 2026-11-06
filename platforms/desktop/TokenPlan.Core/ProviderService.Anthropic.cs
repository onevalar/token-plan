using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    async Task<UsageSnapshot> FetchAnthropic(string key, string cooldown, CancellationToken cancellation)
    {
        var now = DateTimeOffset.UtcNow;
        var month = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var start = new DateTimeOffset(now.UtcDateTime.Date.AddDays(-29), TimeSpan.Zero);
        if (month < start) start = month;
        var costs = ReadAnthropicPages(key, cooldown, true, start, now, cancellation);
        var usage = ReadAnthropicPages(key, cooldown, false, start, now, cancellation);
        await Task.WhenAll(costs, usage);
        return OpenAIUsageParser.Parse(await costs, await usage, now) with { Id = "anthropic", Name = "Anthropic API" };
    }
    async Task<IReadOnlyList<JsonElement>> ReadAnthropicPages(string key, string cooldown, bool costs, DateTimeOffset start, DateTimeOffset now, CancellationToken cancellation)
    {
        var rows = new List<JsonElement>(); var seen = new HashSet<string>(); string? cursor = null;
        for (var page = 0; page < 100; page++)
        {
            var url = "https://api.anthropic.com/v1/organizations/analytics/" + (costs ? "cost" : "usage")
                + "?starting_at=" + Uri.EscapeDataString(start.ToString("yyyy-MM-ddTHH:mm:ssZ"))
                + "&ending_at=" + Uri.EscapeDataString(now.ToString("yyyy-MM-ddTHH:mm:ssZ"))
                + "&time_bucket_width=1h&limit=1000&group_by%5B%5D=model"
                + (cursor == null ? "" : "&page=" + Uri.EscapeDataString(cursor));
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("x-api-key", key);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Headers.Add("anthropic-beta", "analytics-usage-cost-2026-08-24");
            string json;
            try { json = await Fetch(request, cooldown, cancellation); }
            catch (ProviderFailure error) when (error.Status == System.Net.HttpStatusCode.Forbidden)
            { throw new ProviderFailure("This key cannot read organization usage or costs. Check its permissions."); }
            catch (ProviderFailure error) when (error.Status == System.Net.HttpStatusCode.Unauthorized)
            { throw new ProviderFailure("The Anthropic Admin key was rejected. Replace it in service settings."); }
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array
                || !root.TryGetProperty("has_more", out var more) || more.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) throw new InvalidDataException();
            rows.AddRange(data.EnumerateArray().Select(x => AnthropicUsageParser.Normalize(x, costs, start, now)));
            if (!more.GetBoolean()) return rows;
            cursor = UsageParser.String(root, "next_page");
            if (string.IsNullOrEmpty(cursor) || !seen.Add(cursor)) throw new InvalidDataException();
        }
        throw new InvalidDataException();
    }
}

public static class AnthropicUsageParser
{
    public static JsonElement Normalize(JsonElement row, bool costs, DateTimeOffset start, DateTimeOffset now)
    {
        if (!DateTimeOffset.TryParse(UsageParser.String(row,"starting_at"), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date)
            || date < start || date > now) throw new InvalidDataException();
        var model = UsageParser.String(row.GetProperty("group"), "model");
        object value;
        if (costs) {
            var cost = row.GetProperty("cost");
            if (UsageParser.String(cost,"currency")?.ToUpperInvariant() != "USD"
                || KeyUsageParser.Number(cost,"amount") is not { } cents || !double.IsFinite(cents)) throw new InvalidDataException();
            value = new { amount = new { value = cents / 100, currency = "usd" }, model };
        } else {
            var usage = row.GetProperty("usage");
            long Count(string name) => usage.TryGetProperty(name,out var v) && v.TryGetInt64(out var n) && n >= 0 && n <= 1_000_000_000_000_000 ? n : throw new InvalidDataException();
            value = new { input_tokens = Count("total_tokens"), output_tokens = 0, num_model_requests = Count("requests"), model };
        }
        return JsonSerializer.SerializeToElement(new { start_time = date.ToUnixTimeSeconds(), results = new[] { value } });
    }
}

using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

namespace TokenPlan.Core;

public sealed partial class ProviderService
{
    async Task<UsageSnapshot> FetchOpenAI(string key, string cooldown, CancellationToken cancellation)
    {
        var now = DateTimeOffset.UtcNow;
        var month = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var start = new DateTimeOffset(now.UtcDateTime.Date.AddDays(-29), TimeSpan.Zero);
        if (month < start) start = month;
        var costs = ReadOpenAIPages(key, cooldown, true, start, now, cancellation);
        var usage = ReadOpenAIPages(key, cooldown, false, start, now, cancellation);
        await Task.WhenAll(costs, usage);
        return OpenAIUsageParser.Parse(await costs, await usage, now);
    }
    async Task<IReadOnlyList<JsonElement>> ReadOpenAIPages(string key, string cooldown, bool costs, DateTimeOffset start, DateTimeOffset now, CancellationToken cancellation)
    {
        var rows = new List<JsonElement>(); var seen = new HashSet<string>(); string? cursor = null;
        for (var page = 0; page < 100; page++)
        {
            var url = "https://api.openai.com/v1/organization/" + (costs ? "costs" : "usage/completions")
                + $"?start_time={start.ToUnixTimeSeconds()}&end_time={now.ToUnixTimeSeconds()}&bucket_width=1d&limit=31&group_by=" + (costs ? "project_id" : "model")
                + (cursor == null ? "" : "&page=" + Uri.EscapeDataString(cursor));
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
            string json;
            try { json = await Fetch(request, cooldown, cancellation); }
            catch (ProviderFailure error) when (error.Status == System.Net.HttpStatusCode.Forbidden)
            { throw new ProviderFailure("This key cannot read organization usage or costs. Check its permissions."); }
            catch (ProviderFailure error) when (error.Status == System.Net.HttpStatusCode.Unauthorized)
            { throw new ProviderFailure("The OpenAI Admin key was rejected. Replace it in service settings."); }
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array
                || !root.TryGetProperty("has_more", out var more) || more.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) throw new InvalidDataException();
            rows.AddRange(data.EnumerateArray().Select(x => x.Clone()));
            if (!more.GetBoolean()) return rows;
            cursor = UsageParser.String(root, "next_page");
            if (string.IsNullOrEmpty(cursor) || !seen.Add(cursor)) throw new InvalidDataException();
        }
        throw new InvalidDataException();
    }
}

public static class OpenAIUsageParser
{
    public static UsageSnapshot Parse(IReadOnlyList<JsonElement> costs, IReadOnlyList<JsonElement> usage, DateTimeOffset now)
    {
        var spend = new Dictionary<DateOnly, double>(); var tokens = new Dictionary<DateOnly, TokenCounts>();
        var models = new Dictionary<DateOnly, Dictionary<string, TokenCounts>>(); long requests = 0;
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        foreach (var bucket in costs)
        {
            var day = Day(bucket, now); double total = 0;
            foreach (var row in bucket.GetProperty("results").EnumerateArray())
            {
                var amount = row.GetProperty("amount");
                if (UsageParser.String(amount, "currency")?.ToLowerInvariant() != "usd"
                    || KeyUsageParser.Number(amount, "value") is not { } value) throw new InvalidDataException();
                total += value;
            }
            spend[day] = spend.GetValueOrDefault(day) + total;
        }
        foreach (var bucket in usage)
        {
            var day = Day(bucket, now); var total = TokenCounts.Zero;
            if (!models.TryGetValue(day, out var dailyModels)) models[day] = dailyModels = new();
            foreach (var row in bucket.GetProperty("results").EnumerateArray())
            {
                var input = Count(row, "input_tokens"); var output = Count(row, "output_tokens");
                // input_tokens already includes cached input; do not add it a second time.
                var count = new TokenCounts(input, output, 0);
                total = Add(total, count);
                var name = UsageParser.String(row, "model") ?? "Unattributed";
                dailyModels[name] = Add(dailyModels.GetValueOrDefault(name) ?? TokenCounts.Zero, count);
                var requestCount = Count(row, "num_model_requests");
                if (day.Year == today.Year && day.Month == today.Month) requests = checked(requests + requestCount);
            }
            tokens[day] = Add(tokens.GetValueOrDefault(day) ?? TokenCounts.Zero, total);
        }
        var days = tokens.Keys.Intersect(spend.Keys).Order().Select(day => new TokenDay(day, tokens[day], new CostTotal(spend[day], 0, 1),
            models[day].OrderBy(x => x.Key).Select(x => new TokenModel(x.Key, x.Value, new CostTotal(0, 1, 0))).ToArray())).ToArray();
        bool Month(DateOnly d) => d.Year == today.Year && d.Month == today.Month;
        var windows = new List<UsageWindow>();
        if (spend.Keys.Any(Month)) windows.Add(new("This Month",0,null,spend.Where(x => Month(x.Key)).Sum(x => x.Value),"USD"));
        if (tokens.Keys.Any(Month)) {
            windows.Add(new("Month Tokens",0,null,tokens.Where(x => Month(x.Key)).Sum(x => (double)x.Value.Total),"COUNT"));
            windows.Add(new("Month Requests",0,null,requests,"COUNT"));
        }
        if (spend.TryGetValue(today, out var valueToday)) windows.Insert(Math.Min(1,windows.Count),new("Today",0,null,valueToday,"USD"));
        return new("openai", "OpenAI API", null, windows, now, new TokenTrend(days, false, now));
    }
    static TokenCounts Add(TokenCounts a, TokenCounts b) => new(checked(a.Input+b.Input),checked(a.Output+b.Output),0);
    static long Count(JsonElement row,string field) => row.TryGetProperty(field,out var item) && item.TryGetInt64(out var number) && number >= 0 && number <= 1_000_000_000_000_000 ? number : throw new InvalidDataException();
    static DateOnly Day(JsonElement bucket, DateTimeOffset now)
    {
        if (!bucket.TryGetProperty("start_time",out var start) || !start.TryGetInt64(out var epoch) || epoch < 0 || epoch > now.ToUnixTimeSeconds()
            || !bucket.TryGetProperty("results",out var results) || results.ValueKind != JsonValueKind.Array) throw new InvalidDataException();
        return DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(epoch).UtcDateTime);
    }
}

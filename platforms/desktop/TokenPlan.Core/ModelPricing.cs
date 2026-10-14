using System.Text.Json;
using System.Text.RegularExpressions;
namespace TokenPlan.Core;

/// Uses the same bundled catalogs as macOS. Unknown models stay unpriced, never $0.
public static partial class ModelPricing
{
    sealed record Rate(double Input, double Output, double Read, double Write, double? LongInput = null, double? LongOutput = null, double? LongRead = null, double? LongWrite = null, bool ExplicitRead = true);
    static readonly Dictionary<string, Rate> rates = new(StringComparer.OrdinalIgnoreCase);
    static readonly List<(Regex Pattern, string Canonical)> aliases = new();
    static readonly Dictionary<string, double> fast = new(StringComparer.OrdinalIgnoreCase);
    static ModelPricing()
    {
        foreach (var name in new[] { "pricing_models_dev_snapshot", "pricing_litellm_snapshot" })
        {
            using var stream = typeof(ModelPricing).Assembly.GetManifestResourceStream("TokenPlan." + name + ".json")!;
            using var doc = JsonDocument.Parse(stream);
            foreach (var model in doc.RootElement.GetProperty("models").EnumerateObject())
            {
                var v = model.Value;
                rates[model.Name] = new(Number(v, "i"), Number(v, "o"), Number(v, "cr"), Number(v, "cw"), Optional(v, "ia"), Optional(v, "oa"), Optional(v, "cra"), Optional(v, "cwa"), KeyUsageParser.Field(v, "cre").ValueKind != JsonValueKind.False);
                if (Optional(v, "fast") is { } multiplier) fast[model.Name] = multiplier;
            }
        }
        foreach (var (key, value) in rates) bundled[key] = value;
        using var supplement = typeof(ModelPricing).Assembly.GetManifestResourceStream("TokenPlan.pricing_supplement.json")!;
        using var data = JsonDocument.Parse(supplement);
        foreach (var model in data.RootElement.GetProperty("pricing").EnumerateObject())
        {
            var v = model.Value;
            rates[model.Name] = new(Number(v, "input_per_million"), Number(v, "output_per_million"), Number(v, "cache_read_per_million"), Number(v, "cache_write_per_million"));
        }
        foreach (var rule in data.RootElement.GetProperty("alias_rules").EnumerateArray()) aliases.Add((new Regex(rule.GetProperty("pattern").GetString()!, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(50)), rule.GetProperty("canonical").GetString()!));
        foreach (var rule in data.RootElement.GetProperty("fast_multipliers").EnumerateObject()) fast[rule.Name] = rule.Value.GetDouble();
        ApplyFeed("supplement", data.RootElement.GetRawText());
    }
    static double? Optional(JsonElement value, string key) => KeyUsageParser.Number(value, key);
    static double Number(JsonElement v, string key) => v.TryGetProperty(key, out var value) && value.TryGetDouble(out var n) ? n : 0;
    public static double? Estimate(string? model, TokenCounts tokens, bool fastMode = false, long oneHourWrites = 0, bool applyLongContext = true, string? provider = null)
    {
        lock (sync)
        {
        if (string.IsNullOrWhiteSpace(model)) return null;
        var key = model.Trim();
        foreach (var rule in aliases) if (rule.Pattern.IsMatch(key)) { key = rule.Canonical; break; }
        if (!rates.TryGetValue(key, out var rate)) return null;
        if (tokens.Other > 0) return null;
        if (applyLongContext && tokens.Input + tokens.CacheRead + tokens.CacheWrite > 200_000)
            rate = rate with { Input = rate.LongInput ?? rate.Input, Output = rate.LongOutput ?? rate.Output, Read = rate.LongRead ?? rate.Read, Write = rate.LongWrite ?? rate.Write };
        if (provider == "codex" && !rate.ExplicitRead) rate = rate with { Read = rate.Input };
        oneHourWrites = Math.Clamp(oneHourWrites, 0, tokens.CacheWrite);
        var multiplier = fastMode ? fast.GetValueOrDefault(key, 1) : 1;
        return (tokens.Input * rate.Input + tokens.Output * rate.Output + tokens.CacheRead * rate.Read + (tokens.CacheWrite - oneHourWrites) * rate.Write + oneHourWrites * rate.Input * 2) / 1_000_000d * multiplier;
        }
    }
}
public record CostTotal(double Dollars = 0, int Unpriced = 0, int Priced = 0)
{
    public CostTotal Add(double? cost) => cost is { } value ? this with { Dollars = Dollars + value, Priced = Priced + 1 } : this with { Unpriced = Unpriced + 1 };
    public CostTotal Plus(CostTotal other) => new(Dollars + other.Dollars, Unpriced + other.Unpriced, Priced + other.Priced);
}

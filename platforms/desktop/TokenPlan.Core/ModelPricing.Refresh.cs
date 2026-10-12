using System.Text.Json;
using System.Text.RegularExpressions;
namespace TokenPlan.Core;

public static partial class ModelPricing
{
    static readonly object sync = new();
    static readonly SemaphoreSlim refreshGate = new(1);
    static readonly Dictionary<string, Dictionary<string, Rate>> live = new();
    static readonly Dictionary<string, Rate> bundled = new(StringComparer.OrdinalIgnoreCase);
    static readonly Dictionary<string, Rate> supplementRates = new(StringComparer.OrdinalIgnoreCase);
    static string[] fallbackModels = [];
    static string? fallbackModel;
    static int revision;
    static DateTimeOffset nextRefresh;
    public static int Revision => Volatile.Read(ref revision);
    public static string[] FallbackModels { get { lock (sync) return fallbackModels.Where(rates.ContainsKey).ToArray(); } }
    public static void SetCodexFallback(string? model)
    {
        lock (sync) { model = model != null && fallbackModels.Contains(model) ? model : null; if (fallbackModel == model) return; fallbackModel = model; Interlocked.Increment(ref revision); }
    }
    public static void ApplyFeed(string source, string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        var parsed = new Dictionary<string, Rate>(StringComparer.OrdinalIgnoreCase);
        double? Valid(JsonElement entry, string name) { var n = Optional(entry, name); return n is >= 0 && double.IsFinite(n.Value) ? n : null; }
        if (source == "supplement")
        {
            foreach (var model in root.GetProperty("pricing").EnumerateObject())
            {
                var v = model.Value;
                var i = Valid(v, "input_per_million"); var o = Valid(v, "output_per_million");
                if (i == null || o == null) throw new InvalidDataException();
                parsed[model.Name] = new(i.Value, o.Value, Valid(v, "cache_read_per_million") ?? i.Value * .1, Valid(v, "cache_write_per_million") ?? i.Value);
            }
            var rules = root.GetProperty("alias_rules").EnumerateArray().Take(1000).Select(r => (new Regex(r.GetProperty("pattern").GetString()!, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(50)), r.GetProperty("canonical").GetString()!)).ToArray();
            var multipliers = root.GetProperty("fast_multipliers").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetDouble());
            if (multipliers.Values.Any(v => !double.IsFinite(v) || v <= 0) || parsed.Count == 0) throw new InvalidDataException();
            var models = root.TryGetProperty("fallback_models", out var choices) && choices.TryGetProperty("codex", out var codex) ? codex.EnumerateArray().Select(v => v.GetString()!).Where(v => !string.IsNullOrWhiteSpace(v)).Distinct().ToArray() : [];
            lock (sync)
            {
                supplementRates.Clear(); foreach (var (key, value) in parsed) supplementRates[key] = value;
                aliases.Clear(); aliases.AddRange(rules); foreach (var (key, value) in multipliers) fast[key] = value;
                fallbackModels = models; Rebuild();
            }
            return;
        }
        if (source == "litellm")
            foreach (var model in root.EnumerateObject())
            {
                var v = model.Value; if (v.ValueKind != JsonValueKind.Object) continue;
                var i = Valid(v, "input_cost_per_token"); var o = Valid(v, "output_cost_per_token");
                if (i == null || o == null) continue;
                parsed[model.Name] = new(i.Value * 1e6, o.Value * 1e6, (Valid(v, "cache_read_input_token_cost") ?? i.Value * .1) * 1e6, (Valid(v, "cache_creation_input_token_cost") ?? i.Value) * 1e6,
                    Valid(v, "input_cost_per_token_above_200k_tokens") * 1e6, Valid(v, "output_cost_per_token_above_200k_tokens") * 1e6, Valid(v, "cache_read_input_token_cost_above_200k_tokens") * 1e6, Valid(v, "cache_creation_input_token_cost_above_200k_tokens") * 1e6, Valid(v, "cache_read_input_token_cost") != null);
            }
        else if (source == "models_dev")
            foreach (var provider in root.EnumerateObject().OrderBy(p => p.Name, StringComparer.Ordinal))
            {
                if (!provider.Value.TryGetProperty("models", out var models)) continue;
                foreach (var model in models.EnumerateObject())
                {
                    if (!model.Value.TryGetProperty("cost", out var cost)) continue;
                    var i = Valid(cost, "input"); var o = Valid(cost, "output"); if (i == null || o == null) continue;
                    parsed.TryAdd(model.Name, new(i.Value, o.Value, Valid(cost, "cache_read") ?? i.Value * .1, Valid(cost, "cache_write") ?? i.Value, ExplicitRead: Valid(cost, "cache_read") != null));
                }
            }
        else throw new ArgumentException("Unknown pricing source");
        if (parsed.Count == 0) throw new InvalidDataException();
        lock (sync) { live[source] = parsed; Rebuild(); }
    }
    static void Rebuild()
    {
        rates.Clear(); foreach (var (key, value) in bundled) rates[key] = value;
        foreach (var source in new[] { "models_dev", "litellm" })
            if (live.TryGetValue(source, out var catalog)) foreach (var (key, value) in catalog) rates[key] = value;
        foreach (var (key, value) in supplementRates) rates[key] = value;
        Interlocked.Increment(ref revision);
    }
    public static async Task<bool> Refresh(string directory, CancellationToken cancellation)
    {
        if (!await refreshGate.WaitAsync(0, cancellation)) return true;
        try
        {
            if (DateTimeOffset.UtcNow < nextRefresh) return true;
            nextRefresh = DateTimeOffset.UtcNow.AddMinutes(30);
            Directory.CreateDirectory(directory);
            var sources = new[] { ("models_dev", "https://models.dev/api.json"), ("litellm", "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"), ("supplement", "https://onevalar.github.io/token-plan/pricing_supplement.json") };
            using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(8) };
            var success = true;
            foreach (var (source, url) in sources)
            {
                var file = Path.Combine(directory, source + ".json");
                try
                {
                    if (File.Exists(file) && new FileInfo(file).Length <= 16 * 1024 * 1024)
                    {
                        ApplyFeed(source, await File.ReadAllTextAsync(file, cancellation));
                        if (DateTime.UtcNow - File.GetLastWriteTimeUtc(file) < TimeSpan.FromHours(1)) continue;
                    }
                }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException or InvalidDataException or ArgumentException or InvalidOperationException or KeyNotFoundException) { DiagnosticLog.Write("pricing", "Cached pricing could not be read; refreshing."); }
                try
                {
                    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation); timeout.CancelAfter(TimeSpan.FromSeconds(8));
                    using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, timeout.Token); response.EnsureSuccessStatusCode();
                    await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
                    using var buffer = new MemoryStream(); var bytes = new byte[32768]; int read;
                    while ((read = await stream.ReadAsync(bytes, timeout.Token)) > 0) { if (buffer.Length + read > 16 * 1024 * 1024) throw new InvalidDataException(); buffer.Write(bytes, 0, read); }
                    var json = System.Text.Encoding.UTF8.GetString(buffer.ToArray()); ApplyFeed(source, json);
                    var temporary = file + ".tmp"; await File.WriteAllTextAsync(temporary, json, timeout.Token); File.Move(temporary, file, true);
                }
                catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { success = false; DiagnosticLog.Write("pricing", "Pricing refresh timed out; retaining known prices."); }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException or HttpRequestException or JsonException or InvalidDataException or ArgumentException or InvalidOperationException or KeyNotFoundException) { success = false; DiagnosticLog.Write("pricing", "Pricing refresh failed; retaining known prices."); }
            }
            if (success) nextRefresh = DateTimeOffset.UtcNow.AddHours(1);
            return success;
        }
        finally { refreshGate.Release(); }
    }
}

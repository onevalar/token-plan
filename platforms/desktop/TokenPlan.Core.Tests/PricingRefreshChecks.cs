using TokenPlan.Core;
static class PricingRefreshChecks
{
    public static void Run(Action<bool, string> check)
    {
        var legacy = System.Text.Json.JsonSerializer.Deserialize<Preferences>(
            """{"CodexFallbackModel":"gpt-5.6-sol","Language":"zh-Hans"}""")!;
        check(legacy.Language == "zh-Hans", "Legacy fallback preference is ignored without losing other settings");
        check(!System.Text.Json.JsonSerializer.Serialize(legacy).Contains("CodexFallbackModel"), "Removed fallback preference is not saved again");
        var tokens = new TokenCounts(1_000_000, 0, 0);
        ModelPricing.ApplyFeed("models_dev", """{"fixture":{"models":{"fixture-public-model":{"cost":{"input":2,"output":4}}}}}""");
        check(ModelPricing.Estimate("fixture-public-model", tokens) == 2, "models.dev live feed uses per-million rates");
        ModelPricing.ApplyFeed("litellm", """{"fixture-public-model":{"input_cost_per_token":0.000003,"output_cost_per_token":0.000006}}""");
        check(ModelPricing.Estimate("fixture-public-model", tokens) == 3, "LiteLLM converts per-token rates and takes precedence");
        try { ModelPricing.ApplyFeed("litellm", "{}"); throw new Exception("Empty pricing replaced known rates"); }
        catch (InvalidDataException) { check(ModelPricing.Estimate("fixture-public-model", tokens) == 3, "Invalid feed retains the last usable price"); }
        check(ModelPricing.Estimate("fixture-unknown-model", tokens, provider: "codex") == null, "Unknown Codex models remain unpriced");
        check(ModelPricing.Estimate(null, tokens, provider: "codex") == null, "Missing model never borrows another model's price");
    }
}

using TokenPlan.Core;
static class PricingRefreshChecks
{
    public static void Run(Action<bool, string> check)
    {
        var tokens = new TokenCounts(1_000_000, 0, 0);
        ModelPricing.ApplyFeed("models_dev", """{"fixture":{"models":{"fixture-public-model":{"cost":{"input":2,"output":4}}}}}""");
        check(ModelPricing.Estimate("fixture-public-model", tokens) == 2, "models.dev live feed uses per-million rates");
        ModelPricing.ApplyFeed("litellm", """{"fixture-public-model":{"input_cost_per_token":0.000003,"output_cost_per_token":0.000006}}""");
        check(ModelPricing.Estimate("fixture-public-model", tokens) == 3, "LiteLLM converts per-token rates and takes precedence");
        try { ModelPricing.ApplyFeed("litellm", "{}"); throw new Exception("Empty pricing replaced known rates"); }
        catch (InvalidDataException) { check(ModelPricing.Estimate("fixture-public-model", tokens) == 3, "Invalid feed retains the last usable price"); }
        var model = ModelPricing.FallbackModels.First(); var expected = ModelPricing.Estimate(model, tokens, provider: "codex");
        ModelPricing.SetCodexFallback(model);
        check(ModelPricing.Estimate("fixture-unknown-model", tokens, provider: "codex") == expected, "Unknown Codex model uses explicitly selected reviewed fallback");
        check(ModelPricing.Estimate("fixture-unknown-model", tokens) == null, "Codex fallback does not leak to other providers");
        ModelPricing.SetCodexFallback("not-a-reviewed-model");
        check(ModelPricing.Estimate("fixture-unknown-model", tokens, provider: "codex") == null, "Unreviewed fallback cannot invent a price");
        ModelPricing.SetCodexFallback(null);
        check(ModelPricing.Estimate("fixture-unknown-model", tokens, provider: "codex") == null, "Disabling fallback restores unpriced state");
    }
}

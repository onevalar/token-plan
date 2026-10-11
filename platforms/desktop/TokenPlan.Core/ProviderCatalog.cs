namespace TokenPlan.Core;

public record ProviderDefinition(string Id, string Name, string? EnvironmentKey = null, string? KeysURL = null);

public static class ProviderCatalog
{
    public static readonly IReadOnlyList<ProviderDefinition> All = new[] {
        new ProviderDefinition("claude", "Claude"), new ProviderDefinition("codex", "Codex"),
        new ProviderDefinition("cursor", "Cursor"), new ProviderDefinition("amp", "Amp"),
        new ProviderDefinition("antigravity", "Antigravity"), new ProviderDefinition("copilot", "Copilot"),
        new ProviderDefinition("deepseek", "DeepSeek", "DEEPSEEK_API_KEY", "https://platform.deepseek.com/api_keys"),
        new ProviderDefinition("devin", "Devin"), new ProviderDefinition("grok", "Grok"),
        new ProviderDefinition("moonshot", "Kimi", "MOONSHOT_API_KEY", "https://platform.kimi.com/console/api-keys"),
        new ProviderDefinition("minimax", "MiniMax", "MINIMAX_API_KEY", "https://platform.minimaxi.com/user-center/basic-information/interface-key"),
        new ProviderDefinition("ollama", "Ollama"), new ProviderDefinition("opencode", "OpenCode"),
        new ProviderDefinition("openrouter", "OpenRouter", "OPENROUTER_API_KEY", "https://openrouter.ai/settings/keys"),
        new ProviderDefinition("siliconflow", "SiliconFlow", "SILICONFLOW_API_KEY", "https://cloud.siliconflow.cn/account/ak"),
        new ProviderDefinition("zai", "Z.ai", "ZAI_API_KEY", "https://z.ai/manage-apikey/apikey-list")
    };
    public static ProviderDefinition Get(string id) => All.FirstOrDefault(p => p.Id == id) ?? throw new ArgumentException("Unknown provider", nameof(id));
    public static readonly string[] TokenLogProviders = { "claude", "codex", "cursor", "grok" };
}

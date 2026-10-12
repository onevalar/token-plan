using System.Text.Json;

namespace TokenPlan.Core;

public partial record Preferences(string Appearance = "system", string Language = "system", bool AutoRefresh = true,
    bool ClaudeEnabled = true, bool CodexEnabled = true, bool CursorEnabled = true, int HistoryDays = 7, int TokenDays = 7, string TokenProvider = "codex", bool KeepRunningWhenClosed = true)
{
    public Dictionary<string, bool> TrayAccounts { get; init; } = new();
    public Dictionary<string, bool> AccountVisibility { get; init; } = new();
    public string? CodexFallbackModel { get; init; }
    public bool GlobalShortcut { get; init; }
    public int LogLevel { get; init; } = 2;
    public bool ReduceAnimations { get; init; }
    public Dictionary<string, bool> TrayServices { get; init; } = new();
    public Dictionary<string, string[]> MetricOrder { get; init; } = new();
    public int SpendPeriod { get; init; }
    public int SpendMetric { get; init; }
    public bool NotifyAlmostOut { get; init; }
    public bool NotifyCuttingClose { get; init; }
    public bool NotifyWillRunOut { get; init; }
    public bool ShowRemaining { get; init; }
    public bool Compact { get; init; }
    public int RefreshMinutes { get; init; } = 5;
    public bool HideValues { get; init; }
    public bool NotificationsEnabled { get; init; }
    public int NotificationThreshold { get; init; } = 90;
    public string[] ProviderOrder { get; init; } = Array.Empty<string>();
    public Dictionary<string, string[]> PinnedMetrics { get; init; } = new();
    public Dictionary<string, string[]> ExpandedMetrics { get; init; } = new();
    public IEnumerable<string> OrderedProviders => ProviderOrder.Concat(ProviderCatalog.All.Select(p => p.Id)).Distinct().Where(id => ProviderCatalog.All.Any(p => p.Id == id));
    public Preferences Pin(string id, string metric, bool pinned)
    {
        var current = (PinnedMetrics.GetValueOrDefault(id) ?? Array.Empty<string>()).ToList();
        if (pinned && !current.Contains(metric)) { if (current.Count >= 2) return this; current.Add(metric); }
        if (!pinned) current.Remove(metric);
        return this with { PinnedMetrics = new(PinnedMetrics) { [id] = current.ToArray() } };
    }
    public Preferences MoveProvider(string id, int offset)
    {
        var order = OrderedProviders.ToList(); var index = order.IndexOf(id); var next = index + offset;
        if (index < 0 || next < 0 || next >= order.Count) return this;
        (order[index], order[next]) = (order[next], order[index]);
        return this with { ProviderOrder = order.ToArray() };
    }
    public Dictionary<string, bool> AdditionalProviders { get; init; } = new();
    public Dictionary<string, string> ProviderNotes { get; init; } = new();
    public Dictionary<string, string[]> HiddenMetrics { get; init; } = new();
    public bool IsEnabled(string id) => id switch { "claude" => ClaudeEnabled, "codex" => CodexEnabled, "cursor" => CursorEnabled, _ => AdditionalProviders.GetValueOrDefault(id) };
    public Preferences WithEnabled(string id, bool enabled) => id switch {
        "claude" => this with { ClaudeEnabled = enabled }, "codex" => this with { CodexEnabled = enabled },
        "cursor" => this with { CursorEnabled = enabled }, _ => this with { AdditionalProviders = new(AdditionalProviders) { [ProviderCatalog.Get(id).Id] = enabled } }
    };
    public static string DefaultPath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TokenPlan", "desktop", "preferences.json");
    public static Preferences Load(string file)
    {
        if (!File.Exists(file)) return new();
        var value = JsonSerializer.Deserialize<Preferences>(File.ReadAllText(file)) ?? throw new InvalidDataException();
        if (value.Appearance is not ("system" or "light" or "dark") || value.Language is not ("system" or "en" or "zh-Hans" or "zh-Hant" or "ja" or "ko") || value.HistoryDays is not (7 or 30) || value.TokenDays is not (7 or 30)) throw new InvalidDataException();
        if (value.TokenProvider is not ("codex" or "claude" or "cursor" or "grok")) throw new InvalidDataException();
        if (value.RefreshMinutes is not (1 or 2 or 5 or 10 or 15 or 30 or 60) || value.ProviderOrder == null || value.PinnedMetrics == null || value.ExpandedMetrics == null || value.NotificationThreshold is < 50 or > 100 || value.PinnedMetrics.Values.Any(v => v == null || v.Length > 2) || value.ExpandedMetrics.Values.Any(v => v == null) || (value.HiddenMetrics == null || value.HiddenMetrics.Values.Any(v => v == null)) || value.AdditionalProviders == null || value.ProviderNotes == null || value.HiddenMetrics == null || value.AdditionalProviders.Keys.Any(id => !ProviderCatalog.All.Any(p => p.Id == id))) throw new InvalidDataException();
        if (value.AccountVisibility == null || value.TrayAccounts == null) throw new InvalidDataException();
        if (value.LogLevel is < 0 or > 3 || value.TrayServices == null || value.MetricOrder == null || value.MetricOrder.Values.Any(v => v == null) || value.SpendPeriod is < 0 or > 2 || value.SpendMetric is < 0 or > 2) throw new InvalidDataException();
        if (value.NotificationsEnabled) value = value with { NotifyAlmostOut = true, NotificationsEnabled = false };
        return value with { AutoRefresh = true };
    }
    public void Save(string file)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(file))!);
        var temporary = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try { File.WriteAllText(temporary, JsonSerializer.Serialize(this)); File.Move(temporary, file, true); }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}

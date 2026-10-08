using System.Text.Json;

namespace TokenPlan.Core;

public record Preferences(string Appearance = "system", string Language = "system", bool AutoRefresh = true,
    bool ClaudeEnabled = true, bool CodexEnabled = true, bool CursorEnabled = true, int HistoryDays = 7, int TokenDays = 7, string TokenProvider = "codex", bool KeepRunningWhenClosed = false)
{
    public bool IsEnabled(string id) => id switch { "claude" => ClaudeEnabled, "codex" => CodexEnabled, "cursor" => CursorEnabled, _ => false };
    public Preferences WithEnabled(string id, bool enabled) => id switch {
        "claude" => this with { ClaudeEnabled = enabled }, "codex" => this with { CodexEnabled = enabled },
        "cursor" => this with { CursorEnabled = enabled }, _ => throw new ArgumentException("Unknown provider", nameof(id))
    };
    public static string DefaultPath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TokenPlan", "desktop", "preferences.json");
    public static Preferences Load(string file)
    {
        if (!File.Exists(file)) return new();
        var value = JsonSerializer.Deserialize<Preferences>(File.ReadAllText(file)) ?? throw new InvalidDataException();
        if (value.Appearance is not ("system" or "light" or "dark") || value.Language is not ("system" or "en" or "zh-Hans" or "zh-Hant" or "ja" or "ko") || value.HistoryDays is not (7 or 30) || value.TokenDays is not (7 or 30)) throw new InvalidDataException();
        if (value.TokenProvider is not ("codex" or "claude" or "cursor")) throw new InvalidDataException();
        return value;
    }
    public void Save(string file)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(file))!);
        var temporary = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try { File.WriteAllText(temporary, JsonSerializer.Serialize(this)); File.Move(temporary, file, true); }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}

using System.Text.Json;
using TokenPlan.Core;
namespace TokenPlan.Bridge;

public sealed partial class DesktopSession : IDisposable
{
    readonly string file;
    Preferences preferences;
    readonly ProviderService service;
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, ProviderResult> results = new();
    readonly Dictionary<string, LocalTokenUsage> scanners;
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, TokenTrend> trends = new();
    readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTimeOffset> nextRefresh = new();
    readonly string stateFile;
    string trayStyle = "ring";
    string ringIconPosition = "inside";
    bool autoUpdates = true;
    bool[] notifications = [false, false, false];
    string shortcut = "";
    List<string> accountOrder = [];
    public DesktopSession(string? preferencesPath = null)
    {
        file = preferencesPath ?? Preferences.DefaultPath;
        preferences = Preferences.Load(file, preserveRefreshSetting: true);
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var codex = Environment.GetEnvironmentVariable("CODEX_HOME") ?? Path.Combine(home, ".codex");
        var claude = Environment.GetEnvironmentVariable("CLAUDE_CONFIG_DIR") ?? Path.Combine(home, ".claude");
        service = new(codex, claude);
        service.IsAccountRemoved = a => preferences.IsAccountRemoved(a);
        var claudeHomes = Environment.GetEnvironmentVariable("CLAUDE_CONFIG_DIR") is { Length: > 0 } configured
            ? configured.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : new[] { claude, Path.Combine(Environment.GetEnvironmentVariable("XDG_CONFIG_HOME") ?? Path.Combine(home, ".config"), "claude") };
        scanners = new() { ["codex"] = new(codex), ["claude"] = new("", claudeHomes: claudeHomes) };
        stateFile = Path.Combine(Path.GetDirectoryName(file)!, "tauri-session.json");
        if (File.Exists(stateFile))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(stateFile));
            if (doc.RootElement.TryGetProperty("accounts", out var cached))
                foreach (var account in (cached.Deserialize<ProviderResult[]>() ?? []).Take(512))
                {
                    _ = ProviderCatalog.Get(account.Id);
                    // Restored headings are not authenticated quota snapshots.
                    results[account.SettingsKey] = new(account.Id, account.Name, null, null, AccountKey: account.AccountKey, AccountEmail: account.AccountEmail, AccountIdentity: account.AccountIdentity);
                }
            if (doc.RootElement.TryGetProperty("notifications", out var alerts)) { var flags = alerts.Deserialize<bool[]>(); if (flags?.Length == 3) notifications = flags; }
            if (doc.RootElement.TryGetProperty("shortcut", out var binding)) shortcut = binding.GetString() ?? "";
            if (doc.RootElement.TryGetProperty("ringIconPosition", out var position)) ringIconPosition = position.GetString() == "left" ? "left" : "inside";
            if (doc.RootElement.TryGetProperty("autoUpdates", out var automatic)) autoUpdates = automatic.GetBoolean();
            trayStyle = doc.RootElement.GetProperty("trayStyle").GetString() is "percentage" ? "percentage" : "ring";
            if (doc.RootElement.TryGetProperty("cooldowns", out var cooldowns)) service.RestoreCooldowns(cooldowns.Deserialize<Dictionary<string, DateTimeOffset>>() ?? []);
            if (doc.RootElement.TryGetProperty("accountOrder", out var order)) accountOrder = order.Deserialize<List<string>>() ?? [];
            if (doc.RootElement.TryGetProperty("nextRefresh", out var dates))
                foreach (var entry in dates.EnumerateObject())
                    if (DateTimeOffset.TryParse(entry.Value.GetString(), out var date) && date <= DateTimeOffset.UtcNow.AddHours(24)) nextRefresh[entry.Name] = date;
        }
    }
    public async Task<object> Execute(JsonElement request)
    {
        var method = request.GetProperty("method").GetString();
        var id = request.TryGetProperty("accountId", out var aid) ? aid.GetString() ?? "" : "";
        var value = request.TryGetProperty("value", out var v) ? v : default;
        var account = results.GetValueOrDefault(id);
        var family = account?.Id ?? id;
        if (method is not ("state" or "refresh" or "discover" or "settings")) _ = ProviderCatalog.Get(family);
        switch (method)
        {
            case "state": break;
            case "refresh":
            case "discover":
                await RefreshAccounts(method == "discover", id == "" ? null : family);

                break;
            case "enabled":
                if (value.GetBoolean() && !preferences.IsEnabled(family))
                {
                    var visibility = new Dictionary<string, bool>(preferences.AccountVisibility);
                    foreach (var known in Accounts().Where(a => a.Id == family)) visibility[known.SettingsKey] = false;
                    preferences = preferences with { AccountVisibility = visibility };
                }
                preferences = preferences with { AccountVisibility = new(preferences.AccountVisibility) { [id] = value.GetBoolean() } };
                if (value.GetBoolean()) preferences = preferences.WithEnabled(family, true);
                break;
            case "remove":
                if (account == null || Preferences.AccountRemovalKey(account) == null) throw new InvalidDataException();
                preferences = preferences.RemoveAccount(account); break;
            case "tray":
                if (!preferences.TrayServices.GetValueOrDefault(family, true))
                {
                    var choices = new Dictionary<string, bool>(preferences.TrayAccounts);
                    foreach (var known in Accounts().Where(a => a.Id == family)) choices[known.SettingsKey] = false;
                    preferences = preferences with { TrayAccounts = choices, TrayServices = new(preferences.TrayServices) { [family] = true } };
                }
                preferences = preferences with { TrayAccounts = new(preferences.TrayAccounts) { [id] = value.GetBoolean() } };
                break;
            case "note":
                var note = value.GetString() ?? ""; if (note.Length > 2000) throw new InvalidDataException();
                preferences = preferences with { ProviderNotes = new(preferences.ProviderNotes) { [id] = note } }; break;
            case "move":
                var offset = value.GetInt32(); if (Math.Abs(offset) != 1) throw new InvalidDataException();
                var order = Accounts().Select(a => a.SettingsKey).ToList(); var index = order.IndexOf(id);
                if (index >= 0 && index + offset >= 0 && index + offset < order.Count) { (order[index], order[index + offset]) = (order[index + offset], order[index]); accountOrder = order; }
                break;
            case "metric":
                var metric = request.GetProperty("metricId").GetString()!;
                var windows = account?.Snapshot?.Windows ?? [];
                if (!windows.Any(w => w.Label == metric)) throw new InvalidDataException();
                if (value.TryGetProperty("placement", out var place))
                    preferences = preferences.PlaceMetric(id, metric, place.GetString() switch { "home" => MetricPlacement.Home, "details" => MetricPlacement.Details, "hidden" => MetricPlacement.Hidden, _ => throw new InvalidDataException() }, windows);
                if (value.TryGetProperty("pinned", out var pinned))
                {
                    var current = preferences.PinnedMetrics.GetValueOrDefault(id) ?? windows.Take(2).Select(w => w.Label).ToArray();
                    if (pinned.GetBoolean() && current.Length >= 3 && !current.Contains(metric)) throw new InvalidDataException();
                    preferences = preferences with { PinnedMetrics = new(preferences.PinnedMetrics) { [id] = current } };
                    preferences = preferences.Pin(id, metric, pinned.GetBoolean(), maxPins: 3);
                }
                break;
            case "key":
                var key = value.GetString() ?? "";
                if (key.Length > 8192) throw new InvalidDataException();
                if (key == "") service.Keys.Delete(family); else service.Keys.Save(family, key);
                break;
            case "settings": ApplySettings(value); break;
            default: throw new InvalidDataException();
        }
        if (method != "state") { preferences.Save(file); Persist(); }
        return Snapshot();
    }
    void ApplySettings(JsonElement value)
    {
        if (value.TryGetProperty("notifications", out var alerts)) { var flags = alerts.Deserialize<bool[]>(); if (flags?.Length != 3) throw new InvalidDataException(); notifications = flags; }
        if (value.TryGetProperty("shortcut", out var binding)) { var text = binding.GetString() ?? ""; if (text.Length > 100) throw new InvalidDataException(); shortcut = text; }
        if (value.TryGetProperty("showRemaining", out var remaining)) preferences = preferences with { ShowRemaining = remaining.GetBoolean() };
        if (value.TryGetProperty("appearance", out var appearance))
        {
            var theme = appearance.GetString()!; if (theme is not ("system" or "light" or "dark")) throw new InvalidDataException();
            preferences = preferences with { Appearance = theme };
        }
        if (value.TryGetProperty("language", out var language))
        {
            var lang = language.GetString()!; if (lang is not ("system" or "en" or "zh-Hans" or "zh-Hant" or "ja" or "ko")) throw new InvalidDataException();
            preferences = preferences with { Language = lang };
        }
        if (value.TryGetProperty("refreshMinutes", out var minutes))
        {
            if (!new[] { 1, 2, 5, 10, 15, 30, 60 }.Contains(minutes.GetInt32())) throw new InvalidDataException();
            preferences = preferences with { RefreshMinutes = minutes.GetInt32() };
        }
        if (value.TryGetProperty("autoUpdates", out var updates)) autoUpdates = updates.GetBoolean();
        if (value.TryGetProperty("autoRefresh", out var automatic)) preferences = preferences with { AutoRefresh = automatic.GetBoolean() };
        if (value.TryGetProperty("ringIconPosition", out var position)) ringIconPosition = position.GetString() is "inside" or "left" ? position.GetString()! : throw new InvalidDataException();
        if (value.TryGetProperty("trayStyle", out var style)) trayStyle = style.GetString() is "ring" or "percentage" ? style.GetString()! : throw new InvalidDataException();
    }
    readonly object persistenceLock = new();
    void Persist()
    {
        lock (persistenceLock) {
        Directory.CreateDirectory(Path.GetDirectoryName(stateFile)!);
        var temp = stateFile + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(new { trayStyle, ringIconPosition, autoUpdates, notifications, shortcut, nextRefresh, accountOrder, cooldowns = service.ExportCooldowns(), accounts = results.Values.Select(a => new ProviderResult(a.Id, a.Name, null, null, AccountKey: a.AccountKey, AccountEmail: a.AccountEmail, AccountIdentity: a.AccountIdentity)).ToArray() }));
        File.Move(temp, stateFile, true);
        }
    }
    public void Dispose() => service.Dispose();
}

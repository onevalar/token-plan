using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Input;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Styling;
using Avalonia.Threading;
using Avalonia.VisualTree;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow : Window
{
    static readonly string[] ProviderIDs = ProviderCatalog.All.Select(p => p.Id).ToArray();
    readonly ProviderService providers;
    readonly Dictionary<string, LocalTokenUsage> localTokens;
    readonly Dictionary<string, TokenTrend> tokenTrends = new();
    string TokenProvider => preferences.IsEnabled(preferences.TokenProvider) ? preferences.TokenProvider : ProviderCatalog.TokenLogProviders.FirstOrDefault(preferences.IsEnabled) ?? preferences.TokenProvider;
    TokenTrend? tokenTrend {
        get {
            var trend = tokenTrends.GetValueOrDefault(TokenProvider);
            if (TokenProvider != "cursor" || trend == null || trend.ErrorKey != null) return trend;
            return trend.CredentialFingerprint != null && results.GetValueOrDefault("cursor")?.CredentialFingerprint == trend.CredentialFingerprint ? trend : null;
        }
    }
    readonly QuotaAlerts usageAlerts = new();
    bool tokensLoading;
    readonly HashSet<string> expandedProviders = new();
    readonly Dictionary<string, ProviderResult> results = new();
    readonly Dictionary<string, IReadOnlyList<ProviderResult>> additionalAccounts = new();
    readonly DispatcherTimer timer = new() { Interval = TimeSpan.FromMinutes(5) };
    readonly string preferencesFile;
    readonly string historyFile;
    UsageHistory history = new();
    Preferences preferences = new();
    CancellationTokenSource? refresh;
    string page = "overview";
    string? notice;
    bool ready;
    public event Action? StateChanged;
    public bool TrayAvailable { get; set; }
    public bool KeepRunningWhenClosed => preferences.KeepRunningWhenClosed;
    public void RefreshFromTray() => _ = Refresh();
    public IEnumerable<string> TraySummaries() => TrayAccountEntries()
        .Where(result => TrayAccountSelected(result) && preferences.AccountVisibility.GetValueOrDefault(result.SettingsKey, true))
        .SelectMany(result => TrayReadings.Select(result, preferences.PinnedMetrics.GetValueOrDefault(result.SettingsKey))
            .Select(metric => TrayAccountLabel(result) + " · " + MetricTitle(result.Id, metric.Label) + " " + MetricValue(metric)
                + (result.ErrorKey != null ? " · " + L.T("Needs Attention") : "")));
    readonly Dictionary<string, Vector> scrollPositions = new();
    ScrollViewer? pageScroll;
    string? focusedName;
    bool restoringFocus;
    int renderVersion;
    bool IsDark => ActualThemeVariant == ThemeVariant.Dark;
    IBrush Surface => T.Group;
    IBrush Canvas => T.Canvas;
    IBrush Ink => T.Ink;
    IBrush Muted => T.Secondary;
    IBrush Line => T.Separator;
    IBrush Accent => T.Accent;

    public MainWindow()
    {
        Title = Program.Fixture ? "TokenPlan · Interface Review" : "TokenPlan";
        // The macOS popover is a 340pt-wide panel that sizes to its content; the window keeps that
        // width so both clients read as the same app.
        Width = 340; Height = 600; MinWidth = 320; MinHeight = 360;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ConfigureControls();
        using (var icon = typeof(MainWindow).Assembly.GetManifestResourceStream("TokenPlan.AppIcon.png")) Icon = new WindowIcon(icon!);
        // The OS owns caption buttons, dragging, snapping and window decoration placement.
        ExtendClientAreaToDecorationsHint = false;
        preferencesFile = Program.Fixture ? Path.Combine(Path.GetTempPath(), "TokenPlan-interface-review", "preferences.json") : Preferences.DefaultPath;
        historyFile = Path.Combine(Path.GetDirectoryName(preferencesFile)!, "quota-history.json");
        try { preferences = Preferences.Load(preferencesFile); }
        catch (Exception e) when (e is IOException or System.Text.Json.JsonException or InvalidDataException or UnauthorizedAccessException) { notice = "Preferences could not be read. Changes can be saved again in Settings."; DiagnosticLog.Write("settings", notice); }
        L.Use(preferences.Language);
        try { history = Program.Fixture ? ExampleHistory() : UsageHistory.Load(historyFile, DateTimeOffset.UtcNow); }
        catch (Exception e) when (e is IOException or System.Text.Json.JsonException or InvalidDataException or UnauthorizedAccessException) { notice = "Usage history could not be read. New readings will start a fresh history."; DiagnosticLog.Write("history", notice); }
        DiagnosticLog.Level = preferences.LogLevel;
        ApplyAppearance();
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var claudeConfig = Environment.GetEnvironmentVariable("CLAUDE_CONFIG_DIR");
        var claudeHomes = !string.IsNullOrWhiteSpace(claudeConfig) ? claudeConfig.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            : new[] { Path.Combine(home, ".claude"), Path.Combine(Environment.GetEnvironmentVariable("XDG_CONFIG_HOME") ?? Path.Combine(home, ".config"), "claude") };
        localTokens = new() {
            ["codex"] = new(Environment.GetEnvironmentVariable("CODEX_HOME") ?? Path.Combine(home, ".codex")),
            ["claude"] = new("", claudeHomes: claudeHomes)
        };
        providers = new(Environment.GetEnvironmentVariable("CODEX_HOME") ?? Path.Combine(home, ".codex"), Environment.GetEnvironmentVariable("CLAUDE_CONFIG_DIR") ?? Path.Combine(home, ".claude"), cursorDatabase: Environment.GetEnvironmentVariable("TOKENPLAN_CURSOR_STATE_DB"));
        timer.Interval = TimeSpan.FromMinutes(preferences.RefreshMinutes);
        timer.Tick += (_, _) => { _ = CheckAppUpdate(false); if (preferences.AutoRefresh && refresh == null) _ = Refresh(); };
        Opened += (_, _) => { if (!timer.IsEnabled) { timer.Start(); ApplyShortcut(); _ = Refresh(); _ = CheckAppUpdate(false); } };
        Closed += (_, _) => { ready = false; shortcut?.Dispose(); timer.Stop(); refresh?.Cancel(); providers.Dispose(); };
        ActualThemeVariantChanged += (_, _) => { if (ready) Render(); };
        SizeChanged += (_, _) => RepositionPanel();
        KeyDown += (_, e) => {
            var command = e.KeyModifiers.HasFlag(OperatingSystem.IsMacOS() ? KeyModifiers.Meta : KeyModifiers.Control);
            if (e.Key == Key.R && command) { e.Handled = true; if (refresh == null) _ = Refresh(); }
            if (e.Key == Key.OemComma && command) { e.Handled = true; GoBack(closeWhenHome: false); OpenUtility("settings"); }
            if (e.Key == Key.Escape) { e.Handled = true; if (refresh != null) refresh.Cancel(); else GoBack(closeWhenHome: true); }
            if (e.Key == Key.Enter) { e.Handled = true; if (refresh != null) return; if (page == "overview") OpenUtility("providers"); else GoBack(closeWhenHome: false); }
        };
        ready = true;
        GotFocus += (_, e) => {
            if (!restoringFocus && e.Source is Control source)
                focusedName = source.GetVisualAncestors().Prepend(source).OfType<Control>().FirstOrDefault(c => c.Name?.StartsWith("tokenplan-", StringComparison.Ordinal) == true)?.Name;
        };
        Render();
    }
    void ApplyAppearance() => RequestedThemeVariant = preferences.Appearance switch { "light" => ThemeVariant.Light, "dark" => ThemeVariant.Dark, _ => ThemeVariant.Default };
    static void Add(Grid grid, Control child, int row = 0, int column = 0) { Grid.SetRow(child, row); Grid.SetColumn(child, column); grid.Children.Add(child); }
    TextBlock Text(string text, double size = 13, bool muted = false) => new() { Text = text, FontSize = preferences.Compact ? Math.Max(11, size - 1) : size, Foreground = muted ? Muted : Ink, TextWrapping = TextWrapping.Wrap, VerticalAlignment = Avalonia.Layout.VerticalAlignment.Center };
    static StackPanel Stack(double spacing = 12) => new StretchStack { Spacing = spacing };
    Button Action(string label, Action action)
    {
        var button = new Button { Content = L.T(label), Background = T.SubtleFill, Foreground = Ink, BorderThickness = new Thickness(0), CornerRadius = new CornerRadius(6), MinHeight = 28, FontSize = D.RowLabelSize, Padding = new Thickness(10, 5), HorizontalAlignment = HorizontalAlignment.Left };
        button.Click += (_, _) => action();
        return button;
    }
    string ScrollKey(string pageID) => pageID == "detail" ? "detail/" + detailProvider + "/" + detailAccount + "/" + detailSettings : pageID;
    static string CanonicalPage(string next) => next;
    void Navigate(string next) { page = CanonicalPage(next); Render(); }
    /// <summary>Esc / Return / the top bar's chevron: one level back, closing the panel at the dashboard.</summary>
    void GoBack(bool closeWhenHome)
    {
        if (page == "detail" && detailSettings) { detailSettings = false; Render(); return; }
        if (page == "detail") { page = detailOrigin; Render(); return; }
        if (page != "overview") { Navigate(utilityOrigins.GetValueOrDefault(page, settingsOrigin)); return; }
        if (closeWhenHome && IsTrayPanel) Hide();
    }
    void Render()
    {
        StateChanged?.Invoke();
        var version = ++renderVersion;
        var renderedScroll = ScrollKey(page);
        var focusToRestore = focusedName;
        var oldInput = this.GetVisualDescendants().OfType<TextBox>().FirstOrDefault(t => t.Name == focusedName);
        var caret = oldInput?.CaretIndex;
        restoringFocus = true;
        var offset = scrollPositions.GetValueOrDefault(ScrollKey(page));
        Background = Canvas;
        Foreground = Ink;
        var content = page switch { "detail" => DetailPage(), "settings" => Settings(), "appearance" => AppearancePage(), "history" => HistoryPage(), "notifications" => NotificationPage(), "advanced" => AdvancedPage(), "about" => AboutPage(), "providers" => ProvidersPage(), _ => Overview() };
        var root = new Grid();
        Add(root, content);
        pageScroll = null;
        Content = root;
        Classes.Set("reduce-motion", preferences.ReduceAnimations);
        Dispatcher.UIThread.Post(() => {
            if (!ready || version != renderVersion) return;
            var viewer = content as ScrollViewer ?? content.GetVisualDescendants().OfType<ScrollViewer>().FirstOrDefault();
            pageScroll = viewer;
            if (viewer != null) {
                viewer.Offset = offset;
                viewer.ScrollChanged += (_, _) => { if (ReferenceEquals(pageScroll, viewer)) scrollPositions[renderedScroll] = viewer.Offset; };
            }
            if (focusToRestore != null) {
                var target = this.GetVisualDescendants().OfType<Control>().FirstOrDefault(c => c.Name == focusToRestore && c.IsEnabled);
                if (target is ListBox list && list.SelectedItem != null && list.ContainerFromItem(list.SelectedItem) is { } selected) selected.Focus();
                else if (target is Expander expander) expander.GetVisualDescendants().OfType<ToggleButton>().FirstOrDefault()?.Focus();
                else { target?.Focus(); if (target is TextBox input && caret != null) input.CaretIndex = Math.Min(caret.Value, input.Text?.Length ?? 0); }
            }
            restoringFocus = false;
        }, DispatcherPriority.Loaded);
    }
    ComboBox Choice(string[] labels, int index) => Field(new ComboBox { ItemsSource = labels.Select(L.T).ToArray(), SelectedIndex = index, MinWidth = 104 });
    void Save()
    {
        try { preferences.Save(preferencesFile); notice = null; }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { notice = "Preferences could not be saved. Check the app data folder permissions."; DiagnosticLog.Write("settings", notice); Render(); }
    }
    async Task Refresh(string? only = null)
    {
        if (refresh != null) return;
        var pending = new CancellationTokenSource(); refresh = pending;
        Render();
        providers.IsAccountRemoved = account => preferences.IsAccountRemoved(account);
        Task tokenWork = Task.CompletedTask;
        try
        {
            tokenWork = RefreshPricedTokens(only, pending.Token);
            foreach (var id in (only == null ? ProviderIDs : new[] { only }).Where(preferences.IsEnabled))
            {
                DiagnosticLog.Write(id, "Refreshing usage", 3);
                var result = Program.Fixture ? Example(id) : await providers.Refresh(id, pending.Token);
                DiagnosticLog.Write(id, result.ErrorKey == null ? "Usage refreshed" : "Usage refresh failed", result.ErrorKey == null ? 2 : 1);
                if (!ready || pending.IsCancellationRequested) return;
                if (!Program.Fixture && !preferences.IsAccountRemoved(result))
                {
                    var alertBatch = usageAlerts.Evaluate(result, preferences, DateTimeOffset.UtcNow);
                    var alerts = alertBatch.Alerts;
                    if (alerts.Count > 0)
                    {
                        try { await DesktopNotifications.Send("TokenPlan · " + result.Name, preferences.HideValues ? L.T("Usage Needs Attention") : string.Join(", ", alerts.Select(a => L.T(a.Metric) + " · " + L.T(a.Title)))); alertBatch.Commit(); }
                        catch (Exception) { notice = "Notifications could not be delivered. Check system notification settings."; DiagnosticLog.Write("notifications", notice); }
                    }
                }
                history.Observe(result, DateTimeOffset.UtcNow);
                SaveHistory();
                result = result.PreserveLastSuccess(results.GetValueOrDefault(id));
                results[id] = result;
                if (!Program.Fixture && id is "claude" or "codex")
                {
                    try { additionalAccounts[id] = (await providers.RefreshAdditionalAccounts(id, pending.Token)).Where(r => r.CredentialFingerprint == null || r.CredentialFingerprint != result.CredentialFingerprint).ToArray();
                        foreach (var account in additionalAccounts[id]) ObserveAccount(account);
                    }
                    catch (OperationCanceledException) { throw; }
                    catch (Exception) { additionalAccounts.Remove(id); notice = "Additional accounts could not be read. Check the account configuration folders."; DiagnosticLog.Write(id, notice); }
                }
                Render();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception) { notice = "The provider could not return usage. Try again later."; DiagnosticLog.Write("refresh", notice); }
        finally { await tokenWork; refresh = null; pending.Dispose(); if (ready) Render(); }
    }
    Control ProviderMark(string id)
    {
        using var stream = typeof(MainWindow).Assembly.GetManifestResourceStream("TokenPlan.Icons." + id + ".svg")!;
        var svg = System.Xml.Linq.XDocument.Load(stream);
        var bounds = (svg.Root?.Attribute("viewBox")?.Value ?? "0 0 100 100").Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries).Select(v => double.Parse(v, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
        var canvas = new Canvas { Width = bounds[2], Height = bounds[3] };
        foreach (var path in svg.Descendants().Where(e => e.Name.LocalName == "path")) canvas.Children.Add(new Avalonia.Controls.Shapes.Path { Data = Geometry.Parse(path.Attribute("d")!.Value), Fill = Ink });
        return new Viewbox { Width = 24, Height = 24, Child = canvas };
    }
    static ProviderResult Example(string id)
    {
        var now = DateTimeOffset.UtcNow;
        if (id == "cursor") return new(id, "Cursor", new(id, "Cursor", "Pro", new[] { new UsageWindow("Total usage", 52, now.AddDays(12)), new UsageWindow("Cursor Models", 24, now.AddDays(12)), new UsageWindow("Other Models", 61, now.AddDays(12)) }, now), null, new string('C', 64));
        return new(id, ProviderName(id), new(id, ProviderName(id), id == "claude" ? "Pro" : "Plus", new[] { new UsageWindow("Session", id == "claude" ? 38 : 22, now.AddHours(2)), new UsageWindow("Weekly", id == "claude" ? 61 : 47, now.AddDays(3)) }, now), null, new string(id == "claude" ? 'A' : 'B', 64));
    }
}

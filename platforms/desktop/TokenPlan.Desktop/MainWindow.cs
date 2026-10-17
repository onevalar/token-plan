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
    IBrush Surface => Brush.Parse(IsDark ? "#0F1010" : "#FFFFFF");
    IBrush Canvas => Brush.Parse(IsDark ? "#08090A" : "#F4F5F6");
    IBrush Ink => Brush.Parse(IsDark ? "#E4E4E7" : "#191B20");
    IBrush Muted => Brush.Parse(IsDark ? "#8C919B" : "#515661");
    IBrush Line => Brush.Parse(IsDark ? "#22242A" : "#DDDFE3");
    IBrush Accent => Brush.Parse(IsDark ? "#4C8DFF" : "#2675E5");

    public MainWindow()
    {
        Title = Program.Fixture ? "TokenPlan · Interface Review" : "TokenPlan";
        Width = 560; Height = 720; MinWidth = 480; MinHeight = 360;
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
        KeyDown += (_, e) => {
            if (e.Key == Key.R && e.KeyModifiers.HasFlag(OperatingSystem.IsMacOS() ? KeyModifiers.Meta : KeyModifiers.Control)) { e.Handled = true; _ = Refresh(); }
            if (e.Key == Key.Escape) { e.Handled = true; if (refresh != null) refresh.Cancel(); else if (IsTrayPanel) Hide(); }
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
    TextBlock Text(string text, double size = 14, bool muted = false) => new() { Text = text, FontSize = preferences.Compact ? Math.Max(11, size - 1) : size, Foreground = muted ? Muted : Ink, TextWrapping = TextWrapping.Wrap };
    static StackPanel Stack(double spacing = 12) => new() { Spacing = spacing };
    Button Action(string label, Action action)
    {
        var button = new Button { Content = L.T(label), Background = Brush.Parse(IsDark ? "#202228" : "#EEF0F3"), Foreground = Ink, BorderThickness = new Thickness(0), CornerRadius = new CornerRadius(7), MinHeight = 36, Padding = new Thickness(14, 7), HorizontalAlignment = HorizontalAlignment.Left };
        if (label == "Back") button.Name = "tokenplan-back";
        button.Click += (_, _) => action();
        return button;
    }
    string ScrollKey(string pageID) => pageID == "detail" ? "detail/" + detailProvider + "/" + detailAccount + "/" + detailSettings : pageID;
    static string CanonicalPage(string next) => next switch { "history" => "providers", "appearance" => "settings", _ => next };
    void Navigate(string next) { page = CanonicalPage(next); Render(); }
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
        var content = page switch { "detail" => DetailPage(), "settings" => Settings(), "notifications" => NotificationPage(), "advanced" => AdvancedPage(), "about" => AboutPage(), "providers" => ProvidersPage(), _ => Overview() };
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
    Control Overview()
    {
        var body = Stack(20); body.Margin = new Thickness(20, 16); body.MaxWidth = 780;
        var heading = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
        Add(heading, Brand(20));
        var refreshAll = Action(refresh == null ? "Refresh" : "Stop", () => { if (refresh != null) refresh.Cancel(); else _ = Refresh(); });
        refreshAll.Name = "tokenplan-refresh-all";
        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        actions.Children.Add(refreshAll); actions.Children.Add(MoreMenu());
        Add(heading, actions, 0, 1);
        body.Children.Add(heading);
        if (Program.Fixture) body.Children.Add(Note(L.T("Interface review uses example data. No accounts are connected.")));
        if (notice != null) body.Children.Add(Note(L.T(notice)));
        if (availableUpdate != null) body.Children.Add(Action("Update Available", () => Navigate("about")));
        var cards = new ProviderGrid();
        foreach (var id in preferences.OrderedProviders.Where(preferences.IsEnabled))
        {
            cards.Children.Add(Card(results.GetValueOrDefault(id) ?? new(id, ProviderName(id), null, "Waiting for the first update…")));
            foreach (var account in additionalAccounts.GetValueOrDefault(id) ?? Array.Empty<ProviderResult>()) if (preferences.AccountVisibility.GetValueOrDefault(account.SettingsKey, true)) cards.Children.Add(Card(account));
        }
        body.Children.Add(cards);
        if (!ProviderIDs.Any(preferences.IsEnabled)) { body.Children.Add(Note(L.T("No providers are enabled."))); body.Children.Add(Action("Manage Providers", () => Navigate("providers"))); }

        return new ScrollViewer { Content = body, HorizontalScrollBarVisibility = Avalonia.Controls.Primitives.ScrollBarVisibility.Disabled };
    }
    Control Brand(double size)
    {
        var panel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4, VerticalAlignment = VerticalAlignment.Center };
        using var stream = typeof(MainWindow).Assembly.GetManifestResourceStream("TokenPlan.AppIcon.png")!;
        panel.Children.Add(new Image { Source = new Avalonia.Media.Imaging.Bitmap(stream), Width = 20, Height = 20, VerticalAlignment = VerticalAlignment.Center });
        var brandName = Text("TokenPlan", size); brandName.VerticalAlignment = VerticalAlignment.Center; panel.Children.Add(brandName); return panel;
    }
    Control Note(string message) => new Border { Background = Canvas, CornerRadius = new CornerRadius(8), Padding = new Thickness(12), BorderBrush = Line, BorderThickness = new Thickness(1), Child = Text(message, 12, true) };
    Control Card(ProviderResult result, bool detail = false)
    {
        var body = Stack(10);
        var header = new Grid { ColumnDefinitions = new ColumnDefinitions("Auto,*,Auto") };
        var mark = new Border { Width = 32, Height = 32, CornerRadius = new CornerRadius(8), Background = Canvas, Child = ProviderMark(result.Id) };
        Add(header, mark);
        var title = Stack(2); title.Margin = new Thickness(10, 0, 0, 0); title.Children.Add(Text(result.AccountEmail != null ? ProviderName(result.Id) : result.Name, 16));
        if (result.AccountEmail != null) title.Children.Add(AccountIdentityRow(result));
        else if (result.Snapshot?.Plan is { Length: > 0 } plan) title.Children.Add(Text(plan, 11, true));
        Add(header, title, 0, 1);
        if (!detail)
        {
            var open = Action("Details", () => OpenAccountDetail(result)); open.Content = "›"; open.MinWidth = 32;
            Avalonia.Automation.AutomationProperties.SetName(open, result.Name + " · " + L.T("Details"));
            Add(header, open, 0, 2); body.Children.Add(header);
        }
        if (result.ErrorKey != null) body.Children.Add(Text(L.T(result.ErrorKey), 12, true));
        if (result.Snapshot is { } snapshot)
        {
            if (snapshot.Windows.Count == 0) body.Children.Add(Text(L.T("No quota data is available."), 12, true));
            var metrics = preferences.OrderedMetrics(result.SettingsKey, snapshot.Windows).Where(w => preferences.Placement(result.SettingsKey, w.Label) != MetricPlacement.Hidden).ToArray();
            var primary = detail ? metrics : metrics.Where(w => preferences.Placement(result.SettingsKey, w.Label) == MetricPlacement.Home).ToArray();
            foreach (var metric in primary) body.Children.Add(MetricRow(metric, result.Id));
            if (detail && result.AccountKey == null && ProviderCatalog.TokenLogProviders.Contains(result.Id)) body.Children.Add(ServiceSpendRows(result.Id));
            body.Children.Add(Text(L.T(result.ErrorKey == null ? "Updated" : "Last Successful Update") + " " + snapshot.FetchedAt.ToLocalTime().ToString("g"), 11, true));
        }
        return new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(preferences.Compact ? 12 : 20), Child = body };
    }
    ComboBox Choice(string[] labels, int index) => new() { ItemsSource = labels.Select(L.T).ToArray(), SelectedIndex = index, MinWidth = 240 };
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
                if (!Program.Fixture)
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

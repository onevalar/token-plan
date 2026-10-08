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
    static readonly string[] ProviderIDs = { "claude", "codex", "cursor" };
    static readonly string[] Pages = { "overview", "providers", "history", "settings" };
    readonly ProviderService providers;
    readonly Dictionary<string, LocalTokenUsage> localTokens;
    readonly Dictionary<string, TokenTrend> tokenTrends = new();
    string TokenProvider => preferences.IsEnabled(preferences.TokenProvider) ? preferences.TokenProvider : ProviderIDs.FirstOrDefault(preferences.IsEnabled) ?? preferences.TokenProvider;
    TokenTrend? tokenTrend {
        get {
            var trend = tokenTrends.GetValueOrDefault(TokenProvider);
            if (TokenProvider != "cursor" || trend == null || trend.ErrorKey != null) return trend;
            return trend.CredentialFingerprint != null && results.GetValueOrDefault("cursor")?.CredentialFingerprint == trend.CredentialFingerprint ? trend : null;
        }
    }
    bool tokensLoading;
    readonly HashSet<string> expandedProviders = new();
    readonly Dictionary<string, ProviderResult> results = new();
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
    public IEnumerable<string> TraySummaries() => ProviderIDs.Where(preferences.IsEnabled).Select(id => {
        var result = results.GetValueOrDefault(id);
        var metric = result?.Snapshot?.Windows.FirstOrDefault();
        return ProviderName(id) + " · " + (metric == null ? L.T("Needs Attention") : L.T(metric.Label) + " " + metric.UsedPercent.ToString("0.#") + "% " + L.T("Used"))
            + (metric != null && result?.ErrorKey != null ? " · " + L.T("Needs Attention") : "");
    });
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
    IBrush Accent => this.GetPlatformSettings()?.GetColorValues().AccentColor1 is { } color ? new SolidColorBrush(color) : Brush.Parse("#2664C7");

    public MainWindow()
    {
        Title = Program.Fixture ? "TokenPlan · Interface Review" : "TokenPlan";
        Width = 1000; Height = 760; MinWidth = 680; MinHeight = 500;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
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
        timer.Tick += (_, _) => { if (preferences.AutoRefresh && refresh == null) _ = Refresh(); };
        Opened += (_, _) => { timer.Start(); _ = Refresh(); };
        Closed += (_, _) => { ready = false; timer.Stop(); refresh?.Cancel(); providers.Dispose(); };
        ActualThemeVariantChanged += (_, _) => { if (ready) Render(); };
        KeyDown += (_, e) => {
            if (e.Key == Key.R && e.KeyModifiers.HasFlag(OperatingSystem.IsMacOS() ? KeyModifiers.Meta : KeyModifiers.Control)) { e.Handled = true; _ = Refresh(); }
            if (e.Key == Key.Escape && refresh != null) { e.Handled = true; refresh.Cancel(); }
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
    TextBlock Text(string text, double size = 14, bool muted = false) => new() { Text = text, FontSize = size, Foreground = muted ? Muted : Ink, TextWrapping = TextWrapping.Wrap };
    static StackPanel Stack(double spacing = 12) => new() { Spacing = spacing };
    Button Action(string label, Action action)
    {
        var button = new Button { Content = L.T(label), MinHeight = 36, Padding = new Thickness(14, 7), HorizontalAlignment = HorizontalAlignment.Left };
        button.Click += (_, _) => action();
        return button;
    }
    void Navigate(string next) { page = next; Render(); }
    void Render()
    {
        StateChanged?.Invoke();
        var version = ++renderVersion;
        var renderedPage = page;
        var focusToRestore = focusedName;
        restoringFocus = true;
        var offset = scrollPositions.GetValueOrDefault(page);
        Background = Canvas;
        Foreground = Ink;
        var content = page switch { "settings" => Settings(), "providers" => ProvidersPage(), "history" => HistoryPage(), _ => Overview() };
        var destinationsText = new[] { L.T("Overview"), L.T("Providers"), L.T("History"), L.T("Settings") };
        var root = new Grid();
        if (OperatingSystem.IsLinux())
        {
            // A compact header and horizontal destinations fit GNOME/KDE window layouts.
            root.RowDefinitions = new RowDefinitions("Auto,*");
            var header = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto"), Margin = new Thickness(24, 14) };
            Add(header, Text("TokenPlan", 20));
            var destinations = new TabStrip { Name = "tokenplan-navigation", ItemsSource = destinationsText, SelectedIndex = Array.IndexOf(Pages, page) };
            destinations.SelectionChanged += (_, _) => { if (destinations.SelectedIndex >= 0) Navigate(Pages[destinations.SelectedIndex]); };
            Add(header, destinations, 0, 1);
            Add(root, header); Add(root, content, 1);
        }
        else
        {
            // Windows keeps persistent navigation in a rail beside the content.
            root.ColumnDefinitions = new ColumnDefinitions("196,*");
            var rail = Stack(10); rail.Margin = new Thickness(20, 28);
            rail.Children.Add(Text("TokenPlan", 22));
            rail.Children.Add(Text(L.T("AI Usage"), 12, true));
            var navigation = new ListBox { Name = "tokenplan-navigation", ItemsSource = destinationsText, SelectedIndex = Array.IndexOf(Pages, page), Margin = new Thickness(0, 24, 0, 0), Background = Brushes.Transparent, BorderThickness = new Thickness(0) };
            // Fluent's selected presenter reads these resources instead of the item's Background.
            navigation.Resources["SystemControlHighlightListAccentLowBrush"] = Brush.Parse(IsDark ? "#202532" : "#E6ECF7");
            navigation.Resources["SystemControlHighlightListAccentMediumBrush"] = Brush.Parse(IsDark ? "#292F3F" : "#DAE3F3");
            navigation.Resources["SystemControlHighlightListAccentHighBrush"] = Brush.Parse(IsDark ? "#333C50" : "#CCD9ED");
            navigation.Resources["SystemControlHighlightAltBaseHighBrush"] = Ink;
            navigation.Styles.Add(new Style(x => x.OfType<ListBoxItem>()) { Setters = { new Setter(ListBoxItem.PaddingProperty, new Thickness(12, 10)), new Setter(ListBoxItem.CornerRadiusProperty, new CornerRadius(8)), new Setter(ListBoxItem.MarginProperty, new Thickness(0, 2)), new Setter(ListBoxItem.MinHeightProperty, 40d) } });
            navigation.Styles.Add(new Style(x => x.OfType<ListBoxItem>().Class(":selected")) { Setters = { new Setter(ListBoxItem.BackgroundProperty, Brush.Parse(IsDark ? "#202532" : "#E6ECF7")), new Setter(ListBoxItem.ForegroundProperty, Ink), new Setter(ListBoxItem.FontWeightProperty, FontWeight.SemiBold) } });
            navigation.SelectionChanged += (_, _) => { if (navigation.SelectedIndex >= 0) Navigate(Pages[navigation.SelectedIndex]); };
            rail.Children.Add(navigation);
            Add(root, rail);
            Add(root, new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1, 0, 0, 0), Child = content }, 0, 1);
        }
        pageScroll = null;
        Content = root;
        Dispatcher.UIThread.Post(() => {
            if (!ready || version != renderVersion) return;
            var viewer = content as ScrollViewer ?? content.GetVisualDescendants().OfType<ScrollViewer>().FirstOrDefault();
            pageScroll = viewer;
            if (viewer != null) {
                viewer.Offset = offset;
                viewer.ScrollChanged += (_, _) => { if (ReferenceEquals(pageScroll, viewer)) scrollPositions[renderedPage] = viewer.Offset; };
            }
            if (focusToRestore != null) {
                var target = this.GetVisualDescendants().OfType<Control>().FirstOrDefault(c => c.Name == focusToRestore && c.IsEnabled);
                if (target is ListBox list && list.SelectedItem != null && list.ContainerFromItem(list.SelectedItem) is { } selected) selected.Focus();
                else if (target is Expander expander) expander.GetVisualDescendants().OfType<ToggleButton>().FirstOrDefault()?.Focus();
                else target?.Focus();
            }
            restoringFocus = false;
        }, DispatcherPriority.Loaded);
    }
    Control Overview()
    {
        var body = Stack(20); body.Margin = new Thickness(32, 28); body.MaxWidth = 780;
        var heading = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
        var titles = Stack(6); titles.Children.Add(Text(L.T("AI Usage"), 28)); titles.Children.Add(Text(L.T("Your account limits, together in one place."), 13, true));
        Add(heading, titles);
        var refreshAll = Action(refresh == null ? "Refresh" : "Stop", () => { if (refresh != null) refresh.Cancel(); else _ = Refresh(); });
        refreshAll.Name = "tokenplan-refresh-all";
        Add(heading, refreshAll, 0, 1);
        body.Children.Add(heading);
        if (Program.Fixture) body.Children.Add(Note(L.T("Interface review uses example data. No accounts are connected.")));
        if (notice != null) body.Children.Add(Note(L.T(notice)));
        var available = results.Values.Count(r => r.Snapshot != null);
        body.Children.Add(Text(L.T("Available Usage") + "  " + available + " / " + ProviderIDs.Count(preferences.IsEnabled), 12, true));
        var cards = new ProviderGrid();
        foreach (var id in ProviderIDs.Where(preferences.IsEnabled)) cards.Children.Add(Card(results.GetValueOrDefault(id) ?? new(id, ProviderName(id), null, "Waiting for the first update…")));
        body.Children.Add(cards);
        if (!ProviderIDs.Any(preferences.IsEnabled)) { body.Children.Add(Note(L.T("No providers are enabled."))); body.Children.Add(Action("Manage Providers", () => Navigate("providers"))); }
        body.Children.Add(TokenPanel());
        body.Children.Add(Text(L.T("Reads existing logins on this device. Credentials are never copied or synced."), 12, true));
        return new ScrollViewer { Content = body, HorizontalScrollBarVisibility = Avalonia.Controls.Primitives.ScrollBarVisibility.Disabled };
    }
    Control Note(string message) => new Border { Background = Canvas, CornerRadius = new CornerRadius(8), Padding = new Thickness(12), BorderBrush = Line, BorderThickness = new Thickness(1), Child = Text(message, 12, true) };
    Control Card(ProviderResult result)
    {
        var body = Stack(10);
        var header = new Grid { ColumnDefinitions = new ColumnDefinitions("Auto,*,Auto") };
        var mark = new Border { Width = 32, Height = 32, CornerRadius = new CornerRadius(8), Background = Canvas, Child = ProviderMark(result.Id) };
        Add(header, mark);
        var title = Stack(2); title.Margin = new Thickness(10, 0, 0, 0); title.Children.Add(Text(result.Name, 16));
        if (result.Snapshot?.Plan is { Length: > 0 } plan) title.Children.Add(Text(plan, 11, true));
        Add(header, title, 0, 1);
        var retry = Action("Refresh", () => _ = Refresh(result.Id)); retry.Name = "tokenplan-refresh-" + result.Id; retry.IsEnabled = refresh == null; Add(header, retry, 0, 2);
        body.Children.Add(header);
        if (result.ErrorKey != null) body.Children.Add(Text(L.T(result.ErrorKey), 12, true));
        if (result.Snapshot is { } snapshot)
        {
            Control Metric(UsageWindow window) {
                var row = Stack(6); var labels = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
                Add(labels, Text(L.T(window.Label), 13));
                Add(labels, Text(window.UsedPercent.ToString("0.#") + "% " + L.T("Used"), 13, true), 0, 1);
                row.Children.Add(labels);
                row.Children.Add(new ProgressBar { Minimum = 0, Maximum = 100, Value = Math.Clamp(window.UsedPercent, 0, 100), Height = 6, Foreground = window.UsedPercent >= 90 ? Brush.Parse(IsDark ? "#B96560" : "#D36661") : window.UsedPercent >= 75 ? Brush.Parse(IsDark ? "#AE9E50" : "#C6AC49") : Accent });
                var meta = L.T("Remaining") + " " + window.RemainingPercent.ToString("0.#") + "%";
                if (window.ResetsAt is { } reset) meta += "  ·  " + L.T("Resets") + " " + reset.ToLocalTime().ToString("g");
                row.Children.Add(Text(meta, 11, true));
                return row;
            }
            var primary = snapshot.Windows.Where(w => result.Id == "cursor" ? w == snapshot.Windows[0] : w.Label is "Session" or "Weekly").ToArray();
            if (primary.Length == 0) primary = snapshot.Windows.Take(1).ToArray();
            foreach (var window in primary) body.Children.Add(Metric(window));
            var other = snapshot.Windows.Except(primary).ToArray();
            if (other.Length > 0) {
                var more = Stack(10); foreach (var window in other) more.Children.Add(Metric(window));
                var disclosure = new Expander { Name = "tokenplan-metrics-" + result.Id, Header = L.T("More Metrics"), Content = more, IsExpanded = expandedProviders.Contains(result.Id), HorizontalAlignment = HorizontalAlignment.Stretch };
                disclosure.Expanded += (_, _) => expandedProviders.Add(result.Id); disclosure.Collapsed += (_, _) => expandedProviders.Remove(result.Id);
                body.Children.Add(disclosure);
            }
            body.Children.Add(Text(L.T(result.ErrorKey == null ? "Updated" : "Last Successful Update") + " " + snapshot.FetchedAt.ToLocalTime().ToString("g"), 11, true));
        }
        return new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(16), Child = body };
    }
    Control Settings()
    {
        var body = Stack(20); body.Margin = new Thickness(32, 28); body.MaxWidth = 700;
        body.Children.Add(Text(L.T("Settings"), 28));
        if (notice != null) body.Children.Add(Note(L.T(notice)));
        body.Children.Add(Text(L.T("Appearance"), 15));
        var appearance = Choice(new[] { "Follow System", "Light", "Dark" }, Array.IndexOf(new[] { "system", "light", "dark" }, preferences.Appearance));
        appearance.Name = "tokenplan-appearance";
        appearance.SelectionChanged += (_, _) => { preferences = preferences with { Appearance = new[] { "system", "light", "dark" }[appearance.SelectedIndex] }; Save(); ApplyAppearance(); Render(); };
        body.Children.Add(appearance);
        body.Children.Add(Text(L.T("Language"), 15));
        var languageLabels = new[] { L.T("Follow System"), "English", "简体中文", "繁體中文", "日本語", "한국어" };
        var languages = new[] { "system", "en", "zh-Hans", "zh-Hant", "ja", "ko" };
        var language = new ComboBox { Name = "tokenplan-language", ItemsSource = languageLabels, SelectedIndex = Array.IndexOf(languages, preferences.Language), MinWidth = 240 };
        language.SelectionChanged += (_, _) => { preferences = preferences with { Language = languages[language.SelectedIndex] }; Save(); L.Use(preferences.Language); Render(); };
        body.Children.Add(language);
        var automatic = new CheckBox { Name = "tokenplan-auto-refresh", Content = L.T("Refresh Every Five Minutes"), IsChecked = preferences.AutoRefresh };
        automatic.IsCheckedChanged += (_, _) => { preferences = preferences with { AutoRefresh = automatic.IsChecked == true }; Save(); Render(); };
        body.Children.Add(automatic);
        var background = new CheckBox { Name = "tokenplan-keep-running", Content = L.T("Keep Running When Window Closes"), IsChecked = preferences.KeepRunningWhenClosed, IsEnabled = TrayAvailable };
        background.IsCheckedChanged += (_, _) => { preferences = preferences with { KeepRunningWhenClosed = background.IsChecked == true }; Save(); Render(); };
        body.Children.Add(background);
        body.Children.Add(Text(L.T("Use the tray menu to reopen TokenPlan, refresh usage or quit. Enable background mode only if your desktop displays the tray icon."), 12, true));
        body.Children.Add(Note(L.T("Claude and Codex use CLI logins. Cursor uses its desktop login. Sign in again in the corresponding app if a session expires.")));
        body.Children.Add(Text(L.T("This desktop preview does not yet include spending history, iCloud sync or automatic updates."), 12, true));
        return new ScrollViewer { Content = body };
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
            tokenWork = RefreshTokens(only, pending.Token);
            foreach (var id in (only == null ? ProviderIDs : new[] { only }).Where(preferences.IsEnabled))
            {
                var result = Program.Fixture ? Example(id) : await providers.Refresh(id, pending.Token);
                if (!ready || pending.IsCancellationRequested) return;
                history.Observe(result, DateTimeOffset.UtcNow);
                SaveHistory();
                result = result.PreserveLastSuccess(results.GetValueOrDefault(id));
                results[id] = result;
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
        var canvas = new Canvas { Width = 100, Height = 100 };
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

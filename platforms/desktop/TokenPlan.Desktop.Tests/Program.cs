using Avalonia;
using Avalonia.Controls;
using Avalonia.Headless;
using Avalonia.Interactivity;
using Avalonia.LogicalTree;
using Avalonia.Styling;
using Avalonia.Threading;
using Avalonia.VisualTree;
using System.Reflection;
using TokenPlan.Core;
using TokenPlan.Desktop;

AppBuilder.Configure<App>().UseSkia().UseHeadless(new AvaloniaHeadlessPlatformOptions { UseHeadlessDrawing = false }).SetupWithoutStarting();
typeof(MainWindow).Assembly.GetType("TokenPlan.Desktop.Program")!.GetProperty("Fixture")!.SetValue(null, true);
if (Environment.GetEnvironmentVariable("TOKENPLAN_TEST_LINUX_THEME") == "1") { Application.Current!.Styles.Clear(); Application.Current.Styles.Add(new Avalonia.Themes.Simple.SimpleTheme()); }
var window = new MainWindow();
// Headless windows never appear on the desktop; fixture mode prevents account access.
var checks = 0;
void Check(bool condition, string label) { if (!condition) throw new Exception(label); checks++; }
var flags = BindingFlags.Instance | BindingFlags.NonPublic;
void Set(string name, object value) => typeof(MainWindow).GetField(name, flags)!.SetValue(window, value);
object? Get(string name) => typeof(MainWindow).GetField(name, flags)!.GetValue(window);
object? Call(string name, params object[] values) => typeof(MainWindow).GetMethod(name, flags)!.Invoke(window, values);
var temp = Path.Combine(Path.GetTempPath(), "tokenplan-ui-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(temp);
Set("preferencesFile", Path.Combine(temp, "preferences.json"));
try
{
    Set("preferences", new Preferences());
    window.Show(); Dispatcher.UIThread.RunJobs();
    var results = (Dictionary<string, ProviderResult>)Get("results")!;
    results["claude"] = new("claude", "Claude", new("claude", "Claude", "Pro", new[] { new UsageWindow("Session", 32, null), new UsageWindow("Weekly", 64, null), new UsageWindow("Sonnet", 23, null) }, DateTimeOffset.UtcNow), null, "fixture");
    foreach (var theme in new[] { ThemeVariant.Light, ThemeVariant.Dark })
    {
        window.RequestedThemeVariant = theme;
        foreach (var page in new[] { "overview", "providers", "settings", "notifications", "advanced", "about" })
        {
            Call("Navigate", page); window.Measure(new Size(560, 720)); window.Arrange(new Rect(0, 0, 560, 720)); Dispatcher.UIThread.RunJobs();
            Check(window.Content is Grid, "Every page renders in " + theme + ": " + page);
            if (Environment.GetEnvironmentVariable("TOKENPLAN_UI_CAPTURE") is { Length: > 0 } capture)
            {
                Directory.CreateDirectory(capture);
                foreach (var viewer in window.GetVisualDescendants().OfType<ScrollViewer>()) viewer.Offset = default;
                Dispatcher.UIThread.RunJobs(); Avalonia.Headless.AvaloniaHeadlessPlatform.ForceRenderTimerTick();
                using var bitmap = window.CaptureRenderedFrame(); bitmap?.Save(Path.Combine(capture, theme + "-" + page + ".png"), Avalonia.Media.Imaging.PngBitmapEncoderOptions.Default);
            }
        }
        foreach (var provider in ProviderCatalog.All)
        {
            Call("OpenDetail", provider.Id); Set("detailSettings", true); Call("Render");
            window.Measure(new Size(680, 500)); window.Arrange(new Rect(0, 0, 680, 500)); Dispatcher.UIThread.RunJobs();
            if (!window.GetVisualDescendants().OfType<TextBox>().Any(t => t.Name == "tokenplan-note-" + provider.Id))
            {
                window.GetVisualDescendants().OfType<Button>().First(b => b.Name == "tokenplan-note-disclosure-" + provider.Id).RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
                window.Measure(new Size(680, 500)); window.Arrange(new Rect(0, 0, 680, 500)); Dispatcher.UIThread.RunJobs();
            }
            Check(window.GetVisualDescendants().OfType<TextBox>().Any(t => t.Name == "tokenplan-note-" + provider.Id), "Every service settings page has usable notes: " + provider.Id + " " + theme);
            if (provider.EnvironmentKey != null) Check(window.GetVisualDescendants().OfType<TextBox>().Any(t => t.Name == "tokenplan-api-key-" + provider.Id), "API credential entry exists for " + provider.Id);
        }
        foreach (var target in new[] { "history", "appearance", "settings", "about" })
        {
            Call("Navigate", "overview"); Call("OpenUtility", target);
            window.Measure(new Size(560, 720)); window.Arrange(new Rect(0, 0, 560, 720)); Dispatcher.UIThread.RunJobs();
            window.GetVisualDescendants().OfType<Button>().First(b => b.Name == "tokenplan-back").RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
            Check((string)Get("page")! == "overview", "Actual Back button returns home from " + target);
        }
        Call("Navigate", "overview"); Call("OpenUtility", "history");
        Check((string)Get("settingsOrigin")! == "overview", "History preserves home origin");
        Call("OpenDetail", "claude");
        Check((string)Get("detailOrigin")! == "providers", "Detail preserves actual origin");
        Set("detailSettings", true); Call("Render");
        window.Measure(new Size(680, 500)); window.Arrange(new Rect(0, 0, 680, 500)); Dispatcher.UIThread.RunJobs();
        Check(window.GetVisualDescendants().OfType<CheckBox>().Any(), "Detail controls available at minimum window size");
    }
    results["opencode"] = new("opencode", "OpenCode", new("opencode", "OpenCode", "Go", new[] { new UsageWindow("Session", 100, DateTimeOffset.UtcNow.AddHours(2)) }, DateTimeOffset.UtcNow), null);
    var metricTitle = typeof(MainWindow).GetMethod("MetricTitle", BindingFlags.Static | BindingFlags.NonPublic)!;
    Check((string)metricTitle.Invoke(null, new object[] { "opencode", "Session" })! == L.T("5 Hours"), "OpenCode display label explicitly identifies five hours");
    Set("preferences", new Preferences().PlaceMetric("opencode", "Session", MetricPlacement.Hidden, results["opencode"].Snapshot!.Windows));
    Check(((Preferences)Get("preferences")!).Placement("opencode", "Session") == MetricPlacement.Hidden, "OpenCode keeps existing metric preference identity");
    Call("OpenDetail", "opencode"); Call("Render");
    window.Measure(new Size(680, 500)); window.Arrange(new Rect(0, 0, 680, 500)); Dispatcher.UIThread.RunJobs();
    var allowance = L.T("These three readings share one allowance. More expensive models use it up faster. They are not each model's own remaining amount.");
    Check(!window.GetVisualDescendants().OfType<TextBlock>().Any(t => t.Text == allowance), "Hidden OpenCode quota does not leave a misleading allowance note");
    Set("preferences", new Preferences()); Call("Render");
    window.Measure(new Size(680, 500)); window.Arrange(new Rect(0, 0, 680, 500)); Dispatcher.UIThread.RunJobs();
    Check(window.GetVisualDescendants().OfType<TextBlock>().Any(t => t.Text == allowance), "OpenCode details show the localized shared allowance note");
    Set("preferences", new Preferences().Pin("claude", "Session", true).Pin("claude", "Weekly", true));
    Call("OpenDetail", "claude"); Set("detailSettings", true); Call("Render");
    window.Measure(new Size(560, 720)); window.Arrange(new Rect(0, 0, 560, 720)); Dispatcher.UIThread.RunJobs();
    var choices = window.GetVisualDescendants().OfType<CheckBox>().Where(c => c.Name?.StartsWith("metric-pin-") == true).ToArray();
    Check(choices.Length == 3 && choices[0].IsEnabled && choices[1].IsEnabled && !choices[2].IsEnabled, "Third tray choice visually and functionally disabled at cap in the actual detail table");
    Set("preferences", new Preferences { ExpandedMetrics = new() { ["claude"] = new[] { "Weekly", "Sonnet" } } });
    Call("OpenDetail", "claude"); Set("detailSettings", true); Call("Render");
    window.Measure(new Size(560, 720)); window.Arrange(new Rect(0, 0, 560, 720)); Dispatcher.UIThread.RunJobs();
    var sessionVisibility = window.GetVisualDescendants().OfType<ComboBox>().First(c => c.Name == "metric-status-Session");
    Check(sessionVisibility.ItemCount == 3, "Last home metric can be moved to details or hidden");
    Set("preferences", new Preferences { ExpandedMetrics = new() { ["claude"] = new[] { "Session", "Weekly", "Sonnet" } } });
    var accountCard = (Control)Call("Card", results["claude"], false)!;
    Check(!accountCard.GetLogicalDescendants().OfType<ProgressBar>().Any(), "All-details account has no promoted overview quota");
    Check(accountCard.GetLogicalDescendants().OfType<Button>().Any(), "Heading-only account retains its details action");
    Set("preferences", new Preferences { HideValues = true });
    Check((string)Call("MetricValue", new UsageWindow("Balance", 0, null, 1234, "USD"))! == "•••", "Privacy hides monetary amounts");
    Set("detailSettings", false); Call("OpenDetail", "claude");
    window.Measure(new Size(560, 720)); window.Arrange(new Rect(0, 0, 560, 720)); Dispatcher.UIThread.RunJobs();
    Check(window.GetVisualDescendants().OfType<ProgressBar>().Count() == 3, "Detail usage renders all three metrics expanded");
    Check(window.GetVisualDescendants().OfType<ProgressBar>().All(p => p.Bounds.Height <= 6), "Platform themes preserve the compact six-pixel progress height");
    Check(window.GetVisualDescendants().OfType<ProgressBar>().All(p => p.Value == 0), "Privacy masks progress lengths too");
    var trends = (Dictionary<string, TokenTrend>)Get("tokenTrends")!;
    var today = DateOnly.FromDateTime(DateTime.Now);
    foreach (var id in new[] { "claude", "codex" }) trends[id] = new(new[] { new TokenDay(today, new(100, 20, 0), new(0.1, 0, 1)) }, false, DateTimeOffset.UtcNow);
    Set("historyProvider", "claude"); Set("selectedSpendDate", today); Call("Navigate", "history");
    window.Measure(new Size(560, 720)); window.Arrange(new Rect(0, 0, 560, 720)); Dispatcher.UIThread.RunJobs();
    var labels = window.GetVisualDescendants().OfType<TextBlock>().Select(t => t.Text).ToArray();
    Check(labels.Contains("Claude") && !labels.Contains("Codex"), "Daily history drill-down preserves selected service filter");
    Call("Navigate", "overview"); Call("OpenUtility", "settings"); Call("OpenUtility", "notifications");
    void Back() { window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs(); window.GetVisualDescendants().OfType<Button>().First(b => b.Name == "tokenplan-back").RaiseEvent(new RoutedEventArgs(Button.ClickEvent)); }
    Back(); Check((string)Get("page")! == "settings", "Notifications returns to general settings");
    Back(); Check((string)Get("page")! == "overview", "Nested settings return does not overwrite home origin");
    Set("preferences", new Preferences { ExpandedMetrics = new() { ["claude"] = new[] { "Sonnet" } } });
    Call("Navigate", "overview"); window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    Check(!window.GetVisualDescendants().OfType<Expander>().Any(), "Details-only items are not hidden in home expanders");
    Set("preferences", new Preferences()); Set("selectedSpendDate", null!); Set("historyProvider", "claude");
    trends["claude"] = new(new[] { new TokenDay(today, new(100,20,0), null) }, false, DateTimeOffset.UtcNow);
    Call("Navigate", "history"); window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var costTexts = window.GetVisualDescendants().OfType<TextBlock>().Select(t => t.Text).ToArray();
    Check(costTexts.Contains("—") && !costTexts.Contains("$0.00"), "Unknown prices never masquerade as zero cost");
    var periodControl = window.GetVisualDescendants().OfType<Avalonia.Controls.Primitives.TabStrip>().First(t => t.Name == "spend-period");
    periodControl.SelectedIndex = 2;
    Check(((Preferences)Get("preferences")!).SpendPeriod == 2, "History period selection persists");
    foreach (var theme in new[] { ThemeVariant.Light, ThemeVariant.Dark })
    {
        window.RequestedThemeVariant = theme; L.Use("zh-Hans");
        foreach (var settings in new[] { false, true })
        {
            Call("OpenDetail", "claude"); Set("detailSettings", settings); Call("Render"); window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
            if (Environment.GetEnvironmentVariable("TOKENPLAN_UI_CAPTURE") is { Length: > 0 } capture)
            {
                foreach (var viewer in window.GetVisualDescendants().OfType<ScrollViewer>()) viewer.Offset = default;
                Dispatcher.UIThread.RunJobs(); Avalonia.Headless.AvaloniaHeadlessPlatform.ForceRenderTimerTick();
                using var bitmap = window.CaptureRenderedFrame(); bitmap?.Save(Path.Combine(capture, theme + (settings ? "-detail-settings.png" : "-detail-usage.png")), Avalonia.Media.Imaging.PngBitmapEncoderOptions.Default);
            }
        }
    }
    var accounts = (Dictionary<string, IReadOnlyList<ProviderResult>>)Get("additionalAccounts")!;
    var accountA = results["claude"] with { AccountIdentity = "fixture-identity-a", AccountKey = "claude:fixture-a", Name = "Claude · A", AccountEmail = "a-very-long-account-email@example.com" };
    var accountB = results["claude"] with { AccountKey = "claude:fixture-b", Name = "Claude · B" };
    accounts["claude"] = new[] { accountA, accountB };
    Set("preferences", new Preferences { HiddenMetrics = new() { [accountA.SettingsKey] = new[] { "Sonnet" } }, ProviderNotes = new() { [accountA.SettingsKey] = "only A" } });
    Call("OpenAccountDetail", accountA); Set("detailSettings", true); Call("Render");
    Check((string)Get("detailAccount")! == accountA.AccountKey, "Account card opens that account's settings");
    window.Measure(new Size(420,720)); window.Arrange(new Rect(0,0,420,720)); Dispatcher.UIThread.RunJobs();
    var accountEmail = window.GetVisualDescendants().OfType<TextBlock>().Single(t => t.Name == "account-email-" + accountA.SettingsKey);
    Check(accountEmail.Text == accountA.AccountEmail && accountEmail.TextWrapping == Avalonia.Media.TextWrapping.NoWrap, "Details show a single-line email without organization metadata");
    Check(window.GetVisualDescendants().OfType<TextBlock>().Any(t => t.Text == "Pro"), "Details retain subscription level beside account email");
    if (Environment.GetEnvironmentVariable("TOKENPLAN_UI_CAPTURE") is { Length: > 0 } accountCapture)
    {
        Avalonia.Headless.AvaloniaHeadlessPlatform.ForceRenderTimerTick();
        using var frame = window.CaptureRenderedFrame(); frame?.Save(Path.Combine(accountCapture, "account-detail.png"), Avalonia.Media.Imaging.PngBitmapEncoderOptions.Default);
    }

    var scoped = (Preferences)Get("preferences")!;
    Check(scoped.Placement(accountA.SettingsKey, "Sonnet") == MetricPlacement.Hidden && scoped.Placement(accountB.SettingsKey, "Sonnet") == MetricPlacement.Home, "Account metric settings are isolated");
    Check(scoped.ProviderNotes.GetValueOrDefault(accountB.SettingsKey) == null, "Account notes are isolated");
    // Two Claude accounts should mean exactly two tray switches, without a family switch.
    accounts["claude"] = new[] { accountA };
    Set("preferences", new Preferences { PinnedMetrics = new() { ["claude"] = new[] { "Session" }, [accountA.SettingsKey] = Array.Empty<string>() } });
    Call("Navigate", "settings");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var traySwitches = window.GetVisualDescendants().OfType<ToggleSwitch>().Where(t => t.Name?.StartsWith("tray-account-claude") == true).ToArray();
    Check(traySwitches.Length == 2, "Two Claude accounts have exactly two tray switches");
    var summaries = window.TraySummaries().ToArray();
    Check(summaries.Any(t => t.StartsWith("Claude-" + accountA.AccountEmail)), "An unpinned account still appears in percentage summaries with a concise email");
    var firstClaude = Array.FindIndex(summaries, t => t.StartsWith("Claude ·"));
    var secondClaude = Array.FindIndex(summaries, t => t.StartsWith("Claude-"));
    Check(secondClaude == firstClaude + 1, "Sibling account summaries stay adjacent in settings order");
    Set("preferences", new Preferences { TrayServices = new() { ["claude"] = false } });
    Call("SetTrayAccountSelected", accountA, true);
    Check(window.TraySummaries().Any(t => t.StartsWith("Claude-")) && !window.TraySummaries().Any(t => t.StartsWith("Claude ·")), "Enabling one account under a legacy hidden service preserves sibling visibility");
    Call("SetTrayAccountSelected", accountA, false);
    Check(!window.TraySummaries().Any(t => t.StartsWith("Claude")), "The individual switch hides the unpinned fallback too");
    Set("preferences", new Preferences());
    accounts["claude"] = new[] { accountA, accountB };
    Call("Navigate", "providers");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var accountSwitch = window.GetVisualDescendants().OfType<ToggleSwitch>().Single(t => t.Name == "account-visible-" + accountA.SettingsKey);
    accountSwitch.IsChecked = false;
    Check(!((Preferences)Get("preferences")!).AccountVisibility[accountA.SettingsKey], "Account visibility control persists independent preference");
    Check(!window.TraySummaries().Any(text => text.StartsWith(accountA.Name)), "Hidden account also leaves tray summaries");
    Call("OpenAccountDetail", accountA); Set("detailSettings", true); Call("Render");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var removeAccount = window.GetVisualDescendants().OfType<Button>().Single(b => b.Name == "tokenplan-remove-account");
    removeAccount.RaiseEvent(new RoutedEventArgs(Button.ClickEvent)); Dispatcher.UIThread.RunJobs();
    var removalDialog = window.OwnedWindows.Single();
    var confirmRemoval = removalDialog.GetLogicalDescendants().OfType<Button>().Single(b => Equals(b.Content, L.T("Remove Account")));
    confirmRemoval.RaiseEvent(new RoutedEventArgs(Button.ClickEvent)); Dispatcher.UIThread.RunJobs();
    Check(((Preferences)Get("preferences")!).IsAccountRemoved(accountA), "Confirmed removal is persisted for this identity");
    Check(Preferences.Load(Path.Combine(temp, "preferences.json")).IsAccountRemoved(accountA), "Removed identity survives restart");
    Check(!window.TraySummaries().Any(text => text.Contains(accountA.AccountEmail!)), "Removed account is absent from tray summaries");
    Call("Navigate", "providers");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    Check(!window.GetVisualDescendants().OfType<ToggleSwitch>().Any(t => t.Name == "account-visible-" + accountA.SettingsKey), "Removed account is absent from service configuration");
    L.Use("en"); Call("Navigate", "overview");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var homeText = window.GetVisualDescendants().OfType<TextBlock>().Select(t => t.Text).ToArray();
    Check(!homeText.Contains("Overview") && !homeText.Any(t => t?.StartsWith("Available Usage") == true), "Overview has no duplicate title or service counter");
    Check(!window.GetVisualDescendants().OfType<Avalonia.Controls.Primitives.TabStrip>().Any(), "Overview has no destination tabs");
    var options = window.GetVisualDescendants().OfType<Button>().Single(b => b.Name == "tokenplan-options");
    var services = options.ContextMenu!.Items.OfType<MenuItem>().Single(item => (string?)item.Header == "Service Configuration");
    services.RaiseEvent(new RoutedEventArgs(MenuItem.ClickEvent));
    Check((string)Get("page")! == "providers", "Options opens service management");
    Back(); Check((string)Get("page")! == "overview", "Service management returns to overview");
    var menuLabels = options.ContextMenu.Items.OfType<MenuItem>().Select(item => (string?)item.Header).ToArray();
    Check(menuLabels.SequenceEqual(new[] { "Service Configuration", "General Settings", "About", "Quit" }), "Options has only merged destinations");
    Call("Navigate", "settings");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var settingLabels = window.GetVisualDescendants().OfType<TextBlock>().Select(t => t.Text).ToArray();
    Check(settingLabels.Contains("Theme") && settingLabels.Contains("Language") && settingLabels.Contains("Refresh Interval") && settingLabels.Contains("System Tray"), "General settings includes appearance, language and behavior");
    Set("selectedSpendDate", null!); Call("Navigate", "providers");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var summary = window.GetVisualDescendants().OfType<StackPanel>().Single(p => p.Name == "tokenplan-usage-overview");
    var management = window.GetVisualDescendants().OfType<TextBlock>().First(t => t.Text == "Manage Providers");
    Check(summary.TranslatePoint(default, window)!.Value.Y < management.TranslatePoint(default, window)!.Value.Y, "Usage overview precedes service management in one page");
    Call("Navigate", "about");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    var aboutLabels = window.GetVisualDescendants().OfType<TextBlock>().Select(t => t.Text).ToArray();
    Check(!aboutLabels.Contains("Platform") && !aboutLabels.Contains("Privacy") && !aboutLabels.Contains("MIT"), "About presents compact application metadata without removed copy");
    Check(window.GetVisualDescendants().OfType<Button>().Any(b => (string?)b.Content == "Report an Issue"), "About offers actionable support");
    var area = new PixelRect(-1920, 0, 1920, 1080);
    var position = DesktopPanelPosition.Place(area, new PixelSize(560, 720), new PixelPoint(-1900, 0));
    Check(position.X >= area.X && position.X + 560 <= area.Right && position.Y >= area.Y && position.Y + 720 <= area.Bottom, "Tray panel stays on negative-origin monitor");
    window.ConfigureTrayPanel(true);
    Check(window.IsTrayPanel && !window.ShowInTaskbar && !window.CanResize, "Tray mode uses compact non-taskbar panel");
    window.ConfigureTrayPanel(false);
    Check(!window.IsTrayPanel && window.ShowInTaskbar && window.CanResize, "Missing tray restores accessible system window");
    Set("preferences", new Preferences()); Call("Navigate", "overview");
    Check(window.TraySummaries().Any(), "Fresh settings expose default quota summaries");
    window.Measure(new Size(560,720)); window.Arrange(new Rect(0,0,560,720)); Dispatcher.UIThread.RunJobs();
    foreach (var progress in window.GetVisualDescendants().OfType<ProgressBar>())
    {
        var stack = progress.Parent as StackPanel;
        Check(stack != null && stack.Children.IndexOf(progress) > 0, "Quota progress has its own row below labels and values");
    }
    // Exercise the fallback menu without touching the host's actual system tray.
    var trayType = typeof(MainWindow).Assembly.GetType("TokenPlan.Desktop.DesktopTray")!;
    var tray = System.Runtime.CompilerServices.RuntimeHelpers.GetUninitializedObject(trayType);
    trayType.GetField("window", flags)!.SetValue(tray, window);
    trayType.GetMethod("ShowContextMenu", flags)!.Invoke(tray, new object[] { 100, 100 });
    var trayMenu = (Window)trayType.GetField("contextWindow", flags)!.GetValue(tray)!;
    Dispatcher.UIThread.RunJobs();
    var menuButtons = trayMenu.GetVisualDescendants().OfType<Button>().ToArray();
    Check(menuButtons.Any(b => Equals(b.Content, L.T("Quit"))), "Linux context-menu fallback exposes Quit");
    menuButtons.First(b => Equals(b.Content, L.T("Show TokenPlan"))).RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
    Check(window.IsVisible && !trayMenu.IsVisible, "A single menu activation opens the panel and dismisses the menu");
    trayType.GetMethod("Show", flags)!.Invoke(tray, null);
    Check(window.IsVisible, "Repeated tray activation does not toggle the panel closed");
    trayMenu.Close();
    // Fail on dependency upgrades that invalidate the isolated Linux compatibility shim.
    var linuxBackend = Assembly.Load("Avalonia.FreeDesktop").GetType("Avalonia.FreeDesktop.DBusTrayIconImpl")!;
    Check(typeof(TrayIcon).GetField("_impl", flags) != null &&
        linuxBackend.GetField("_connection", flags)?.FieldType == typeof(Tmds.DBus.Protocol.DBusConnection) &&
        linuxBackend.GetField("_itemExported", flags)?.FieldType == typeof(bool) &&
        typeof(Tmds.DBus.Protocol.IPathMethodHandler).IsAssignableFrom(linuxBackend.GetField("_statusNotifierItemDbusObj", flags)!.FieldType),
        "Pinned Linux tray backend supports the context-menu compatibility adapter");
    Console.WriteLine($"PASS: {checks} desktop UI checks (light/dark, navigation, controls, privacy)");
}
finally { window.Close(); Directory.Delete(temp, true); }

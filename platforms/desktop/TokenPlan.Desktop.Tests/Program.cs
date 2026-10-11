using Avalonia;
using Avalonia.Controls;
using Avalonia.Headless;
using Avalonia.Interactivity;
using Avalonia.Styling;
using Avalonia.Threading;
using Avalonia.VisualTree;
using System.Reflection;
using TokenPlan.Core;
using TokenPlan.Desktop;

AppBuilder.Configure<App>().UseSkia().UseHeadless(new AvaloniaHeadlessPlatformOptions { UseHeadlessDrawing = false }).SetupWithoutStarting();
typeof(MainWindow).Assembly.GetType("TokenPlan.Desktop.Program")!.GetProperty("Fixture")!.SetValue(null, true);
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
        foreach (var page in new[] { "overview", "providers", "history", "settings", "appearance", "notifications", "advanced", "about" })
        {
            Call("Navigate", page); window.Measure(new Size(1000, 760)); window.Arrange(new Rect(0, 0, 1000, 760)); Dispatcher.UIThread.RunJobs();
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
            window.Measure(new Size(1000, 760)); window.Arrange(new Rect(0, 0, 1000, 760)); Dispatcher.UIThread.RunJobs();
            window.GetVisualDescendants().OfType<Button>().First(b => b.Name == "tokenplan-back").RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
            Check((string)Get("page")! == "overview", "Actual Back button returns home from " + target);
        }
        Call("Navigate", "overview"); Call("OpenUtility", "history");
        Check((string)Get("settingsOrigin")! == "overview", "History preserves home origin");
        Call("OpenDetail", "claude");
        Check((string)Get("detailOrigin")! == "history", "Detail preserves actual origin");
        Set("detailSettings", true); Call("Render");
        window.Measure(new Size(680, 500)); window.Arrange(new Rect(0, 0, 680, 500)); Dispatcher.UIThread.RunJobs();
        Check(window.GetVisualDescendants().OfType<CheckBox>().Any(), "Detail controls available at minimum window size");
    }
    Set("preferences", new Preferences().Pin("claude", "Session", true).Pin("claude", "Weekly", true));
    Call("OpenDetail", "claude"); Set("detailSettings", true); Call("Render");
    window.Measure(new Size(1000, 760)); window.Arrange(new Rect(0, 0, 1000, 760)); Dispatcher.UIThread.RunJobs();
    var choices = window.GetVisualDescendants().OfType<CheckBox>().Where(c => c.Name?.StartsWith("metric-pin-") == true).ToArray();
    Check(choices.Length == 3 && choices[0].IsEnabled && choices[1].IsEnabled && !choices[2].IsEnabled, "Third tray choice visually and functionally disabled at cap in the actual detail table");
    Set("preferences", new Preferences { ExpandedMetrics = new() { ["claude"] = new[] { "Weekly", "Sonnet" } } });
    Call("OpenDetail", "claude"); Set("detailSettings", true); Call("Render");
    window.Measure(new Size(1000, 760)); window.Arrange(new Rect(0, 0, 1000, 760)); Dispatcher.UIThread.RunJobs();
    var sessionVisibility = window.GetVisualDescendants().OfType<ComboBox>().First(c => c.Name == "metric-status-Session");
    Check(sessionVisibility.ItemCount == 1, "Last always-visible item cannot be hidden while all others are on demand");
    Set("preferences", new Preferences { HideValues = true });
    Check((string)Call("MetricValue", new UsageWindow("Balance", 0, null, 1234, "USD"))! == "•••", "Privacy hides monetary amounts");
    Set("detailSettings", false); Call("OpenDetail", "claude");
    window.Measure(new Size(1000, 760)); window.Arrange(new Rect(0, 0, 1000, 760)); Dispatcher.UIThread.RunJobs();
    Check(window.GetVisualDescendants().OfType<ProgressBar>().Count() == 3, "Detail usage renders all three metrics expanded");
    Check(window.GetVisualDescendants().OfType<ProgressBar>().All(p => p.Bounds.Height <= 6), "Platform themes preserve the compact six-pixel progress height");
    Check(window.GetVisualDescendants().OfType<ProgressBar>().All(p => p.Value == 0), "Privacy masks progress lengths too");
    var trends = (Dictionary<string, TokenTrend>)Get("tokenTrends")!;
    var today = DateOnly.FromDateTime(DateTime.Now);
    foreach (var id in new[] { "claude", "codex" }) trends[id] = new(new[] { new TokenDay(today, new(100, 20, 0), new(0.1, 0, 1)) }, false, DateTimeOffset.UtcNow);
    Set("historyProvider", "claude"); Set("selectedSpendDate", today); Call("Navigate", "history");
    window.Measure(new Size(1000, 760)); window.Arrange(new Rect(0, 0, 1000, 760)); Dispatcher.UIThread.RunJobs();
    var labels = window.GetVisualDescendants().OfType<TextBlock>().Select(t => t.Text).ToArray();
    Check(labels.Contains("Claude") && !labels.Contains("Codex"), "Daily history drill-down preserves selected service filter");
    Call("Navigate", "overview"); Call("OpenUtility", "settings"); Call("OpenUtility", "notifications");
    void Back() { window.Measure(new Size(1000,760)); window.Arrange(new Rect(0,0,1000,760)); Dispatcher.UIThread.RunJobs(); window.GetVisualDescendants().OfType<Button>().First(b => b.Name == "tokenplan-back").RaiseEvent(new RoutedEventArgs(Button.ClickEvent)); }
    Back(); Check((string)Get("page")! == "settings", "Notifications returns to general settings");
    Back(); Check((string)Get("page")! == "overview", "Nested settings return does not overwrite home origin");
    Set("preferences", new Preferences { ExpandedMetrics = new() { ["claude"] = new[] { "Sonnet" } } });
    Call("Navigate", "overview"); window.Measure(new Size(1000,760)); window.Arrange(new Rect(0,0,1000,760)); Dispatcher.UIThread.RunJobs();
    Check(!window.GetVisualDescendants().OfType<Expander>().Any(), "Details-only items are not hidden in home expanders");
    Set("preferences", new Preferences()); Set("selectedSpendDate", null!); Set("historyProvider", "claude");
    trends["claude"] = new(new[] { new TokenDay(today, new(100,20,0), null) }, false, DateTimeOffset.UtcNow);
    Call("Navigate", "history"); window.Measure(new Size(1000,760)); window.Arrange(new Rect(0,0,1000,760)); Dispatcher.UIThread.RunJobs();
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
            Call("OpenDetail", "claude"); Set("detailSettings", settings); Call("Render"); window.Measure(new Size(1000,760)); window.Arrange(new Rect(0,0,1000,760)); Dispatcher.UIThread.RunJobs();
            if (Environment.GetEnvironmentVariable("TOKENPLAN_UI_CAPTURE") is { Length: > 0 } capture)
            {
                foreach (var viewer in window.GetVisualDescendants().OfType<ScrollViewer>()) viewer.Offset = default;
                Dispatcher.UIThread.RunJobs(); Avalonia.Headless.AvaloniaHeadlessPlatform.ForceRenderTimerTick();
                using var bitmap = window.CaptureRenderedFrame(); bitmap?.Save(Path.Combine(capture, theme + (settings ? "-detail-settings.png" : "-detail-usage.png")), Avalonia.Media.Imaging.PngBitmapEncoderOptions.Default);
            }
        }
    }
    Console.WriteLine($"PASS: {checks} desktop UI checks (light/dark, navigation, controls, privacy)");
}
finally { window.Close(); Directory.Delete(temp, true); }

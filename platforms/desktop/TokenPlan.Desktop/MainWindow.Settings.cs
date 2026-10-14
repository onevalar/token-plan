using Avalonia;
using Avalonia.Input.Platform;
using Avalonia.Controls;
using Avalonia.Layout;
using TokenPlan.Core;
namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    string settingsOrigin = "overview";
    readonly Dictionary<string,string> utilityOrigins = new();
    void OpenUtility(string target) { target = CanonicalPage(target); settingsOrigin = page; if (page != target) utilityOrigins[target] = page; Navigate(target); }
    Control MoreMenu()
    {
        var button = Action("Options", () => { });
        button.Name = "tokenplan-options"; button.Content = "⋯";
        Avalonia.Automation.AutomationProperties.SetName(button, L.T("Options"));
        var menu = new ContextMenu();
        foreach (var (label, target) in new[] { ("Service Configuration", "providers"), ("General Settings", "settings"), ("About", "about") })
        {
            var item = new MenuItem { Header = L.T(label) }; item.Click += (_, _) => OpenUtility(target); menu.Items.Add(item);
        }
        var quit = new MenuItem { Header = L.T("Quit") };
        quit.Click += (_, _) => (Application.Current?.ApplicationLifetime as Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime)?.Shutdown();
        menu.Items.Add(quit);
        button.ContextMenu = menu;
        button.Click += (_, _) => menu.Open(button);
        return button;
    }
    StackPanel UtilityBody(string title)
    {
        var body = Stack(20); body.Margin = new Thickness(20, 16); body.MaxWidth = 780;
        body.Children.Add(Action("Back", () => Navigate(utilityOrigins.GetValueOrDefault(page, "overview"))));
        body.Children.Add(Text(L.T(title), 28));
        if (notice != null) body.Children.Add(Note(L.T(notice)));
        return body;
    }
    Control Section(string title, params Control[] controls)
    {
        var section = Stack(8); section.Children.Add(Text(L.T(title), 16));
        var body = Stack(8); foreach (var control in controls) body.Children.Add(control);
        section.Children.Add(new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(16), Child = body }); return section;
    }
    Control SettingRow(string label, Control control)
    {
        var row = new Grid { ColumnDefinitions = new("*,Auto"), MinHeight = preferences.Compact ? 36 : 44 };
        var text = Text(L.T(label), 14); text.VerticalAlignment = VerticalAlignment.Center; text.Margin = new Thickness(0, 0, 12, 0);
        control.HorizontalAlignment = HorizontalAlignment.Right; control.VerticalAlignment = VerticalAlignment.Center;
        Avalonia.Automation.AutomationProperties.SetName(control, L.T(label)); Add(row, text); Add(row, control, 0, 1); return row;
    }
    ToggleSwitch Switch(bool selected, Action<bool> changed)
    {
        var toggle = new ToggleSwitch { IsChecked = selected, OnContent = "", OffContent = "" };
        toggle.IsCheckedChanged += (_, _) => changed(toggle.IsChecked == true); return toggle;
    }
    void AddAppearanceSettings(StackPanel body)
    {
        var languages = new[] { "system", "en", "zh-Hans", "zh-Hant", "ja", "ko" };
        var language = new ComboBox { Name = "tokenplan-language", ItemsSource = new[] { L.T("Follow System"), "English", "简体中文", "繁體中文", "日本語", "한국어" }, SelectedIndex = Array.IndexOf(languages, preferences.Language), MinWidth = 150 };
        language.SelectionChanged += (_, _) => { if (language.SelectedIndex < 0) return; preferences = preferences with { Language = languages[language.SelectedIndex] }; Save(); L.Use(preferences.Language); Render(); };
        var usage = Choice(new[] { "Used", "Left" }, preferences.ShowRemaining ? 1 : 0); usage.MinWidth = 150;
        usage.SelectionChanged += (_, _) => { if (usage.SelectedIndex < 0) return; preferences = preferences with { ShowRemaining = usage.SelectedIndex == 1 }; Save(); Render(); };
        body.Children.Add(Section("Usage Display", SettingRow("Show Usage As", usage), Text(L.T("Preview"), 12, true), MetricRow(new UsageWindow("Session", 18, DateTimeOffset.Now.AddHours(2.5)))));
        var appearance = Choice(new[] { "Follow System", "Light", "Dark" }, Array.IndexOf(new[] { "system", "light", "dark" }, preferences.Appearance)); appearance.MinWidth = 150;
        appearance.SelectionChanged += (_, _) => { if (appearance.SelectedIndex < 0) return; preferences = preferences with { Appearance = new[] { "system", "light", "dark" }[appearance.SelectedIndex] }; Save(); ApplyAppearance(); Render(); };
        var density = Choice(new[] { "Default", "Compact" }, preferences.Compact ? 1 : 0); density.MinWidth = 150;
        density.SelectionChanged += (_, _) => { if (density.SelectedIndex < 0) return; preferences = preferences with { Compact = density.SelectedIndex == 1 }; Save(); Render(); };
        body.Children.Add(Section("App Interface", SettingRow("Language", language), SettingRow("Theme", appearance), SettingRow("Density", density), SettingRow("Reduce Animations", Switch(preferences.ReduceAnimations, value => { preferences = preferences with { ReduceAnimations = value }; Save(); Render(); }))));
        var tray = Stack(4); tray.Children.Add(Text(L.T("Shown Services"), 12, true));
        foreach (var account in TrayAccountEntries())
        {
            var toggle = Switch(TrayAccountSelected(account), value => SetTrayAccountSelected(account, value));
            toggle.Name = "tray-account-" + account.SettingsKey;
            tray.Children.Add(SettingRow(TrayAccountLabel(account), toggle));
        }
        body.Children.Add(Section("System Tray", tray));
        body.Children.Add(UpdateControls());
    }
    Control Settings()
    {
        var body = UtilityBody("General Settings");
        AddAppearanceSettings(body);
        var intervals = new[] { 1, 2, 5, 10, 15, 30, 60 };
        var interval = new ComboBox { ItemsSource = intervals.Select(n => n == 60 ? L.T("1 hour") : n == 1 ? L.T("1 minute") : n + " " + L.T("minutes")).ToArray(), SelectedIndex = Array.IndexOf(intervals, preferences.RefreshMinutes), MinWidth = 150 };
        interval.SelectionChanged += (_, _) => { if (interval.SelectedIndex < 0) return; preferences = preferences with { AutoRefresh = true, RefreshMinutes = intervals[interval.SelectedIndex] }; timer.Interval = TimeSpan.FromMinutes(preferences.RefreshMinutes); Save(); };
        var startup = Switch(DesktopStartup.Enabled, value => { try { DesktopStartup.SetEnabled(value); } catch (Exception) { notice = "Startup settings could not be saved. Check system permissions."; Render(); } }); startup.IsEnabled = !Program.Fixture;
        body.Children.Add(Section("General", SettingRow("Refresh Interval", interval), SettingRow("Launch at Login", startup)));
        var shortcutToggle = Switch(preferences.GlobalShortcut, value => { preferences = preferences with { GlobalShortcut = value }; Save(); ApplyShortcut(); });
        shortcutToggle.IsEnabled = !Program.Fixture && DesktopShortcut.Supported;
        body.Children.Add(Section("Global Shortcut", SettingRow("Ctrl + Alt + U", shortcutToggle)));
        if (OperatingSystem.IsLinux() && !DesktopShortcut.Supported) body.Children.Add(Text(L.T("Assign tokenplan --toggle in your desktop's keyboard settings."), 12, true));
        var background = Switch(preferences.KeepRunningWhenClosed, value => { preferences = preferences with { KeepRunningWhenClosed = value }; Save(); }); background.IsEnabled = TrayAvailable;
        body.Children.Add(Section("Window", SettingRow("Keep Running When Window Closes", background)));
        var more = Stack(6);
        foreach (var (label, destination) in new[] { ("Notifications", "notifications"), ("Privacy & Advanced", "advanced") })
        {
            var button = Action(label, () => OpenUtility(destination)); button.Content = L.T(label) + "   ›"; button.HorizontalAlignment = HorizontalAlignment.Stretch; more.Children.Add(button);
        }
        body.Children.Add(Section("More", more));
        return new ScrollViewer { Content = body };
    }
    Control NotificationPage()
    {
        var body = UtilityBody("Notifications");
        body.Children.Add(Section("Notifications",
            SettingRow("Almost Out", Switch(preferences.NotifyAlmostOut, value => { preferences = preferences with { NotifyAlmostOut = value }; Save(); })),
            SettingRow("Cutting It Close", Switch(preferences.NotifyCuttingClose, value => { preferences = preferences with { NotifyCuttingClose = value }; Save(); })),
            SettingRow("Will Run Out", Switch(preferences.NotifyWillRunOut, value => { preferences = preferences with { NotifyWillRunOut = value }; Save(); }))));
        return new ScrollViewer { Content = body };
    }
    Control AdvancedPage()
    {
        var body = UtilityBody("Privacy & Advanced");
        body.Children.Add(Section("Privacy", SettingRow("Hide Usage Values", Switch(preferences.HideValues, value => { preferences = preferences with { HideValues = value }; Save(); Render(); }))));
        var levels = new[] { "Error", "Warning", "Info", "Debug" }; var logLevel = Choice(levels, preferences.LogLevel); logLevel.MinWidth = 150;
        logLevel.SelectionChanged += (_, _) => { if (logLevel.SelectedIndex < 0) return; preferences = preferences with { LogLevel = logLevel.SelectedIndex }; DiagnosticLog.Level = preferences.LogLevel; Save(); };
        var copy = Action("Copy Log Path", () => { }); copy.Click += async (_, _) => { try { if (Clipboard != null) await Clipboard.SetTextAsync(DiagnosticLog.Path); } catch (Exception) { notice = "Couldn't copy the log path to the clipboard."; Render(); } };
        var reveal = Action("Show Log Folder", () => { }); reveal.Click += async (_, _) => { try { System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(DiagnosticLog.Path)!); await Launcher.LaunchUriAsync(new Uri(System.IO.Path.GetDirectoryName(DiagnosticLog.Path)!)); } catch (Exception) { notice = "The log folder could not be opened."; Render(); } };
        body.Children.Add(Section("Advanced", SettingRow("Log Level", logLevel), copy, reveal,
            Action("Reset All Settings…", () => Confirm("Reset All Settings?", "Restore preferences to their defaults? Saved credentials and usage history are kept.", () => { if (!Program.Fixture) { try { DesktopStartup.SetEnabled(false); } catch (Exception) { notice = "Startup settings could not be saved. Check system permissions."; Render(); return; } } preferences = new(); ApplyShortcut(); DiagnosticLog.Level = preferences.LogLevel; Save(); L.Use(preferences.Language); ApplyAppearance(); timer.Interval = TimeSpan.FromMinutes(preferences.RefreshMinutes); Render(); }))));
        return new ScrollViewer { Content = body };
    }
}

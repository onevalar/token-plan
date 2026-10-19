using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Input.Platform;
using Avalonia.Layout;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

/// <summary>
/// The popover's settings screens, grouped the way the macOS client groups them: General Settings
/// holds behaviour, Display &amp; Appearance holds usage display, interface and tray choices, and the
/// remaining pages hang off General's "More" rows. Every page is caption + grouped card.
/// </summary>
public sealed partial class MainWindow
{
    string settingsOrigin = "overview";
    readonly Dictionary<string, string> utilityOrigins = new();

    void OpenUtility(string target)
    {
        target = CanonicalPage(target);
        settingsOrigin = page;
        if (page != target) utilityOrigins[target] = page;
        Navigate(target);
    }

    Control MoreMenu()
    {
        var button = new Button
        {
            Content = "⋯",
            Name = "tokenplan-options",
            Background = T.SubtleFill,
            BorderThickness = default,
            Foreground = T.Secondary,
            FontSize = 14,
            Width = 28,
            Height = 28,
            Padding = default,
            CornerRadius = new CornerRadius(T.Radius),
            HorizontalContentAlignment = HorizontalAlignment.Center,
            VerticalContentAlignment = VerticalAlignment.Center
        };
        AutomationProperties.SetName(button, L.T("Options"));
        var menu = new ContextMenu();
        foreach (var (label, target) in new[]
        {
            ("Service Configuration", "providers"),
            ("Display & Appearance", "appearance"),
            ("Usage History", "history"),
            ("General Settings", "settings"),
            ("About", "about")
        })
        {
            var item = new MenuItem { Header = L.T(label) };
            item.Click += (_, _) => OpenUtility(target);
            menu.Items.Add(item);
        }
        menu.Items.Add(new Separator());
        var quit = new MenuItem { Header = L.T("Quit") };
        quit.Click += (_, _) => (Application.Current?.ApplicationLifetime as Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime)?.Shutdown();
        menu.Items.Add(quit);
        button.ContextMenu = menu;
        button.Click += (_, _) => menu.Open(button);
        return button;
    }

    ToggleSwitch Switch(bool selected, Action<bool> changed)
    {
        var toggle = new ToggleSwitch { IsChecked = selected, OnContent = "", OffContent = "", VerticalAlignment = VerticalAlignment.Center };
        toggle.IsCheckedChanged += (_, _) => changed(toggle.IsChecked == true);
        return toggle;
    }

    Control Settings()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        if (notice != null) body.Children.Add(Note(notice));

        var intervals = new[] { 1, 2, 5, 10, 15, 30, 60 };
        var interval = Field(new ComboBox
        {
            ItemsSource = intervals.Select(n => n == 60 ? L.T("1 hour") : n == 1 ? L.T("1 minute") : n + " " + L.T("minutes")).ToArray(),
            SelectedIndex = Array.IndexOf(intervals, preferences.RefreshMinutes),
            MinWidth = 116
        });
        interval.SelectionChanged += (_, _) => { if (interval.SelectedIndex < 0) return; preferences = preferences with { AutoRefresh = true, RefreshMinutes = intervals[interval.SelectedIndex] }; timer.Interval = TimeSpan.FromMinutes(preferences.RefreshMinutes); Save(); };
        var startup = Switch(DesktopStartup.Enabled, value => { try { DesktopStartup.SetEnabled(value); } catch (Exception) { notice = "Startup settings could not be saved. Check system permissions."; Render(); } });
        startup.IsEnabled = !Program.Fixture;
        body.Children.Add(Section("General", StackCard(ControlRow("Refresh Interval", interval), ControlRow("Launch at Login", startup))));

        var shortcutToggle = Switch(preferences.GlobalShortcut, value => { preferences = preferences with { GlobalShortcut = value }; Save(); ApplyShortcut(); });
        shortcutToggle.IsEnabled = !Program.Fixture && DesktopShortcut.Supported;
        var shortcutRows = new StretchStack { Spacing = 0 };
        shortcutRows.Children.Add(ControlRow("Ctrl + Alt + U", shortcutToggle));
        if (OperatingSystem.IsLinux() && !DesktopShortcut.Supported)
        {
            var hint = Label(L.T("Assign tokenplan --toggle in your desktop's keyboard settings."), D.CaptionSize, T.Secondary);
            hint.Margin = new Thickness(12, 0, 12, 9);
            shortcutRows.Children.Add(hint);
        }
        body.Children.Add(Section("Global Shortcut", CardSurface(shortcutRows)));

        var background = Switch(preferences.KeepRunningWhenClosed, value => { preferences = preferences with { KeepRunningWhenClosed = value }; Save(); });
        background.IsEnabled = TrayAvailable;
        body.Children.Add(Section("Window", CardSurface(ControlRow("Keep Running When Window Closes", background))));

        var more = new StretchStack { Spacing = 0 };
        var firstLink = true;
        foreach (var (label, destination) in new[] { ("Notifications", "notifications"), ("Privacy & Advanced", "advanced") })
        {
            if (!firstLink) more.Children.Add(Hairline());
            firstLink = false;
            var link = new Button
            {
                Background = Avalonia.Media.Brushes.Transparent,
                BorderThickness = default,
                Padding = new Thickness(12, 10),
                HorizontalAlignment = HorizontalAlignment.Stretch,
                HorizontalContentAlignment = HorizontalAlignment.Stretch
            };
            var line = new Grid { ColumnDefinitions = new("*,Auto") };
            Add(line, Label(L.T(label), D.RowLabelSize));
            Add(line, Label("›", D.RowLabelSize, T.Secondary), 0, 1);
            link.Content = line;
            link.Click += (_, _) => OpenUtility(destination);
            more.Children.Add(link);
        }
        body.Children.Add(Section("More", CardSurface(more)));
        return Page("General Settings", body);
    }

    Control AppearancePage()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        if (notice != null) body.Children.Add(Note(notice));

        var usage = Choice(new[] { "Used", "Left" }, preferences.ShowRemaining ? 1 : 0);
        usage.MinWidth = 104;
        usage.SelectionChanged += (_, _) => { if (usage.SelectedIndex < 0) return; preferences = preferences with { ShowRemaining = usage.SelectedIndex == 1 }; Save(); Render(); };
        var usageRows = new StretchStack { Spacing = 0 };
        usageRows.Children.Add(ControlRow("Show Usage As", usage));
        var previewCaption = Label(L.T("Preview"), D.CaptionSize, T.Secondary);
        previewCaption.Margin = new Thickness(12, 2, 12, 0);
        usageRows.Children.Add(previewCaption);
        usageRows.Children.Add(MetricRow(new UsageWindow("Session", 18, DateTimeOffset.Now.AddHours(2.5))));
        body.Children.Add(Section("Usage Display", CardSurface(usageRows)));

        var languages = new[] { "system", "en", "zh-Hans", "zh-Hant", "ja", "ko" };
        var language = Field(new ComboBox
        {
            Name = "tokenplan-language",
            ItemsSource = new[] { L.T("Follow System"), "English", "简体中文", "繁體中文", "日本語", "한국어" },
            SelectedIndex = Array.IndexOf(languages, preferences.Language),
            MinWidth = 104
        });
        language.SelectionChanged += (_, _) => { if (language.SelectedIndex < 0) return; preferences = preferences with { Language = languages[language.SelectedIndex] }; Save(); L.Use(preferences.Language); Render(); };
        var appearance = Choice(new[] { "Follow System", "Light", "Dark" }, Array.IndexOf(new[] { "system", "light", "dark" }, preferences.Appearance));
        appearance.MinWidth = 104;
        appearance.SelectionChanged += (_, _) => { if (appearance.SelectedIndex < 0) return; preferences = preferences with { Appearance = new[] { "system", "light", "dark" }[appearance.SelectedIndex] }; Save(); ApplyAppearance(); Render(); };
        var density = Choice(new[] { "Default", "Compact" }, preferences.Compact ? 1 : 0);
        density.MinWidth = 104;
        density.SelectionChanged += (_, _) => { if (density.SelectedIndex < 0) return; preferences = preferences with { Compact = density.SelectedIndex == 1 }; Save(); Render(); };
        var reduce = Switch(preferences.ReduceAnimations, value => { preferences = preferences with { ReduceAnimations = value }; Save(); Render(); });
        body.Children.Add(Section("App Interface", StackCard(
            ControlRow("Language", language),
            ControlRow("Theme", appearance),
            ControlRow("Density", density),
            ControlRow("Reduce Animations", reduce))));

        if (TrayAccountEntries().Any())
        {
            var tray = new StretchStack { Spacing = 0 };
            var first = true;
            foreach (var account in TrayAccountEntries())
            {
                if (!first) tray.Children.Add(Hairline());
                first = false;
                var toggle = Switch(TrayAccountSelected(account), value => SetTrayAccountSelected(account, value));
                toggle.Name = "tray-account-" + account.SettingsKey;
                tray.Children.Add(ControlRow(TrayAccountLabel(account), toggle));
            }
            body.Children.Add(Section("System Tray", CardSurface(tray)));
        }
        body.Children.Add(UpdateControls());
        return Page("Display & Appearance", body);
    }

    Control NotificationPage()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        if (notice != null) body.Children.Add(Note(notice));
        body.Children.Add(Section("Notifications", StackCard(
            ControlRow("Almost Out", Switch(preferences.NotifyAlmostOut, value => { preferences = preferences with { NotifyAlmostOut = value }; Save(); })),
            ControlRow("Cutting It Close", Switch(preferences.NotifyCuttingClose, value => { preferences = preferences with { NotifyCuttingClose = value }; Save(); })),
            ControlRow("Will Run Out", Switch(preferences.NotifyWillRunOut, value => { preferences = preferences with { NotifyWillRunOut = value }; Save(); })))));
        return Page("Notifications & Sync", body);
    }

    Control AdvancedPage()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        if (notice != null) body.Children.Add(Note(notice));
        body.Children.Add(Section("Privacy", CardSurface(ControlRow("Hide Usage Values", Switch(preferences.HideValues, value => { preferences = preferences with { HideValues = value }; Save(); Render(); })))));

        var levels = new[] { "Error", "Warning", "Info", "Debug" };
        var logLevel = Choice(levels, preferences.LogLevel);
        logLevel.MinWidth = 104;
        logLevel.SelectionChanged += (_, _) => { if (logLevel.SelectedIndex < 0) return; preferences = preferences with { LogLevel = logLevel.SelectedIndex }; DiagnosticLog.Level = preferences.LogLevel; Save(); };
        var copy = Action("Copy Log Path", () => { });
        copy.Click += async (_, _) => { try { if (Clipboard != null) await Clipboard.SetTextAsync(DiagnosticLog.Path); } catch (Exception) { notice = "Couldn't copy the log path to the clipboard."; Render(); } };
        var reveal = Action("Show Log Folder", () => { });
        reveal.Click += async (_, _) => { try { System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(DiagnosticLog.Path)!); await Launcher.LaunchUriAsync(new Uri(System.IO.Path.GetDirectoryName(DiagnosticLog.Path)!)); } catch (Exception) { notice = "The log folder could not be opened."; Render(); } };
        var advanced = new StretchStack { Spacing = 0 };
        advanced.Children.Add(ControlRow("Log Level", logLevel));
        foreach (var action in new[] { copy, reveal })
        {
            advanced.Children.Add(Hairline());
            action.HorizontalAlignment = HorizontalAlignment.Stretch;
            action.HorizontalContentAlignment = HorizontalAlignment.Left;
            action.Margin = new Thickness(8, 4);
            advanced.Children.Add(action);
        }
        advanced.Children.Add(Hairline());
        var reset = Action("Reset All Settings…", () => Confirm("Reset All Settings?", "Restore preferences to their defaults? Saved credentials and usage history are kept.", () =>
        {
            if (!Program.Fixture)
            {
                try { DesktopStartup.SetEnabled(false); }
                catch (Exception) { notice = "Startup settings could not be saved. Check system permissions."; Render(); return; }
            }
            preferences = new() { RemovedAccounts = preferences.RemovedAccounts };
            ApplyShortcut();
            DiagnosticLog.Level = preferences.LogLevel;
            Save();
            L.Use(preferences.Language);
            ApplyAppearance();
            timer.Interval = TimeSpan.FromMinutes(preferences.RefreshMinutes);
            Render();
        }));
        reset.HorizontalAlignment = HorizontalAlignment.Stretch;
        reset.HorizontalContentAlignment = HorizontalAlignment.Left;
        reset.Margin = new Thickness(8, 4);
        advanced.Children.Add(reset);
        body.Children.Add(Section("Advanced", CardSurface(advanced)));
        return Page("Privacy & Advanced", body);
    }
}

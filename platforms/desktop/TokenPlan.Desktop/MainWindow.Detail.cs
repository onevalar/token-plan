using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    readonly HashSet<string> notesExpanded = new();
    readonly Dictionary<string, string> noteDrafts = new();
    string? detailProvider;
    string detailOrigin = "overview";
    bool detailSettings;
    void OpenDetail(string id)
    {
        if (page != "detail") detailOrigin = page; detailProvider = id; detailSettings = false;
        Navigate("detail");
    }
    Control DetailPage()
    {
        var id = detailProvider!;
        var body = Stack(20); body.Margin = new Thickness(32, 28); body.MaxWidth = 780;
        body.Children.Add(Action("Back", () => Navigate(detailOrigin)));
        var heading = new Grid { ColumnDefinitions = new ColumnDefinitions("Auto,*,Auto,Auto") };
        Add(heading, ProviderMark(id));
        var title = Text(ProviderName(id), 24); title.Margin = new Thickness(12, 0); Add(heading, title, 0, 1);
        var result = results.GetValueOrDefault(id);
        Add(heading, Text(L.T(result?.Snapshot != null && result.ErrorKey == null ? "Connected" : "Needs Attention"), 12, true), 0, 2);
        var refreshOne = Action("Refresh", () => _ = Refresh(id)); refreshOne.IsEnabled = refresh == null && preferences.IsEnabled(id); refreshOne.Margin = new Thickness(12, 0, 0, 0); Add(heading, refreshOne, 0, 3);
        body.Children.Add(heading);
        var tabs = new TabStrip { Name = "tokenplan-detail-tabs", ItemsSource = new[] { L.T("Usage"), L.T("Settings") }, SelectedIndex = detailSettings ? 1 : 0 };
        tabs.SelectionChanged += (_, _) => { detailSettings = tabs.SelectedIndex == 1; Render(); };
        body.Children.Add(tabs);
        if (!detailSettings)
        {
            body.Children.Add(Card(result ?? new(id, ProviderName(id), null, "No usage yet. Refresh after signing in."), detail: true));
            foreach (var account in additionalAccounts.GetValueOrDefault(id) ?? Array.Empty<ProviderResult>()) { body.Children.Add(Text(account.Name, 17)); body.Children.Add(Card(account, detail: true)); }
        }
        else
        {
            if (ProviderCatalog.Get(id).EnvironmentKey != null) body.Children.Add(CredentialEditor(id));
            body.Children.Add(MetricSettings(id, result?.Snapshot));
            var notes = new TextBox { Name = "tokenplan-note-" + id, PlaceholderText = L.T("Note (Optional)"), Text = noteDrafts.GetValueOrDefault(id) ?? preferences.ProviderNotes.GetValueOrDefault(id) ?? "", AcceptsReturn = true, MinHeight = 70, MaxLength = 2000 };
            notes.TextChanged += (_, _) => noteDrafts[id] = notes.Text ?? "";
            notes.TextChanged += (_, _) => { preferences = preferences with { ProviderNotes = new(preferences.ProviderNotes) { [id] = notes.Text ?? "" } }; Save(); };
            var noteSection = Stack(12);
            var noteHeader = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") }; Add(noteHeader, Text(L.T("Notes"), 16));
            var disclosure = Action("Notes", () => { if (!notesExpanded.Add(id)) notesExpanded.Remove(id); Render(); });
            disclosure.Name = "tokenplan-note-disclosure-" + id; disclosure.Content = notesExpanded.Contains(id) ? "⌃" : "⌄";
            Avalonia.Automation.AutomationProperties.SetName(disclosure, L.T("Notes")); Add(noteHeader, disclosure, 0, 1); noteSection.Children.Add(noteHeader);
            if (notesExpanded.Contains(id)) noteSection.Children.Add(notes);
            body.Children.Add(new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(16), Child = noteSection });
            body.Children.Add(Action("Restore Defaults…", () => Confirm("Restore Defaults?", "Restores this subscription's metric visibility, order and tray selection. Other subscriptions are unchanged.", () => { preferences = preferences.RestoreMetrics(id); Save(); Render(); })));
        }
        return new ScrollViewer { Content = body };
    }
}

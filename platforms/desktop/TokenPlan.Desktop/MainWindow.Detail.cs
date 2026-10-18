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
    string? detailAccount;
    string? detailProvider;
    void OpenAccountDetail(ProviderResult result) { OpenDetail(result.Id); detailAccount = result.AccountKey; Render(); }
    string detailOrigin = "overview";
    bool detailSettings;
    void OpenDetail(string id)
    {
        if (page != "detail") detailOrigin = page; detailProvider = id; detailAccount = null; detailSettings = false;
        Navigate("detail");
    }
    Control DetailPage()
    {
        var id = detailProvider!;
        var scope = detailAccount ?? id;
        var body = Stack(20); body.Margin = new Thickness(20, 16); body.MaxWidth = 780;
        body.Children.Add(Action("Back", () => Navigate(detailOrigin)));
        var heading = new Grid { ColumnDefinitions = new ColumnDefinitions("Auto,*,Auto") };
        Add(heading, ProviderMark(id));
        var title = Text(ProviderName(id), 24); title.Margin = new Thickness(12, 0); Add(heading, title, 0, 1);
        var result = detailAccount == null ? results.GetValueOrDefault(id) : additionalAccounts.GetValueOrDefault(id)?.FirstOrDefault(a => a.AccountKey == detailAccount);
        var refreshOne = Action("Refresh", () => _ = Refresh(id)); refreshOne.IsEnabled = refresh == null && preferences.IsEnabled(id); refreshOne.Margin = new Thickness(12, 0, 0, 0); Add(heading, refreshOne, 0, 2);
        body.Children.Add(heading);
        if (result?.AccountEmail != null) body.Children.Add(AccountIdentityRow(result));
        var tabs = new TabStrip { Name = "tokenplan-detail-tabs", ItemsSource = new[] { L.T("Usage"), L.T("Settings") }, SelectedIndex = detailSettings ? 1 : 0 };
        tabs.SelectionChanged += (_, _) => { detailSettings = tabs.SelectedIndex == 1; Render(); };
        body.Children.Add(tabs);
        if (!detailSettings)
        {
            body.Children.Add(Card(result ?? new(id, ProviderName(id), null, "No usage yet. Refresh after signing in."), detail: true));
            if (id == "opencode" && result?.Snapshot?.Windows.Any(w => w.Label is "Session" or "Weekly" or "Monthly" && preferences.Placement(scope, w.Label) != MetricPlacement.Hidden) == true)
                body.Children.Add(Text(L.T("These three readings share one allowance. More expensive models use it up faster. They are not each model's own remaining amount."), 12, true));
            if (result?.AccountKey != null) { if (result.AccountEmail == null) body.Children.Add(Text(result.Name, 14, true)); body.Children.Add(AccountHistory(result)); }
        }
        else
        {
            if (ProviderCatalog.Get(id).EnvironmentKey != null) body.Children.Add(CredentialEditor(id));
            body.Children.Add(MetricSettings(scope, result?.Snapshot));
            var notes = new TextBox { Name = "tokenplan-note-" + id, PlaceholderText = L.T("Note (Optional)"), Text = noteDrafts.GetValueOrDefault(scope) ?? preferences.ProviderNotes.GetValueOrDefault(scope) ?? "", AcceptsReturn = true, MinHeight = 70, MaxLength = 2000 };
            notes.TextChanged += (_, _) => noteDrafts[scope] = notes.Text ?? "";
            notes.TextChanged += (_, _) => { preferences = preferences with { ProviderNotes = new(preferences.ProviderNotes) { [scope] = notes.Text ?? "" } }; Save(); };
            var noteSection = Stack(12);
            var noteHeader = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") }; Add(noteHeader, Text(L.T("Notes"), 16));
            var disclosure = Action("Notes", () => { if (!notesExpanded.Add(id)) notesExpanded.Remove(id); Render(); });
            disclosure.Name = "tokenplan-note-disclosure-" + id; disclosure.Content = notesExpanded.Contains(id) ? "⌃" : "⌄";
            Avalonia.Automation.AutomationProperties.SetName(disclosure, L.T("Notes")); Add(noteHeader, disclosure, 0, 1); noteSection.Children.Add(noteHeader);
            if (notesExpanded.Contains(id)) noteSection.Children.Add(notes);
            body.Children.Add(new Border { Background = Surface, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(16), Child = noteSection });
            body.Children.Add(Action("Restore Defaults…", () => Confirm("Restore Defaults?", "Restores this subscription's metric visibility, order and tray selection. Other subscriptions are unchanged.", () => { preferences = preferences.RestoreMetrics(scope); Save(); Render(); })));
            if (result != null && Preferences.AccountRemovalKey(result) != null && !preferences.IsAccountRemoved(result))
            {
                var remove = Action("Remove Account…", () => Confirm("Remove Account?",
                    "Remove this account from TokenPlan and stop adding it automatically. Your CLI login and saved usage history will not be deleted.", () => {
                        preferences = preferences.RemoveAccount(result); Save(); Navigate("providers");
                    }, "Remove Account"));
                remove.Name = "tokenplan-remove-account";
                body.Children.Add(remove);
            }
        }
        return new ScrollViewer { Content = body };
    }
}

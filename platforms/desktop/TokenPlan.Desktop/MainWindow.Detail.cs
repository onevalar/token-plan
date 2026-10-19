using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

/// <summary>
/// A subscription's details: the service identity and Refresh on every tab, a capsule Usage/Settings
/// switcher, and grouped cards underneath — the same anatomy as the macOS detail page.
/// </summary>
public sealed partial class MainWindow
{
    readonly HashSet<string> notesExpanded = new();
    readonly Dictionary<string, string> noteDrafts = new();
    string? detailAccount;
    string? detailProvider;
    string detailOrigin = "overview";
    bool detailSettings;

    void OpenAccountDetail(ProviderResult result) { OpenDetail(result.Id); detailAccount = result.AccountKey; Render(); }

    void OpenDetail(string id)
    {
        if (page != "detail") detailOrigin = page;
        detailProvider = id;
        detailAccount = null;
        detailSettings = false;
        Navigate("detail");
    }

    Control DetailPage()
    {
        var id = detailProvider!;
        var scope = detailAccount ?? id;
        var result = detailAccount == null ? results.GetValueOrDefault(id) : additionalAccounts.GetValueOrDefault(id)?.FirstOrDefault(a => a.AccountKey == detailAccount);
        var title = detailAccount != null ? result?.Name ?? ProviderName(id) : ProviderName(id);

        var body = new StretchStack { Spacing = D.SectionSpacing };
        body.Children.Add(DetailHeading(id, result));

        var tabs = new TabStrip { Name = "tokenplan-detail-tabs", ItemsSource = new[] { L.T("Usage"), L.T("Settings") }, SelectedIndex = detailSettings ? 1 : 0 };
        tabs.SelectionChanged += (_, _) => { if (tabs.SelectedIndex < 0) return; detailSettings = tabs.SelectedIndex == 1; Render(); };
        body.Children.Add(Segments(tabs));

        if (!detailSettings) body.Children.Add(UsageSection(id, result));
        else body.Children.Add(SettingsSection(id, scope, result));
        return Page(title, body);
    }

    Control DetailHeading(string id, ProviderResult? result)
    {
        var row = new Grid { ColumnDefinitions = new("Auto,*,Auto") };
        var mark = new Border { Width = 22, Height = 22, Child = ProviderMark(id), VerticalAlignment = VerticalAlignment.Center };
        Add(row, mark);
        var identity = new StackPanel { Spacing = 1, Margin = new Thickness(8, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
        if (result?.AccountEmail is { Length: > 0 }) identity.Children.Add(AccountIdentityRow(result));
        else identity.Children.Add(Label(result?.Name ?? ProviderName(id), D.HeaderSize, weight: Avalonia.Media.FontWeight.SemiBold));
        if (result?.Snapshot?.Plan is { Length: > 0 } plan && result.AccountEmail == null) identity.Children.Add(Label(plan, D.PlanSize, T.Secondary));
        Add(row, identity, 0, 1);
        var refreshOne = Pill("Refresh", null, () => _ = Refresh(id));
        refreshOne.IsEnabled = refresh == null && preferences.IsEnabled(id);
        Add(row, refreshOne, 0, 2);
        return row;
    }

    Control UsageSection(string id, ProviderResult? result)
    {
        var stack = new StretchStack { Spacing = 12 };
        stack.Children.Add(Card(result ?? new(id, ProviderName(id), null, "No usage yet. Refresh after signing in."), detail: true));
        if (id == "opencode" && result?.Snapshot?.Windows.Any(w => w.Label is "Session" or "Weekly" or "Monthly" && preferences.Placement(detailAccount ?? id, w.Label) != MetricPlacement.Hidden) == true)
            stack.Children.Add(new Border { Padding = new Thickness(8, 0), Child = Label(L.T("These three readings share one allowance. More expensive models use it up faster. They are not each model's own remaining amount."), D.CaptionSize, T.Secondary) });
        if (result?.AccountKey != null)
        {
            if (result.AccountEmail == null) stack.Children.Add(Label(result.Name, D.SupportingSize, T.Secondary));
            stack.Children.Add(AccountHistory(result));
        }
        return stack;
    }

    Control SettingsSection(string id, string scope, ProviderResult? result)
    {
        var stack = new StretchStack { Spacing = D.SectionSpacing };
        if (ProviderCatalog.Get(id).EnvironmentKey != null) stack.Children.Add(Section("API Key", CardSurface(CredentialEditor(id))));
        stack.Children.Add(Section("Display Content", CardSurface(MetricSettings(scope, result?.Snapshot))));

        var notes = Field(new TextBox
        {
            Name = "tokenplan-note-" + id,
            PlaceholderText = L.T("Note (Optional)"),
            Text = noteDrafts.GetValueOrDefault(scope) ?? preferences.ProviderNotes.GetValueOrDefault(scope) ?? "",
            AcceptsReturn = true,
            MinHeight = 70,
            MaxLength = 2000
        });
        notes.TextChanged += (_, _) => noteDrafts[scope] = notes.Text ?? "";
        notes.TextChanged += (_, _) => { preferences = preferences with { ProviderNotes = new(preferences.ProviderNotes) { [scope] = notes.Text ?? "" } }; Save(); };
        var noteSection = new StretchStack { Spacing = 0 };
        var noteHeader = new Grid { ColumnDefinitions = new("*,Auto") };
        Add(noteHeader, ControlRowLabel("Notes"));
        var disclosure = Chevron(L.T("Notes"), () => { if (!notesExpanded.Add(id)) notesExpanded.Remove(id); Render(); });
        disclosure.Content = notesExpanded.Contains(id) ? "⌃" : "⌄";
        disclosure.Name = "tokenplan-note-disclosure-" + id;
        disclosure.Margin = new Thickness(0, 0, 6, 0);
        Add(noteHeader, disclosure, 0, 1);
        noteSection.Children.Add(noteHeader);
        if (notesExpanded.Contains(id)) noteSection.Children.Add(new Border { Padding = new Thickness(12, 0, 12, 10), Child = notes });
        stack.Children.Add(CardSurface(noteSection));

        var actions = new StretchStack { Spacing = 8 };
        var restore = PlainAction("Restore Defaults…", () => Confirm("Restore Defaults?", "Restores this subscription's metric visibility, order and tray selection. Other subscriptions are unchanged.", () => { preferences = preferences.RestoreMetrics(scope); Save(); Render(); }));
        actions.Children.Add(restore);
        if (result != null && Preferences.AccountRemovalKey(result) != null && !preferences.IsAccountRemoved(result))
        {
            var remove = PlainAction("Remove Account…", () => Confirm("Remove Account?",
                "Remove this account from TokenPlan and stop adding it automatically. Your CLI login and saved usage history will not be deleted.", () => {
                    preferences = preferences.RemoveAccount(result); Save(); Navigate("providers");
                }, "Remove Account"));
            remove.Name = "tokenplan-remove-account";
            actions.Children.Add(remove);
        }
        stack.Children.Add(actions);
        return stack;
    }

    /// <summary>A plain text action, as macOS uses for restore/reset rows.</summary>
    Button PlainAction(string label, Action action)
    {
        var button = new Button
        {
            Content = L.T(label),
            Background = Avalonia.Media.Brushes.Transparent,
            BorderThickness = default,
            Foreground = T.Secondary,
            FontSize = D.RowLabelSize,
            Padding = new Thickness(10, 6),
            HorizontalAlignment = HorizontalAlignment.Left,
            CornerRadius = new CornerRadius(6)
        };
        button.Click += (_, _) => action();
        return button;
    }

    TextBlock ControlRowLabel(string text)
    {
        var label = Label(L.T(text), D.RowLabelSize);
        label.Margin = new Thickness(12, 10, 12, 8);
        return label;
    }
}

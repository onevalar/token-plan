using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Layout;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    string MetricValue(UsageWindow metric) => preferences.HideValues ? "•••" : metric.Amount != null ? metric.FormattedAmount : (preferences.ShowRemaining ? metric.RemainingPercent : metric.UsedPercent).ToString("0.#") + "% " + L.T(preferences.ShowRemaining ? "Remaining" : "Used");

    readonly Dictionary<string, string> credentialDrafts = new();

    /// <summary>The API-key card: current state, a key field, Save/Remove and a link to the key page.</summary>
    Control CredentialEditor(string id)
    {
        var box = new StackPanel { Spacing = 8, Margin = new Thickness(12, 10, 12, 10) };
        if (!Program.Fixture)
        {
            try
            {
                if (providers.Keys.Load(id) != null) box.Children.Add(Label(L.T("API Key Configured"), D.SupportingSize, T.Secondary));
            }
            catch (Exception e) when (e is System.IO.IOException or System.IO.InvalidDataException or UnauthorizedAccessException or System.Text.Json.JsonException or System.Security.Cryptography.CryptographicException)
            {
                box.Children.Add(Label(L.T("The saved API key could not be read. Enter it again."), D.SupportingSize, T.Warning));
            }
        }
        var field = Field(new TextBox { Name = "tokenplan-api-key-" + id, Text = credentialDrafts.GetValueOrDefault(id), PasswordChar = '●', PlaceholderText = L.T("API Key"), IsEnabled = !Program.Fixture });
        AutomationProperties.SetName(field, ProviderName(id) + " " + L.T("API Key"));
        field.TextChanged += (_, _) => credentialDrafts[id] = field.Text ?? "";
        box.Children.Add(field);
        var feedback = Label("", D.CaptionSize, T.Secondary);
        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 6 };
        var save = Action("Save", () =>
        {
            try { providers.Keys.Save(id, field.Text ?? ""); field.Text = ""; feedback.Text = L.T("Saved"); results.Remove(id); _ = Refresh(id); }
            catch (Exception e) when (e is System.IO.IOException or UnauthorizedAccessException or System.IO.InvalidDataException or System.Security.Cryptography.CryptographicException)
            { feedback.Text = L.T("The API key could not be saved. Check the key and local folder permissions."); DiagnosticLog.Write(id, "API key save failed."); }
        });
        var remove = Action("Remove", () =>
        {
            try { providers.Keys.Delete(id); field.Text = ""; results.Remove(id); _ = Refresh(id); }
            catch (Exception e) when (e is System.IO.IOException or UnauthorizedAccessException)
            { feedback.Text = L.T("The API key could not be removed. Check local folder permissions."); DiagnosticLog.Write(id, "API key removal failed."); }
        });
        save.IsEnabled = remove.IsEnabled = !Program.Fixture && refresh == null;
        actions.Children.Add(save);
        actions.Children.Add(remove);
        if (ProviderCatalog.Get(id).KeysURL is { } keysURL)
        {
            var getKey = Action("Get API Key", () => { });
            getKey.Click += async (_, _) => { try { await Launcher.LaunchUriAsync(new Uri(keysURL)); } catch (Exception) { notice = "The browser could not be opened."; Render(); } };
            actions.Children.Add(getKey);
        }
        box.Children.Add(actions);
        box.Children.Add(feedback);
        return box;
    }
}

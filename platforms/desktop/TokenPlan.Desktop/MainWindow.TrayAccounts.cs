using TokenPlan.Core;
namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    // One source for settings and tray order: provider order, then its individual accounts.
    IEnumerable<ProviderResult> TrayAccountEntries() => preferences.OrderedProviders.Where(preferences.IsEnabled)
        .SelectMany(id => new[] { results.GetValueOrDefault(id) ?? new ProviderResult(id, ProviderName(id), null, null) }
            .Concat(additionalAccounts.GetValueOrDefault(id) ?? []));

    static string TrayAccountLabel(ProviderResult account) => account.AccountEmail is { Length: > 0 } email
        ? ProviderName(account.Id) + "-" + email : account.Name;

    bool TrayAccountSelected(ProviderResult account) => preferences.TrayServices.GetValueOrDefault(account.Id, true)
        && preferences.TrayAccounts.GetValueOrDefault(account.SettingsKey, true);

    void SetTrayAccountSelected(ProviderResult account, bool selected)
    {
        var choices = new Dictionary<string, bool>(preferences.TrayAccounts);
        var services = new Dictionary<string, bool>(preferences.TrayServices);
        if (!services.GetValueOrDefault(account.Id, true))
        {
            foreach (var sibling in TrayAccountEntries().Where(a => a.Id == account.Id)) choices[sibling.SettingsKey] = false;
            services[account.Id] = true;
        }
        choices[account.SettingsKey] = selected;
        preferences = preferences with { TrayAccounts = choices, TrayServices = services };
        Save(); Render();
    }
}

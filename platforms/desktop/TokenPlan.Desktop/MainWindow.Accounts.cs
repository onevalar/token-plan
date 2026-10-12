using Avalonia.Controls;
using TokenPlan.Core;
namespace TokenPlan.Desktop;
public sealed partial class MainWindow
{
    Control AccountIdentityRow(ProviderResult account)
    {
        var row = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto"), HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Left, MaxWidth = 500 };
        var email = Text(account.AccountEmail ?? account.Name, 13);
        email.TextWrapping = Avalonia.Media.TextWrapping.NoWrap;
        email.TextTrimming = Avalonia.Media.TextTrimming.CharacterEllipsis;
        email.Name = "account-email-" + account.SettingsKey;
        Add(row, email);
        if (account.Snapshot?.Plan is { Length: > 0 } plan)
        {
            var label = Text(plan, 13, true); label.Margin = new Avalonia.Thickness(6, 0, 0, 0);
            label.TextWrapping = Avalonia.Media.TextWrapping.NoWrap;
            Add(row, label, 0, 1);
        }
        return row;
    }

    readonly Dictionary<string, UsageHistory> accountHistories = new();
    string AccountHistoryFile(string key) => Path.Combine(Path.GetDirectoryName(historyFile)!, "accounts", key.Replace(':', '-') + ".json");
    void ObserveAccount(ProviderResult account)
    {
        if (account.AccountKey == null) return;
        var key = account.AccountKey;
        try
        {
            if (!accountHistories.TryGetValue(key, out var data)) accountHistories[key] = data = UsageHistory.Load(AccountHistoryFile(key), DateTimeOffset.UtcNow);
            data.Observe(account, DateTimeOffset.UtcNow); data.Save(AccountHistoryFile(key));
        }
        catch (Exception e) when (e is IOException or InvalidDataException or System.Text.Json.JsonException or UnauthorizedAccessException)
        { notice = "Usage history could not be saved. Check the app data folder permissions."; DiagnosticLog.Write(account.Id, notice); }
    }
    Control AccountHistory(ProviderResult account)
    {
        var body = Stack(8);
        if (accountHistories.TryGetValue(account.SettingsKey, out var data))
            foreach (var reading in data.Read(new Dictionary<string, ProviderResult> { [account.Id] = account }, preferences, DateTimeOffset.UtcNow.AddDays(-7), DateTimeOffset.UtcNow).Take(168)) body.Children.Add(HistoryRow(reading));
        if (body.Children.Count == 0) body.Children.Add(Text(L.T("No readings in this range. Successful refreshes will appear here."), 12, true));
        body.Children.Add(Action("Clear Account History", () => Confirm("Clear Account History", "Clear this account's local quota history?", () => {
            try { File.Delete(AccountHistoryFile(account.SettingsKey)); accountHistories.Remove(account.SettingsKey); Render(); }
            catch (IOException) { notice = "Usage history could not be saved. Check the app data folder permissions."; Render(); }
        })));
        return Section("Usage History", body);
    }
    async Task RefreshPricedTokens(string? only, CancellationToken cancellation)
    {
        try
        {
            if (!Program.Fixture) await ModelPricing.Refresh(Path.Combine(Path.GetDirectoryName(preferencesFile)!, "pricing"), cancellation);
            await RefreshTokens(only, cancellation);
        }
        catch (OperationCanceledException) { }
    }
}

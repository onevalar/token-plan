using Avalonia.Controls;
using TokenPlan.Core;
namespace TokenPlan.Desktop;
public sealed partial class MainWindow
{
    Control CodexPricingSettings()
    {
        var models = new[] { "" }.Concat(ModelPricing.FallbackModels).ToArray();
        var picker = new ComboBox { ItemsSource = models.Select(m => m == "" ? L.T("None") : m).ToArray(), SelectedIndex = Math.Max(0, Array.IndexOf(models, preferences.CodexFallbackModel ?? "")), IsEnabled = refresh == null, MaxWidth = 260 };
        picker.SelectionChanged += (_, _) => {
            if (picker.SelectedIndex < 0) return;
            var model = models[picker.SelectedIndex];
            preferences = preferences with { CodexFallbackModel = model.Length == 0 ? null : model }; Save();
            ModelPricing.SetCodexFallback(preferences.CodexFallbackModel);
            tokenTrends.Remove("codex"); _ = Refresh("codex");
        };
        return Section("Pricing", SettingRow("Fallback Model", picker), Text(L.T("Estimate costs for models that don't have known pricing."), 12, true));
    }
}

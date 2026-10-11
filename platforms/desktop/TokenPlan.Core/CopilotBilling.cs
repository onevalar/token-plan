using System.Text.Json;
namespace TokenPlan.Core;
public static class CopilotBilling
{
    public static bool IsManaged(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return KeyUsageParser.Field(doc.RootElement, "token_based_billing").ValueKind == JsonValueKind.True;
    }
    public static IReadOnlyList<UsageWindow> Parse(string json)
    {
        using var doc = JsonDocument.Parse(json); var items = KeyUsageParser.Field(doc.RootElement, "usageItems");
        if (items.ValueKind != JsonValueKind.Array) return Array.Empty<UsageWindow>();
        double credits = 0, dollars = 0; var found = false;
        foreach (var item in items.EnumerateArray())
        {
            if (UsageParser.String(item, "product")?.Trim().ToLowerInvariant() != "copilot" || UsageParser.String(item, "unitType")?.Trim().ToLowerInvariant() is not ("ai-units" or "ai-credits")) continue;
            credits += Math.Max(0, KeyUsageParser.Number(item, "grossQuantity") ?? 0); dollars += Math.Max(0, KeyUsageParser.Number(item, "netAmount") ?? 0); found = true;
        }
        return found ? new[] { new UsageWindow("Org Credits", 0, null, credits, "COUNT"), new UsageWindow("Org Spend", 0, null, dollars, "USD") } : Array.Empty<UsageWindow>();
    }
}

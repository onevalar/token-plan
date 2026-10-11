using System.Globalization;
using System.Text.RegularExpressions;

namespace TokenPlan.Core;

// Same two CLI formats as the native Mac mapper. Never infer a monthly renewal date.
public static class AmpUsage
{
    public static UsageSnapshot Parse(string output, DateTimeOffset now)
    {
        var plain = Regex.Replace(output, @"\x1B\[[0-?]*[ -/]*[@-~]", "").Replace("**", "");
        var subscription = plain.Split('\n').FirstOrDefault(line => Regex.IsMatch(line.Trim(), @"^(?:Subscription\s+[^:]+|Amp\s+[^:]+\s+(?:Subscription|Tier)):", RegexOptions.IgnoreCase));
        var rows = new List<UsageWindow>(); string? plan = null;
        if (subscription != null)
        {
            var patterns = new[] { @":\s*([\d.]+)%\s+(?:other|agent)\s+usage\s+and\s+([\d.]+)%\s+orb\s+usage\s+remaining\b", @":\s*agent\s+usage\s+[^\r\n]*?remaining\s*\(([\d.]+)%\),\s*orb\s+usage\s+[^\r\n]*?remaining\s*\(([\d.]+)%\)" };
            var match = patterns.Select(p => Regex.Match(subscription, p, RegexOptions.IgnoreCase)).FirstOrDefault(m => m.Success);
            if (match == null) throw new InvalidDataException();
            var agent = Number(match.Groups[1].Value); var orb = Number(match.Groups[2].Value);
            if (agent is < 0 or > 100 || orb is < 0 or > 100) throw new InvalidDataException();
            var resetText = Regex.Match(subscription, @"resets\s+at\s+(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))", RegexOptions.IgnoreCase);
            DateTimeOffset? reset = DateTimeOffset.TryParse(resetText.Groups[1].Value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;
            rows.Add(new("Agent Usage", 100 - agent, reset)); rows.Add(new("Orb Usage", 100 - orb, reset));
            plan = Regex.Replace(subscription.Split(':')[0].Trim(), @"^(?:Subscription\s+|Amp\s+)|\s+(?:Subscription|Tier)$", "", RegexOptions.IgnoreCase);
        }
        var balanceLine = plain.Split('\n').FirstOrDefault(line => line.Trim().StartsWith("Individual credits:", StringComparison.OrdinalIgnoreCase));
        if (balanceLine != null)
        {
            var balance = Regex.Match(balanceLine, @"Individual\s+credits:\s*\$([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s+USD)?\s+remaining\b", RegexOptions.IgnoreCase);
            if (!balance.Success) throw new InvalidDataException();
            rows.Add(new("Balance", 0, null, Number(balance.Groups[1].Value.Replace(",", "")), "USD"));
        }
        if (rows.Count == 0) throw new InvalidDataException();
        return new("amp", "Amp", plan, rows, now);
    }
    static double Number(string value) => double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var n) && double.IsFinite(n) ? n : throw new InvalidDataException();
}

using System.Globalization;
using System.Reflection;
using System.Text.RegularExpressions;

namespace TokenPlan.Desktop;

public static partial class L
{
    static Dictionary<string, string> table = new();
    public static string Language { get; private set; } = "en";
    public static void Use(string language)
    {
        var culture = CultureInfo.CurrentUICulture.Name;
        Language = language != "system" ? language : culture.StartsWith("zh", StringComparison.OrdinalIgnoreCase) ? (culture.Contains("TW") || culture.Contains("HK") || culture.Contains("Hant") ? "zh-Hant" : "zh-Hans") : culture.Split('-')[0];
        var assembly = Assembly.GetExecutingAssembly();
        var resource = assembly.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith(Language + ".lproj.Localizable.strings", StringComparison.Ordinal));
        table = new();
        if (resource == null) return;
        using var reader = new StreamReader(assembly.GetManifestResourceStream(resource)!);
        foreach (Match match in Entry().Matches(reader.ReadToEnd())) table[Unescape(match.Groups[1].Value)] = Unescape(match.Groups[2].Value);
    }
    static string Unescape(string value) => Regex.Unescape(value);
    public static string T(string key) => table.GetValueOrDefault(key, key);
    [GeneratedRegex("\"((?:[^\"\\\\]|\\\\.)*)\"\\s*=\\s*\"((?:[^\"\\\\]|\\\\.)*)\";")]
    private static partial Regex Entry();
}

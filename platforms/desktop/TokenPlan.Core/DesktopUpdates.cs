using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
namespace TokenPlan.Core;

public record DesktopUpdate(string Version, string Url, string Sha256, long Size);
public static class DesktopUpdates
{
    public const string Feed = "https://onevalar.github.io/apps/tokenplan/latest.json";
    public static DesktopUpdate? Parse(string json, string installed, string platform)
    {
        if (platform is not ("windows-x64" or "linux-x64")) return null;
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var version = root.GetProperty("version").GetString() ?? throw new InvalidDataException();
        if (!Regex.IsMatch(version, @"^\d+\.\d+\.\d+$") || !System.Version.TryParse(version, out var next)) throw new InvalidDataException();
        if (!System.Version.TryParse(installed.Split('+')[0].Split('-')[0], out var current)) throw new InvalidDataException();
        if (next <= current || !root.GetProperty("platforms").TryGetProperty(platform, out var asset)) return null;
        var url = asset.GetProperty("url").GetString()!;
        var hash = asset.GetProperty("sha256").GetString() ?? throw new InvalidDataException();
        var size = asset.GetProperty("size").GetInt64();
        var filename = platform == "windows-x64" ? $"TokenPlan-Setup-{version}.exe" : $"tokenplan_{version}_amd64.deb";
        if (url != $"https://github.com/onevalar/apps/releases/download/tokenplan-v{version}/{filename}"
            || !Regex.IsMatch(hash, "^[a-fA-F0-9]{64}$") || size <= 0 || size > 2147483648L) throw new InvalidDataException();
        return new(version, url, hash, size);
    }
    public static async Task<string> Download(DesktopUpdate update, string directory, CancellationToken cancellation)
    {
        Directory.CreateDirectory(directory);
        var target = Path.Combine(directory, Path.GetFileName(new Uri(update.Url).AbsolutePath));
        var partial = target + "." + Guid.NewGuid().ToString("N") + ".partial";
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromMinutes(15) };
            using var response = await client.GetAsync(update.Url, HttpCompletionOption.ResponseHeadersRead, cancellation);
            response.EnsureSuccessStatusCode();
            await using var input = await response.Content.ReadAsStreamAsync(cancellation);
            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            await using (var output = new FileStream(partial, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                byte[] buffer = new byte[81920]; long size = 0; int count;
                while ((count = await input.ReadAsync(buffer, cancellation)) > 0)
                {
                    size += count; if (size > update.Size) throw new InvalidDataException();
                    hash.AppendData(buffer, 0, count); await output.WriteAsync(buffer.AsMemory(0, count), cancellation);
                }
                if (size != update.Size || !Convert.ToHexString(hash.GetHashAndReset()).Equals(update.Sha256, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException();
            }
            File.Move(partial, target, true); return target;
        }
        finally { if (File.Exists(partial)) File.Delete(partial); }
    }
}

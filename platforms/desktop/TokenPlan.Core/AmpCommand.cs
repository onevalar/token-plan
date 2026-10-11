using System.Diagnostics;
using System.Text.Json;
namespace TokenPlan.Core;

public static class AmpCommand
{
    public static ProcessStartInfo? Find(IEnumerable<string> folders, bool windows)
    {
        var paths = folders.Where(Path.IsPathFullyQualified).Distinct().ToArray();
        var executable = paths.Select(p => Path.Combine(p, windows ? "amp.exe" : "amp")).FirstOrDefault(File.Exists);
        if (executable != null) { var native = new ProcessStartInfo(executable); native.ArgumentList.Add("usage"); return native; }
        if (!windows) return null;
        // Invoke npm's declared JS entry through node.exe; never execute a .cmd through a shell.
        var node = paths.Select(p => Path.Combine(p, "node.exe")).FirstOrDefault(File.Exists);
        if (node == null) return null;
        foreach (var folder in paths)
        {
            var packageRoot = Path.Combine(folder, "node_modules", "@sourcegraph", "amp");
            var manifest = Path.Combine(packageRoot, "package.json");
            if (!File.Exists(manifest)) continue;
            if (new FileInfo(manifest).Length > 65536) throw new InvalidDataException();
            using var json = JsonDocument.Parse(File.ReadAllText(manifest));
            var bin = KeyUsageParser.Field(json.RootElement, "bin");
            var entry = bin.ValueKind == JsonValueKind.String ? bin.GetString() : UsageParser.String(bin, "amp");
            if (entry == null) continue;
            var path = Path.GetFullPath(Path.Combine(packageRoot, entry));
            if (!path.StartsWith(Path.GetFullPath(packageRoot) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || !File.Exists(path)) throw new InvalidDataException();
            var start = new ProcessStartInfo(node); start.ArgumentList.Add(path); start.ArgumentList.Add("usage"); return start;
        }
        return null;
    }
}

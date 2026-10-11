using System.Text.Json;

namespace TokenPlan.Core;

/// Keys stay in the current user's local configuration; they never enter preferences or history.
public sealed class APIKeyStore
{
    readonly string directory;
    readonly Func<string, string?> environment;
    public APIKeyStore(string? directory = null, Func<string, string?>? environment = null)
    {
        this.directory = directory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TokenPlan", "credentials");
        this.environment = environment ?? Environment.GetEnvironmentVariable;
    }
    string FileFor(string id)
    {
        if (ProviderCatalog.Get(id).EnvironmentKey == null) throw new ArgumentException("Provider does not use an API key");
        return Path.Combine(directory, id + ".json");
    }
    public string? Load(string id)
    {
        var file = FileFor(id);
        if (File.Exists(file))
        {
            if (new FileInfo(file).Length > 16384) throw new InvalidDataException();
            var bytes = File.ReadAllBytes(file);
            if (bytes.AsSpan().StartsWith("TPK1"u8)) bytes = WindowsCredentialProtection.Transform(bytes[4..], protect: false);
            using var document = JsonDocument.Parse(bytes);
            if (UsageParser.String(document.RootElement, "apiKey") is not { } key) throw new InvalidDataException();
            return Validate(key);
        }
        var value = environment(ProviderCatalog.Get(id).EnvironmentKey!);
        return string.IsNullOrWhiteSpace(value) ? null : Validate(value);
    }
    public void Save(string id, string key)
    {
        var file = FileFor(id); key = Validate(key);
        Directory.CreateDirectory(directory);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(directory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var temporary = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
            if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            using (var stream = new FileStream(temporary, options))
            {
                var bytes = JsonSerializer.SerializeToUtf8Bytes(new { apiKey = key });
                try
                {
                    if (OperatingSystem.IsWindows()) { stream.Write("TPK1"u8); stream.Write(WindowsCredentialProtection.Transform(bytes, protect: true)); }
                    else stream.Write(bytes);
                }
                finally { System.Security.Cryptography.CryptographicOperations.ZeroMemory(bytes); }
            }
            File.Move(temporary, file, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
    public void Delete(string id) => File.Delete(FileFor(id));
    static string Validate(string key)
    {
        key = key.Trim();
        if (key.Length == 0 || key.Length > 8192 || key.Any(char.IsControl)) throw new InvalidDataException("Invalid API key");
        return key;
    }
}

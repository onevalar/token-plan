using System.Buffers.Binary;
using System.Text;
using System.Text.Json;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;
namespace TokenPlan.Core;

public sealed class OllamaSigningKey : IDisposable
{
    readonly byte[] seed;
    public string PublicKey { get; }
    OllamaSigningKey(byte[] seed, byte[] publicKey) { this.seed = seed; PublicKey = Convert.ToBase64String(publicKey); }
    public static OllamaSigningKey Parse(string pem)
    {
        var bytes = Convert.FromBase64String(string.Concat(pem.Split('\n').Select(s => s.Trim()).Where(s => !s.StartsWith("-----"))));
        byte[]? privateSection = null;
        try
        {
            var magic = "openssh-key-v1\0"u8;
            if (!bytes.AsSpan().StartsWith(magic)) throw new InvalidDataException();
            var reader = new Reader(bytes, magic.Length);
            if (Encoding.ASCII.GetString(reader.Block()) != "none" || Encoding.ASCII.GetString(reader.Block()) != "none" || reader.Block().Length != 0 || reader.Integer() != 1) throw new InvalidDataException();
            var publicBlob = reader.Block(); privateSection = reader.Block();
            var inner = new Reader(privateSection);
            if (inner.Integer() != inner.Integer() || Encoding.ASCII.GetString(inner.Block()) != "ssh-ed25519") throw new InvalidDataException();
            var publicKey = inner.Block(); var secret = inner.Block();
            try
            {
                if (secret.Length != 64 || publicKey.Length != 32 || !secret.AsSpan(32).SequenceEqual(publicKey)) throw new InvalidDataException();
                var key = new Ed25519PrivateKeyParameters(secret, 0);
                if (!key.GeneratePublicKey().GetEncoded().AsSpan().SequenceEqual(publicKey)) throw new InvalidDataException();
                var outer = new Reader(publicBlob);
                if (Encoding.ASCII.GetString(outer.Block()) != "ssh-ed25519" || !outer.Block().AsSpan().SequenceEqual(publicKey)) throw new InvalidDataException();
                return new(secret[..32], publicBlob);
            }
            finally { System.Security.Cryptography.CryptographicOperations.ZeroMemory(secret); }
        }
        finally { System.Security.Cryptography.CryptographicOperations.ZeroMemory(bytes); if (privateSection != null) System.Security.Cryptography.CryptographicOperations.ZeroMemory(privateSection); }
    }
    public string Authorization(string method, string uri)
    {
        var signer = new Ed25519Signer(); signer.Init(true, new Ed25519PrivateKeyParameters(seed, 0));
        var message = Encoding.UTF8.GetBytes(method + "," + uri); signer.BlockUpdate(message, 0, message.Length);
        return PublicKey + ":" + Convert.ToBase64String(signer.GenerateSignature());
    }
    public void Dispose() => System.Security.Cryptography.CryptographicOperations.ZeroMemory(seed);
    sealed class Reader(byte[] bytes, int offset = 0)
    {
        int position = offset;
        public uint Integer() { if (position > bytes.Length - 4) throw new InvalidDataException(); var value = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(position, 4)); position += 4; return value; }
        public byte[] Block() { var length = Integer(); if (length > bytes.Length - position) throw new InvalidDataException(); var value = bytes.AsSpan(position, (int)length).ToArray(); position += (int)length; return value; }
    }
}
public static class OllamaUsage
{
    public static UsageSnapshot Parse(string json, DateTimeOffset now)
    {
        using var doc = JsonDocument.Parse(json); var root = doc.RootElement;
        if (!root.TryGetProperty("limits", out var limits) || limits.ValueKind != JsonValueKind.Object) throw new InvalidDataException();
        var windows = new List<UsageWindow>();
        foreach (var (field, label) in new[] { ("session", "Session"), ("weekly", "Weekly"), ("monthly", "Monthly") })
            if (limits.TryGetProperty(field, out var entry) && entry.TryGetProperty("usage", out var value) && value.TryGetDouble(out var number) && double.IsFinite(number) && number >= 0) windows.Add(new(label, Math.Clamp(number * 100, 0, 100), null));
        if (root.TryGetProperty("activity", out var activity) && activity.TryGetProperty("cost", out var cost) && double.TryParse(cost.ToString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var amount) && double.IsFinite(amount) && amount >= 0) windows.Add(new("Last 4 Weeks", 0, null, amount, "USD"));
        if (windows.Count == 0) throw new InvalidDataException();
        return new("ollama", "Ollama", null, windows, now);
    }
}

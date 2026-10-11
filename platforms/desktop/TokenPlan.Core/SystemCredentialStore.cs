using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
namespace TokenPlan.Core;

/// Read only the named application's credential. Never enumerate or modify other entries.
public static class SystemCredentialStore
{
    public static async Task<string?> Read(string service, string account, CancellationToken cancellation)
    {
        if (OperatingSystem.IsWindows()) return ReadWindows(service + ":" + account);
        if (!OperatingSystem.IsLinux()) return null;
        if (!File.Exists("/usr/bin/secret-tool")) throw new IOException("System credential reader unavailable");
        var start = new ProcessStartInfo("/usr/bin/secret-tool") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var arg in new[] { "lookup", "service", service, "username", account }) start.ArgumentList.Add(arg);
        using var process = Process.Start(start) ?? throw new IOException();
        try
        {
            var output = ReadBounded(process.StandardOutput, cancellation);
            var error = ReadBounded(process.StandardError, cancellation);
            await Task.WhenAll(output, error, process.WaitForExitAsync(cancellation));
            if (process.ExitCode != 0 && !string.IsNullOrWhiteSpace(error.Result)) throw new IOException("Credential store unavailable");
            return string.IsNullOrWhiteSpace(output.Result) ? null : output.Result.Trim();
        }
        finally { if (!process.HasExited) process.Kill(true); }
    }
    static async Task<string> ReadBounded(StreamReader reader, CancellationToken cancellation)
    {
        var text = new StringBuilder(); var buffer = new char[1024]; int count;
        while ((count = await reader.ReadAsync(buffer.AsMemory(), cancellation)) > 0) { if (text.Length + count > 65536) throw new InvalidDataException(); text.Append(buffer, 0, count); }
        return text.ToString();
    }
    static string? ReadWindows(string target)
    {
        if (!CredRead(target, 1, 0, out var pointer)) { if (Marshal.GetLastWin32Error() == 1168) return null; throw new IOException("Credential store unavailable"); }
        try
        {
            var credential = Marshal.PtrToStructure<Credential>(pointer);
            if (credential.Size > 65536) throw new InvalidDataException();
            var bytes = new byte[credential.Size]; Marshal.Copy(credential.Blob, bytes, 0, bytes.Length);
            try { return Encoding.UTF8.GetString(bytes); }
            finally { System.Security.Cryptography.CryptographicOperations.ZeroMemory(bytes); }
        }
        finally { CredFree(pointer); }
    }
    [StructLayout(LayoutKind.Sequential)] struct Credential
    {
        public uint Flags, Type; public IntPtr Target, Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint Size; public IntPtr Blob; public uint Persist, AttributeCount; public IntPtr Attributes, Alias, UserName;
    }
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)] static extern bool CredRead(string target, uint type, uint flags, out IntPtr credential);
    [DllImport("advapi32.dll")] static extern void CredFree(IntPtr pointer);
}

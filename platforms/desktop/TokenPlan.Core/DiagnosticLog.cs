namespace TokenPlan.Core;

public static class DiagnosticLog
{
    static readonly object Gate = new();
    public static void Write(string source, string errorKey)
    {
        // Callers pass known error keys, never exceptions, headers, tokens or provider bodies.
        lock (Gate)
        {
            try
            {
                var folder = Path.GetDirectoryName(Preferences.DefaultPath)!;
                Directory.CreateDirectory(folder);
                var file = Path.Combine(folder, "TokenPlan.log");
                if (File.Exists(file) && new FileInfo(file).Length > 1024 * 1024) File.Move(file, file + ".1", true);
                File.AppendAllText(file, $"{DateTimeOffset.UtcNow:O} {source}: {errorKey}{Environment.NewLine}");
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { Console.Error.WriteLine("TokenPlan could not write its diagnostic log."); }
        }
    }
}

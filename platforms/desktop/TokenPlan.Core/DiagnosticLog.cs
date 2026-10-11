namespace TokenPlan.Core;

public static class DiagnosticLog
{
    public static int Level { get; set; } = 2;
    public static string Path => System.IO.Path.Combine(System.IO.Path.GetDirectoryName(Preferences.DefaultPath)!, "TokenPlan.log");
    static readonly object Gate = new();
    public static void Write(string source, string errorKey) => Write(source, errorKey, 0);
    public static void Write(string source, string errorKey, int level)
    {
        // Callers pass known error keys, never exceptions, headers, tokens or provider bodies.
        if (level > Level) return;
        lock (Gate)
        {
            try
            {
                var folder = System.IO.Path.GetDirectoryName(Preferences.DefaultPath)!;
                Directory.CreateDirectory(folder);
                var file = System.IO.Path.Combine(folder, "TokenPlan.log");
                if (File.Exists(file) && new FileInfo(file).Length > 1024 * 1024) File.Move(file, file + ".1", true);
                File.AppendAllText(file, $"{DateTimeOffset.UtcNow:O} {source}: {errorKey}{Environment.NewLine}");
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { Console.Error.WriteLine("TokenPlan could not write its diagnostic log."); }
        }
    }
}

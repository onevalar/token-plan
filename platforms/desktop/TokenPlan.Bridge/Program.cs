using System.Text.Json;
using TokenPlan.Core;
using TokenPlan.Bridge;
if (!args.SequenceEqual(new[] { "--desktop-bridge" })) return;
using var session = new DesktopSession();
while (await Console.In.ReadLineAsync() is { } line)
{
    try
    {
        if (line.Length > 65536) throw new InvalidDataException();
        using var request = JsonDocument.Parse(line);
        var state = await session.Execute(request.RootElement);
        Console.WriteLine(JsonSerializer.Serialize(new { ok = true, state }));
    }
    catch (Exception error)
    {
        DiagnosticLog.Write("bridge", error.GetType().Name);
        Console.WriteLine("""{"ok":false,"error":"request_failed"}""");
    }
}

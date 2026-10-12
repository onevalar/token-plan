using System.IO.Pipes;
using System.Security.Cryptography;
using System.Text;
using Avalonia.Threading;
namespace TokenPlan.Desktop;

sealed class DesktopActivation : IDisposable
{
    static string Name => "TokenPlan-" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile))))[..24];
    readonly CancellationTokenSource stop = new();
    public static bool NotifyExisting()
    {
        try { using var pipe = new NamedPipeClientStream(".", Name, PipeDirection.Out, PipeOptions.CurrentUserOnly); pipe.Connect(2000); pipe.WriteByte(1); return true; }
        catch (Exception e) when (e is IOException or TimeoutException) { TokenPlan.Core.DiagnosticLog.Write("activation", "The running app could not be activated."); return false; }
    }
    public DesktopActivation(Action toggle)
    {
        _ = Task.Run(async () => {
            while (!stop.IsCancellationRequested)
            {
                try
                {
                    await using var pipe = new NamedPipeServerStream(Name, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
                    await pipe.WaitForConnectionAsync(stop.Token);
                    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stop.Token); timeout.CancelAfter(TimeSpan.FromSeconds(2));
                    var buffer = new byte[1];
                    if (await pipe.ReadAsync(buffer, timeout.Token) == 1 && buffer[0] == 1) Dispatcher.UIThread.Post(toggle);
                }
                catch (OperationCanceledException) { }
                catch (IOException) { TokenPlan.Core.DiagnosticLog.Write("activation", "Activation channel could not be read."); break; }
            }
        });
    }
    public static Mutex CreateMutex() => new(false, Name + "-instance");
    public void Dispose() => stop.Cancel();
}

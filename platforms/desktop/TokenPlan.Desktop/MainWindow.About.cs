using System.Reflection;
using Avalonia.Controls;
using Avalonia.Layout;
namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    Control AboutPage()
    {
        var body = UtilityBody("About");
        var brand = Brand(24); brand.HorizontalAlignment = HorizontalAlignment.Center;
        body.Children.Add(brand);
        var version = typeof(MainWindow).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0]
            ?? typeof(MainWindow).Assembly.GetName().Version?.ToString() ?? "—";
        var versionLabel = Text(version, 14, true);
        versionLabel.HorizontalAlignment = HorizontalAlignment.Center;
        body.Children.Add(versionLabel);
        var links = Stack(8); links.HorizontalAlignment = HorizontalAlignment.Center;
        links.Children.Add(AboutLink("Project Website", "https://github.com/onevalar/token-plan"));
        links.Children.Add(AboutLink("Report an Issue", "https://github.com/onevalar/token-plan/issues"));
        links.Children.Add(AboutLink("Privacy Policy", "https://github.com/onevalar/token-plan/blob/main/docs/privacy.md"));
        links.Children.Add(AboutLink("Open-Source Licenses", new Uri(Path.Combine(AppContext.BaseDirectory, "THIRD-PARTY-NOTICES.txt")).AbsoluteUri));
        body.Children.Add(links);
        body.Children.Add(UpdateControls());
        return new ScrollViewer { Content = body };
    }
    Button AboutLink(string label, string destination)
    {
        var button = Action(label, () => { }); button.HorizontalAlignment = HorizontalAlignment.Stretch;
        button.Click += async (_, _) => {
            try { if (!await Launcher.LaunchUriAsync(new Uri(destination))) throw new IOException(); }
            catch (Exception e) when (e is IOException or InvalidOperationException or System.ComponentModel.Win32Exception)
            { notice = "The link could not be opened. Try again from your system browser or file manager."; TokenPlan.Core.DiagnosticLog.Write("about", notice); Render(); }
        };
        return button;
    }
}

using System.Reflection;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;

namespace TokenPlan.Desktop;

public sealed partial class MainWindow
{
    Control AboutPage()
    {
        var body = new StretchStack { Spacing = D.SectionSpacing };
        var version = typeof(MainWindow).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0]
            ?? typeof(MainWindow).Assembly.GetName().Version?.ToString() ?? "—";

        var identity = new StackPanel { Spacing = 6, Margin = new Thickness(0, 12, 0, 12), HorizontalAlignment = HorizontalAlignment.Center };
        using (var stream = typeof(MainWindow).Assembly.GetManifestResourceStream("TokenPlan.AppIcon.png")!)
            identity.Children.Add(new Image { Source = new Avalonia.Media.Imaging.Bitmap(stream), Width = 48, Height = 48, HorizontalAlignment = HorizontalAlignment.Center });
        var name = Label("TokenPlan", D.HeaderSize, T.Ink, Avalonia.Media.FontWeight.SemiBold);
        name.HorizontalAlignment = HorizontalAlignment.Center;
        identity.Children.Add(name);
        var versionLabel = Label(version, D.SupportingSize, T.Secondary);
        versionLabel.HorizontalAlignment = HorizontalAlignment.Center;
        identity.Children.Add(versionLabel);
        body.Children.Add(identity);

        var links = new StretchStack { Spacing = 0 };
        var first = true;
        foreach (var (label, destination) in new[]
        {
            ("Project Website", "https://github.com/onevalar/token-plan"),
            ("Report an Issue", "https://github.com/onevalar/token-plan/issues"),
            ("Privacy Policy", "https://github.com/onevalar/token-plan/blob/main/docs/privacy.md"),
            ("Open-Source Licenses", new Uri(Path.Combine(AppContext.BaseDirectory, "THIRD-PARTY-NOTICES.txt")).AbsoluteUri)
        })
        {
            if (!first) links.Children.Add(Hairline());
            first = false;
            links.Children.Add(AboutLink(label, destination));
        }
        body.Children.Add(CardSurface(links));
        body.Children.Add(UpdateControls());
        return Page("About", body);
    }

    Button AboutLink(string label, string destination)
    {
        var button = new Button
        {
            Content = L.T(label),
            Background = Avalonia.Media.Brushes.Transparent,
            BorderThickness = default,
            Foreground = Ink,
            FontSize = D.RowLabelSize,
            Padding = new Thickness(12, 10),
            HorizontalAlignment = HorizontalAlignment.Stretch,
            HorizontalContentAlignment = HorizontalAlignment.Left,
            CornerRadius = new CornerRadius(0)
        };
        button.Click += async (_, _) =>
        {
            try { if (!await Launcher.LaunchUriAsync(new Uri(destination))) throw new IOException(); }
            catch (Exception e) when (e is IOException or InvalidOperationException or System.ComponentModel.Win32Exception)
            { notice = "The link could not be opened. Try again from your system browser or file manager."; TokenPlan.Core.DiagnosticLog.Write("about", notice); Render(); }
        };
        return button;
    }
}

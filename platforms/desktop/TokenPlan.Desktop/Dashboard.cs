using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Media;
using TokenPlan.Core;

namespace TokenPlan.Desktop;

/// <summary>
/// The dashboard: one flat section per service (provider mark, name, plan, chevron), then that
/// service's Home metrics as single-line readings — label, track, value, countdown — separated from
/// the next service by a hairline. This mirrors the macOS popover, which reads as one inset list
/// rather than a grid of cards.
/// </summary>
public sealed partial class MainWindow
{
    Control Overview()
    {
        var body = new StretchStack { Spacing = 0 };
        body.Children.Add(Header());
        if (Program.Fixture) body.Children.Add(Note("Interface review uses example data. No accounts are connected."));
        if (notice != null) body.Children.Add(Note(notice));
        if (availableUpdate != null)
        {
            var update = new Button { Content = Label(L.T("Update Available"), D.SupportingSize, T.Accent, FontWeight.Medium), Background = T.SubtleFill, BorderThickness = default, CornerRadius = new CornerRadius(T.Radius), Padding = new Thickness(10, 7), HorizontalAlignment = HorizontalAlignment.Stretch, HorizontalContentAlignment = HorizontalAlignment.Left };
            update.Click += (_, _) => Navigate("about");
            body.Children.Add(new Border { Margin = new Thickness(0, 0, 0, D.SectionSpacing), Child = update });
        }

        var sections = new List<Control>();
        foreach (var id in preferences.OrderedProviders.Where(preferences.IsEnabled))
        {
            var primary = results.GetValueOrDefault(id) ?? new(id, ProviderName(id), null, "Waiting for the first update…");
            if (!preferences.IsAccountRemoved(primary)) sections.Add(ProviderSection(primary));
            foreach (var account in additionalAccounts.GetValueOrDefault(id) ?? Array.Empty<ProviderResult>())
                if (!preferences.IsAccountRemoved(account) && preferences.AccountVisibility.GetValueOrDefault(account.SettingsKey, true)) sections.Add(ProviderSection(account));
        }

        if (sections.Count == 0)
        {
            var empty = new StretchStack { Spacing = 10 };
            var message = Label(L.T("Nothing is being tracked yet. Choose which services and metrics to show."), D.SupportingSize, T.Secondary);
            message.TextAlignment = TextAlignment.Center;
            empty.Children.Add(message);
            empty.Children.Add(Action("Service Configuration", () => OpenUtility("providers")));
            body.Children.Add(new Border { Margin = new Thickness(0, 24), Child = empty });
        }

        for (var index = 0; index < sections.Count; index++)
        {
            if (index > 0)
            {
                body.Children.Add(new Border { Height = 0.5, Background = T.Divider, Margin = new Thickness(0, D.SectionSpacing - 6, 0, D.SectionSpacing - 6) });
            }
            body.Children.Add(sections[index]);
        }
        return Page(null, body);
    }

    /// <summary>A service heading followed by its Home readings, exactly as the macOS section renders.</summary>
    Control ProviderSection(ProviderResult result)
    {
        var stack = new StretchStack { Spacing = 0 };
        stack.Children.Add(ProviderSectionHeader(result));
        if (result.Snapshot is { } snapshot)
        {
            if (snapshot.Windows.Count == 0) stack.Children.Add(ProviderMessage("No quota data is available."));
            var metrics = preferences.OrderedMetrics(result.SettingsKey, snapshot.Windows)
                .Where(w => preferences.Placement(result.SettingsKey, w.Label) == MetricPlacement.Home).ToArray();
            foreach (var metric in metrics) stack.Children.Add(MetricRow(metric, result.Id));
        }
        else if (result.ErrorKey == null)
        {
            stack.Children.Add(ProviderMessage("Waiting for the first update…"));
        }
        if (result.ErrorKey != null) stack.Children.Add(ProviderMessage(L.T(result.ErrorKey), T.Warning));
        if (result.Snapshot is { } updated)
        {
            var caption = Label(L.T(result.ErrorKey == null ? "Updated" : "Last Successful Update") + " " + updated.FetchedAt.ToLocalTime().ToString("g"), D.CaptionSize, T.Tertiary);
            caption.Margin = new Thickness(0, 4, 0, 0);
            stack.Children.Add(caption);
        }
        return stack;
    }

    /// <summary>The service heading: mark, name, plan and a chevron, clickable as one target.</summary>
    Control ProviderSectionHeader(ProviderResult result)
    {
        var row = new Grid { ColumnDefinitions = new("Auto,*,Auto"), Margin = new Thickness(2, 2, 0, 2) };
        var mark = new Border { Width = D.HeaderIcon, Height = D.HeaderIcon, Child = ProviderMark(result.Id), VerticalAlignment = VerticalAlignment.Center };
        Add(row, mark);
        var identity = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 5, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 0, 0) };
        var name = result.AccountEmail != null ? ProviderName(result.Id) : result.Name;
        identity.Children.Add(Label(name, D.HeaderSize, weight: FontWeight.SemiBold));
        var plan = result.Snapshot?.Plan;
        if (result.AccountEmail is { Length: > 0 } email) plan = email;
        if (plan is { Length: > 0 }) identity.Children.Add(Label(plan, D.PlanSize, T.Secondary));
        Add(row, identity, 0, 1);
        var chevron = Label("›", 18, T.Secondary);
        chevron.HorizontalAlignment = HorizontalAlignment.Right;
        chevron.Margin = new Thickness(0, 0, 2, 0);
        Add(row, chevron, 0, 2);
        var header = new Button
        {
            Content = row,
            Background = Avalonia.Media.Brushes.Transparent,
            BorderThickness = default,
            Padding = new Thickness(0, 4, 4, 4),
            HorizontalAlignment = HorizontalAlignment.Stretch,
            HorizontalContentAlignment = HorizontalAlignment.Stretch,
            CornerRadius = new CornerRadius(6)
        };
        AutomationProperties.SetName(header, result.Name + " · " + L.T("Details"));
        header.Click += (_, _) => OpenAccountDetail(result);
        return header;
    }

    Control ProviderMessage(string text, IBrush? tint = null)
    {
        var label = Label(text, D.SupportingSize, tint ?? T.Secondary);
        label.Margin = new Thickness(2, 6, 0, 6);
        return label;
    }

    /// <summary>
    /// One Home reading. Quotas share columns — label, capsule track, value, countdown — so tracks
    /// line up across services; balances and other text rows drop the track.
    /// </summary>
    Control MetricRow(UsageWindow metric, string? providerId = null)
    {
        var padded = new Grid { Margin = new Thickness(2, metric.IsBalance ? D.TextRowPadding : D.BarRowPadding, 0, metric.IsBalance ? D.TextRowPadding : D.BarRowPadding) };
        if (metric.IsBalance)
        {
            padded.ColumnDefinitions = new("*,Auto");
            var balanceLabel = Label(MetricTitle(providerId, metric.Label), D.SupportingSize);
            Add(padded, balanceLabel);
            var amount = Readable(metric);
            amount.FontWeight = FontWeight.SemiBold;
            Add(padded, amount, 0, 1);
        }
        else
        {
            padded.ColumnDefinitions = new("Auto,*,Auto,Auto");
            var title = Label(MetricTitle(providerId, metric.Label), D.SupportingSize);
            title.MaxWidth = 78;
            title.TextTrimming = TextTrimming.CharacterEllipsis;
            title.TextWrapping = TextWrapping.NoWrap;
            Add(padded, title);
            var meter = QuotaBar(metric);
            Add(padded, meter, 0, 1);
            var value = Readable(metric);
            value.FontWeight = FontWeight.SemiBold;
            value.HorizontalAlignment = HorizontalAlignment.Right;
            value.TextAlignment = TextAlignment.Right;
            value.MinWidth = 42;
            value.Margin = new Thickness(8, 0, 0, 0);
            Add(padded, value, 0, 2);
            var context = Context(metric);
            Add(padded, context, 0, 3);
        }
        if (metric.Expiries == null) return padded;
        var withExpiries = new StretchStack { Spacing = 0 };
        withExpiries.Children.Add(padded);
        foreach (var expiry in metric.Expiries)
        {
            var line = Label(L.T("Expires") + " " + (preferences.HideValues ? "•••" : expiry.ToLocalTime().ToString("g")), D.CaptionSize, T.Secondary);
            line.Margin = new Thickness(2, 0, 0, D.TextRowPadding);
            withExpiries.Children.Add(line);
        }
        return withExpiries;
    }

    TextBlock Readable(UsageWindow metric) => Label(
        preferences.HideValues ? "•••" : metric.Amount != null ? metric.FormattedAmount : DisplayPercent(metric),
        D.SupportingSize,
        T.Ink);

    string DisplayPercent(UsageWindow metric) => (preferences.ShowRemaining ? metric.RemainingPercent : metric.UsedPercent).ToString("0.#") + "%";

    /// <summary>The 5pt capsule track: fill follows Used/Left, color always follows remaining quota.</summary>
    QuotaMeter QuotaBar(UsageWindow metric)
    {
        var height = D.MeterHeight;
        var remaining = metric.RemainingPercent;
        var fill = remaining <= 10 ? T.Danger : remaining <= 30 ? T.Warning : T.Accent;
        var value = preferences.HideValues ? 0 : Math.Clamp(preferences.ShowRemaining ? metric.RemainingPercent : metric.UsedPercent, 0, 100);
        var bar = new QuotaMeter(value, fill, T.Track, height) { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(8, 0, 2, 0) };
        AutomationProperties.SetName(bar, MetricTitle(null, metric.Label));
        return bar;
    }

    Control Context(UsageWindow metric)
    {
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 0, 0) };
        if (metric.ResetsAt != null) row.Children.Add(Hourglass());
        row.Children.Add(Label(preferences.HideValues ? "•••" : ResetLabel(metric.ResetsAt), D.SupportingSize, T.Secondary));
        return row;
    }

    /// <summary>The small hourglass macOS puts before a countdown, drawn rather than typed so it
    /// stays crisp at caption size in every font.</summary>
    Avalonia.Controls.Shapes.Path Hourglass() => new()
    {
        Data = Avalonia.Media.Geometry.Parse("M1,1 L7,1 L4,4 L7,7 L1,7 L4,4 Z"),
        Fill = T.Secondary,
        Width = 7,
        Height = 7,
        Stretch = Avalonia.Media.Stretch.Uniform,
        VerticalAlignment = VerticalAlignment.Center,
        Opacity = 0.85
    };

    static string ResetLabel(DateTimeOffset? reset)
    {
        if (reset == null) return L.T("Not started");
        var remaining = reset.Value - DateTimeOffset.Now;
        if (remaining <= TimeSpan.Zero) return L.T("Resetting");
        return remaining.TotalDays >= 1 ? $"{(int)remaining.TotalDays}d {remaining.Hours}h" : remaining.TotalHours >= 1 ? $"{(int)remaining.TotalHours}h {remaining.Minutes}m" : $"{Math.Max(1, remaining.Minutes)}m";
    }

    /// <summary>
    /// The grouped card the detail screen (and the tests) build: a service heading and its readings on
    /// a rounded surface. <paramref name="detail"/> adds every non-hidden metric instead of Home ones.
    /// </summary>
    Control Card(ProviderResult result, bool detail = false)
    {
        var stack = new StackPanel { Spacing = 0, Margin = new Thickness(0, D.CardGutter, 0, D.CardGutter) };
        // The detail page prints the service identity above the card, so the card starts with readings.
        if (!detail) stack.Children.Add(ProviderSectionHeader(result));
        if (result.Snapshot is { } snapshot)
        {
            if (snapshot.Windows.Count == 0) stack.Children.Add(ProviderMessage("No quota data is available."));
            var metrics = preferences.OrderedMetrics(result.SettingsKey, snapshot.Windows)
                .Where(w => preferences.Placement(result.SettingsKey, w.Label) != MetricPlacement.Hidden).ToArray();
            var visible = detail ? metrics : metrics.Where(w => preferences.Placement(result.SettingsKey, w.Label) == MetricPlacement.Home).ToArray();
            foreach (var metric in visible) stack.Children.Add(StackedMetricRow(metric, result.Id));
            if (detail && result.AccountKey == null && ProviderCatalog.TokenLogProviders.Contains(result.Id)) stack.Children.Add(ServiceSpendRows(result.Id));
            var caption = Label(L.T(result.ErrorKey == null ? "Updated" : "Last Successful Update") + " " + snapshot.FetchedAt.ToLocalTime().ToString("g"), D.CaptionSize, T.Tertiary);
            caption.Margin = new Thickness(0, 4, 0, 2);
            stack.Children.Add(caption);
        }
        return CardSurface(stack);
    }

    /// <summary>Detail readings stack (label + value, track, countdown) like the macOS detail card.</summary>
    Control StackedMetricRow(UsageWindow metric, string? providerId)
    {
        if (metric.IsBalance)
        {
            var balance = new Grid { ColumnDefinitions = new("*,Auto"), Margin = new Thickness(0, D.TextRowPadding, 0, D.TextRowPadding) };
            Add(balance, Label(MetricTitle(providerId, metric.Label), D.SupportingSize));
            var amount = Readable(metric);
            amount.FontWeight = FontWeight.SemiBold;
            Add(balance, amount, 0, 1);
            return balance;
        }
        var stack = new StackPanel { Spacing = D.RowInnerSpacing, Margin = new Thickness(0, D.TextRowPadding + 2, 0, D.TextRowPadding + 2) };
        var top = new Grid { ColumnDefinitions = new("*,Auto") };
        Add(top, Label(MetricTitle(providerId, metric.Label), D.SupportingSize));
        var value = Readable(metric);
        value.FontWeight = FontWeight.SemiBold;
        Add(top, value, 0, 1);
        stack.Children.Add(top);
        var bar = QuotaBar(metric);
        bar.Margin = default;
        stack.Children.Add(bar);
        var context = Context(metric);
        context.HorizontalAlignment = HorizontalAlignment.Right;
        context.Margin = default;
        stack.Children.Add(context);
        return new Border { Padding = new Thickness(12, 0), Child = stack };
    }
}

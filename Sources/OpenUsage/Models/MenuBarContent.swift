import Foundation

/// Resolved menu-bar data: Percentage keeps pinned readings; Ring chooses one quota per account.
/// `isEmpty` means render the plain app icon.
struct MenuBarContent: Equatable {
    /// One resolved pinned metric.
    struct Metric: Equatable {
        let id: String          // descriptor id
        let label: String       // metric label for the accessibility summary, e.g. "Session"
        let value: String       // unit-aware tray display, e.g. "41%", "$5.23", or "412"
        let fraction: Double?   // bounded only; follows WidgetData.fraction in the selected Used/Left mode

        init(id: String, label: String, value: String, fraction: Double? = nil) {
            self.id = id
            self.label = label
            self.value = value
            self.fraction = fraction
        }
    }

    /// A provider and its pinned metrics, in order. One segment of the strip.
    struct Group: Equatable {
        let providerID: String
        let displayName: String
        let icon: IconSource
        let metrics: [Metric]
        var accountBadge: Int? = nil
    }

    /// Provider groups in Customize order. Dynamic: only metrics that currently
    /// have real data appear, and a provider whose pinned metrics all lack data drops out entirely
    /// (no orphan icon) — so the strip never renders "—" placeholders.
    let groups: [Group]

    /// Nothing is pinned, every pinned service is hidden/disabled, or no pinned metric has data yet —
    /// the menu bar falls back to the app icon.
    var isEmpty: Bool { groups.isEmpty }

    /// VoiceOver summary for the rendered strip image, e.g.
    /// "Claude Session 41%, Weekly 12%; Cursor Credits $12".
    var accessibilityText: String {
        groups.map { group in
            let metrics = group.metrics.map { "\($0.label) \($0.value)" }.joined(separator: ", ")
            let name = group.accountBadge.map { "\(group.displayName) · \($0)" } ?? group.displayName
            return "\(name) \(metrics)"
        }
        .joined(separator: "; ")
    }
}

@MainActor
enum MenuBarContentBuilder {
    /// Percentage receives pinnedGroups. Ring receives all supported metrics of visible, enabled
    /// services so its primary quota does not depend on stars or dashboard placement. Plan comes
    /// from the existing snapshot, never a second authentication or network lookup.
    static func build(
        groups: [ProviderMetrics],
        style: MenuBarStyle = .percentage,
        plan: (String) -> String? = { _ in nil },
        accountNumbers: [String: Int] = [:],
        data: (WidgetDescriptor) -> WidgetData
    ) -> MenuBarContent {
        if style == .ring {
            var selected: [MenuBarContent.Group] = []
            for group in groups {
                let family = ProviderAccountID.family(of: group.provider.id)
                let readings = group.metrics.map { (descriptor: $0, data: data($0)) }.filter {
                    $0.data.hasData && !$0.data.isChart && !$0.data.isUsagePeriod && !$0.data.showsResetExpiries
                }
                let quotas = readings.filter { $0.data.isBounded }
                let tier = plan(group.provider.id)?.lowercased().split(whereSeparator: \.isWhitespace).first
                let preferred: String?
                if family == "claude" {
                    preferred = "\(group.provider.id).session"
                } else if family == "codex", tier == "pro" {
                    preferred = "\(group.provider.id).weekly"
                } else if family == "codex", tier == "plus" {
                    preferred = "\(group.provider.id).session"
                } else {
                    preferred = nil
                }
                guard let reading = quotas.first(where: { $0.descriptor.id == preferred })
                    ?? quotas.min(by: { $0.data.remainingFraction < $1.data.remainingFraction })
                    ?? readings.first else { continue }
                selected.append(MenuBarContent.Group(
                    providerID: group.provider.id, displayName: group.provider.displayName, icon: group.provider.icon,
                    metrics: [resolve(reading.descriptor, reading.data)], accountBadge: accountNumbers[group.provider.id]
                ))
            }
            return MenuBarContent(groups: selected)
        }
        let resolvedGroups = groups.compactMap { group -> MenuBarContent.Group? in
            let metrics = group.metrics.compactMap { descriptor -> MenuBarContent.Metric? in
                let value = data(descriptor)
                return value.hasData ? resolve(descriptor, value) : nil
            }
            guard !metrics.isEmpty else { return nil }
            return MenuBarContent.Group(
                providerID: group.provider.id,
                displayName: group.provider.displayName,
                icon: group.provider.icon,
                metrics: metrics,
                accountBadge: accountNumbers[group.provider.id]
            )
        }
        return MenuBarContent(groups: resolvedGroups)
    }

    private static func resolve(_ descriptor: WidgetDescriptor, _ data: WidgetData) -> MenuBarContent.Metric {
        MenuBarContent.Metric(
            id: descriptor.id,
            label: descriptor.metricLabel,
            value: data.menuBarValue,
            fraction: data.isBounded ? data.fraction : nil
        )
    }
}

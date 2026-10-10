import SwiftUI

/// One monochrome quota ring per selected account, with a centered provider mark and sibling badge.
/// The content builder selects the plan's primary quota. Unbounded balances remain numeric.
struct MenuBarRingStrip: View {
    let content: MenuBarContent

    var body: some View {
        HStack(spacing: 11) {
            ForEach(content.groups, id: \.providerID) { group in
                MenuBarRingGroup(group: group)
            }
        }
        .foregroundStyle(.black)
        .monospacedDigit()
        .padding(.horizontal, 2)
        .padding(.vertical, 1)
        .fixedSize()
    }
}

private struct MenuBarRingGroup: View {
    let group: MenuBarContent.Group

    var body: some View {
        if let fraction = group.metrics.first?.fraction {
            HStack(alignment: .top, spacing: 0) {
                ZStack {
                    MenuBarQuotaRing(fraction: fraction)
                        .frame(width: 18, height: 18)
                    MenuBarProviderGlyph(icon: group.icon, side: 10)
                }
                .frame(width: 20, height: 20)
                if let badge = group.accountBadge {
                    Text(verbatim: String(badge)).font(.system(size: 7, weight: .bold))
                        .accessibilityHidden(true)
                }
            }
        } else {
            MenuBarTextGroup(group: group)
        }
    }
}

private struct MenuBarQuotaRing: View {
    let fraction: Double

    var body: some View {
        ZStack {
            Circle().stroke(Color.black.opacity(0.22), lineWidth: 1.5)
            if fraction >= 1 {
                Circle().stroke(Color.black, lineWidth: 1.5)
            } else if fraction > 0 {
                Circle().trim(from: 0, to: fraction)
                    .stroke(Color.black, style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
        }
    }
}

import SwiftUI

/// One row in the Customize provider list (L1). The drag grip leads (drag-only — a tap on it does
/// nothing); the middle content (mark + name + count) is tappable to open the provider's detail (L2)
/// and expands to fill, so the empty space between the name and the toggle is tappable too; the
/// trailing on/off toggle toggles; the caret after the toggle also opens L2. So: tap anything except
/// the grip or the toggle to open L2, drag the grip to reorder. The secondary line shows the
/// provider's total metric count. Disabled providers render greyed but stay openable.
struct ProviderListRow<Handle: View>: View {
    let provider: Provider
    let isEnabled: Bool
    let metricCount: Int
    let handle: (AnyView) -> Handle
    var onToggle: ((Bool) -> Void) = { _ in }
    var onOpen: () -> Void = {}

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        HStack(spacing: 10) {
            // Drag handle only — outside the open target so a tap on the grip doesn't open L2.
            handle(AnyView(ReorderGrip()))

            // A real full-width button supports keyboard navigation as well as pointer clicks.
            Button(action: onOpen) {
                HStack(spacing: 10) {
                    ProviderIcon(source: provider.icon)
                        .frame(width: 18, height: 18)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(provider.displayName)
                            .font(.system(size: density.headerPointSize, weight: .semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                        Text(trf("%lld metrics", metricCount))
                            .font(.system(size: density.planBadgePointSize))
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(String(localized: "Open \(provider.displayName)"))

            Toggle(provider.displayName, isOn: Binding(get: { isEnabled }, set: { onToggle($0) }))
                .labelsHidden()
                .settingsSwitchStyle()

            Button(action: onOpen) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.tertiary)
                    .frame(width: 16, height: 16)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(String(localized: "Open \(provider.displayName)"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, density.controlRowPadding)
        .opacity(isEnabled ? 1 : 0.55)
    }
}

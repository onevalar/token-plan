import SwiftUI

/// Navigation only: one understated Back control, never a lookalike reset action.
struct PopoverTopBar: View {
    let layout: LayoutStore
    let screen: PopoverScreen
    let height: CGFloat
    let horizontalPadding: CGFloat

    var body: some View {
        if screen != .dashboard {
            ZStack {
                Text(title).font(.headline).lineLimit(1)
                HStack {
                    Button {
                        withAnimation(Motion.navigation) { _ = layout.goBack() }
                    } label: {
                        Image(systemName: "chevron.backward")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.secondary)
                            .frame(width: 28, height: 28).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back")
                    Spacer(minLength: 8)
                }
            }
            .padding(.horizontal, horizontalPadding)
            .frame(height: height).frame(maxWidth: .infinity)
        }
    }

    private var title: String {
        screen == .settings
            ? layout.displayedSettingsPage?.title ?? tr("General Settings")
            : tr(layout.displayedCustomizeProviderID == nil ? "Subscription Services" : "Subscription Details")
    }
}

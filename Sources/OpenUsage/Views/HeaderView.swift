import AppKit
import SwiftUI

/// The overview's Options menu. Management stays here instead of duplicating overview buttons.
struct HeaderView: View {
    @Environment(LayoutStore.self) private var layout
    @Environment(UpdaterController.self) private var updater
    @Environment(PopoverTransparencyStore.self) private var transparency
    let screen: PopoverScreen

    var body: some View {
        if screen == .dashboard {
            Menu {
                Button { toggle(.customize) } label: {
                    Label("Services & Subscriptions", systemImage: "rectangle.stack")
                }
                .keyboardShortcut(.return, modifiers: [])
                Button { toggle(.settings) } label: {
                    Label("Settings", systemImage: "gearshape")
                }
                .keyboardShortcut(",")
                Divider()
                Button { updater.checkForUpdates() } label: {
                    Label("Check for Updates…", systemImage: "arrow.triangle.2.circlepath")
                }
                .disabled(!updater.canCheckForUpdates)
                Button { AboutPanel.present() } label: {
                    Label("About TokenPlan", systemImage: "info.circle")
                }
                Divider()
                Button(role: .destructive) { NSApplication.shared.terminate(nil) } label: {
                    Label("Quit TokenPlan", systemImage: "power")
                }
                .keyboardShortcut("q")
            } label: {
                Label("Options", systemImage: "ellipsis")
                    .labelStyle(.iconOnly)
                    .frame(width: 28, height: 28).contentShape(Rectangle())
            }
            .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden)
            .fixedSize()
            .interactiveGlass(in: Capsule(), reinforced: transparency.effectiveStyle.needsChromeLegibilityBacking)
            .accessibilityLabel("Options")
        }
    }

    private func toggle(_ screen: PopoverScreen) {
        withAnimation(Motion.modeSwitch) {
            layout.screen = layout.screen == screen ? .dashboard : screen
        }
    }
}

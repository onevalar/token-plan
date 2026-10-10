import AppKit
import SwiftUI

/// The overview's Options menu. Management stays here instead of duplicating overview buttons.
struct HeaderView: View {
    @Environment(LayoutStore.self) private var layout
    @Environment(UpdaterController.self) private var updater
    let screen: PopoverScreen

    var body: some View {
        if screen == .dashboard {
            Menu {
                Button { toggle(.customize) } label: {
                    Label("Services & Subscriptions", systemImage: "rectangle.stack")
                }
                Divider()
                ForEach(SettingsPage.dashboardPages, id: \.self) { page in
                    Button { openSettings(page) } label: {
                        Label(page.title, systemImage: page.symbol)
                    }
                }
                Button { openSettings(nil) } label: {
                    Label("General Settings", systemImage: "gearshape")
                }
                .keyboardShortcut(",")
                Divider()
                Button { updater.checkForUpdates() } label: {
                    Label("Check for Updates…", systemImage: "arrow.triangle.2.circlepath")
                }
                .disabled(!updater.canCheckForUpdates)
                Button { AboutPanel.present() } label: {
                    Label("About", systemImage: "info.circle")
                }
                Divider()
                Button(role: .destructive) { NSApplication.shared.terminate(nil) } label: {
                    Label("Quit", systemImage: "power")
                }
                .keyboardShortcut("q")
            } label: {
                Label("Options", systemImage: "ellipsis")
                    .labelStyle(.iconOnly)
                    .frame(width: 28, height: 28).contentShape(Rectangle())
            }
            .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden)
            .fixedSize()
            .background(.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(.secondary)
            .accessibilityLabel("Options")
        }
    }

    private func toggle(_ screen: PopoverScreen) {
        withAnimation(Motion.modeSwitch) {
            layout.screen = layout.screen == screen ? .dashboard : screen
        }
    }

    private func openSettings(_ page: SettingsPage?) {
        withAnimation(Motion.modeSwitch) {
            layout.openSettingsPage(page)
        }
    }
}

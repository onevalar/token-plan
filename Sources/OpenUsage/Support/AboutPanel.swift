import AppKit
import SwiftUI

/// A native, reusable About window; version comes from the installed bundle.
@MainActor
enum AboutPanel {
    private static var controller: NSWindowController?

    static func present() {
        if controller == nil {
            let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 320, height: 200),
                                styleMask: [.titled, .closable], backing: .buffered, defer: false)
            panel.title = tr("About")
            panel.isReleasedWhenClosed = false
            panel.contentViewController = NSHostingController(rootView: AboutContent())
            panel.center()
            controller = NSWindowController(window: panel)
        }
        NSApp.activate(ignoringOtherApps: true)
        controller?.showWindow(nil)
        controller?.window?.makeKeyAndOrderFront(nil)
    }
}

private struct AboutContent: View {
    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 8) {
                Image(nsImage: AppInfo.icon).resizable()
                    .interpolation(.high)
                    .scaledToFit().frame(width: 32, height: 40)
                VStack(spacing: 3) {
                    Text(AppInfo.displayName).font(.title2.bold())
                    Text(verbatim: AppInfo.version).font(.caption).foregroundStyle(.secondary)
                }
            }
            VStack(spacing: 8) {
                HStack(spacing: 16) {
                    Link("Project Website", destination: URL(string: "https://github.com/onevalar/apps#tokenplan")!)
                    Link("Report an Issue", destination: URL(string: "https://github.com/onevalar/apps/issues")!)
                }
                HStack(spacing: 16) {
                    Link("Privacy Policy", destination: URL(string: "https://github.com/onevalar/apps/blob/main/tokenplan/privacy.md")!)
                    Link("License", destination: URL(string: "https://github.com/onevalar/apps/blob/main/tokenplan/third-party-notices.txt")!)
                }
            }.font(.subheadline)
        }
        .padding(20)
        .frame(width: 320)
        .fixedSize(horizontal: false, vertical: true)
    }

}

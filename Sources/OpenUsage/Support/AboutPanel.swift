import AppKit

/// A compact version-only panel. Keep the controller alive so repeated openings reuse one window.
@MainActor
enum AboutPanel {
    private static var controller: NSWindowController?

    static func present() {
        if controller == nil {
            let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 280, height: 100),
                                styleMask: [.titled, .closable], backing: .buffered, defer: false)
            panel.title = tr("About")
            panel.isReleasedWhenClosed = false
            let version = NSTextField(labelWithString: AppInfo.version)
            version.font = .systemFont(ofSize: 17, weight: .medium)
            version.alignment = .center
            version.translatesAutoresizingMaskIntoConstraints = false
            let content = NSView()
            content.addSubview(version)
            NSLayoutConstraint.activate([
                version.centerXAnchor.constraint(equalTo: content.centerXAnchor),
                version.centerYAnchor.constraint(equalTo: content.centerYAnchor)
            ])
            panel.contentView = content
            panel.center()
            controller = NSWindowController(window: panel)
        }
        NSApp.activate(ignoringOtherApps: true)
        controller?.showWindow(nil)
        controller?.window?.makeKeyAndOrderFront(nil)
    }
}

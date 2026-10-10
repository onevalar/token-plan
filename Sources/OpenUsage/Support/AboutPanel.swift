import AppKit

/// Presents the standard macOS About panel for the footer menu's "About TokenPlan" item.
///
/// As a menu-bar accessory app, TokenPlan is not the active app while the popover is showing, so the
/// app is activated first — otherwise the panel would open behind whatever app currently owns the
/// foreground. The panel pulls the app icon, name, and version (`CFBundleShortVersionString` — the
/// same string `AppInfo.version` surfaces in the footer) straight from the bundle; we only supply the
/// product description and the bundled license notice.
enum AboutPanel {
    static var licenseURL: URL { Bundle.openUsageResources.url(forResource: "LICENSE", withExtension: "txt")! }

    @MainActor
    static func present() {
        NSApp.activate(ignoringOtherApps: true)
        NSApplication.shared.orderFrontStandardAboutPanel(options: [.credits: credits])
    }

    /// The standard panel renders the local license link as clickable, without sending any data.
    private static var credits: NSAttributedString {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center

        let base: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 11),
            .foregroundColor: NSColor.secondaryLabelColor,
            .paragraphStyle: paragraph,
        ]

        let credits = NSMutableAttributedString()
        credits.append(NSAttributedString(string: tr("Your AI usage, limits and subscriptions at a glance."), attributes: base))
        credits.append(NSAttributedString(string: "\n\n", attributes: base))
        credits.append(link(tr("License"), licenseURL.absoluteString, base: base))
        return credits
    }

    private static func link(_ text: String, _ urlString: String, base: [NSAttributedString.Key: Any]) -> NSAttributedString {
        var attributes = base
        if let url = URL(string: urlString) {
            attributes[.link] = url
        }
        return NSAttributedString(string: text, attributes: attributes)
    }
}

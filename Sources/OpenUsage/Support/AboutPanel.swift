import AppKit

/// Presents the standard macOS About panel for the footer menu's "About TokenPlan" item.
///
/// As a menu-bar accessory app, TokenPlan is not the active app while the popover is showing, so the
/// app is activated first — otherwise the panel would open behind whatever app currently owns the
/// foreground. The panel pulls the app icon, name, and version (`CFBundleShortVersionString` — the
/// same string `AppInfo.version` surfaces in the footer) straight from the bundle; we only supply the
/// credits line, naming the project and its open-source origin.
enum AboutPanel {
    @MainActor
    static func present() {
        NSApp.activate(ignoringOtherApps: true)
        NSApplication.shared.orderFrontStandardAboutPanel(options: [.credits: credits])
    }

    /// Centered, secondary-styled credits with the same two links as the rest of the app: the author's
    /// page and the GitHub repo. The standard panel renders `.link`-attributed runs as clickable.
    private static var credits: NSAttributedString {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center

        let base: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 11),
            .foregroundColor: NSColor.secondaryLabelColor,
            .paragraphStyle: paragraph,
        ]

        let credits = NSMutableAttributedString()
        credits.append(NSAttributedString(string: tr("Based on the MIT-licensed OpenUsage project by Robin Ebers"), attributes: base))
        credits.append(NSAttributedString(string: "\n\n" + tr("Open source on") + " ", attributes: base))
        credits.append(link("GitHub", "https://github.com/onevalar/token-plan", base: base))
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

import AppKit
import SwiftUI

/// Renders the TokenPlan reservoir mark into a template `NSImage` for the menu bar.
/// Reuses the same SVG→`ProviderIconShape` pipeline as the provider tiles, so there is no
/// asset catalog or second SVG parser to maintain.
@MainActor
enum MenuBarIcon {
    /// Side length (points) of the menu bar glyph.
    private static let side: CGFloat = 18

    /// Cached template image, or `nil` if the brand mark fails to load/parse.
    static let image: NSImage? = render()

    private static func render() -> NSImage? {
        guard let mark = ProviderMarks.mark(for: "tokenplan") else { return nil }
        let renderer = ImageRenderer(
            // The SVG already has safe margins; do not shrink the capsule a second time.
            content: ProviderIconShape(mark: mark, inset: 0)
                .fill(Color.black)
                .frame(width: side, height: side)
        )
        renderer.scale = 2
        guard let nsImage = renderer.nsImage else { return nil }
        nsImage.size = NSSize(width: side, height: side)
        nsImage.isTemplate = true
        return nsImage
    }
}

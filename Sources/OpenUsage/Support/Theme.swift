import SwiftUI
import AppKit

/// Linear colors shared with the user's custom Hero UI library.
/// AppKit retains native controls, vibrancy, system text colors and accessibility behavior.
enum Theme {
    /// Hierarchical secondary tint for the provider marks.
    static let iconGray = AnyShapeStyle(.secondary)

    /// Meter fill for a severity band — the macOS system palette (the battery-style traffic light),
    /// never hand-tuned hexes, so the bars track light/dark and accessibility settings like every
    /// other system meter. Full strength: on the opaque surface there's no glass to temper against.
    static func meterFill(_ severity: WidgetData.MeterSeverity) -> AnyShapeStyle {
        AnyShapeStyle(meterColor(severity))
    }

    private static func meterColor(_ severity: WidgetData.MeterSeverity) -> Color {
        switch severity {
        case .normal: return accent
        case .warning: return Color(nsColor: .systemYellow)
        case .critical: return Color(nsColor: .systemRed)
        }
    }

    /// Inline notice/alert tint (refresh warning triangle, pin-limit notice, settings errors) — the
    /// system orange at full strength, matching the meter fills.
    static let notice = AnyShapeStyle(Color(nsColor: .systemOrange))

    /// Inline success tint (the "screenshot copied to clipboard" confirmation) — the system green at
    /// full strength, the positive counterpart to `notice`'s orange.
    static let positive = AnyShapeStyle(Color(nsColor: .systemGreen))

    // MARK: - Surfaces

    /// Dynamic AppKit colors also keep the panel backdrop in sync with SwiftUI appearance.
    static let trayNSColor = NSColor(name: "TokenPlanLinearBackground") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.031352, green: 0.035341, blue: 0.039341, alpha: 1)
            : NSColor(srgbRed: 0.957658, green: 0.960922, blue: 0.966188, alpha: 1)
    }
    static let cardNSColor = NSColor(name: "TokenPlanLinearSurface") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.058245, green: 0.063059, blue: 0.063061, alpha: 1)
            : .white
    }
    static let accent = Color(red: 0.149, green: 0.392, blue: 0.780)
    static var traySurface: Color { Color(nsColor: trayNSColor) }
    static let cardFill = AnyShapeStyle(Color(nsColor: cardNSColor))

    /// The single corner radius for every metric/settings card surface and its lifted twin, so the
    /// floating drag preview always matches the live card's shape.
    static let cardCornerRadius: CGFloat = 12

    /// The rounded rectangle shared by every card surface (live and lifted), so the shape is defined once.
    static var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: cardCornerRadius, style: .continuous)
    }
}

extension View {
    /// Shared surface for data cards, settings groups and drag previews.
    func cardSurface() -> some View {
        modifier(CardSurfaceModifier())
    }

    /// A single-row lifted preview surface: the card surface plus a thin separator hairline that fences
    /// a free-floating one-row chip off from the rows beneath it (the multi-row provider previews don't
    /// take the hairline — their shadow alone reads as detached).
    func liftedRowSurface() -> some View {
        cardSurface()
            .overlay { Theme.cardShape.strokeBorder(.separator, lineWidth: 0.5) }
    }

    /// The trailing on/off switch styling shared by every settings + Customize row toggle: no inline
    /// label (the row's leading text is the label), the native switch style, small control size.
    func settingsSwitchStyle() -> some View {
        labelsHidden()
            .toggleStyle(.switch)
            .controlSize(.small)
    }
}

/// Data uses solid surfaces; transparency remains an explicit user preference.
private struct CardSurfaceModifier: ViewModifier {
    @Environment(\.popoverSurfaceTreatment) private var treatment

    func body(content: Content) -> some View {
        content.background {
            switch treatment {
            case .opaque:
                Theme.cardShape
                    .fill(Theme.cardFill)
                    .overlay { Theme.cardShape.strokeBorder(.separator.opacity(0.25), lineWidth: 0.5) }
            case .translucent:
                // The AppKit backdrop already applies the system blur. A stable translucent surface here
                // keeps text legible without stacking another live material pass under every card.
                Theme.cardShape
                    .fill(Color(nsColor: Theme.cardNSColor).opacity(0.75))
                    .overlay { Theme.cardShape.strokeBorder(.separator.opacity(0.25), lineWidth: 0.5) }
            }
        }
    }
}

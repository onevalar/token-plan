import SwiftUI
import AppKit

/// Linear colors shared with the user's custom Hero UI library.
/// AppKit retains native controls, vibrancy, system text colors and accessibility behavior.
enum Theme {
    /// Hierarchical secondary tint for the provider marks.
    static let iconGray = AnyShapeStyle(.secondary)

    /// Meter fill for a severity band — the macOS system palette (the battery-style traffic light),
    /// never hand-tuned hexes, so the bars track light/dark and accessibility settings like every
    /// other system meter. Full strength keeps the readings clear on both panel treatments.
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
    static let accent = Color(red: 0.149, green: 0.392, blue: 0.780)
    static var traySurface: Color { Color(nsColor: trayNSColor) }

    /// Rounded surfaces are reserved for floating drag previews and clipped controls.
    static let cardCornerRadius: CGFloat = 12

    /// Shared shape for elevated surfaces and control clipping.
    static var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: cardCornerRadius, style: .continuous)
    }
}

extension View {
    /// Flat groups share the panel backdrop, separated by a native hairline rather than nested cards.
    func cardSurface() -> some View {
        overlay(alignment: .bottom) { Divider() }
    }

    /// A lifted preview needs its own backing so it stays readable over the rows being reordered.
    func liftedRowSurface() -> some View {
        background(.regularMaterial, in: Theme.cardShape)
            .clipShape(Theme.cardShape)
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

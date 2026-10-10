import SwiftUI
import AppKit

/// Linear colors shared with the user's custom Hero UI library.
/// AppKit retains native controls, vibrancy, system text colors and accessibility behavior.
enum Theme {
    /// Hierarchical secondary tint for the provider marks.
    static let iconGray = AnyShapeStyle(.secondary)

    /// Severity colors follow the custom Linear palette, with a separate dark-mode ramp.
    static func meterFill(_ severity: WidgetData.MeterSeverity) -> AnyShapeStyle {
        AnyShapeStyle(meterColor(severity))
    }

    private static func meterColor(_ severity: WidgetData.MeterSeverity) -> Color {
        switch severity {
        case .normal: return accent
        case .warning: return warning
        case .critical: return danger
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
    static let accent = Color(nsColor: NSColor(name: "TokenPlanAccent") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.194791, green: 0.475032, blue: 0.926228, alpha: 1)
            : NSColor(srgbRed: 0.149, green: 0.392, blue: 0.780, alpha: 1)
    })
    static let fieldSurface = Color(nsColor: NSColor(name: "TokenPlanField") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.059, green: 0.063, blue: 0.063, alpha: 1)
            : .white
    })
    static let groupSurface = Color(nsColor: NSColor(name: "TokenPlanGroup") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.071, green: 0.075, blue: 0.078, alpha: 1)
            : .white
    })
    static let warning = Color(nsColor: NSColor(name: "TokenPlanWarning") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.769396, green: 0.627781, blue: 0.289127, alpha: 1)
            : NSColor(srgbRed: 0.941742, green: 0.749332, blue: 0, alpha: 1)
    })
    static let danger = Color(nsColor: NSColor(name: "TokenPlanDanger") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 0.779718, green: 0.360697, blue: 0.333166, alpha: 1)
            : NSColor(srgbRed: 0.920261, green: 0.341653, blue: 0.341226, alpha: 1)
    })
    static var traySurface: Color { Color(nsColor: trayNSColor) }

    /// Rounded surfaces are reserved for floating drag previews and clipped controls.
    static let cardCornerRadius: CGFloat = 8

    /// Shared shape for elevated surfaces and control clipping.
    static var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: cardCornerRadius, style: .continuous)
    }
}

extension View {
    /// Shared grouped surface for detail and settings controls, using the Linear neutral palette.
    func cardSurface() -> some View {
        background(Theme.groupSurface, in: Theme.cardShape)
            .overlay { Theme.cardShape.strokeBorder(.primary.opacity(0.07), lineWidth: 0.5).allowsHitTesting(false) }
    }

    /// A lifted preview needs its own backing so it stays readable over the rows being reordered.
    func liftedRowSurface() -> some View {
        background(.regularMaterial, in: Theme.cardShape)
            .clipShape(Theme.cardShape)
            .overlay { Theme.cardShape.strokeBorder(.separator, lineWidth: 0.5).allowsHitTesting(false) }
    }

    /// The trailing on/off switch styling shared by every settings + Customize row toggle: no inline
    /// label (the row's leading text is the label), the native switch style, small control size.
    func settingsSwitchStyle() -> some View {
        labelsHidden()
            .toggleStyle(.switch)
            .controlSize(.small)
    }
}


struct TokenPlanButtonStyle: ButtonStyle {
    var prominent = false
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 10).padding(.vertical, 7)
            .foregroundStyle(prominent ? Color.white : Color.primary)
            .background(prominent ? Theme.accent : Theme.fieldSurface, in: RoundedRectangle(cornerRadius: 8))
            .overlay { RoundedRectangle(cornerRadius: 8).strokeBorder(.primary.opacity(0.12), lineWidth: 0.5).allowsHitTesting(false) }
            .opacity(enabled ? (configuration.isPressed ? 0.7 : 1) : 0.4)
    }
}

extension View {
    func tokenPlanField() -> some View { modifier(TokenPlanFieldModifier()) }
}

private struct TokenPlanFieldModifier: ViewModifier {
    @FocusState private var focused: Bool
    func body(content: Content) -> some View {
        content.focused($focused)
            .font(.subheadline).padding(10)
            .background(Theme.fieldSurface, in: RoundedRectangle(cornerRadius: 8))
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(focused ? Theme.accent : Color.primary.opacity(0.15), lineWidth: focused ? 1.5 : 0.5)
                    .allowsHitTesting(false)
            }
    }
}

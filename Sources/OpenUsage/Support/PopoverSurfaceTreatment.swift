import SwiftUI

/// How the popover's page tray paints its base.
///
/// `.translucent` clears the page base so the AppKit behind-window vibrancy backdrop shows through.
/// `.opaque` covers it when transparency is disabled or accessibility requires it. The value is
/// driven from `PopoverTransparencyStore.surfaceTreatment` and read by `PopoverSurface`.
enum PopoverSurfaceTreatment: Equatable, Sendable {
    /// Solid panel backing shared by the flat content groups.
    case opaque
    /// The page clears to the behind-window blur, optionally tinted by the easter egg.
    case translucent
}

private struct PopoverSurfaceTreatmentKey: EnvironmentKey {
    static let defaultValue: PopoverSurfaceTreatment = .opaque
}

extension EnvironmentValues {
    var popoverSurfaceTreatment: PopoverSurfaceTreatment {
        get { self[PopoverSurfaceTreatmentKey.self] }
        set { self[PopoverSurfaceTreatmentKey.self] = newValue }
    }
}

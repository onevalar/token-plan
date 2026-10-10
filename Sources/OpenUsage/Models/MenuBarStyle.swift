import Foundation

/// Settings-owned menu-bar presentation, independent of the overview's quota style.
enum MenuBarStyle: String, CaseIterable, Hashable, Sendable {
    case percentage
    case ring

    var label: String {
        switch self {
        case .percentage: return tr("Percentage")
        case .ring: return tr("Ring")
        }
    }
}

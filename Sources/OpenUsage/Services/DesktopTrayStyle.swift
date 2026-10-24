import Foundation

/// The Tauri helper owns this choice; the frozen classic menu-bar style remains unchanged.
enum DesktopTrayStyle: String {
    case ring, percentage, sparkline

    static let key = "tokenplan.desktop.trayStyle"
    enum Failure: Error { case invalid }

    init(validating value: Any) throws {
        guard let raw = value as? String, let style = Self(rawValue: raw) else { throw Failure.invalid }
        self = style
    }

    /// A missing override inherits the classic choice without migrating or rewriting it.
    static func read(defaults: UserDefaults, legacyStyle: MenuBarStyle) throws -> String {
        guard let saved = defaults.object(forKey: key) else { return legacyStyle.rawValue }
        do {
            return try Self(validating: saved).rawValue
        } catch {
            AppLog.warn(.config, "Invalid saved desktop tray style at '\(key)'")
            throw error
        }
    }

    func save(defaults: UserDefaults) {
        defaults.set(rawValue, forKey: Self.key)
    }
}

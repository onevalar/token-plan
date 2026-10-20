import Foundation

enum AppDefaults {
    /// Foundation rejects suiteName when it is the current bundle's identifier.
    /// The signed helper shares the app identifier so it must use standard there.
    static func open(
        domain: String,
        bundleIdentifier: String? = Bundle.main.bundleIdentifier
    ) -> UserDefaults? {
        if domain == bundleIdentifier { return .standard }
        return UserDefaults(suiteName: domain)
    }
}

import AppKit

/// The interface language. `system` follows macOS; the others pin the app to one of the five shipped
/// translations. macOS reads a process's language once at launch, so a change is stored (here and in the
/// app's `AppleLanguages` default, which is what actually selects the `.lproj`) and takes effect after a
/// relaunch — Settings offers a "Restart Now" button for that.
enum LanguageSetting: String, Hashable, Sendable, CaseIterable, UserDefaultsBacked {
    case system
    case english = "en"
    case simplifiedChinese = "zh-Hans"
    case traditionalChinese = "zh-Hant"
    case japanese = "ja"
    case korean = "ko"

    static let key = "tokenplan.language"
    static let fallback = LanguageSetting.system

    /// Each language names itself in its own script, so a user who can't read the current UI language can
    /// still find theirs. Only "System Default" is translated.
    var label: String {
        switch self {
        case .system: return String(localized: "System Default")
        case .english: return "English"
        case .simplifiedChinese: return "简体中文"
        case .traditionalChinese: return "繁體中文"
        case .japanese: return "日本語"
        case .korean: return "한국어"
        }
    }

    /// Persist the choice and point `AppleLanguages` at it (or clear the override for `system`).
    @MainActor
    static func apply(_ language: LanguageSetting, defaults: UserDefaults = .standard) {
        if language == .system {
            defaults.removeObject(forKey: "AppleLanguages")
        } else {
            defaults.set([language.rawValue], forKey: "AppleLanguages")
        }
    }

    /// Relaunch the packaged app so the new language is picked up. A bare `swift run` has no bundle to
    /// reopen, so there it just quits and the developer starts it again.
    @MainActor
    static func relaunch() {
        let path = Bundle.main.bundlePath
        if path.hasSuffix(".app") {
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/bin/sh")
            process.arguments = ["-c", "sleep 0.6; /usr/bin/open -n \"$1\"", "sh", path]
            try? process.run()
        }
        NSApplication.shared.terminate(nil)
    }
}

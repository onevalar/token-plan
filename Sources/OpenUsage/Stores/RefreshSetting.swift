import Foundation

/// Single source of truth for the background refresh cadence.
///
/// The periodic refresh loop, the snapshot-cache TTL, the staleness hint and the footer countdown all
/// read the cadence through here so they can never disagree: the cache treats a snapshot as fresh for
/// exactly one refresh interval, and the loop re-fetches when that window elapses. The interval is a
/// user choice (Settings → General → Refresh Interval) persisted under `key`; it is read live, so a
/// change applies without a relaunch (`RefreshWakeSignal` wakes the loop on `didChangeNotification`).
enum RefreshSetting {
    static let key = "tokenplan.refreshMinutes"
    static let defaultMinutes = 5
    /// The choices offered in Settings, in minutes. 1 minute is the floor: providers rate-limit.
    static let options = [1, 2, 5, 10, 15, 30, 60]
    /// Posted after the stored interval changes, so the sleeping refresh loop re-evaluates at once.
    static let didChangeNotification = Notification.Name("TokenPlan.RefreshIntervalDidChange")

    /// The stored choice, or `defaultMinutes` when unset or not one of `options`.
    static func minutes(defaults: UserDefaults = .standard) -> Int {
        let stored = defaults.integer(forKey: key)
        return options.contains(stored) ? stored : defaultMinutes
    }

    static var interval: TimeInterval {
        TimeInterval(minutes() * 60)
    }

    static func setMinutes(_ minutes: Int, defaults: UserDefaults = .standard, center: NotificationCenter = .default) {
        guard options.contains(minutes), minutes != Self.minutes(defaults: defaults) else { return }
        defaults.set(minutes, forKey: key)
        center.post(name: didChangeNotification, object: nil)
    }

    /// Forget the choice (Reset All Settings).
    static func reset(defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: key)
        NotificationCenter.default.post(name: didChangeNotification, object: nil)
    }

    /// Picker label: "1 minute", "5 minutes", "1 hour".
    static func label(forMinutes minutes: Int) -> String {
        if minutes == 60 { return String(localized: "1 hour") }
        if minutes == 1 { return String(localized: "1 minute") }
        return String(localized: "\(minutes) minutes")
    }
}

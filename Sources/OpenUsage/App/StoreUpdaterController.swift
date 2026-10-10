#if APP_STORE_BUILD
import Foundation
import Observation

/// Store builds are updated by TestFlight/App Store. Sparkle is not linked into this target.
@MainActor
@Observable
final class UpdaterController {
    let isActive = false
    let canCheckForUpdates = false
    let availableUpdateVersion: String? = nil
    var betaChannelEnabled = false
    var automaticallyChecksForUpdates = false
    func start() {}
    func resetToDefaults() {}
    func checkForUpdates() {}
    func installAvailableUpdate() {}
    func dismissAvailableUpdate() {}
}
#endif

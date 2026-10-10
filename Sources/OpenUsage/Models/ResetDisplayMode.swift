import Foundation

/// Internal formatter choice. Quota rows always use countdowns; detail timelines also show expiry dates.
enum ResetDisplayMode: Equatable, Sendable {
    case relative
    case absolute
}

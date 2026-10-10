import Foundation

/// Preferences for the overview menu’s Usage History page.
enum TotalSpendSetting {
    /// The card's selected period (Today / Yesterday / 30 Days), persisted by `TotalSpendCard`.
    static let periodKey = "tokenplan.totalSpend.period"
    /// The card's selected metric (Cost / Cost/MTok / Tokens), persisted by `TotalSpendCard`.
    static let metricKey = "tokenplan.totalSpend.metric"
}

import Foundation

/// The shared editor submits one complete draft, validated before any layout mutation.
@MainActor
enum DesktopMetricLayout {
    enum Failure: Error { case invalid }

    static func apply(_ value: Any?, accountID: String, registry: WidgetRegistry, layout: LayoutStore) throws {
        let validIDs = Set(registry.descriptors(for: accountID).map(\.id))
        guard registry.provider(id: accountID) != nil,
              let rows = value as? [[String: String]], rows.count == validIDs.count,
              Set(rows.compactMap { $0["id"] }) == validIDs,
              rows.allSatisfy({ ["home", "details", "hidden"].contains($0["placement"] ?? "") })
        else { throw Failure.invalid }
        for row in rows {
            let metricID = row["id"]!, placement = row["placement"]!
            layout.setMetricEnabled(metricID, placement != "hidden")
            if placement == "details" { layout.expandedMetricIDs.insert(metricID) }
            else { layout.expandedMetricIDs.remove(metricID) }
        }
        layout.metricOrderByProvider[accountID] = rows.map { $0["id"]! }
        layout.persistExpanded()
        layout.persistMetricOrder()
        layout.syncPlacedOrder()
    }
}

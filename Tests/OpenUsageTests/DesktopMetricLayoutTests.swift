import XCTest
@testable import OpenUsage

@MainActor
final class DesktopMetricLayoutTests: XCTestCase {
    func testCompleteDraftPersistsAndInvalidDraftNeverPartlyApplies() throws {
        let suite = "TokenPlanTests.MetricDraft.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let registry = WidgetRegistry.from([ClaudeProvider(), CodexProvider()])
        let layout = LayoutStore(registry: registry, defaults: defaults)
        let ids = registry.descriptors(for: "claude").map(\.id).reversed()
        let rows = ids.enumerated().map { index, id in ["id": id, "placement": index == 0 ? "hidden" : index == 1 ? "details" : "home"] }
        let otherBefore = layout.metricOrder(for: "codex")
        let pinsBefore = layout.pinnedMetricIDs
        try DesktopMetricLayout.apply(rows, accountID: "claude", registry: registry, layout: layout)
        XCTAssertEqual(layout.metricOrder(for: "claude"), Array(ids))
        XCTAssertFalse(layout.isMetricEnabled(rows[0]["id"]!))
        XCTAssertTrue(layout.expandedMetricIDs.contains(rows[1]["id"]!))
        XCTAssertEqual(layout.metricOrder(for: "codex"), otherBefore)
        XCTAssertEqual(layout.pinnedMetricIDs, pinsBefore)
        let restored = LayoutStore(registry: registry, defaults: defaults)
        XCTAssertEqual(restored.metricOrder(for: "claude"), Array(ids))
        XCTAssertFalse(restored.isMetricEnabled(rows[0]["id"]!))
        XCTAssertTrue(restored.expandedMetricIDs.contains(rows[1]["id"]!))
        var duplicate = rows; duplicate[1] = duplicate[0]
        var badPlacement = rows; badPlacement[badPlacement.count - 1]["placement"] = "invalid"
        for invalid in [Array(rows.dropLast()), duplicate, badPlacement] {
            XCTAssertThrowsError(try DesktopMetricLayout.apply(invalid, accountID: "claude", registry: registry, layout: layout))
            XCTAssertEqual(layout.metricOrder(for: "claude"), Array(ids))
            XCTAssertFalse(layout.isMetricEnabled(rows[0]["id"]!))
        }
    }
}

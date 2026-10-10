import XCTest
@testable import OpenUsage

@MainActor
final class LayoutBootstrapTests: XCTestCase {
    func testFreshInstallUsesCurrentDefaults() {
        let (persistence, _) = makePersistence("Fresh")

        let state = LayoutBootstrap.load(
            registry: .mock,
            persistence: persistence,
            defaults: makeDefaultSet()
        )

        XCTAssertEqual(state.placed.map(\.descriptorID), ["claude.session", "claude.weekly"])
        XCTAssertEqual(state.pinnedMetricIDs, ["claude.session"])
        XCTAssertEqual(state.expandedMetricIDs, ["claude.weekly"])
        XCTAssertTrue(state.hiddenMenuBarServices.isEmpty)
        XCTAssertEqual(state.menuBarStyle, .percentage)
        XCTAssertEqual(state.seededDefaultsToPersist, ["claude.session", "claude.weekly"])
        XCTAssertTrue(state.shouldPersistExpanded)
        XCTAssertTrue(state.shouldPersistExpandOnEnable)
        XCTAssertFalse(state.shouldPersistPlaced)
    }

    func testExistingLayoutUsesLegacyBaselineWithoutRestoringRemovedMetric() {
        let (persistence, _) = makePersistence("ExistingBaseline")
        persistence.savePlaced([PlacedWidget(descriptorID: "claude.session")])

        let state = LayoutBootstrap.load(
            registry: .mock,
            persistence: persistence,
            defaults: makeDefaultSet()
        )

        XCTAssertEqual(state.placed.map(\.descriptorID), ["claude.session"])
        XCTAssertFalse(state.expandedMetricIDs.contains("claude.weekly"))
        XCTAssertFalse(state.shouldPersistExpanded)
        XCTAssertTrue(state.shouldPersistExpandOnEnable)
        XCTAssertFalse(state.shouldPersistPlaced)
        XCTAssertEqual(state.seededDefaultsToPersist, ["claude.session", "claude.weekly"])
    }

    func testPreviouslySeededMetricStaysOffWhenUserDisabledIt() {
        let (persistence, _) = makePersistence("UserDisabled")
        persistence.savePlaced([PlacedWidget(descriptorID: "claude.session")])
        persistence.saveSeededDefaults(["claude.session", "claude.weekly"])

        let state = LayoutBootstrap.load(
            registry: .mock,
            persistence: persistence,
            defaults: makeDefaultSet()
        )

        XCTAssertEqual(state.placed.map(\.descriptorID), ["claude.session"])
        XCTAssertFalse(state.shouldPersistPlaced)
        XCTAssertNil(state.seededDefaultsToPersist)
    }

    func testSavedMenuBarVisibilityLoadsWithoutDroppingAbsentServicesOrRewritingPreferences() {
        let (persistence, defaults) = makePersistence("HiddenServices")
        persistence.saveHiddenMenuBarServices(["claude", "temporarilyAbsent"])
        let saved = defaults.stringArray(forKey: "layout.hiddenMenuBarServices")

        let state = LayoutBootstrap.load(registry: .mock, persistence: persistence, defaults: makeDefaultSet())

        XCTAssertEqual(state.hiddenMenuBarServices, ["claude", "temporarilyAbsent"])
        XCTAssertEqual(defaults.stringArray(forKey: "layout.hiddenMenuBarServices"), saved)
    }

    func testMenuBarStyleLoadsWithoutStartupWrites() {
        let (persistence, defaults) = makePersistence("Style")
        for (raw, expected) in [("ring", MenuBarStyle.ring), ("percentage", .percentage),
                                ("text", .percentage), ("bars", .percentage), ("invalid", .percentage)] {
            defaults.set(raw, forKey: "layout.menuBarStyle")
            let state = LayoutBootstrap.load(registry: .mock, persistence: persistence, defaults: makeDefaultSet())
            XCTAssertEqual(state.menuBarStyle, expected)
            XCTAssertEqual(defaults.string(forKey: "layout.menuBarStyle"), raw)
        }
    }

    private func makeDefaultSet() -> LayoutDefaultSet {
        LayoutDefaultSet(
            metricIDs: ["claude.session", "claude.weekly"],
            migrationBaselineMetricIDs: ["claude.session", "claude.weekly"],
            pinnedMetricIDs: ["claude.session"],
            expandedMetricIDs: ["claude.weekly"]
        )
    }

    private func makePersistence(_ name: String) -> (LayoutPersistence, UserDefaults) {
        let suite = "TokenPlanTests.LayoutBootstrap.\(name).\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (LayoutPersistence(defaults: defaults, storageKey: "layout"), defaults)
    }
}

import XCTest
@testable import OpenUsage

@MainActor
final class LayoutPinBootstrapTests: XCTestCase {
    private func registry(_ ids: [String]) -> WidgetRegistry {
        let providers = ids.map { Provider(id: $0, displayName: "Claude", icon: .providerMark("claude")) }
        return WidgetRegistry(providers: providers, descriptors: providers.map {
            WidgetDescriptor(id: $0.id + ".session", providerID: $0.id, metricLabel: "Session",
                sample: WidgetData(title: "Session", icon: $0.icon, kind: .percent, used: 0, limit: 100))
        })
    }
    private func withPersistence(_ body: (LayoutPersistence) -> Void) {
        let suite = "TokenPlanTests.PinBootstrap.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        body(LayoutPersistence(defaults: defaults, storageKey: "layout"))
    }
    func testNewAccountSeedsIndependentlyOfExplicitEmptySibling() {
        withPersistence { p in
            let first = registry(["claude"]), both = registry(["claude", "claude@second"])
            _ = LayoutPinBootstrap.load(registry: first, persistence: p, defaultPins: ["claude.session"])
            p.savePins([])
            let pins = LayoutPinBootstrap.load(registry: both, persistence: p, defaultPins: ["claude.session", "claude@second.session"])
            XCTAssertEqual(pins, ["claude@second.session"])
            p.savePins([])
            XCTAssertTrue(LayoutPinBootstrap.load(registry: both, persistence: p, defaultPins: ["claude.session", "claude@second.session"]).isEmpty)
        }
    }
    func testLegacyExistingEmptyAccountIsPreservedButNewAccountSeeds() {
        withPersistence { p in
            p.savePlaced([PlacedWidget(descriptorID: "claude.session")])
            p.savePins([])
            XCTAssertEqual(LayoutPinBootstrap.load(registry: registry(["claude", "claude@new"]), persistence: p,
                defaultPins: ["claude.session", "claude@new.session"]), ["claude@new.session"])
        }
    }
    func testAmbiguousLegacyEmptySelectionIsNeverOverridden() {
        withPersistence { p in
            p.savePins([])
            XCTAssertTrue(LayoutPinBootstrap.load(registry: registry(["claude"]), persistence: p, defaultPins: ["claude.session"]).isEmpty)
        }
    }
    func testTemporarilyAbsentAccountRetainsItsChoice() {
        withPersistence { p in
            let both = registry(["claude", "claude@second"]), defaults = ["claude.session", "claude@second.session"]
            _ = LayoutPinBootstrap.load(registry: both, persistence: p, defaultPins: defaults)
            p.savePins(["claude.session"])
            _ = LayoutPinBootstrap.load(registry: registry(["claude"]), persistence: p, defaultPins: defaults)
            XCTAssertEqual(LayoutPinBootstrap.load(registry: both, persistence: p, defaultPins: defaults), ["claude.session"])
        }
    }
}

import XCTest
@testable import OpenUsage

/// The desktop shell shows "refreshed" after a press of Refresh, so the helper must actually fetch then.
/// These cover the two ways it used to answer from a snapshot instead: the press was not treated as a
/// forced refresh, and a snapshot left by the previous launch counted as fresh.
@MainActor
final class DesktopBridgeRefreshTests: XCTestCase {
    func testOnlyAnExplicitForceFlagForcesARefresh() {
        XCTAssertTrue(DesktopBridge.isForcedRefresh(["method": "refresh", "force": true]))
        XCTAssertFalse(DesktopBridge.isForcedRefresh(["method": "refresh", "force": false]))
        XCTAssertFalse(DesktopBridge.isForcedRefresh(["method": "refresh"]))
        XCTAssertFalse(DesktopBridge.isForcedRefresh(["method": "refresh", "force": "yes"]))
    }

    func testSnapshotLeftByPreviousLaunchDoesNotSuppressFirstRefresh() async {
        let fixture = Fixture()
        // The previous launch fetched a moment ago and quit.
        DesktopBridge.makeSnapshotCache(defaults: fixture.defaults, now: fixture.clock.now)
            .store(fixture.snapshot(refreshedAt: fixture.clock.date))

        let store = fixture.makeStore(clock: fixture.clock)
        await store.refreshAll()

        XCTAssertEqual(fixture.runtime.refreshCount, 1)
    }

    func testRefreshesCloseTogetherAreCoalescedUnlessForced() async {
        let fixture = Fixture()
        let store = fixture.makeStore(clock: fixture.clock)

        await store.refreshAll()
        XCTAssertEqual(fixture.runtime.refreshCount, 1)

        // A scheduled tick a few seconds later reuses the snapshot…
        fixture.clock.advance(by: 5)
        await store.refreshAll()
        XCTAssertEqual(fixture.runtime.refreshCount, 1)

        // …but a press of Refresh always fetches.
        await store.refreshAll(force: true)
        XCTAssertEqual(fixture.runtime.refreshCount, 2)
    }

    func testScheduledRefreshFetchesOnceTheCoalescingWindowHasPassed() async {
        let fixture = Fixture()
        let store = fixture.makeStore(clock: fixture.clock)

        await store.refreshAll()
        fixture.clock.advance(by: DesktopBridge.coalescingWindow + 1)
        await store.refreshAll()

        XCTAssertEqual(fixture.runtime.refreshCount, 2)
    }
}

private final class Clock {
    private(set) var date = Date(timeIntervalSince1970: 1_800_000_000)
    func advance(by seconds: TimeInterval) { date = date.addingTimeInterval(seconds) }
    var now: () -> Date { { [unowned self] in self.date } }
}

@MainActor
private struct Fixture {
    static let provider = Provider(id: "test", displayName: "Test", icon: .providerMark("cursor"))
    static let descriptor = WidgetDescriptor(
        id: "test.alpha",
        providerID: provider.id,
        metricLabel: "Alpha",
        sample: WidgetData(title: "Alpha", icon: provider.icon, kind: .percent, used: 10, limit: 100)
    )

    let defaults: UserDefaults
    let clock = Clock()
    let runtime: CountingProviderRuntime

    init() {
        let suiteName = "TokenPlanTests.DesktopBridgeRefresh.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        runtime = CountingProviderRuntime(
            provider: Self.provider,
            descriptors: [Self.descriptor],
            snapshot: ProviderSnapshot(
                providerID: Self.provider.id,
                displayName: Self.provider.displayName,
                plan: nil,
                lines: [.progress(label: "Alpha", used: 20, limit: 100, format: .percent)],
                refreshedAt: clock.date
            )
        )
    }

    func snapshot(refreshedAt: Date) -> ProviderSnapshot {
        ProviderSnapshot(
            providerID: Self.provider.id,
            displayName: Self.provider.displayName,
            plan: nil,
            lines: [.progress(label: "Alpha", used: 20, limit: 100, format: .percent)],
            refreshedAt: refreshedAt
        )
    }

    /// A store wired like the helper's: a fresh cache instance is a fresh launch.
    func makeStore(clock: Clock) -> WidgetDataStore {
        WidgetDataStore(
            registry: WidgetRegistry(providers: [Self.provider], descriptors: [Self.descriptor]),
            providers: [runtime],
            cache: DesktopBridge.makeSnapshotCache(defaults: defaults, now: clock.now),
            defaults: defaults
        )
    }
}

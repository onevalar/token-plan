import XCTest
@testable import OpenUsage

/// Covers the menu-bar pin model on `LayoutStore`: the ≤2-per-provider rendering cap, denial
/// reasons/notices, order derivation from the Customize order,
/// disabled-provider handling, and persistence across relaunch.
@MainActor
final class MenuBarPinTests: XCTestCase {
    func testRemovedAccountLeavesAllListsImmediately() {
        let store = LayoutStore(registry: makeRegistry(providerIDs: ["claude", "claude@removed", "claude@third"]),
                                defaults: makeDefaults("removed"), storageKey: "layout")
        store.isProviderRemoved = { $0 == "claude@removed" }
        XCTAssertEqual(store.customizeProviderRows.map(\.id), ["claude", "claude@third"])
        XCTAssertEqual(store.menuBarEntries.map(\.id), ["claude", "claude@third"])
        XCTAssertFalse(store.displayGroups.contains { $0.id == "claude@removed" })
    }

    func testDesktopThreePinsPersistAndRejectFourthWithoutChangingClassicCap() {
        let defaults = makeDefaults("desktop-three")
        let registry = makeRegistry(metricCount: 4)
        let desktop = LayoutStore(registry: registry, pinLimit: 3, defaults: defaults, storageKey: "layout")
        for n in 1...4 { desktop.setPinned(true, for: "a.m\(n)") }
        XCTAssertEqual(desktop.pinnedCount(forProvider: "a"), 3)
        XCTAssertFalse(desktop.isPinned("a.m4"))
        let reload = LayoutStore(registry: registry, pinLimit: 3, defaults: defaults, storageKey: "layout")
        XCTAssertTrue(reload.isPinned("a.m3"))
        reload.menuBarStyle = .ring
        reload.menuBarStyle = .percentage
        XCTAssertTrue(reload.isPinned("a.m3"))
        let classic = LayoutStore(registry: registry, defaults: makeDefaults("classic-two"))
        for n in 1...3 { classic.setPinned(true, for: "a.m\(n)") }
        XCTAssertEqual(classic.pinnedCount(forProvider: "a"), 2)
    }

    func testNoPinsByDefault() {
        let store = makeStore("default")
        XCTAssertTrue(store.pinnedMetricIDs.isEmpty)
        XCTAssertTrue(store.pinnedGroups.isEmpty)
        XCTAssertTrue(store.hiddenMenuBarServices.isEmpty)
        XCTAssertEqual(store.menuBarStyle, .percentage)
        XCTAssertEqual(store.menuBarServices.map(\.id), ["a", "b"])
        XCTAssertTrue(store.menuBarServices.allSatisfy { store.isMenuBarServiceVisible($0.id) })
    }

    func testPinUnpinPersistsAcrossReload() {
        let defaults = makeDefaults("persist")
        let store = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")

        store.setPinned(true, for: "a.m1")
        XCTAssertTrue(store.isPinned("a.m1"))

        let reloaded = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertTrue(reloaded.isPinned("a.m1"))

        reloaded.setPinned(false, for: "a.m1")
        let reloadedAgain = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertFalse(reloadedAgain.isPinned("a.m1"))
    }

    func testPerProviderCapBlocksThirdPinUntilSlotIsFreed() {
        let store = makeStore("perProvider")
        store.setPinned(true, for: "a.m1")
        store.setPinned(true, for: "a.m2")

        XCTAssertFalse(store.canPin("a.m3"))
        store.setPinned(true, for: "a.m3")
        XCTAssertFalse(store.isPinned("a.m3"))
        XCTAssertEqual(store.pinnedCount(forProvider: "a"), 2)

        // An already-pinned id stays pinnable so its toggle can still unpin it.
        XCTAssertTrue(store.canPin("a.m1"))

        store.setPinned(false, for: "a.m1")
        XCTAssertTrue(store.canPin("a.m3"))
    }

    func testPinAvailabilityTracksRemovalReplacementAndUndo() {
        let store = makeStore("selectionAvailability")
        store.setPinned(true, for: "a.m1")
        store.setPinned(true, for: "a.m2")
        XCTAssertFalse(store.canPin("a.m3"))
        XCTAssertTrue(store.canPin("a.m1"), "Selected checkboxes must remain removable at the cap")
        XCTAssertTrue(store.canPin("b.m1"), "The cap must not disable another subscription")

        store.setPinned(false, for: "a.m1")
        XCTAssertEqual(store.pinnedCount(forProvider: "a"), 1)
        XCTAssertTrue(store.canPin("a.m3"))
        store.setPinned(true, for: "a.m3")
        XCTAssertFalse(store.canPin("a.m1"))
        XCTAssertEqual(store.pinnedCount(forProvider: "a"), 2)

        XCTAssertTrue(store.undo())
        XCTAssertTrue(store.canPin("a.m1"))
        XCTAssertEqual(store.pinnedCount(forProvider: "a"), 1)
        XCTAssertTrue(store.undo())
        XCTAssertFalse(store.canPin("a.m3"))
        XCTAssertEqual(store.pinnedCount(forProvider: "a"), 2)
    }

    func testEachProviderCanPinUpToTwo() {
        let store = makeStore("manyProviders")
        for provider in ["a", "b"] {
            store.setPinned(true, for: "\(provider).m1")
            store.setPinned(true, for: "\(provider).m2")
            XCTAssertFalse(store.canPin("\(provider).m3"))
        }
        XCTAssertEqual(store.pinnedMetricIDs.count, 4)
    }

    func testPinDenialReasonsAndFooterNotice() {
        let store = makeStore("denial")
        XCTAssertNil(store.pinDenialReason("a.m1"))

        store.setPinned(true, for: "a.m1")
        store.setPinned(true, for: "a.m2")
        XCTAssertEqual(store.pinDenialReason("a.m3"), "Up to 2 stars per provider")
        XCTAssertNil(store.pinDenialReason("b.m1"))

        // A denied click surfaces the reason as the transient footer notice and bumps the shake
        // trigger every time, so repeat clicks re-shake even while the text is unchanged.
        XCTAssertNil(store.pinLimitNotice)
        XCTAssertEqual(store.pinNoticeShakeTrigger, 0)
        store.notePinDenied("a.m3")
        XCTAssertEqual(store.pinLimitNotice, "Up to 2 stars per provider")
        XCTAssertEqual(store.pinNoticeShakeTrigger, 1)
        store.notePinDenied("a.m3")
        XCTAssertEqual(store.pinNoticeShakeTrigger, 2)
    }

    func testPinnedGroupsFollowCustomizeOrder() {
        let store = makeStore("order")
        // Pin out of order; expect provider order (a before b) and metric order (m1 before m2).
        store.setPinned(true, for: "b.m2")
        store.setPinned(true, for: "a.m2")
        store.setPinned(true, for: "a.m1")

        XCTAssertEqual(store.pinnedGroups.flatMap { $0.metrics.map(\.id) }, ["a.m1", "a.m2", "b.m2"])
        XCTAssertEqual(store.pinnedGroups.map(\.provider.id), ["a", "b"])
    }

    func testDisabledProviderPinsExcludedFromGroupsButKept() {
        let store = LayoutStore(
            registry: makeRegistry(),
            defaults: makeDefaults("disabled"),
            storageKey: "layout",
            isProviderEnabled: { $0 != "a" }
        )
        store.setPinned(true, for: "a.m1")
        store.setPinned(true, for: "b.m1")

        XCTAssertEqual(store.pinnedGroups.map(\.provider.id), ["b"])
        XCTAssertTrue(store.isPinned("a.m1"))  // membership preserved while hidden
    }

    func testResetToDefaultClearsPins() {
        let store = makeStore("reset")
        store.setPinned(true, for: "a.m1")
        store.resetToDefault()
        XCTAssertTrue(store.pinnedMetricIDs.isEmpty)
    }

    func testHidingServicePreservesPinsDashboardLayoutAndEnablement() {
        let defaults = makeDefaults("independentVisibility")
        let enablement = ProviderEnablementStore(defaults: defaults)
        enablement.seedEnabledProviders(["a", "b"])
        var enablementChanges = 0
        enablement.onChange = { enablementChanges += 1 }
        let store = LayoutStore(
            registry: makeRegistry(), defaults: defaults, storageKey: "layout",
            defaultMetricIDs: ["a.m1", "a.m2", "b.m1"],
            defaultPinnedMetricIDs: ["a.m1", "a.m2", "b.m1"],
            defaultExpandedMetricIDs: ["a.m2"],
            isProviderEnabled: { enablement.isEnabled($0) }
        )
        let pins = store.pinnedMetricIDs
        let placed = store.placed
        let visible = store.visiblePlaced
        let dashboard = store.displayGroups.flatMap(\.widgets)
        let providerOrder = store.providerOrder
        let metricOrder = store.metricOrderByProvider
        let expanded = store.expandedMetricIDs
        let onEnable = store.defaultExpandedOnEnableIDs
        let stripIDs = store.pinnedGroups.flatMap { $0.metrics.map(\.id) }

        store.setMenuBarServiceVisible(false, for: "a")

        XCTAssertEqual(store.pinnedGroups.map(\.id), ["b"])
        XCTAssertEqual(store.menuBarServices.map(\.id), ["a", "b"])
        XCTAssertEqual(store.pinnedMetricIDs, pins)
        XCTAssertEqual(store.placed, placed)
        XCTAssertEqual(store.visiblePlaced, visible)
        XCTAssertEqual(store.displayGroups.flatMap(\.widgets), dashboard)
        XCTAssertEqual(store.providerOrder, providerOrder)
        XCTAssertEqual(store.metricOrderByProvider, metricOrder)
        XCTAssertEqual(store.expandedMetricIDs, expanded)
        XCTAssertEqual(store.defaultExpandedOnEnableIDs, onEnable)
        XCTAssertFalse(store.canUndo)
        XCTAssertEqual(enablement.enabledIDs, ["a", "b"])
        XCTAssertEqual(enablementChanges, 0) // No enablement callback to wake refresh or rewrite history.

        store.setMenuBarServiceVisible(true, for: "a")
        XCTAssertEqual(store.pinnedGroups.flatMap { $0.metrics.map(\.id) }, stripIDs)
        XCTAssertEqual(store.pinnedMetricIDs, pins)
    }

    func testHiddenServicesPersistAndReshowRestoresExactPinsAndOrder() {
        let defaults = makeDefaults("hiddenPersist")
        let store = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        store.setPinned(true, for: "a.m3")
        store.setPinned(true, for: "a.m1")
        store.setPinned(true, for: "b.m2")
        store.reorderProvider(dragged: "b", target: "a")
        store.reorderMetric(dragged: "a.m3", target: "a.m1", in: "a")
        let stripIDs = store.pinnedGroups.flatMap { $0.metrics.map(\.id) }
        let savedPins = defaults.stringArray(forKey: "layout.menuBarPins")
        store.setMenuBarServiceVisible(false, for: "a")

        let reloaded = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertEqual(reloaded.hiddenMenuBarServices, ["a"])
        XCTAssertEqual(reloaded.pinnedGroups.map(\.id), ["b"])
        XCTAssertEqual(reloaded.pinnedMetricIDs, store.pinnedMetricIDs)
        XCTAssertEqual(defaults.stringArray(forKey: "layout.menuBarPins"), savedPins)

        reloaded.setMenuBarServiceVisible(true, for: "a")
        XCTAssertEqual(reloaded.pinnedGroups.flatMap { $0.metrics.map(\.id) }, stripIDs)
        XCTAssertEqual(defaults.stringArray(forKey: "layout.menuBarPins"), savedPins)
        let shown = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertTrue(shown.hiddenMenuBarServices.isEmpty)
        XCTAssertEqual(shown.pinnedGroups.flatMap { $0.metrics.map(\.id) }, stripIDs)
    }

    func testHideEveryServiceProducesAppIconFallbackWithoutUnpinning() {
        let store = makeStore("hideAll")
        store.setPinned(true, for: "a.m1")
        store.setPinned(true, for: "b.m2")
        let pins = store.pinnedMetricIDs
        for service in store.menuBarServices {
            store.setMenuBarServiceVisible(false, for: service.id)
        }

        let content = MenuBarContentBuilder.build(groups: store.pinnedGroups, data: { $0.sample })
        XCTAssertTrue(content.isEmpty)
        for style in MenuBarStyle.allCases {
            store.menuBarStyle = style
            XCTAssertNil(MenuBarStripRenderer.image(for: content, style: store.menuBarStyle))
        }
        XCTAssertEqual(store.pinnedMetricIDs, pins)
        XCTAssertEqual(store.menuBarServices.map(\.id), ["a", "b"])
    }

    func testServiceListIncludesNoDataNoPinsAndNoMetricsButExcludesDisabledServices() {
        let providers = ["a", "b", "c", "disabled"].map {
            Provider(id: $0, displayName: $0.uppercased(), icon: .providerMark("cursor"))
        }
        var sample = metric(providers[0], id: "a.noData", label: "No Data").sample
        sample.hasData = false
        let noData = WidgetDescriptor(id: "a.noData", providerID: "a", metricLabel: "No Data", sample: sample)
        let registry = WidgetRegistry(providers: providers, descriptors: [noData])
        let store = LayoutStore(
            registry: registry, defaults: makeDefaults("unpinnedServices"), storageKey: "layout",
            defaultPinnedMetricIDs: ["a.noData"], isProviderEnabled: { $0 != "disabled" }
        )
        XCTAssertTrue(MenuBarContentBuilder.build(groups: store.pinnedGroups, data: { $0.sample }).isEmpty)
        XCTAssertEqual(store.menuBarServices.map(\.id), ["a", "b", "c"])

        store.setMenuBarServiceVisible(false, for: "b")
        XCTAssertFalse(store.isMenuBarServiceVisible("b"))
        XCTAssertEqual(store.menuBarServices.map(\.id), ["a", "b", "c"])
    }

    func testOneToggleControlsEveryAccountInServiceFamily() {
        let defaults = makeDefaults("accountFamilies")
        let ids = ["claude@work", "b", "claude", "codex", "codex@work", "claude@disabled"]
        let registry = makeRegistry(providerIDs: ids)
        let store = LayoutStore(
            registry: registry, defaults: defaults, storageKey: "layout",
            defaultPinnedMetricIDs: ids.map { "\($0).m1" },
            isProviderEnabled: { $0 != "claude@disabled" }
        )
        XCTAssertEqual(store.menuBarServices.map(\.id), ["claude", "b", "codex"])
        XCTAssertEqual(store.menuBarServices.map(\.displayName), ["Claude", "B", "Codex"])
        let pins = store.pinnedMetricIDs

        store.setMenuBarServiceVisible(false, for: "claude@work")
        XCTAssertEqual(store.hiddenMenuBarServices, ["claude"])
        XCTAssertFalse(store.isMenuBarServiceVisible("claude"))
        XCTAssertFalse(store.isMenuBarServiceVisible("claude@newAccount"))
        XCTAssertTrue(store.isMenuBarServiceVisible("codex@work"))
        XCTAssertEqual(store.pinnedGroups.map(\.id), ["b", "codex", "codex@work"])
        XCTAssertEqual(defaults.stringArray(forKey: "layout.hiddenMenuBarServices"), ["claude"])
        XCTAssertEqual(store.pinnedMetricIDs, pins)

        store.setMenuBarServiceVisible(true, for: "claude")
        XCTAssertEqual(store.pinnedGroups.map(\.id), Array(ids.dropLast()))
        XCTAssertEqual(store.pinnedMetricIDs, pins)
    }

    func testCustomizationResetsAndUndoKeepSettingsOwnedMenuBarChoices() {
        let store = makeStore("visibilityReset")
        store.setPinned(true, for: "a.m1")
        store.setMenuBarServiceVisible(false, for: "a")
        store.menuBarStyle = .ring
        XCTAssertTrue(store.undo())
        XCTAssertEqual(store.hiddenMenuBarServices, ["a"])
        XCTAssertEqual(store.menuBarStyle, .ring)
        store.resetProvider("a")
        XCTAssertEqual(store.hiddenMenuBarServices, ["a"])
        XCTAssertEqual(store.menuBarStyle, .ring)
        store.resetToDefault()
        XCTAssertEqual(store.hiddenMenuBarServices, ["a"])
        XCTAssertEqual(store.menuBarStyle, .ring)

        store.resetMenuBarSettings()
        XCTAssertTrue(store.hiddenMenuBarServices.isEmpty)
        XCTAssertTrue(store.isMenuBarServiceVisible("a"))
        XCTAssertEqual(store.menuBarStyle, .percentage)
    }

    func testUserSelectsAllOrIndividualAccountsWithoutAutomaticSelectionOrRenumbering() {
        let defaults = makeDefaults("accountVisibility")
        let ids = ["claude", "claude@work", "codex"]
        let registry = makeRegistry(providerIDs: ids)
        let store = LayoutStore(
            registry: registry, defaults: defaults, storageKey: "layout",
            defaultMetricIDs: ids.map { "\($0).m1" }, defaultPinnedMetricIDs: []
        )
        // Save stars through the same user action as the UI, rather than changing the application's
        // startup defaults only for the first instance of this synthetic registry.
        for id in ids { store.setPinned(true, for: "\(id).m1") }
        let dashboard = store.displayGroups.flatMap(\.widgets)
        let pins = store.pinnedMetricIDs
        for style in MenuBarStyle.allCases {
            store.menuBarStyle = style
            XCTAssertEqual(store.menuBarGroups.map(\.id), ids)
            store.setMenuBarAccountVisible(false, for: "claude")
            XCTAssertTrue(store.isMenuBarServiceVisible("claude"), "Default card is not the family switch")
            XCTAssertEqual(store.menuBarGroups.map(\.id), ["claude@work", "codex"])
            XCTAssertEqual(store.menuBarAccountNumbers["claude@work"], 2)
            XCTAssertNil(store.menuBarAccountNumbers["codex"])
            XCTAssertEqual(store.displayGroups.flatMap(\.widgets), dashboard)
            XCTAssertEqual(store.pinnedMetricIDs, pins)
            XCTAssertEqual(store.menuBarAccounts(for: "claude").map(\.id), ["claude", "claude@work"])

            store.setMenuBarServiceVisible(false, for: "claude")
            XCTAssertEqual(store.menuBarGroups.map(\.id), ["codex"])
            store.setMenuBarServiceVisible(true, for: "claude")
            XCTAssertEqual(store.menuBarGroups.map(\.id), ["claude@work", "codex"])
            let reloaded = LayoutStore(
                registry: registry, defaults: defaults, storageKey: "layout",
                defaultMetricIDs: ids.map { "\($0).m1" }, defaultPinnedMetricIDs: []
            )
            XCTAssertEqual(reloaded.menuBarGroups.map(\.id), ["claude@work", "codex"])
            XCTAssertEqual(reloaded.menuBarAccountNumbers["claude@work"], 2)
            XCTAssertEqual(reloaded.pinnedMetricIDs, pins)
            XCTAssertEqual(reloaded.displayGroups.flatMap(\.widgets).map(\.descriptorID), dashboard.map(\.descriptorID))
            store.setMenuBarAccountVisible(true, for: "claude")
            XCTAssertEqual(store.menuBarGroups.map(\.id), ids)
        }
    }

    func testSettingsAndStripShareGroupedAccountOrderAndIndividualSwitches() {
        let defaults = makeDefaults("groupedEntries")
        let ids = ["claude", "codex", "claude@work"]
        let store = LayoutStore(registry: makeRegistry(providerIDs: ids), defaults: defaults, storageKey: "layout",
                                defaultMetricIDs: ids.map { "\($0).m1" }, defaultPinnedMetricIDs: [])
        for id in ids { store.setPinned(true, for: "\(id).m1") }
        XCTAssertEqual(store.menuBarEntries.map(\.id), ["claude", "claude@work", "codex"])
        XCTAssertEqual(store.menuBarEntries.filter { ProviderAccountID.family(of: $0.id) == "claude" }.count, 2)
        for style in MenuBarStyle.allCases {
            store.menuBarStyle = style
            XCTAssertEqual(store.menuBarGroups.map(\.id), store.menuBarEntries.map(\.id))
            store.setMenuBarServiceVisible(false, for: "claude")
            store.setMenuBarEntrySelected(true, for: "claude@work")
            XCTAssertFalse(store.isMenuBarEntrySelected("claude"))
            XCTAssertTrue(store.isMenuBarEntrySelected("claude@work"))
            XCTAssertEqual(store.menuBarGroups.map(\.id), ["claude@work", "codex"])
            store.setMenuBarEntrySelected(true, for: "claude")
        }
        let provider = Provider(id: "claude@work", displayName: "Claude — redundant Organization", icon: .providerMark("claude"), accountLabel: "work@example.com")
        XCTAssertEqual(provider.menuBarEntryLabel, "Claude-work@example.com")
    }

    func testBothStylesKeepSelectedAccountsEvenWithoutStars() {
        let ids = ["claude", "codex", "claude@work"]
        let store = LayoutStore(registry: makeRegistry(providerIDs: ids), defaults: makeDefaults("noAccountPins"),
                                storageKey: "layout", defaultMetricIDs: ids.map { "\($0).m1" }, defaultPinnedMetricIDs: [])
        store.setPinned(true, for: "claude.m1")
        let pins = store.pinnedMetricIDs
        for style in MenuBarStyle.allCases {
            store.menuBarStyle = style
            XCTAssertEqual(store.menuBarGroups.map(\.id), ["claude", "claude@work", "codex"])
            XCTAssertEqual(store.pinnedMetricIDs, pins)
        }
    }

    func testSavedStylesLoadWithoutStartupPreferenceRewrite() throws {
        for (raw, expected) in [("percentage", MenuBarStyle.percentage), ("ring", .ring),
                                ("text", .percentage), ("bars", .percentage), ("invalid", .percentage)] {
            let defaults = makeDefaults("savedStyle.\(raw)")
            defaults.set(raw, forKey: "layout.menuBarStyle")
            let store = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
            XCTAssertEqual(store.menuBarStyle, expected)
            XCTAssertTrue(store.hiddenMenuBarServices.isEmpty)
            XCTAssertNil(defaults.object(forKey: "layout.hiddenMenuBarServices"))
            XCTAssertEqual(defaults.string(forKey: "layout.menuBarStyle"), raw)
            store.setPinned(true, for: "a.m1")
            let content = MenuBarContentBuilder.build(groups: store.pinnedGroups, data: { $0.sample })
            let image = try XCTUnwrap(MenuBarStripRenderer.image(for: content, style: store.menuBarStyle))
            XCTAssertEqual(image.accessibilityDescription, "A M1 10%")
            XCTAssertEqual(defaults.string(forKey: "layout.menuBarStyle"), raw)
        }
    }

    func testStylePersistsWithoutChangingVisibilityPinsOrUndo() {
        let defaults = makeDefaults("stylePersist")
        let store = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertNil(defaults.object(forKey: "layout.menuBarStyle"))
        store.setMenuBarServiceVisible(false, for: "a")
        store.menuBarStyle = .ring
        XCTAssertFalse(store.canUndo)
        XCTAssertTrue(store.pinnedMetricIDs.isEmpty)
        XCTAssertEqual(store.hiddenMenuBarServices, ["a"])
        XCTAssertEqual(defaults.string(forKey: "layout.menuBarStyle"), "ring")

        let reloaded = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertEqual(reloaded.menuBarStyle, .ring)
        XCTAssertEqual(reloaded.hiddenMenuBarServices, ["a"])
        reloaded.menuBarStyle = .percentage
        XCTAssertEqual(defaults.string(forKey: "layout.menuBarStyle"), "percentage")
        XCTAssertEqual(LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout").menuBarStyle, .percentage)
    }

    func testSettingsResetReplacesLegacyRawStyleAndPersistsBothDefaults() {
        let defaults = makeDefaults("styleReset")
        defaults.set("bars", forKey: "layout.menuBarStyle")
        let store = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        store.setMenuBarServiceVisible(false, for: "a")
        store.resetMenuBarSettings()
        XCTAssertEqual(defaults.string(forKey: "layout.menuBarStyle"), "percentage")
        XCTAssertEqual(defaults.stringArray(forKey: "layout.hiddenMenuBarServices"), [])
        let reloaded = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")
        XCTAssertEqual(reloaded.menuBarStyle, .percentage)
        XCTAssertTrue(reloaded.hiddenMenuBarServices.isEmpty)
    }

    func testInvalidPinnedIDsDroppedOnLoad() {
        let defaults = makeDefaults("invalid")
        defaults.set(["a.m1", "ghost.metric"], forKey: "layout.menuBarPins")
        let store = LayoutStore(registry: makeRegistry(), defaults: defaults, storageKey: "layout")

        XCTAssertTrue(store.isPinned("a.m1"))
        XCTAssertFalse(store.isPinned("ghost.metric"))
    }

    // MARK: - Fixtures

    private func makeStore(_ name: String) -> LayoutStore {
        LayoutStore(registry: makeRegistry(), defaults: makeDefaults(name), storageKey: "layout")
    }

    /// Two providers, each with three percent metrics, are sufficient to exercise provider-local caps.
    private func makeRegistry(providerIDs: [String] = ["a", "b"], metricCount: Int = 3) -> WidgetRegistry {
        let providers = providerIDs.map { id in
            Provider(id: id, displayName: id.uppercased(), icon: .providerMark("cursor"))
        }
        let descriptors = providers.flatMap { provider in
            (1...metricCount).map { n in metric(provider, id: "\(provider.id).m\(n)", label: "M\(n)") }
        }
        return WidgetRegistry(providers: providers, descriptors: descriptors)
    }

    private func metric(_ provider: Provider, id: String, label: String) -> WidgetDescriptor {
        WidgetDescriptor(
            id: id,
            providerID: provider.id,
            metricLabel: label,
            sample: WidgetData(
                title: label,
                icon: provider.icon,
                kind: .percent,
                used: 10,
                limit: 100
            )
        )
    }

    private func makeDefaults(_ name: String) -> UserDefaults {
        let suiteName = "TokenPlanTests.MenuBarPin.\(name).\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        return defaults
    }
}

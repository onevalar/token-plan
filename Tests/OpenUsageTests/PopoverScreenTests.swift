import XCTest
@testable import OpenUsage

/// The in-popover screen mode (dashboard / Customize / Settings) and its `isEditing` bridge,
/// which older call sites still drive Customize through.
@MainActor
final class PopoverScreenTests: XCTestCase {
    func testStartsOnDashboard() {
        let store = makeStore("Default")
        XCTAssertEqual(store.screen, .dashboard)
        XCTAssertFalse(store.isEditing)
    }

    func testIsEditingBridgesCustomizeScreen() {
        let store = makeStore("Bridge")

        store.isEditing = true
        XCTAssertEqual(store.screen, .customize)

        store.isEditing = false
        XCTAssertEqual(store.screen, .dashboard)
    }

    func testSettingsScreenIsNotEditing() {
        let store = makeStore("Settings")

        store.screen = .settings
        XCTAssertFalse(store.isEditing)
    }

    func testScreensReplaceEachOther() {
        let store = makeStore("Switch")

        store.screen = .customize
        store.screen = .settings
        XCTAssertEqual(store.screen, .settings)
        XCTAssertFalse(store.isEditing)

        store.screen = .customize
        XCTAssertTrue(store.isEditing)
    }

    func testBackFollowsSettingsSubpagesAndSubscriptionEntryPoint() {
        let store = makeStore("BackRoutes")
        store.screen = .settings
        for page in SettingsPage.allCases {
            store.settingsPage = page
            XCTAssertTrue(store.goBack())
            XCTAssertEqual(store.screen, .settings)
            XCTAssertNil(store.settingsPage)
        }

        store.screen = .customize
        store.customizeProviderID = "claude"
        store.goBack()
        XCTAssertNil(store.customizeProviderID)
        XCTAssertEqual(store.screen, .customize)
        store.goBack()
        XCTAssertEqual(store.screen, .settings)
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard)

        store.customizeProviderID = "codex"
        store.screen = .customize
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard, "A plan opened from the overview returns there directly")
        XCTAssertNil(store.customizeProviderID)
        XCTAssertFalse(store.goBack(), "Only the overview delegates Esc to closing the panel")
        store.screen = .settings
        store.settingsPage = .advanced
        store.screen = .dashboard
        XCTAssertNil(store.settingsPage, "Reopening Settings never strands the user in a subpage")
    }

    func testOutgoingSubroutesRemainDisplayOnlyAndNeverLeakIntoANewVisit() {
        let store = makeStore("OutgoingRoutes")
        store.customizeProviderID = "claude"
        store.screen = .customize
        XCTAssertEqual(store.displayedCustomizeProviderID, "claude")
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard)
        XCTAssertNil(store.customizeProviderID)
        XCTAssertEqual(store.displayedCustomizeProviderID, "claude",
                      "The outgoing detail must not become Services & Subscriptions before sliding away")
        store.screen = .customize
        XCTAssertNil(store.displayedCustomizeProviderID, "A new visit starts at Services & Subscriptions")
        store.customizeProviderID = "codex"
        XCTAssertEqual(store.displayedCustomizeProviderID, "codex")
        store.goBack() // Back within the same screen returns to its list, not the old detail.
        XCTAssertEqual(store.screen, .customize)
        XCTAssertNil(store.displayedCustomizeProviderID)

        store.screen = .settings
        store.settingsPage = .appearance
        XCTAssertEqual(store.displayedSettingsPage, .appearance)
        store.screen = .dashboard // Cmd-, exits even from a secondary Settings page.
        XCTAssertNil(store.settingsPage)
        XCTAssertEqual(store.displayedSettingsPage, .appearance,
                      "The outgoing Appearance page must not become main Settings before sliding away")
        store.screen = .settings
        XCTAssertNil(store.displayedSettingsPage, "A new visit starts at main Settings")
        store.settingsPage = .advanced
        store.goBack()
        XCTAssertEqual(store.screen, .settings)
        XCTAssertNil(store.displayedSettingsPage)
    }

    private func makeStore(_ name: String) -> LayoutStore {
        let suiteName = "TokenPlanTests.PopoverScreen.\(name).\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        return LayoutStore(registry: .mock, defaults: defaults, storageKey: "layout")
    }
}

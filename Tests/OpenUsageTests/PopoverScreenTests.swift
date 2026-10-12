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
        for page in SettingsPage.generalPages {
            store.openSettingsPage(page, from: .generalSettings)
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
        store.openSettingsPage(.advanced, from: .generalSettings)
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
        store.openSettingsPage(.notifications)
        XCTAssertEqual(store.displayedSettingsPage, .notifications)
        store.screen = .dashboard // Cmd-, exits even from a secondary Settings page.
        XCTAssertNil(store.settingsPage)
        XCTAssertEqual(store.displayedSettingsPage, .notifications,
                      "The outgoing Appearance page must not become main Settings before sliding away")
        store.screen = .settings
        XCTAssertNil(store.displayedSettingsPage, "A new visit starts at main Settings")
        store.openSettingsPage(.advanced, from: .generalSettings)
        store.goBack()
        XCTAssertEqual(store.screen, .settings)
        XCTAssertNil(store.displayedSettingsPage)
    }

    func testEveryDashboardSettingsDestinationReturnsDirectlyHome() {
        let store = makeStore("DirectSettings")
        for page in SettingsPage.generalPages {
            store.openSettingsPage(page)
            XCTAssertEqual(store.settingsPage, page)
            XCTAssertEqual(store.screen, .settings)
            XCTAssertTrue(store.goBack())
            XCTAssertEqual(store.screen, .dashboard, "\(page) must not invent a General Settings parent")
            XCTAssertNil(store.settingsPage)
            XCTAssertEqual(store.displayedSettingsPage, page, "The outgoing page keeps its title during the slide")
            XCTAssertFalse(store.goBack())
        }
    }

    func testSettingsReturnOriginDoesNotLeakAcrossEntryPointsOrReopening() {
        let store = makeStore("SettingsOrigins")
        store.openSettingsPage()
        store.openSettingsPage(.notifications, from: .generalSettings)
        store.goBack()
        XCTAssertEqual(store.screen, .settings)
        XCTAssertNil(store.settingsPage)
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard)

        store.openSettingsPage(.history)
        store.screen = .dashboard // Closing the panel resets both destination and origin.
        store.openSettingsPage()
        XCTAssertNil(store.settingsPage)
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard)

        store.openSettingsPage(.advanced, from: .generalSettings)
        store.openSettingsPage(.notifications) // A direct entry replaces the old return path.
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard)
    }

    func testSettingsDestinationsHaveNoDuplicateMenuEntries() {
        XCTAssertTrue(SettingsPage.dashboardPages.isEmpty)
        XCTAssertEqual(SettingsPage.generalPages, [.notifications, .advanced])
        let store = makeStore("MergedDestinations")
        store.openSettingsPage(.appearance)
        XCTAssertEqual(store.screen, .settings)
        XCTAssertNil(store.settingsPage)
        store.screen = .dashboard
        store.openSettingsPage(.history)
        XCTAssertEqual(store.screen, .customize)
        XCTAssertNil(store.customizeProviderID)
        store.goBack()
        XCTAssertEqual(store.screen, .dashboard)
    }

    private func makeStore(_ name: String) -> LayoutStore {
        let suiteName = "TokenPlanTests.PopoverScreen.\(name).\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        return LayoutStore(registry: .mock, defaults: defaults, storageKey: "layout")
    }
}

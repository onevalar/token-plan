import Foundation
import XCTest
@testable import OpenUsage

final class StoreDistributionTests: XCTestCase {
    func testProviderResourcesExistInShippedLayout() {
        let resources = Bundle.openUsageResources
        XCTAssertNotNil(resources.url(forResource: "deepseek", withExtension: "svg", subdirectory: "ProviderIcons"))
        XCTAssertNotNil(resources.url(forResource: "pricing_supplement", withExtension: "json"))
    }

    func testAbsolutePathsAreNotRewritten() {
        XCTAssertEqual(expandHome("/selected/service/auth.json"), "/selected/service/auth.json")
        XCTAssertEqual(expandHome("relative.json"), "relative.json")
    }

    #if APP_STORE_BUILD
    @MainActor
    func testStoreCannotStartExternalUpdater() {
        let updater = UpdaterController()
        updater.start()
        XCTAssertFalse(updater.isActive)
        XCTAssertFalse(updater.canCheckForUpdates)
        XCTAssertNil(updater.availableUpdateVersion)
    }

    func testUserKeysStayInsideContainer() {
        XCTAssertEqual(expandHome("~/.config/tokenplan/deepseek.json"),
                       FileManager.default.homeDirectoryForCurrentUser.path + "/.config/tokenplan/deepseek.json")
        XCTAssertEqual(expandHome("~/.codex/auth.json"), ProviderHome.directory.path + "/.codex/auth.json")
    }
    #endif
}

import XCTest
@testable import OpenUsageCLI

final class AppDefaultsTests: XCTestCase {
    func testSignedHelperUsesItsStandardDomain() {
        let defaults = AppDefaults.open(domain: "com.onevalar.tokenplan",
                                       bundleIdentifier: "com.onevalar.tokenplan")
        XCTAssertTrue(defaults === UserDefaults.standard)
    }

    func testExplicitTestSuiteRemainsIsolated() throws {
        let domain = "com.onevalar.tokenplan.tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(AppDefaults.open(domain: domain,
                                                     bundleIdentifier: "com.onevalar.tokenplan"))
        defer { defaults.removePersistentDomain(forName: domain) }
        XCTAssertFalse(defaults === UserDefaults.standard)
        defaults.set("retained", forKey: "testMarker")
        XCTAssertEqual(UserDefaults(suiteName: domain)?.string(forKey: "testMarker"), "retained")
    }
}

import XCTest
@testable import OpenUsage
final class DesktopShortcutMigrationTests: XCTestCase {
    func testLegacyShortcutAndExplicitClear() throws {
        let suite = "tokenplan-shortcut-test-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set(#"{"carbonKeyCode":49,"carbonModifiers":2304}"#, forKey: "KeyboardShortcuts_togglePopover")
        XCTAssertEqual(DesktopShortcutMigration.read(defaults: defaults), "Super+Alt+Space")
        defaults.set("", forKey: "tokenplan.desktop.shortcut")
        XCTAssertEqual(DesktopShortcutMigration.read(defaults: defaults), "")
    }
    func testUnmodifiedLegacyKeyIsNotRegistered() throws {
        let suite = "tokenplan-shortcut-test-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set(#"{"carbonKeyCode":0,"carbonModifiers":0}"#, forKey: "KeyboardShortcuts_togglePopover")
        XCTAssertEqual(DesktopShortcutMigration.read(defaults: defaults), "")
    }
}

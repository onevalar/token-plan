import XCTest
@testable import OpenUsage

@MainActor
final class DesktopTrayStyleTests: XCTestCase {
    func testMissingOverrideReadsClassicStyleWithoutWriting() throws {
        let suite = "TokenPlanTests.DesktopTrayStyle.Migration.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let layout = LayoutStore(registry: .mock, defaults: defaults)

        XCTAssertEqual(try DesktopTrayStyle.read(defaults: defaults, legacyStyle: layout.menuBarStyle), "percentage")
        XCTAssertNil(defaults.object(forKey: DesktopTrayStyle.key))
        for style in MenuBarStyle.allCases {
            layout.menuBarStyle = style
            let saved = defaults.persistentDomain(forName: suite) ?? [:]

            XCTAssertEqual(try DesktopTrayStyle.read(defaults: defaults, legacyStyle: layout.menuBarStyle), style.rawValue)
            XCTAssertNil(defaults.object(forKey: DesktopTrayStyle.key))
            XCTAssertEqual((defaults.persistentDomain(forName: suite) ?? [:]) as NSDictionary, saved as NSDictionary)
        }
    }

    func testPrivateStylesSurviveReloadWithoutChangingClassicLayoutOrOtherPreferences() throws {
        let suite = "TokenPlanTests.DesktopTrayStyle.Persistence.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let layout = LayoutStore(registry: .mock, pinLimit: 3, defaults: defaults)
        layout.menuBarStyle = .percentage
        layout.setPinned(true, for: "claude.today")
        XCTAssertTrue(layout.isPinned("claude.today"))
        let pins = layout.pinnedMetricIDs
        defaults.set("left", forKey: "tokenplan.desktop.ringIconPosition")
        defaults.set("Super+Alt+Space", forKey: "tokenplan.desktop.shortcut")
        defaults.set(false, forKey: "tokenplan.desktop.autoRefresh")
        defaults.set(false, forKey: "SUAutomaticallyCheckForUpdates")
        defaults.set("zh-Hans", forKey: LanguageSetting.key)
        let saved = defaults.persistentDomain(forName: suite) ?? [:]

        for raw in ["sparkline", "ring", "percentage"] {
            try DesktopTrayStyle(validating: raw).save(defaults: defaults)
            let restoredDefaults = try XCTUnwrap(UserDefaults(suiteName: suite))
            let restored = LayoutStore(registry: .mock, pinLimit: 3, defaults: restoredDefaults)

            XCTAssertEqual(restoredDefaults.string(forKey: "tokenplan.desktop.trayStyle"), raw)
            XCTAssertEqual(try DesktopTrayStyle.read(defaults: restoredDefaults, legacyStyle: restored.menuBarStyle), raw)
            XCTAssertEqual(restored.menuBarStyle, .percentage)
            XCTAssertEqual(restored.pinnedMetricIDs, pins)
            var otherPreferences = restoredDefaults.persistentDomain(forName: suite) ?? [:]
            otherPreferences.removeValue(forKey: DesktopTrayStyle.key)
            XCTAssertEqual(otherPreferences as NSDictionary, saved as NSDictionary)
        }
    }

    func testInvalidWritesDoNotOverwriteSavedStyleOrOtherPreferences() throws {
        let suite = "TokenPlanTests.DesktopTrayStyle.InvalidWrites.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        try DesktopTrayStyle(validating: "sparkline").save(defaults: defaults)
        defaults.set("left", forKey: "tokenplan.desktop.ringIconPosition")
        let saved = defaults.persistentDomain(forName: suite) ?? [:]

        let invalidValues: [Any] = ["unknown", "", "Sparkline", "ring ", 42, true, NSNull(), ["sparkline"], ["style": "ring"]]
        for invalid in invalidValues {
            XCTAssertThrowsError(try DesktopTrayStyle(validating: invalid).save(defaults: defaults)) { error in
                XCTAssertTrue(error is DesktopTrayStyle.Failure)
            }
            XCTAssertEqual(try DesktopTrayStyle.read(defaults: defaults, legacyStyle: .percentage), "sparkline")
            XCTAssertEqual((defaults.persistentDomain(forName: suite) ?? [:]) as NSDictionary, saved as NSDictionary)
        }
    }

    func testInvalidSavedOverrideIsRejectedInsteadOfFallingBackOrBeingRewritten() throws {
        let suite = "TokenPlanTests.DesktopTrayStyle.InvalidSaved.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let invalidValues: [Any] = ["unknown", "", "Sparkline", 42, true, ["ring"], ["style": "ring"]]
        for invalid in invalidValues {
            defaults.set(invalid, forKey: DesktopTrayStyle.key)
            let saved = defaults.persistentDomain(forName: suite) ?? [:]

            XCTAssertThrowsError(try DesktopTrayStyle.read(defaults: defaults, legacyStyle: .percentage)) { error in
                XCTAssertTrue(error is DesktopTrayStyle.Failure)
            }
            XCTAssertEqual((defaults.persistentDomain(forName: suite) ?? [:]) as NSDictionary, saved as NSDictionary)
        }

        try DesktopTrayStyle(validating: "ring").save(defaults: defaults)
        XCTAssertEqual(try DesktopTrayStyle.read(defaults: defaults, legacyStyle: .percentage), "ring")
        defaults.removeObject(forKey: DesktopTrayStyle.key)
        XCTAssertEqual(try DesktopTrayStyle.read(defaults: defaults, legacyStyle: .percentage), "percentage")
    }
}

import XCTest
@testable import OpenUsage

@MainActor
final class SavedAccountProjectionTests: XCTestCase {
    func testUnavailableAccountsSurviveRestartAndKeepOrderUntilExplicitRemoval() throws {
        let suite = "TokenPlanTests.SavedAccount.\(UUID())"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = ProviderAccountsStore(defaults: defaults)
        store.reconcile(with: [
            .init(family: "claude", identityKey: "first|org", label: "first@example.com", sources: []),
            .init(family: "claude", identityKey: "second|org", label: "second@example.com", sources: [])
        ])
        let second = store.records[1].id
        let restored = ProviderAccountsStore(defaults: defaults)
        restored.reconcile(with: [])
        XCTAssertEqual(SavedAccountProjection.orderedIDs(runtimeIDs: ["claude"], records: restored.records, order: [second,"claude"]), [second,"claude"])
        let registry = SavedAccountProjection.retainingRecords(in: WidgetRegistry.from([ClaudeProvider()]), records: restored.records)
        XCTAssertNotNil(registry.provider(id: second))
        XCTAssertFalse(registry.descriptors(for: second).isEmpty, "Missing login must not prune saved metric configuration")
        let row = SavedAccountProjection.placeholder(record: restored.records[1], enabled: false, tray: false, note: "kept")
        XCTAssertEqual(row["email"] as? String, "second@example.com")
        XCTAssertEqual(row["enabled"] as? Bool, false)
        XCTAssertEqual(row["note"] as? String, "kept")
        XCTAssertTrue((row["metrics"] as? [[String:Any]])?.isEmpty == true)
        restored.remove(second)
        XCTAssertEqual(SavedAccountProjection.orderedIDs(runtimeIDs: ["claude",second], records: restored.records, order: []), ["claude"])
    }

    func testRegisteredDirectoryCanBeDetectedWithoutReplacingDefaultLogin() {
        let files = FakeFiles([
            "/Users/dev/.tokenplan-account-directories.json": #"{"claude":["/custom/claude"],"codex":[]}"#,
            "/custom/claude/.claude.json": #"{"oauthAccount":{"accountUuid":"new-user","organizationUuid":"org","emailAddress":"new@example.com"}}"#
        ])
        let observer = DefaultAccountObserver(environment: FakeEnvironment([:]), files: files, keychain: FakeKeychain(nil), homeDirectory: {URL(fileURLWithPath:"/Users/dev")})
        let homes = ClaudeHomeDiscovery.discover(observer: observer, listDirectories: {_ in []})
        XCTAssertEqual(homes.map(\.directory), ["/custom/claude"])
        XCTAssertEqual(homes.map(\.identity), ["new-user|org"])
    }
}

import XCTest
@testable import OpenUsage

@MainActor
final class ClaudeHomeDiscoveryTests: XCTestCase {
    func testAccountLabelContainsOnlyEmail() {
        XCTAssertEqual(ProviderAccountAssembly.accountEmail(from: "person@example.com (person's Organization)"), "person@example.com")
        XCTAssertEqual(ProviderAccountAssembly.accountEmail(from: "person@example.com"), "person@example.com")
        XCTAssertNil(ProviderAccountAssembly.accountEmail(from: "Organization"))
    }

    func testIndependentHomesCreateSeparateCardsAndDeduplicateSameIdentity() async throws {
        let root = URL(fileURLWithPath: "/tmp/tokenplan-home-test")
        let second = root.path + "/.claude-account2"
        let duplicate = root.path + "/.claude-copy"
        let files = FakeFiles([
            root.path + "/.tokenplan-account-directories.json": "{\"claude\":[\"\(duplicate)\"]}",
            root.path + "/.claude.json": #"{"oauthAccount":{"accountUuid":"first","organizationUuid":"org1"}}"#,
            second + "/.claude.json": #"{"oauthAccount":{"accountUuid":"second","organizationUuid":"org2","emailAddress":"second@example.com"}}"#,
            duplicate + "/.claude.json": #"{"oauthAccount":{"accountUuid":"first","organizationUuid":"org1"}}"#
        ])
        let suite = "ClaudeHomeTests.\(UUID())"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let observer = DefaultAccountObserver(environment: FakeEnvironment([:]), files: files,
                                               keychain: FakeKeychain(), homeDirectory: { root })
        let assembly = await ProviderAccountAssembly.make(
            observer: observer, accountsStore: ProviderAccountsStore(defaults: defaults), families: ["claude"],
            listClaudeHomeDirectories: { _ in [second, duplicate, root.path + "/.claude-empty"] }
        )
        XCTAssertEqual(assembly.claudeCards.count, 2)
        XCTAssertEqual(assembly.claudeCards.first { $0.identityKey == "first|org1" }?.configDirectory, duplicate)
        XCTAssertEqual(assembly.claudeCards.first { $0.identityKey == "second|org2" }?.configDirectory, second)
        XCTAssertEqual(assembly.claudeCards.first { $0.identityKey == "second|org2" }?.accountLabel, "second@example.com")
        XCTAssertTrue(assembly.claudeCards.first { $0.identityKey == "first|org1" }?.additionalLogDirectories.contains(root.path + "/.claude") == true)
        XCTAssertFalse(assembly.claudeCards.contains { $0.allowsUnattributedPiUsage })
    }

    func testIndependentHomeNeverFallsBackToDefaultKeychainOrEnvironmentToken() {
        let store = ClaudeAuthStore(
            environment: FakeEnvironment(["CLAUDE_CODE_OAUTH_TOKEN": "wrong-account"]),
            files: FakeFiles([:]), keychain: FakeKeychain(),
            isolatedConfigDirectory: "/tmp/.claude-account2"
        )
        XCTAssertEqual(store.keychainServiceCandidates().count, 1)
        XCTAssertNotEqual(store.keychainServiceCandidates().first, "Claude Code-credentials")
        XCTAssertTrue(store.loadCredentialSet().candidates.isEmpty)
        XCTAssertEqual(store.claudeHomeOverride(), "/tmp/.claude-account2")
    }
}

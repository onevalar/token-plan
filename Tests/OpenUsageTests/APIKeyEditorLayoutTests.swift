import AppKit
import SwiftUI
import XCTest
@testable import OpenUsage

@MainActor
final class APIKeyEditorLayoutTests: XCTestCase {
    private func providers() -> [any APIKeyManaging] {
        [
            DeepSeekProvider(authStore: KeyBalanceAuthStore(spec: DeepSeekProvider.spec, files: FakeFiles(), environment: FakeEnvironment())),
            MoonshotProvider(authStore: KeyBalanceAuthStore(spec: MoonshotProvider.spec, files: FakeFiles(), environment: FakeEnvironment())),
            MiniMaxProvider(authStore: KeyBalanceAuthStore(spec: MiniMaxProvider.spec, files: FakeFiles(), environment: FakeEnvironment())),
            SiliconFlowProvider(authStore: KeyBalanceAuthStore(spec: SiliconFlowProvider.spec, files: FakeFiles(), environment: FakeEnvironment())),
            OpenRouterProvider(authStore: OpenRouterAuthStore(files: FakeFiles(), environment: FakeEnvironment())),
            ZAIProvider(authStore: ZAIAuthStore(files: FakeFiles(), environment: FakeEnvironment()))
        ]
    }

    func testEveryKeyProviderSavesProbesAndClearsCredentials() async throws {
        for provider in providers() {
            XCTAssertEqual(provider.apiKeyStatus, .notSet, provider.provider.id)
            let initiallyPresent = await provider.hasLocalCredentials()
            XCTAssertFalse(initiallyPresent)
            XCTAssertThrowsError(try provider.saveAPIKey(" "))
            try provider.saveAPIKey("  tokenplan-fixture-key  ")
            XCTAssertEqual(provider.apiKeyStatus, .saved)
            XCTAssertEqual(provider.currentAPIKey(), "tokenplan-fixture-key")
            let savedPresent = await provider.hasLocalCredentials()
            XCTAssertTrue(savedPresent)
            try provider.deleteAPIKey()
            XCTAssertNil(provider.currentAPIKey())
            XCTAssertEqual(provider.apiKeyStatus, .notSet)
            let deletedPresent = await provider.hasLocalCredentials()
            XCTAssertFalse(deletedPresent)
        }
    }

    func testMissingKeyEditorsFitProviderSettings() throws {
        for provider in providers() {
            try assertEditorFits(provider)
        }
    }

    private func assertEditorFits(_ provider: any APIKeyManaging) throws {
        let suite = "KeyEditorLayout.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = WidgetDataStore(registry: WidgetRegistry.from([provider]), providers: [provider], defaults: defaults)
        let host = NSHostingView(rootView: APIKeysSection(provider: provider).environment(store).defaultAppStorage(defaults).buttonStyle(TokenPlanButtonStyle()).frame(width: 312))
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 340, height: 500), styleMask: [.borderless], backing: .buffered, defer: false)
        window.contentView = host
        host.layoutSubtreeIfNeeded()
        let size = host.fittingSize
        XCTAssertLessThanOrEqual(size.width, 340)
        XCTAssertGreaterThan(size.height, 0)
    }
}

import XCTest
@testable import OpenUsage

/// Explicitly opt in on a developer Mac; never runs during the ordinary test suite.
/// Reads existing logins, makes usage requests, and may refresh a provider's expired session.
@MainActor
final class ProviderLiveAuditTests: XCTestCase {
    func testSelectedLocalProvider() async throws {
        guard let id = ProcessInfo.processInfo.environment["TOKENPLAN_AUDIT_PROVIDER"] else {
            throw XCTSkip("Set TOKENPLAN_AUDIT_PROVIDER to audit an existing local login")
        }
        let suite = "TokenPlan.LiveAudit.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let provider: any ProviderRuntime
        switch id {
        case "cursor": provider = CursorProvider(usageClient: CursorUsageClient(http: AuditLiveHTTP()))
        case "copilot": provider = CopilotProvider(defaults: defaults)
        case "antigravity": provider = AntigravityProvider()
        case "deepseek": provider = DeepSeekProvider()
        case "devin": provider = DevinProvider()
        case "grok": provider = GrokProvider()
        case "moonshot": provider = MoonshotProvider()
        case "minimax": provider = MiniMaxProvider()
        case "ollama": provider = OllamaProvider()
        case "opencode": provider = OpenCodeProvider()
        case "openrouter": provider = OpenRouterProvider()
        case "siliconflow": provider = SiliconFlowProvider()
        case "zai": provider = ZAIProvider()
        default: return XCTFail("Unknown audit provider")
        }
        let present = await provider.hasLocalCredentials()
        print("AUDIT \(id): local credential probe=\(present)")
        let snapshot = await provider.refresh()
        print("AUDIT \(id): category=\(snapshot.errorCategory?.rawValue ?? "none"), metric labels=\(snapshot.lines.map(\.label))")
        // Never print credentials, account identifiers, request headers, or raw response bodies.
        XCTAssertNil(snapshot.errorCategory, "\(id): live fetch did not succeed")
        XCTAssertTrue(snapshot.lines.contains { !$0.isError && $0 != .noUsageData }, "\(id): response had no usage metrics")
    }
}

private struct AuditLiveHTTP: HTTPClient {
    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        do {
            let response = try await URLSessionHTTPClient().send(request)
            print("AUDIT HTTP \(request.url.host ?? ""): \(response.statusCode)")
            return response
        } catch {
            let code = (error as NSError).code
            print("AUDIT HTTP \(request.url.host ?? ""): transport code \(code)")
            throw error
        }
    }
}

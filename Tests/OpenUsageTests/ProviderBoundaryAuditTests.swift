import XCTest
@testable import OpenUsage

/// Runs the actual provider refresh path with isolated credentials and controlled HTTP responses.
@MainActor
final class ProviderBoundaryAuditTests: XCTestCase {
    private func keyProviders(http: any HTTPClient) throws -> [any APIKeyManaging] {
        let providers: [any APIKeyManaging] = [
            DeepSeekProvider(authStore: KeyBalanceAuthStore(spec: DeepSeekProvider.spec, files: FakeFiles(), environment: FakeEnvironment()), http: http),
            MoonshotProvider(authStore: KeyBalanceAuthStore(spec: MoonshotProvider.spec, files: FakeFiles(), environment: FakeEnvironment()), http: http),
            MiniMaxProvider(authStore: KeyBalanceAuthStore(spec: MiniMaxProvider.spec, files: FakeFiles(), environment: FakeEnvironment()), http: http),
            SiliconFlowProvider(authStore: KeyBalanceAuthStore(spec: SiliconFlowProvider.spec, files: FakeFiles(), environment: FakeEnvironment()), http: http),
            OpenRouterProvider(authStore: OpenRouterAuthStore(files: FakeFiles(), environment: FakeEnvironment()), usageClient: OpenRouterUsageClient(http: http)),
            ZAIProvider(authStore: ZAIAuthStore(files: FakeFiles(), environment: FakeEnvironment()), usageClient: ZAIUsageClient(http: http))
        ]
        return providers
    }

    func testEveryKeyProviderRejectsMissingCredentialsWithoutNetwork() async throws {
        let http = FakeHTTPClient(response: response(200, "{}"))
        for provider in try keyProviders(http: http) {
            let snapshot = await provider.refresh()
            XCTAssertEqual(snapshot.errorCategory, .notLoggedIn, provider.provider.id)
            XCTAssertFalse(snapshot.lines.isEmpty)
        }
        XCTAssertTrue(http.requests.isEmpty)
    }

    func testEveryKeyProviderClassifiesHTTPAndMalformedResponses() async throws {
        for (status, category) in [(401, ErrorCategory.authInvalid), (403, .authInvalid), (429, .rateLimited), (500, .http5xx), (200, .decoding)] {
            let http = FakeHTTPClient(response: response(status, "{}"))
            for provider in try keyProviders(http: http) {
                try provider.saveAPIKey("audit-fixture")
                let snapshot = await provider.refresh()
                XCTAssertEqual(snapshot.errorCategory, category, "\(provider.provider.id): HTTP \(status)")
                XCTAssertFalse(snapshot.lines.isEmpty)
            }
            XCTAssertTrue(http.requests.allSatisfy { $0.headers["Authorization"] == "Bearer audit-fixture" })
        }
    }

    func testEveryKeyProviderReportsTransportFailure() async throws {
        let http = RoutingHTTPClient { _ in throw URLError(.timedOut) }
        for provider in try keyProviders(http: http) {
            try provider.saveAPIKey("audit-fixture")
            let snapshot = await provider.refresh()
            XCTAssertEqual(snapshot.errorCategory, .network, provider.provider.id)
        }
    }

    func testRegionalProvidersDoNotRetryOutagesInAnotherRegion() async throws {
        for status in [429, 503, 200] {
            for id in ["moonshot", "minimax"] {
                let http = FakeHTTPClient(response: response(status, "{}"))
                let provider = try XCTUnwrap(try keyProviders(http: http).first { $0.provider.id == id })
                try provider.saveAPIKey("audit-fixture")
                _ = await provider.refresh()
                XCTAssertEqual(http.requests.count, 1, "\(id): \(status)")
            }
        }
    }

    func testMoonshotRegionalFallbackMapsUSDAndRealZero() async throws {
        let http = RoutingHTTPClient { request in
            if request.url.host == "api.moonshot.cn" { return HTTPResponse(statusCode: 401, headers: [:], body: Data()) }
            return HTTPResponse(statusCode: 200, headers: [:], body: Data(#"{"data":{"available_balance":0,"cash_balance":-1,"voucher_balance":0}}"#.utf8))
        }
        let provider = try XCTUnwrap(try keyProviders(http: http).first { $0.provider.id == "moonshot" })
        try provider.saveAPIKey("audit-fixture")
        let snapshot = await provider.refresh()
        XCTAssertNil(snapshot.errorCategory)
        XCTAssertEqual(http.requests.map { $0.url.host }, ["api.moonshot.cn", "api.moonshot.ai"])
        guard case .values(_, let values, _, _, _, _) = snapshot.lines[0] else { return XCTFail("missing balance") }
        XCTAssertEqual(values.first?.number, 0)
        XCTAssertEqual(values.first?.kind, .dollars)
    }

    func testSiliconFlowRefreshMapsAllBalances() async throws {
        let http = FakeHTTPClient(response: response(200, #"{"code":20000,"data":{"totalBalance":"88.88","chargeBalance":"88","balance":"0.88"}}"#))
        let provider = try XCTUnwrap(try keyProviders(http: http).first { $0.provider.id == "siliconflow" })
        try provider.saveAPIKey("audit-fixture")
        let snapshot = await provider.refresh()
        XCTAssertNil(snapshot.errorCategory)
        XCTAssertEqual(snapshot.lines.map(\.label), ["Balance", "Topped Up", "Gift"])
        XCTAssertEqual(http.requests.first?.url, SiliconFlowProvider.infoURL)
    }

    func testMiniMaxBusinessAuthFailureRetriesGlobal() async throws {
        let http = RoutingHTTPClient { request in
            let body = request.url.host == "www.minimaxi.com"
                ? #"{"base_resp":{"status_code":1004}}"#
                : #"{"model_remains":[{"model_name":"MiniMax-M*","current_interval_remaining_percent":85}]}"#
            return HTTPResponse(statusCode: 200, headers: [:], body: Data(body.utf8))
        }
        let provider = try XCTUnwrap(try keyProviders(http: http).first { $0.provider.id == "minimax" })
        try provider.saveAPIKey("audit-fixture")
        let snapshot = await provider.refresh()
        XCTAssertNil(snapshot.errorCategory)
        XCTAssertEqual(http.requests.count, 2)
        guard case .progress(_, let used, _, _, _, _, _) = snapshot.lines[0] else { return XCTFail("missing quota") }
        XCTAssertEqual(used, 15)
    }

    func testMiniMaxDistinguishesRejectedKeyMissingPlanAndBadResponse() async throws {
        for (body, category) in [(#"{"base_resp":{"status_code":1004}}"#, ErrorCategory.authInvalid),
                                 (#"{"base_resp":{"status_code":2038}}"#, .other),
                                 (#"{"model_remains":[]}"#, .notAvailable),
                                 ("{}", .decoding)] {
            let http = FakeHTTPClient(response: response(200, body))
            let provider = try XCTUnwrap(try keyProviders(http: http).first { $0.provider.id == "minimax" })
            try provider.saveAPIKey("audit-fixture")
            let snapshot = await provider.refresh()
            XCTAssertEqual(snapshot.errorCategory, category)
        }
    }

    func testMiniMaxSelectsTextPoolAndPrefersPercentOverConflictingCounts() throws {
        let body = Data(#"{"model_remains":[{"model_name":"speech-hd","current_interval_total_count":9000,"current_interval_usage_count":0},{"model_name":"MiniMax-M*","current_interval_total_count":1500,"current_interval_usage_count":1500,"current_interval_remaining_percent":85.5,"current_weekly_remaining_percent":0}]}"#.utf8)
        let lines = try XCTUnwrap(MiniMaxUsageMapper.map(body, now: Date()))
        XCTAssertEqual(lines.count, 2)
        guard case .progress(_, let session, _, _, _, _, _) = lines[0],
              case .progress(_, let weekly, _, _, _, _, _) = lines[1] else { return XCTFail("missing quota") }
        XCTAssertEqual(session, 14.5)
        XCTAssertEqual(weekly, 100)
    }

    func testBalanceNumbersRejectNonfiniteAndBooleanValues() {
        for value: Any in ["NaN", "Infinity", "-Infinity", true] { XCTAssertNil(KeyBalanceParse.decimal(value)) }
        XCTAssertEqual(KeyBalanceParse.decimal("0"), 0)
    }

    func testDevinPreservesNetworkServerAndDecodingErrors() async {
        let auth = DevinAuthStore(files: FakeFiles([DevinAuthStore.credentialsPath: "windsurf_api_key = \"audit-fixture\""]), sqlite: AuditEmptySQLite())
        for (status, category) in [(429, ErrorCategory.rateLimited), (503, .http5xx), (200, .decoding)] {
            let http = FakeHTTPClient(response: response(status, "{}"))
            let snapshot = await DevinProvider(authStore: auth, usageClient: DevinUsageClient(http: http)).refresh()
            XCTAssertEqual(snapshot.errorCategory, category)
        }
        let http = RoutingHTTPClient { _ in throw URLError(.timedOut) }
        let snapshot = await DevinProvider(authStore: auth, usageClient: DevinUsageClient(http: http)).refresh()
        XCTAssertEqual(snapshot.errorCategory, .network)
    }

    private func response(_ status: Int, _ body: String) -> HTTPResponse {
        HTTPResponse(statusCode: status, headers: [:], body: Data(body.utf8))
    }
}

private struct AuditEmptySQLite: SQLiteAccessing {
    func queryValue(path: String, sql: String) throws -> String? { nil }
    func execute(path: String, sql: String) throws {}
}

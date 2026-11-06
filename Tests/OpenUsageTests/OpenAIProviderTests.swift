import XCTest
@testable import OpenUsage

@MainActor
final class OpenAIProviderTests: XCTestCase {
    func testLiveCodexCreditsReadOnly() async throws {
        guard ProcessInfo.processInfo.environment["TOKENPLAN_AUDIT_CODEX_CREDITS"] == "1" else { throw XCTSkip("Explicit live audit only") }
        let path = NSHomeDirectory() + "/.codex/auth.json"
        let auth = try JSONDecoder().decode(CodexAuth.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
        let token = try XCTUnwrap(auth.tokens?.accessToken)
        let response = try await CodexUsageClient().fetchUsage(accessToken: token, accountID: auth.tokens?.accountID)
        let mapped = try CodexUsageMapper.mapUsageResponse(response)
        let line = try XCTUnwrap(mapped.lines.first { $0.label == "Credits" })
        if case .values(_, let values, _, _, _, _) = line {
            XCTAssertTrue(values.allSatisfy { $0.kind == .count })
        }
        print("AUDIT codex: read-only usage fetched; original credit units mapped")
    }
    let now = Date(timeIntervalSince1970: 1793289600) // 2026-10-29 UTC
    func testReportingJoinsDaysWithoutInventingModelPricesOrCashBalance() async throws {
        let provider = OpenAIProvider(files: FakeFiles(), environment: FakeEnvironment(["OPENAI_ADMIN_KEY": "fixture"]), client: .init(http: ReportingHTTP()), now: { Date(timeIntervalSince1970: 1793289600) })
        let snapshot = await provider.refresh()
        XCTAssertNil(snapshot.errorCategory)
        XCTAssertEqual(snapshot.usageHistory?.series.daily.first?.totalTokens, 150)
        XCTAssertEqual(snapshot.usageHistory?.series.daily.first?.costUSD, 1.25)
        XCTAssertNil(snapshot.usageHistory?.modelUsage?.daily.first?.models.first?.costUSD)
        XCTAssertNil(snapshot.line(label: "Balance"))
        XCTAssertEqual(snapshot.lines.first?.label, "This Month")
    }
    func testAbsentReportingBucketsDoNotInventZeroMonth() {
        let result = OpenAIUsageMapper.map(costs: [], usage: [], now: now)
        XCTAssertTrue(result.lines.isEmpty)
        XCTAssertTrue(result.history.series.daily.isEmpty)
    }
    func testMissingAdminKeyDoesNotUseOrdinaryModelKey() async {
        let provider = OpenAIProvider(files: FakeFiles(), environment: FakeEnvironment(["OPENAI_API_KEY": "ordinary"]))
        let present = await provider.hasLocalCredentials()
        XCTAssertFalse(present)
        let result = await provider.refresh()
        XCTAssertEqual(result.errorCategory, .notLoggedIn)
    }
    func testPermissionFailureIsNotZeroUsage() async {
        let provider = OpenAIProvider(files: FakeFiles(), environment: FakeEnvironment(["OPENAI_ADMIN_KEY": "fixture"]), client: .init(http: ReportingHTTP(status: 403)))
        let result = await provider.refresh()
        XCTAssertNotNil(result.errorCategory)
        XCTAssertNil(result.usageHistory)
        XCTAssertNil(result.line(label: "This Month"))
    }
    func testPaginationLoopFailsRatherThanReturningPartialTotal() async {
        do {
            _ = try await OpenAIUsageClient(http: ReportingHTTP(loop: true)).fetch(key: "fixture", costs: true, now: now)
            XCTFail("Expected invalid pagination")
        } catch OpenAIUsageError.invalid { } catch { XCTFail("Unexpected error") }
    }
    func testMalformedUsageCannotBecomeZero() async {
        do {
            _ = try await OpenAIUsageClient(http: ReportingHTTP(malformed: true)).fetch(key: "fixture", costs: false, now: now)
            XCTFail("Expected invalid response")
        } catch OpenAIUsageError.invalid { } catch { XCTFail("Unexpected error") }
    }
    func testCreditsKeepFractionAndNegativeBalanceWithoutDollarConversion() throws {
        for balance in ["12.375", "-0.25", "0"] {
            let response = HTTPResponse(statusCode: 200, headers: [:], body: Data("{\"credits\":{\"balance\":\"\(balance)\"}}".utf8))
            let mapped = try CodexUsageMapper.mapUsageResponse(response)
            guard case .values(_, let values, _, _, _, _) = mapped.lines.first else { return XCTFail("Missing credits") }
            XCTAssertEqual(values, [.init(number: Double(balance)!, kind: .count, label: "credits")])
        }
    }
    func testUnlimitedMissingAndMeasuredZeroAreDifferent() throws {
        for (json, expected) in [("{\"unlimited\":true,\"balance\":\"0\"}", "unlimited"), ("{}", "missing"), ("{\"has_credits\":false}", "zero")] {
            let mapped = try CodexUsageMapper.mapUsageResponse(.init(statusCode: 200, headers: [:], body: Data("{\"credits\":\(json)}".utf8)))
            if expected == "unlimited" {
                guard case .badge(_, let text, _, _) = mapped.lines.first else { return XCTFail("Expected unlimited") }
                XCTAssertEqual(text, "Unlimited")
            } else if expected == "missing" { XCTAssertTrue(mapped.lines.isEmpty) }
            else { XCTAssertEqual(mapped.lines.count, 1) }
        }
    }
}

private struct ReportingHTTP: HTTPClient {
    var status = 200
    var loop = false
    var malformed = false
    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        let row = request.url.path.hasSuffix("costs") ? #"{"amount":{"value":1.25,"currency":"usd"}}"# : malformed ? #"{"model":"test"}"# : #"{"input_tokens":100,"input_cached_tokens":80,"output_tokens":50,"num_model_requests":2,"model":"test"}"#
        let json = "{\"data\":[{\"start_time\":1793145600,\"results\":[\(row)]}],\"has_more\":\(loop),\"next_page\":\"same\"}"
        return HTTPResponse(statusCode: status, headers: [:], body: Data(json.utf8))
    }
}

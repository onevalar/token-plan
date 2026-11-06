import XCTest
@testable import OpenUsage

@MainActor
final class AnthropicProviderTests: XCTestCase {
    let now = Date(timeIntervalSince1970: 1793966400) // Nov 6 12:00 UTC
    func testOfficialCostAndTotalTokens() async throws {
        let provider = AnthropicProvider(files: FakeFiles(), environment: FakeEnvironment(["ANTHROPIC_ADMIN_KEY":"fixture"]), client: .init(http: AnalyticsHTTP()), now: { Date(timeIntervalSince1970:1793966400) })
        let result = await provider.refresh()
        XCTAssertNil(result.errorCategory)
        XCTAssertEqual(result.usageHistory?.series.daily.first?.costUSD,1.25)
        XCTAssertEqual(result.usageHistory?.series.daily.first?.totalTokens,900)
        XCTAssertNil(result.line(label:"Balance"))
    }
    func testOrdinaryKeyIsNotAdminCredential() async {
        let provider = AnthropicProvider(files: FakeFiles(), environment: FakeEnvironment(["ANTHROPIC_API_KEY":"ordinary"]))
        let present = await provider.hasLocalCredentials()
        XCTAssertFalse(present)
        let result = await provider.refresh()
        XCTAssertEqual(result.errorCategory,.notLoggedIn)
    }
    func testPermissionAndMalformedAndLoopDoNotReturnPartialUsage() async {
        for http in [AnalyticsHTTP(status:403), AnalyticsHTTP(loop:true), AnalyticsHTTP(malformed:true)] {
            let provider = AnthropicProvider(files: FakeFiles(), environment: FakeEnvironment(["ANTHROPIC_ADMIN_KEY":"fixture"]), client:.init(http:http),now:{Date(timeIntervalSince1970:1793966400)})
            let result = await provider.refresh()
            XCTAssertNotNil(result.errorCategory)
            XCTAssertNil(result.usageHistory)
        }
    }
}
private struct AnalyticsHTTP: HTTPClient {
    var status:Int = 200
    var loop:Bool = false
    var malformed:Bool = false
    func send(_ request:HTTPRequest) async throws -> HTTPResponse {
        XCTAssertEqual(request.url.host,"api.anthropic.com")
        XCTAssertEqual(request.method,"GET")
        XCTAssertEqual(request.headers["x-api-key"],"fixture")
        XCTAssertNotNil(request.headers["anthropic-beta"])
        let metric = request.url.path.hasSuffix("/cost") ? #""cost":{"currency":"USD","amount":"125.000000"}"# : (malformed ? #""usage":{"total_tokens":-1,"requests":2}"# : #""usage":{"total_tokens":900,"requests":2,"cache_read_input_tokens":600}"#)
        let json = "{\"data\":[{\"starting_at\":\"2026-11-06T01:00:00Z\",\"group\":{\"model\":\"claude-test\"}," + metric + "}],\"has_more\":" + (loop ? "true" : "false") + ",\"next_page\":\"same\"}"
        return HTTPResponse(statusCode:status,headers:[:],body:Data(json.utf8))
    }
}

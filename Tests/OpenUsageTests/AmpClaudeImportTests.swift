import XCTest
@testable import OpenUsage

final class AmpClaudeImportTests: XCTestCase {
    func testSanitizedImportRetainsTokensAndDeduplicatesStreamingReplies() throws {
        let header = #"{"type":"tokenplan-amp-import","ownerAccountUuid":"a","ownerOrganizationUuid":"o"}"#
        let first = #"{"timestamp":"2026-10-12T01:00:00Z","requestId":"r","message":{"id":"m","model":"claude-opus-5-5","usage":{"input_tokens":2,"output_tokens":10,"cache_read_input_tokens":100}}}"#
        let second = first.replacingOccurrences(of: "\"output_tokens\":10", with: "\"output_tokens\":20")
        let data = Data((header + "\n" + first + "\n" + second + "\n").utf8)
        XCTAssertEqual(ClaudeSessionIdentity.parse(data), .owned(organizationID: "o", accountID: "a"))
        let entries = ClaudeLogUsageScanner.dedup(ClaudeLogUsageScanner.parseFile(data))
        XCTAssertEqual(entries.count, 1)
        XCTAssertEqual(entries.first?.tokens.output, 20)
        XCTAssertEqual(entries.first?.tokens.cacheRead, 100)
    }

    func testOptInDownloadedAmpExport() throws {
        guard let path = ProcessInfo.processInfo.environment["TOKENPLAN_AMP_VALIDATE_EXPORT"] else {
            throw XCTSkip("Set TOKENPLAN_AMP_VALIDATE_EXPORT for an owner-authorized local export check")
        }
        let data = try Data(contentsOf: URL(fileURLWithPath: path))
        let entries = ClaudeLogUsageScanner.dedup(ClaudeLogUsageScanner.parseFile(data))
        XCTAssertFalse(entries.isEmpty)
        // Replay overlapping collection batches through the production parser.
        let lines = data.split(separator: 10)
        let split = lines.count / 2
        let firstData = Data(lines.prefix(split).flatMap { Array($0) + [10] })
        let secondData = Data(lines.dropFirst(max(0, split - 20)).flatMap { Array($0) + [10] })
        let first = ClaudeLogUsageScanner.parseFile(firstData)
        let second = ClaudeLogUsageScanner.parseFile(secondData)
        let replay = ClaudeLogUsageScanner.dedup(first + second + second)
        XCTAssertEqual(replay.count, entries.count)
        XCTAssertEqual(replay.reduce(0) { $0 + $1.tokens.output }, entries.reduce(0) { $0 + $1.tokens.output })
        XCTAssertEqual(replay.reduce(0) { $0 + $1.tokens.cacheRead }, entries.reduce(0) { $0 + $1.tokens.cacheRead })
        print("Amp overlapping batch replay: \(replay.count) unique records; repeat collection totals unchanged")
        let days = Dictionary(grouping: entries) {
            OpenUsageISO8601.string(from: $0.timestamp).prefix(10)
        }
        for (day, records) in days.sorted(by: { $0.key < $1.key }) {
            print("Amp native parser: \(day), \(records.count) unique records, \(records.reduce(0) { $0 + $1.tokens.output }) output tokens")
        }
    }
}

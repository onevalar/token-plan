import XCTest
@testable import OpenUsage

final class CodexUnpricedUsageTests: XCTestCase {
    private let reference = "gpt-5.6-sol"

    private func pricing() -> ModelPricing {
        ModelPricing(
            supplement: PricingSupplement(
                pricing: [reference: ModelRates(
                    inputPerMillion: 5, outputPerMillion: 30,
                    cacheWritePerMillion: 5, cacheReadPerMillion: 0.5,
                    fastMultiplier: 2.5
                )]
            ),
            primary: PricingCatalog(entries: ["known-model": ModelRates(
                inputPerMillion: 1, outputPerMillion: 2,
                cacheWritePerMillion: 1, cacheReadPerMillion: 0.1
            )]),
            secondary: PricingCatalog()
        )
    }

    private func event(
        model: String = "unlisted-model-a", input: Int = 1_000,
        cached: Int = 400, output: Int = 100, fast: Bool = false, ultrafast: Bool = false
    ) -> CodexLogUsageScanner.Event {
        .init(timestamp: Date(timeIntervalSince1970: 1_780_000_000), model: model,
              input: input, cached: cached, output: output, reasoning: 0,
              total: input + output, isFast: fast, isUltrafast: ultrafast)
    }

    func testUnknownModelExcludesUnpricedUsageAndKeepsWarnings() {
        let result = CodexLogUsageScanner.aggregate(events: [event()], since: .distantPast, pricing: pricing())
        XCTAssertTrue(result.series.daily.isEmpty)
        XCTAssertEqual(Set(result.unknownModelsByDay.values.flatMap { $0 }), ["unlisted-model-a"])
        XCTAssertNil(result.fallbackPricingModelsByDay)
    }

    func testKnownPricingStillWorksAlongsideUnknownUsage() throws {
        let result = CodexLogUsageScanner.aggregate(
            events: [event(model: "known-model"), event()], since: .distantPast, pricing: pricing()
        )
        XCTAssertEqual(try XCTUnwrap(result.series.daily.first?.costUSD), 0.00084, accuracy: 0.000001)
        XCTAssertEqual(Set(result.unknownModelsByDay.values.flatMap { $0 }), ["unlisted-model-a"])
        XCTAssertNil(result.fallbackPricingModelsByDay)
    }
}

import Foundation

/// Event pricing stays separate from parsing: changing a preference reuses cached token events.
/// Unpriced usage remains excluded and is reported as unknown.
extension CodexLogUsageScanner {
    // MARK: - Aggregation

    private struct EventKey: Hashable {
        var timestamp: Date
        var model: String
        var pricingModel: String?
        var input: Int
        var cached: Int
        var output: Int
        var reasoning: Int
        var total: Int
    }

    static func aggregate(
        events: [Event], since: Date, pricing: ModelPricing
    ) -> LogUsageScan {
        var seen: Set<EventKey> = []
        var accumulator = DailyUsageAccumulator()

        for event in events where event.timestamp >= since {
            let key = EventKey(
                timestamp: event.timestamp, model: event.model, pricingModel: event.pricingModel, input: event.input,
                cached: event.cached, output: event.output, reasoning: event.reasoning, total: event.total
            )
            guard seen.insert(key).inserted else { continue }

            let day = DailyUsageAccumulator.dayKey(from: event.timestamp)
            // One trimmed slug for pricing, the unknown-model warning, and the breakdown key alike —
            // diverging spellings would let the warning triangle and the hover panel disagree.
            let trimmedModel = event.model.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty

            guard let model = trimmedModel else {
                continue
            }
            let pricingModel = event.pricingModel ?? model
            let resolution = CodexUsagePricing.resolveRates(pricing: pricing, model: pricingModel)
            let rateModel = resolution.rateModel
            let resolvedRates = resolution.rates
            let appliesCodexFastTier = resolution.isFastAlias ? resolution.hasBaseRates : event.isFast
            let appliesUltrafastTier = event.isUltrafast && (!resolution.isFastAlias || resolution.hasBaseRates)
            if resolvedRates == nil, event.total > 0 {
                accumulator.addUnknownModel(day: day, model: model)
            }
            guard let rates = resolvedRates else { continue }
            let eventCost = cost(
                rates: rates, event: event, model: rateModel, fastTier: appliesCodexFastTier,
                ultrafastTier: appliesUltrafastTier
            )
            accumulator.add(
                day: day, tokens: event.total, cost: eventCost, model: model
            )
        }

        return accumulator.build()
    }

    /// Native rollout events count cached tokens inside `input`; the shared estimator takes disjoint
    /// buckets, so the cached portion is subtracted here rather than in `CodexUsagePricing`.
    static func cost(
        rates: ModelRates, event: Event, model: String, fastTier: Bool, ultrafastTier: Bool = false
    ) -> Double {
        CodexUsagePricing.cost(
            rates: rates,
            tokens: TokenBreakdown(
                input: max(0, event.input - event.cached), cacheRead: event.cached, output: event.output
            ),
            model: model,
            fastTier: fastTier,
            ultrafastTier: ultrafastTier
        )
    }
}

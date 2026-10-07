import Foundation

/// MiniMax coding-plan / token-plan quota (MiniMax 编程套餐). The plan is metered in 5-hour windows plus
/// a weekly cap; the quota endpoint answers with a `model_remains` list. The mainland platform
/// (`www.minimaxi.com`) and the global one (`www.minimax.io`) use different hosts and paths and keys are
/// not interchangeable, so a key rejected by one host is retried on the other.
///
/// Field semantics (from MiniMax's published usage examples): `current_interval_total_count` is the
/// window's quota and `current_interval_usage_count` is what is *remaining*, not used.
@MainActor
final class MiniMaxProvider: ProviderRuntime {
    nonisolated static let spec = KeyBalanceSpec(
        name: "MiniMax",
        configFile: "minimax.json",
        environmentNames: ["MINIMAX_API_KEY"],
        keysPage: "platform.minimaxi.com/user-center/basic-information/interface-key"
    )
    static let endpoints: [URL] = [
        URL(string: "https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains")!,
        URL(string: "https://www.minimax.io/v1/token_plan/remains")!
    ]

    let provider = Provider(
        id: "minimax",
        displayName: "MiniMax",
        icon: .providerMark("minimax"),
        links: [
            ProviderLink(label: "Usage", url: "https://platform.minimaxi.com/user-center/payment/coding-plan"),
            ProviderLink(label: "API Keys", url: "https://platform.minimaxi.com/user-center/basic-information/interface-key")
        ]
    )

    let authStore: KeyBalanceAuthStore
    let http: any HTTPClient
    let now: @Sendable () -> Date

    init(
        authStore: KeyBalanceAuthStore = KeyBalanceAuthStore(spec: MiniMaxProvider.spec),
        http: any HTTPClient = URLSessionHTTPClient(),
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.authStore = authStore
        self.http = http
        self.now = now
    }

    var widgetDescriptors: [WidgetDescriptor] {
        [
            .percent(id: "minimax.session", provider: provider, title: "Session", metricLabel: "Session")
                .exportingLimit("session", unit: "percent"),
            .percent(id: "minimax.weekly", provider: provider, title: "Weekly", metricLabel: "Weekly")
                .exportingLimit("weekly", unit: "percent")
        ]
    }

    func hasLocalCredentials() async -> Bool {
        await loadOffMainActor { [authStore] in authStore.loadAPIKey() } != nil
    }

    func refresh() async -> ProviderSnapshot {
        guard let key = await loadOffMainActor({ [authStore] in authStore.loadAPIKey() }) else {
            return .error(provider: provider, error: authStore.missingKeyError)
        }
        var sawAuthFailure = false
        var lastError: KeyBalanceError?
        for url in Self.endpoints {
            switch await KeyBalanceFetcher.get(url, apiKey: key, provider: Self.spec.name, http: http,
                                               extraHeaders: ["Content-Type": "application/json"]) {
            case .authFailure:
                sawAuthFailure = true
            case .failed(let error):
                lastError = error
            case .ok(let body):
                if let lines = MiniMaxUsageMapper.map(body, now: now()) {
                    return .make(provider: provider, plan: nil, lines: lines, refreshedAt: now())
                }
                lastError = .notAvailable(provider: Self.spec.name, reason: String(localized: "No active Coding Plan found for this key."))
            }
        }
        if sawAuthFailure && lastError == nil {
            return .error(provider: provider, error: authStore.invalidKeyError)
        }
        return .error(provider: provider, error: lastError ?? authStore.invalidKeyError)
    }
}

extension MiniMaxProvider: APIKeyManaging {
    var apiKeyStatus: APIKeyStatus { authStore.keyStatus() }
    func currentAPIKey() -> String? { authStore.loadAPIKey() }
    func saveAPIKey(_ key: String) throws { try authStore.saveAPIKey(key) }
    func deleteAPIKey() throws { try authStore.deleteAPIKey() }
}

enum MiniMaxUsageMapper {
    /// Builds Session (+ Weekly when the payload carries weekly counts) from the model with the largest
    /// window quota — the plan's headline text-model pool. Returns `nil` when there is nothing to meter.
    static func map(_ body: Data, now: Date) -> [MetricLine]? {
        guard let root = ProviderParse.jsonObject(body),
              let models = root["model_remains"] as? [[String: Any]], !models.isEmpty else { return nil }
        guard let primary = models
            .filter({ (ProviderParse.number($0["current_interval_total_count"]) ?? 0) > 0 })
            .max(by: { (ProviderParse.number($0["current_interval_total_count"]) ?? 0)
                     < (ProviderParse.number($1["current_interval_total_count"]) ?? 0) }) else { return nil }

        var lines: [MetricLine] = []
        if let total = ProviderParse.number(primary["current_interval_total_count"]),
           let remaining = ProviderParse.number(primary["current_interval_usage_count"]) {
            let end = ProviderParse.number(primary["end_time"]).map { Date(timeIntervalSince1970: $0 / 1000) }
            let start = ProviderParse.number(primary["start_time"]).map { Date(timeIntervalSince1970: $0 / 1000) }
            let periodMs: Int? = (start != nil && end != nil) ? Int(end!.timeIntervalSince(start!) * 1000) : nil
            lines.append(.progress(
                label: "Session",
                used: percentUsed(total: total, remaining: remaining),
                limit: 100,
                format: .percent,
                resetsAt: end.flatMap { $0 > now ? $0 : nil },
                periodDurationMs: periodMs
            ))
        }
        if let weeklyTotal = ProviderParse.number(primary["current_weekly_total_count"]), weeklyTotal > 0,
           let weeklyRemaining = ProviderParse.number(primary["current_weekly_usage_count"]) {
            let weeklyEnd = ProviderParse.number(primary["weekly_end_time"]).map { Date(timeIntervalSince1970: $0 / 1000) }
            lines.append(.progress(
                label: "Weekly",
                used: percentUsed(total: weeklyTotal, remaining: weeklyRemaining),
                limit: 100,
                format: .percent,
                resetsAt: weeklyEnd.flatMap { $0 > now ? $0 : nil },
                periodDurationMs: 7 * 24 * 3600 * 1000
            ))
        }
        return lines.isEmpty ? nil : lines
    }

    private static func percentUsed(total: Double, remaining: Double) -> Double {
        guard total > 0 else { return 0 }
        return ProviderParse.clampPercent((total - remaining) / total * 100)
    }
}

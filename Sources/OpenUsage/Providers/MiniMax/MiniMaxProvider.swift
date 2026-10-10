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
        URL(string: "https://www.minimaxi.com/v1/token_plan/remains")!,
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
        for url in Self.endpoints {
            switch await KeyBalanceFetcher.get(url, apiKey: key, provider: Self.spec.name, http: http,
                                               extraHeaders: ["Content-Type": "application/json"]) {
            case .authFailure:
                continue
            case .failed(let error):
                return .error(provider: provider, error: error)
            case .ok(let body):
                guard let root = ProviderParse.jsonObject(body) else {
                    return .error(provider: provider, error: KeyBalanceError.invalidResponse(provider: Self.spec.name))
                }
                if let base = root["base_resp"] as? [String: Any],
                   let code = ProviderParse.number(base["status_code"]), code != 0 {
                    // MiniMax also rejects credentials in HTTP 200 responses.
                    if code == 1004 { continue }
                    return .error(provider: provider, error: KeyBalanceError.serviceRejected(provider: Self.spec.name, code: String(format: "%g", code)))
                }
                if let models = root["model_remains"] as? [[String: Any]], models.isEmpty {
                    return .error(provider: provider, error: KeyBalanceError.notAvailable(provider: Self.spec.name, reason: String(localized: "No active Coding Plan found for this key.")))
                }
                if let lines = MiniMaxUsageMapper.map(body, now: now()) {
                    return .make(provider: provider, plan: nil, lines: lines, refreshedAt: now())
                }
                return .error(provider: provider, error: KeyBalanceError.invalidResponse(provider: Self.spec.name))
            }
        }
        return .error(provider: provider, error: authStore.invalidKeyError)
    }
}

extension MiniMaxProvider: APIKeyManaging {
    var apiKeyStatus: APIKeyStatus { authStore.keyStatus() }
    func currentAPIKey() -> String? { authStore.loadAPIKey() }
    func saveAPIKey(_ key: String) throws { try authStore.saveAPIKey(key) }
    func deleteAPIKey() throws { try authStore.deleteAPIKey() }
}

enum MiniMaxUsageMapper {
    /// Uses the text-model pool and prefers explicit percentages over legacy counts.
    /// Returns nil for missing or malformed quota data.
    static func map(_ body: Data, now: Date) -> [MetricLine]? {
        guard let root = ProviderParse.jsonObject(body),
              let models = root["model_remains"] as? [[String: Any]], !models.isEmpty else { return nil }
        // Text-model quota only: speech/image pools often have much larger numeric allowances.
        guard let primary = models.first(where: {
            ($0["model_name"] as? String)?.lowercased().hasPrefix("minimax-m") == true
        }) else { return nil }

        var lines: [MetricLine] = []
        for (label, prefix, startKey, endKey) in [
            ("Session", "current_interval", "start_time", "end_time"),
            ("Weekly", "current_weekly", "weekly_start_time", "weekly_end_time")
        ] {
            // Unlimited windows have no bounded percentage to display.
            if ProviderParse.number(primary[prefix + "_status"]) == 3 { continue }
            let used: Double?
            if primary[prefix + "_remaining_percent"] != nil {
                guard let remaining = ProviderParse.number(primary[prefix + "_remaining_percent"]), remaining >= 0 else { return nil }
                used = ProviderParse.clampPercent(100 - remaining)
            } else if let total = ProviderParse.number(primary[prefix + "_total_count"]), total > 0,
                      let remaining = ProviderParse.number(primary[prefix + "_usage_count"]), remaining >= 0 {
                used = percentUsed(total: total, remaining: remaining)
            } else {
                used = nil
            }
            guard let used else { continue }
            let end = ProviderParse.number(primary[endKey]).map { Date(timeIntervalSince1970: $0 / 1000) }
            let start = ProviderParse.number(primary[startKey]).map { Date(timeIntervalSince1970: $0 / 1000) }
            let duration = start.flatMap { start in end.map { $0.timeIntervalSince(start) * 1000 } }
            let periodMs = duration.flatMap { $0 > 0 && $0 < Double(Int.max) ? Int($0) : nil }
            lines.append(.progress(label: label, used: used, limit: 100, format: .percent,
                                   resetsAt: end.flatMap { $0 > now ? $0 : nil },
                                   periodDurationMs: periodMs))
        }
        return lines.isEmpty ? nil : lines
    }

    private static func percentUsed(total: Double, remaining: Double) -> Double {
        guard total > 0 else { return 0 }
        return ProviderParse.clampPercent((total - remaining) / total * 100)
    }
}

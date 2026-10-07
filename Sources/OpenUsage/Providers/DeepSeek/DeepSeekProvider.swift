import Foundation

/// DeepSeek (深度求索) API balance. One call: `GET https://api.deepseek.com/user/balance`, which returns
/// the topped-up and granted balance per currency (CNY or USD, depending on the account).
@MainActor
final class DeepSeekProvider: ProviderRuntime {
    nonisolated static let spec = KeyBalanceSpec(
        name: "DeepSeek",
        configFile: "deepseek.json",
        environmentNames: ["DEEPSEEK_API_KEY"],
        keysPage: "platform.deepseek.com/api_keys"
    )
    static let balanceURL = URL(string: "https://api.deepseek.com/user/balance")!

    let provider = Provider(
        id: "deepseek",
        displayName: "DeepSeek",
        icon: .providerMark("deepseek"),
        links: [
            ProviderLink(label: "Usage", url: "https://platform.deepseek.com/usage"),
            ProviderLink(label: "API Keys", url: "https://platform.deepseek.com/api_keys")
        ]
    )

    let authStore: KeyBalanceAuthStore
    let http: any HTTPClient
    let now: @Sendable () -> Date

    init(
        authStore: KeyBalanceAuthStore = KeyBalanceAuthStore(spec: DeepSeekProvider.spec),
        http: any HTTPClient = URLSessionHTTPClient(),
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.authStore = authStore
        self.http = http
        self.now = now
    }

    var widgetDescriptors: [WidgetDescriptor] {
        [
            .currencyBalance(id: "deepseek.balance", provider: provider, title: "Balance", metricLabel: "Balance", valueWord: "left")
                .exportingLimit("balance", kind: .balance, unit: "cny", source: .value(kind: .yuan)),
            .currencyBalance(id: "deepseek.toppedUp", provider: provider, title: "Topped Up", metricLabel: "Topped Up", valueWord: "left"),
            .currencyBalance(id: "deepseek.granted", provider: provider, title: "Granted", metricLabel: "Granted", valueWord: "left")
        ]
    }

    func hasLocalCredentials() async -> Bool {
        await loadOffMainActor { [authStore] in authStore.loadAPIKey() } != nil
    }

    func refresh() async -> ProviderSnapshot {
        guard let key = await loadOffMainActor({ [authStore] in authStore.loadAPIKey() }) else {
            return .error(provider: provider, error: authStore.missingKeyError)
        }
        switch await KeyBalanceFetcher.get(Self.balanceURL, apiKey: key, provider: Self.spec.name, http: http) {
        case .authFailure:
            return .error(provider: provider, error: authStore.invalidKeyError)
        case .failed(let error):
            return .error(provider: provider, error: error)
        case .ok(let body):
            guard let lines = DeepSeekUsageMapper.map(body) else {
                return .error(provider: provider, error: KeyBalanceError.invalidResponse(provider: Self.spec.name))
            }
            return .make(provider: provider, plan: nil, lines: lines, refreshedAt: now())
        }
    }
}

extension DeepSeekProvider: APIKeyManaging {
    var apiKeyStatus: APIKeyStatus { authStore.keyStatus() }
    func currentAPIKey() -> String? { authStore.loadAPIKey() }
    func saveAPIKey(_ key: String) throws { try authStore.saveAPIKey(key) }
    func deleteAPIKey() throws { try authStore.deleteAPIKey() }
}

enum DeepSeekUsageMapper {
    /// `{"is_available":true,"balance_infos":[{"currency":"CNY","total_balance":"110.00",
    /// "granted_balance":"10.00","topped_up_balance":"100.00"}]}` — amounts are decimal strings.
    /// Uses the first entry whose currency we can display (an account normally has exactly one).
    static func map(_ body: Data) -> [MetricLine]? {
        guard let root = ProviderParse.jsonObject(body),
              let infos = root["balance_infos"] as? [[String: Any]] else { return nil }
        for info in infos {
            guard let kind = KeyBalanceParse.kind(forCurrency: info["currency"] as? String),
                  let total = KeyBalanceParse.decimal(info["total_balance"]) else { continue }
            var lines: [MetricLine] = [
                .values(label: "Balance", values: [MetricValue(number: max(0, total), kind: kind)])
            ]
            if let toppedUp = KeyBalanceParse.decimal(info["topped_up_balance"]) {
                lines.append(.values(label: "Topped Up", values: [MetricValue(number: max(0, toppedUp), kind: kind)]))
            }
            if let granted = KeyBalanceParse.decimal(info["granted_balance"]) {
                lines.append(.values(label: "Granted", values: [MetricValue(number: max(0, granted), kind: kind)]))
            }
            return lines
        }
        return nil
    }
}

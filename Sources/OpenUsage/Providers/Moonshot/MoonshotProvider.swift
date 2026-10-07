import Foundation

/// Moonshot AI / Kimi open-platform API balance (月之暗面 / Kimi 开放平台).
/// `GET /v1/users/me/balance` returns `{"data":{"available_balance","voucher_balance","cash_balance"}}`.
/// The mainland platform (`api.moonshot.cn`) bills in CNY and the global one (`api.moonshot.ai`) in
/// USD; keys are not interchangeable, so a key rejected by one host is retried on the other.
@MainActor
final class MoonshotProvider: ProviderRuntime {
    nonisolated static let spec = KeyBalanceSpec(
        name: "Kimi",
        configFile: "moonshot.json",
        environmentNames: ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
        keysPage: "platform.kimi.com/console/api-keys"
    )
    /// Mainland first (this app's primary audience), then the global platform.
    static let hosts: [(url: URL, kind: MetricKind)] = [
        (URL(string: "https://api.moonshot.cn/v1/users/me/balance")!, .yuan),
        (URL(string: "https://api.moonshot.ai/v1/users/me/balance")!, .dollars)
    ]

    let provider = Provider(
        id: "moonshot",
        displayName: "Kimi",
        icon: .providerMark("moonshot"),
        links: [
            ProviderLink(label: "Dashboard", url: "https://platform.kimi.com/console/account"),
            ProviderLink(label: "API Keys", url: "https://platform.kimi.com/console/api-keys")
        ]
    )

    let authStore: KeyBalanceAuthStore
    let http: any HTTPClient
    let now: @Sendable () -> Date

    init(
        authStore: KeyBalanceAuthStore = KeyBalanceAuthStore(spec: MoonshotProvider.spec),
        http: any HTTPClient = URLSessionHTTPClient(),
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.authStore = authStore
        self.http = http
        self.now = now
    }

    var widgetDescriptors: [WidgetDescriptor] {
        [
            .currencyBalance(id: "moonshot.balance", provider: provider, title: "Balance", metricLabel: "Balance", valueWord: "left")
                .exportingLimit("balance", kind: .balance, unit: "cny", source: .value(kind: .yuan)),
            .currencyBalance(id: "moonshot.cash", provider: provider, title: "Cash", metricLabel: "Cash", valueWord: "left"),
            .currencyBalance(id: "moonshot.voucher", provider: provider, title: "Vouchers", metricLabel: "Vouchers", valueWord: "left")
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
        for host in Self.hosts {
            switch await KeyBalanceFetcher.get(host.url, apiKey: key, provider: Self.spec.name, http: http) {
            case .authFailure:
                sawAuthFailure = true
            case .failed(let error):
                lastError = error
            case .ok(let body):
                guard let lines = MoonshotUsageMapper.map(body, kind: host.kind) else {
                    lastError = .invalidResponse(provider: Self.spec.name)
                    continue
                }
                return .make(provider: provider, plan: nil, lines: lines, refreshedAt: now())
            }
        }
        if sawAuthFailure && lastError == nil {
            return .error(provider: provider, error: authStore.invalidKeyError)
        }
        return .error(provider: provider, error: lastError ?? authStore.invalidKeyError)
    }
}

extension MoonshotProvider: APIKeyManaging {
    var apiKeyStatus: APIKeyStatus { authStore.keyStatus() }
    func currentAPIKey() -> String? { authStore.loadAPIKey() }
    func saveAPIKey(_ key: String) throws { try authStore.saveAPIKey(key) }
    func deleteAPIKey() throws { try authStore.deleteAPIKey() }
}

enum MoonshotUsageMapper {
    /// `{"code":0,"data":{"available_balance":49.58,"voucher_balance":46.58,"cash_balance":3.0},"status":true}`.
    /// `available_balance` already includes cash and vouchers; `cash_balance` can go negative (arrears).
    static func map(_ body: Data, kind: MetricKind) -> [MetricLine]? {
        guard let root = ProviderParse.jsonObject(body),
              let data = root["data"] as? [String: Any],
              let available = KeyBalanceParse.decimal(data["available_balance"]) else { return nil }
        var lines: [MetricLine] = [
            .values(label: "Balance", values: [MetricValue(number: available, kind: kind)])
        ]
        if let cash = KeyBalanceParse.decimal(data["cash_balance"]) {
            lines.append(.values(label: "Cash", values: [MetricValue(number: cash, kind: kind)]))
        }
        if let voucher = KeyBalanceParse.decimal(data["voucher_balance"]) {
            lines.append(.values(label: "Vouchers", values: [MetricValue(number: max(0, voucher), kind: kind)]))
        }
        return lines
    }
}

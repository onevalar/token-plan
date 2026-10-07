import Foundation

/// SiliconFlow (硅基流动) account balance. `GET https://api.siliconflow.cn/v1/user/info` returns the
/// account profile with `balance` (gift), `chargeBalance` (topped up) and `totalBalance`, as strings, in CNY.
/// Only the money fields are read — the profile's name and email are deliberately ignored.
@MainActor
final class SiliconFlowProvider: ProviderRuntime {
    nonisolated static let spec = KeyBalanceSpec(
        name: "SiliconFlow",
        configFile: "siliconflow.json",
        environmentNames: ["SILICONFLOW_API_KEY"],
        keysPage: "cloud.siliconflow.cn/account/ak"
    )
    static let infoURL = URL(string: "https://api.siliconflow.cn/v1/user/info")!

    let provider = Provider(
        id: "siliconflow",
        displayName: "SiliconFlow",
        icon: .providerMark("siliconflow"),
        links: [
            ProviderLink(label: "Usage", url: "https://cloud.siliconflow.cn/bills"),
            ProviderLink(label: "API Keys", url: "https://cloud.siliconflow.cn/account/ak")
        ]
    )

    let authStore: KeyBalanceAuthStore
    let http: any HTTPClient
    let now: @Sendable () -> Date

    init(
        authStore: KeyBalanceAuthStore = KeyBalanceAuthStore(spec: SiliconFlowProvider.spec),
        http: any HTTPClient = URLSessionHTTPClient(),
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.authStore = authStore
        self.http = http
        self.now = now
    }

    var widgetDescriptors: [WidgetDescriptor] {
        [
            .currencyBalance(id: "siliconflow.balance", provider: provider, title: "Balance", metricLabel: "Balance", valueWord: "left")
                .exportingLimit("balance", kind: .balance, unit: "cny", source: .value(kind: .yuan)),
            .currencyBalance(id: "siliconflow.toppedUp", provider: provider, title: "Topped Up", metricLabel: "Topped Up", valueWord: "left"),
            .currencyBalance(id: "siliconflow.gift", provider: provider, title: "Gift", metricLabel: "Gift", valueWord: "left")
        ]
    }

    func hasLocalCredentials() async -> Bool {
        await loadOffMainActor { [authStore] in authStore.loadAPIKey() } != nil
    }

    func refresh() async -> ProviderSnapshot {
        guard let key = await loadOffMainActor({ [authStore] in authStore.loadAPIKey() }) else {
            return .error(provider: provider, error: authStore.missingKeyError)
        }
        switch await KeyBalanceFetcher.get(Self.infoURL, apiKey: key, provider: Self.spec.name, http: http) {
        case .authFailure:
            return .error(provider: provider, error: authStore.invalidKeyError)
        case .failed(let error):
            return .error(provider: provider, error: error)
        case .ok(let body):
            guard let lines = SiliconFlowUsageMapper.map(body) else {
                return .error(provider: provider, error: KeyBalanceError.invalidResponse(provider: Self.spec.name))
            }
            return .make(provider: provider, plan: nil, lines: lines, refreshedAt: now())
        }
    }
}

extension SiliconFlowProvider: APIKeyManaging {
    var apiKeyStatus: APIKeyStatus { authStore.keyStatus() }
    func currentAPIKey() -> String? { authStore.loadAPIKey() }
    func saveAPIKey(_ key: String) throws { try authStore.saveAPIKey(key) }
    func deleteAPIKey() throws { try authStore.deleteAPIKey() }
}

enum SiliconFlowUsageMapper {
    /// `{"code":20000,"status":true,"data":{"balance":"0.88","chargeBalance":"88.00","totalBalance":"88.88",...}}`.
    static func map(_ body: Data) -> [MetricLine]? {
        guard let root = ProviderParse.jsonObject(body),
              let data = root["data"] as? [String: Any] else { return nil }
        let gift = KeyBalanceParse.decimal(data["balance"])
        let charged = KeyBalanceParse.decimal(data["chargeBalance"])
        guard let total = KeyBalanceParse.decimal(data["totalBalance"]) ?? ((gift != nil || charged != nil) ? (gift ?? 0) + (charged ?? 0) : nil) else {
            return nil
        }
        var lines: [MetricLine] = [.values(label: "Balance", values: [MetricValue(number: max(0, total), kind: .yuan)])]
        if let charged { lines.append(.values(label: "Topped Up", values: [MetricValue(number: max(0, charged), kind: .yuan)])) }
        if let gift { lines.append(.values(label: "Gift", values: [MetricValue(number: max(0, gift), kind: .yuan)])) }
        return lines
    }
}

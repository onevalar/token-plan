import Foundation

struct ZAIUsageClient: Sendable {
    /// The global (Z.ai) and mainland (智谱 BigModel) platforms expose the same monitor API on different
    /// origins, and keys are not interchangeable between them.
    enum Origin: CaseIterable, Sendable {
        case global, mainland

        var host: String {
            switch self {
            case .global: "https://api.z.ai"
            case .mainland: "https://open.bigmodel.cn"
            }
        }
    }

    static func subscriptionURL(for origin: Origin) -> URL { URL(string: origin.host + "/api/biz/subscription/list")! }
    static func quotaURL(for origin: Origin) -> URL { URL(string: origin.host + "/api/monitor/usage/quota/limit")! }
    /// The global-origin endpoints, kept as the default (and for tests that pin the request URL).
    static let subscriptionURL = subscriptionURL(for: .global)
    static let quotaURL = quotaURL(for: .global)

    var http: any HTTPClient

    init(http: any HTTPClient = URLSessionHTTPClient()) {
        self.http = http
    }

    /// The user's active subscription(s) — best-effort, used only to surface the plan name. A failure
    /// here must not blank out the quota meters, so the provider treats it as optional.
    func fetchSubscription(apiKey: String, origin: Origin = .global) async throws -> HTTPResponse {
        try await get(Self.subscriptionURL(for: origin), apiKey: apiKey)
    }

    /// Session token usage and web-search quotas. Required for a usable snapshot.
    func fetchQuota(apiKey: String, origin: Origin = .global) async throws -> HTTPResponse {
        try await get(Self.quotaURL(for: origin), apiKey: apiKey)
    }

    private func get(_ url: URL, apiKey: String) async throws -> HTTPResponse {
        try await http.send(HTTPRequest(
            method: "GET",
            url: url,
            headers: [
                "Authorization": "Bearer \(apiKey)",
                "Accept": "application/json"
            ],
            timeout: 15
        ))
    }
}

enum ZAIUsageError: Error, LocalizedError, Equatable {
    case connectionFailed
    case invalidResponse
    case requestFailed(Int)
    /// The key is valid but the account has no GLM Coding Plan (the quota endpoint answers a 2xx with
    /// `success:false`). Distinct from a malformed/failed request — there is simply nothing to meter.
    case noCodingPlan

    var errorDescription: String? {
        switch self {
        case .connectionFailed:
            return ProviderUsageErrorText.connectionFailed
        case .invalidResponse:
            return ProviderUsageErrorText.invalidResponse
        case .requestFailed(let status):
            return ProviderUsageErrorText.requestFailed(statusCode: status)
        case .noCodingPlan:
            return tr("No active GLM Coding Plan. Subscribe at z.ai/subscribe to see usage.")
        }
    }
}

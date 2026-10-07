import Foundation

/// Shared plumbing for the "paste an API key, read a balance or quota with one GET" providers
/// (DeepSeek, Moonshot/Kimi, SiliconFlow, MiniMax). Each provider keeps its own endpoint, mapper and
/// metric descriptors; the key storage, error copy and HTTP classification live here once.

enum KeyBalanceError: Error, LocalizedError, Equatable, CategorizedError {
    case missingKey(provider: String, env: String, file: String)
    case invalidKey(provider: String, keysPage: String)
    case saveFailed(provider: String)
    case deleteFailed(provider: String)
    case connectionFailed(provider: String)
    case invalidResponse(provider: String)
    case requestFailed(provider: String, status: Int)
    /// The key works but the account has nothing to meter (e.g. MiniMax key without a coding plan).
    case notAvailable(provider: String, reason: String)

    var errorDescription: String? {
        switch self {
        case .missingKey(let provider, let env, let file):
            return String(localized: "No \(provider) API key. Set \(env) or add it to \(file).")
        case .invalidKey(let provider, let keysPage):
            return String(localized: "\(provider) API key invalid. Check your key at \(keysPage).")
        case .saveFailed(let provider):
            return String(localized: "Couldn't save the \(provider) API key.")
        case .deleteFailed(let provider):
            return String(localized: "Couldn't remove the saved \(provider) API key.")
        case .connectionFailed(let provider):
            return String(localized: "Couldn't reach \(provider). Check your connection.")
        case .invalidResponse(let provider):
            return String(localized: "\(provider) usage data unavailable. Try again later.")
        case .requestFailed(let provider, let status):
            return String(localized: "\(provider) request failed (HTTP \(status)).")
        case .notAvailable(let provider, let reason):
            return String(localized: "\(provider): \(reason)")
        }
    }

    var errorCategory: ErrorCategory {
        switch self {
        case .missingKey: .notLoggedIn
        case .invalidKey: .authInvalid
        case .saveFailed, .deleteFailed: .other
        case .connectionFailed: .network
        case .invalidResponse: .decoding
        case .requestFailed(_, let status): ErrorCategory.http(status)
        case .notAvailable: .notAvailable
        }
    }
}

/// Static facts about one key-based provider, so the auth store and error copy stay in step.
struct KeyBalanceSpec: Sendable {
    let name: String
    /// File names under `~/.config/tokenplan/` (first wins on save) — e.g. `deepseek.json`.
    let configFile: String
    let environmentNames: [String]
    let keysPage: String
}

/// Reads / saves / clears the provider's API key (config file first, then environment).
struct KeyBalanceAuthStore: Sendable {
    let spec: KeyBalanceSpec
    private let store: UserAPIKeyStore

    init(
        spec: KeyBalanceSpec,
        files: TextFileAccessing = LocalTextFileAccessor(),
        environment: EnvironmentReading = ProcessEnvironmentReader()
    ) {
        self.spec = spec
        let name = spec.name
        let env = spec.environmentNames.first ?? ""
        let file = "~/.config/tokenplan/\(spec.configFile)"
        store = UserAPIKeyStore(
            configPaths: [file],
            environmentNames: spec.environmentNames,
            files: files,
            environment: environment,
            makeError: { failure in
                switch failure {
                case .missingKey: KeyBalanceError.missingKey(provider: name, env: env, file: file)
                case .saveFailed: KeyBalanceError.saveFailed(provider: name)
                case .deleteFailed: KeyBalanceError.deleteFailed(provider: name)
                }
            }
        )
    }

    func loadAPIKey() -> String? { store.loadKey() }
    func keyStatus() -> APIKeyStatus { store.keyStatus() }
    func saveAPIKey(_ key: String) throws { try store.saveKey(key) }
    func deleteAPIKey() throws { try store.deleteKey() }
    var missingKeyError: KeyBalanceError {
        .missingKey(provider: spec.name, env: spec.environmentNames.first ?? "", file: "~/.config/tokenplan/\(spec.configFile)")
    }
    var invalidKeyError: KeyBalanceError { .invalidKey(provider: spec.name, keysPage: spec.keysPage) }
}

/// The outcome of one authenticated GET, classified the way every key provider needs it.
enum KeyBalanceResponse {
    case ok(Data)
    case authFailure
    case failed(KeyBalanceError)
}

enum KeyBalanceFetcher {
    /// GET `url` with a bearer key. 2xx → body, 401/403 → `.authFailure`, anything else a typed failure.
    static func get(
        _ url: URL,
        apiKey: String,
        provider: String,
        http: any HTTPClient,
        extraHeaders: [String: String] = [:]
    ) async -> KeyBalanceResponse {
        var headers = ["Authorization": "Bearer \(apiKey)", "Accept": "application/json"]
        headers.merge(extraHeaders) { _, new in new }
        do {
            let response = try await http.send(HTTPRequest(method: "GET", url: url, headers: headers, timeout: 15))
            if response.statusCode == 401 || response.statusCode == 403 { return .authFailure }
            guard (200..<300).contains(response.statusCode) else {
                return .failed(.requestFailed(provider: provider, status: response.statusCode))
            }
            return .ok(response.body)
        } catch {
            return .failed(.connectionFailed(provider: provider))
        }
    }
}

/// Parsing helpers for balance payloads that carry money as decimal strings ("110.00").
enum KeyBalanceParse {
    static func decimal(_ value: Any?) -> Double? {
        if let string = value as? String { return Double(string.trimmingCharacters(in: .whitespaces)) }
        return ProviderParse.number(value)
    }

    /// `.yuan` for CNY, `.dollars` for USD, `nil` for anything else.
    static func kind(forCurrency code: String?) -> MetricKind? {
        switch code?.uppercased() {
        case "CNY", "RMB": return .yuan
        case "USD": return .dollars
        default: return nil
        }
    }

    static func unit(for kind: MetricKind) -> String { kind == .yuan ? "cny" : "usd" }
}

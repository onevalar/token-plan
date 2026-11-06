import Foundation

/// Read-only Claude Console organization analytics, kept separate from subscription logs.
struct AnthropicUsageClient: Sendable {
    var http: any HTTPClient = URLSessionHTTPClient()
    struct Row: Decodable {
        struct Group: Decodable { let model: String? }
        struct Usage: Decodable { let total_tokens: Int; let requests: Int }
        struct Cost: Decodable { let amount: String; let currency: String }
        let starting_at: String
        let group: Group
        let usage: Usage?
        let cost: Cost?
    }
    struct Page: Decodable { let data: [Row]; let has_more: Bool; let next_page: String? }
    static func normalize(_ row: Row, costs: Bool, now: Date) throws -> OpenAIUsageClient.Bucket {
        let format = ISO8601DateFormatter()
        let plainDate = format.date(from: row.starting_at)
        format.formatOptions.insert(.withFractionalSeconds)
        guard let date = plainDate ?? format.date(from: row.starting_at), date <= now,
              date >= OpenAIUsageClient.start(now: now) else { throw AnthropicUsageError.invalid }
        let value: OpenAIUsageClient.Row
        if costs {
            guard let cost = row.cost, cost.currency.uppercased() == "USD",
                  let cents = Double(cost.amount), cents.isFinite else { throw AnthropicUsageError.invalid }
            value = .init(amount: .init(value: cents / 100, currency: "usd"), input_tokens: nil, output_tokens: nil,
                          num_model_requests: nil, model: row.group.model, project_id: nil)
        } else {
            guard let usage = row.usage, usage.total_tokens >= 0, usage.total_tokens <= 1_000_000_000_000_000,
                  usage.requests >= 0, usage.requests <= 1_000_000_000_000_000 else { throw AnthropicUsageError.invalid }
            // total_tokens already includes cache reads and writes. Never add cache counters again.
            value = .init(amount: nil, input_tokens: usage.total_tokens, output_tokens: 0,
                          num_model_requests: usage.requests, model: row.group.model, project_id: nil)
        }
        return .init(start_time: Int(date.timeIntervalSince1970), results: [value])
    }
    func fetch(key: String, costs: Bool, now: Date) async throws -> [OpenAIUsageClient.Bucket] {
        var result: [OpenAIUsageClient.Bucket] = [], cursor: String?, seen = Set<String>()
        let format = ISO8601DateFormatter()
        for _ in 0..<100 {
            var url = URLComponents(string: "https://api.anthropic.com/v1/organizations/analytics/" + (costs ? "cost" : "usage"))!
            // Hourly buckets include completed hours today; daily ending_at rounds down to midnight.
            url.queryItems = [.init(name: "starting_at", value: format.string(from: OpenAIUsageClient.start(now: now))),
                .init(name: "ending_at", value: format.string(from: now)), .init(name: "time_bucket_width", value: "1h"),
                .init(name: "group_by[]", value: "model"), .init(name: "limit", value: "1000")]
            if let cursor { url.queryItems?.append(.init(name: "page", value: cursor)) }
            let response: HTTPResponse
            do { response = try await http.send(HTTPRequest(method: "GET", url: url.url!, headers: [
                "x-api-key": key, "anthropic-version": "2023-06-01",
                "anthropic-beta": "analytics-usage-cost-2026-08-24", "Accept": "application/json"], timeout: 20)) }
            catch { throw AnthropicUsageError.network }
            guard response.statusCode == 200 else { throw AnthropicUsageError.http(response.statusCode) }
            guard response.body.count <= 8 * 1024 * 1024,
                  let page = try? JSONDecoder().decode(Page.self, from: response.body) else { throw AnthropicUsageError.invalid }
            result += try page.data.map { try Self.normalize($0, costs: costs, now: now) }
            if !page.has_more { return result }
            guard let next = page.next_page, !next.isEmpty, seen.insert(next).inserted else { throw AnthropicUsageError.invalid }
            cursor = next
        }
        throw AnthropicUsageError.invalid
    }
}

enum AnthropicUsageError: Error, LocalizedError, CategorizedError {
    case missing, storage, invalid, network, http(Int)
    var errorCategory: ErrorCategory {
        switch self {
        case .missing: .notLoggedIn
        case .network: .network
        case .invalid: .decoding
        case .http(401): .authInvalid
        case .http(let status): .http(status)
        default: .other
        }
    }
    var errorDescription: String? {
        switch self {
        case .missing: tr("Add an Anthropic organization Admin key to read API usage and costs.")
        case .storage: tr("Couldn't save or remove the Anthropic Admin key.")
        case .invalid: tr("Anthropic API usage data is incomplete or invalid. Try again later.")
        case .network: tr("Couldn't reach Anthropic API. Check your connection and proxy.")
        case .http(401): tr("The Anthropic Admin key was rejected. Replace it in service settings.")
        case .http(403): tr("This key cannot read organization usage or costs. Check its permissions.")
        case .http(429): tr("Usage queries are temporarily rate limited. Try again later.")
        case .http: tr("Anthropic API reporting is unavailable. Try again later.")
        }
    }
}

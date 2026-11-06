import Foundation

/// Read-only organization reporting. Never sends model requests or reads the billing website.
struct OpenAIUsageClient: Sendable {
    var http: any HTTPClient = URLSessionHTTPClient()

    struct Bucket: Decodable, Sendable {
        let start_time: Int
        let results: [Row]
    }
    struct Row: Decodable, Sendable {
        struct Amount: Decodable, Sendable { let value: Double; let currency: String }
        let amount: Amount?
        let input_tokens: Int?
        let output_tokens: Int?
        let num_model_requests: Int?
        let model: String?
        let project_id: String?
    }
    private struct Page: Decodable { let data: [Bucket]; let has_more: Bool; let next_page: String? }

    static var utc: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }
    static func start(now: Date) -> Date {
        let calendar = utc
        return min(calendar.dateInterval(of: .month, for: now)!.start,
                   calendar.date(byAdding: .day, value: -29, to: calendar.startOfDay(for: now))!)
    }

    func fetch(key: String, costs: Bool, now: Date) async throws -> [Bucket] {
        var result: [Bucket] = [], cursor: String?, seen = Set<String>()
        for _ in 0..<100 {
            var url = URLComponents(string: "https://api.openai.com/v1/organization/" + (costs ? "costs" : "usage/completions"))!
            url.queryItems = [URLQueryItem(name: "start_time", value: String(Int(Self.start(now: now).timeIntervalSince1970))),
                              URLQueryItem(name: "end_time", value: String(Int(now.timeIntervalSince1970))),
                              URLQueryItem(name: "bucket_width", value: "1d"), URLQueryItem(name: "limit", value: "31")]
            url.queryItems?.append(URLQueryItem(name: "group_by", value: costs ? "project_id" : "model"))
            if let cursor { url.queryItems?.append(URLQueryItem(name: "page", value: cursor)) }
            let response: HTTPResponse
            do {
                response = try await http.send(HTTPRequest(method: "GET", url: url.url!,
                    headers: ["Authorization": "Bearer \(key)", "Accept": "application/json"], timeout: 20))
            } catch { throw OpenAIUsageError.network }
            guard response.statusCode == 200 else { throw OpenAIUsageError.http(response.statusCode) }
            guard response.body.count <= 8 * 1024 * 1024,
                  let page = try? JSONDecoder().decode(Page.self, from: response.body) else { throw OpenAIUsageError.invalid }
            for bucket in page.data {
                guard bucket.start_time >= 0, bucket.start_time <= Int(now.timeIntervalSince1970) else { throw OpenAIUsageError.invalid }
                for row in bucket.results {
                    if costs {
                        guard let amount = row.amount, amount.currency.lowercased() == "usd", amount.value.isFinite else { throw OpenAIUsageError.invalid }
                    } else {
                        guard let input = row.input_tokens, let output = row.output_tokens,
                              input >= 0, output >= 0, input <= 1_000_000_000_000_000, output <= 1_000_000_000_000_000,
                              let requests = row.num_model_requests, requests >= 0 else { throw OpenAIUsageError.invalid }
                    }
                }
            }
            result += page.data
            if !page.has_more { return result }
            guard let next = page.next_page, !next.isEmpty, seen.insert(next).inserted else { throw OpenAIUsageError.invalid }
            cursor = next
        }
        throw OpenAIUsageError.invalid
    }
}

enum OpenAIUsageError: Error, LocalizedError, CategorizedError {
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
        case .missing: tr("Add an OpenAI organization Admin key to read API usage and costs.")
        case .storage: tr("Couldn't save or remove the OpenAI Admin key.")
        case .invalid: tr("OpenAI API usage data is incomplete or invalid. Try again later.")
        case .network: tr("Couldn't reach OpenAI API. Check your connection and proxy.")
        case .http(401): tr("The OpenAI Admin key was rejected. Replace it in service settings.")
        case .http(403): tr("This key cannot read organization usage or costs. Check its permissions.")
        case .http(429): tr("Usage queries are temporarily rate limited. Try again later.")
        case .http: tr("OpenAI API reporting is unavailable. Try again later.")
        }
    }
}

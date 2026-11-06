import Foundation

@MainActor
final class OpenAIProvider: ProviderRuntime, APIKeyManaging {
    let provider = Provider(id: "openai", displayName: "OpenAI API", icon: .providerMark("codex"), links: [
        ProviderLink(label: "Usage", url: "https://platform.openai.com/usage"),
        ProviderLink(label: "API Keys", url: "https://platform.openai.com/settings/organization/admin-keys")])
    let auth: UserAPIKeyStore
    let client: OpenAIUsageClient
    let now: @Sendable () -> Date
    init(files: TextFileAccessing = LocalTextFileAccessor(), environment: EnvironmentReading = ProcessEnvironmentReader(),
         client: OpenAIUsageClient = OpenAIUsageClient(), now: @escaping @Sendable () -> Date = Date.init) {
        auth = UserAPIKeyStore(configPaths: ["~/.config/tokenplan/openai.json"], environmentNames: ["OPENAI_ADMIN_KEY"],
            files: files, environment: environment, makeError: { _ in OpenAIUsageError.storage })
        self.client = client; self.now = now
    }
    var widgetDescriptors: [WidgetDescriptor] { [
        .values(id: "openai.month", provider: provider, title: "This Month", metricLabel: "This Month", selection: .kind(.dollars), isUsagePeriod: true),
        .values(id: "openai.today", provider: provider, title: "Today", metricLabel: "Today", selection: .kind(.dollars), isUsagePeriod: true),
        .values(id: "openai.tokens", provider: provider, title: "Month Tokens", metricLabel: "Month Tokens", selection: .kind(.count), isUsagePeriod: true),
        .values(id: "openai.requests", provider: provider, title: "Month Requests", metricLabel: "Month Requests", selection: .kind(.count), isUsagePeriod: true)
    ] }
    func hasLocalCredentials() async -> Bool { await loadOffMainActor { [auth] in auth.loadKey() } != nil }
    var apiKeyStatus: APIKeyStatus { auth.keyStatus() }
    func currentAPIKey() -> String? { auth.loadKey() }
    func saveAPIKey(_ key: String) throws { try auth.saveKey(key) }
    func deleteAPIKey() throws { try auth.deleteKey() }
    func refresh() async -> ProviderSnapshot {
        guard let key = await loadOffMainActor({ [auth] in auth.loadKey() }) else { return .error(provider: provider, error: OpenAIUsageError.missing) }
        let date = now()
        do {
            async let costs = client.fetch(key: key, costs: true, now: date)
            async let usage = client.fetch(key: key, costs: false, now: date)
            let mapped = try await OpenAIUsageMapper.map(costs: costs, usage: usage, now: date)
            return .make(provider: provider, plan: nil, lines: mapped.lines, refreshedAt: date, usageHistory: mapped.history)
        } catch { return .error(provider: provider, error: error) }
    }
}

enum OpenAIUsageMapper {
    struct Result { var lines: [MetricLine]; var history: ProviderUsageHistory }
    static func map(costs: [OpenAIUsageClient.Bucket], usage: [OpenAIUsageClient.Bucket], now: Date) -> Result {
        let calendar = OpenAIUsageClient.utc
        func day(_ seconds: Int) -> String { DailyUsageAccumulator.dayKey(from: Date(timeIntervalSince1970: Double(seconds)), calendar: calendar) }
        var spend: [String: Double] = [:], tokens: [String: Int] = [:], models: [String: [String: Int]] = [:]
        var monthRequests = 0
        let today = DailyUsageAccumulator.dayKey(from: now, calendar: calendar)
        let month = String(today.prefix(7))
        for bucket in costs { spend[day(bucket.start_time), default: 0] += bucket.results.reduce(0) { $0 + ($1.amount?.value ?? 0) } }
        for bucket in usage {
            let date = day(bucket.start_time)
            tokens[date, default: 0] += bucket.results.reduce(0) { $0 + ($1.input_tokens ?? 0) + ($1.output_tokens ?? 0) }
            for row in bucket.results {
                models[date, default: [:]][row.model ?? ModelUsageEntry.unattributedModelName, default: 0] += (row.input_tokens ?? 0) + (row.output_tokens ?? 0)
                if date.hasPrefix(month) { monthRequests += row.num_model_requests ?? 0 }
            }
        }
        // Only join days that both reporting endpoints actually returned. Missing buckets are not zero.
        let days = Set(tokens.keys).intersection(spend.keys).sorted()
        let history = ProviderUsageHistory(series: .init(daily: days.map { .init(date: $0, totalTokens: tokens[$0]!, costUSD: spend[$0]) }),
            modelUsage: .init(daily: days.map { date in .init(date: date, models: (models[date] ?? [:]).sorted { $0.key < $1.key }.map { .init(model: $0.key, totalTokens: $0.value, costUSD: nil) }) }))
        var lines: [MetricLine] = []
        let monthSpend = spend.filter { $0.key.hasPrefix(month) }
        let monthTokens = tokens.filter { $0.key.hasPrefix(month) }
        if !monthSpend.isEmpty {
            lines.append(.values(label: "This Month", values: [.init(number: monthSpend.values.reduce(0,+), kind: .dollars)]))
        }
        if !monthTokens.isEmpty {
            lines.append(.values(label: "Month Tokens", values: [.init(number: Double(monthTokens.values.reduce(0,+)), kind: .count, label: "tokens")]))
            lines.append(.values(label: "Month Requests", values: [.init(number: Double(monthRequests), kind: .count)]))
        }
        if let value = spend[today] { lines.insert(.values(label: "Today", values: [.init(number: value, kind: .dollars)]), at: min(1, lines.count)) }
        return Result(lines: lines, history: history)
    }
}

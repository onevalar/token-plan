import Foundation

@MainActor
final class AnthropicProvider: ProviderRuntime, APIKeyManaging {
    let provider = Provider(id: "anthropic", displayName: "Anthropic API", icon: .providerMark("claude"), links: [
        ProviderLink(label: "Usage", url: "https://platform.claude.com/usage"),
        ProviderLink(label: "API Keys", url: "https://platform.claude.com/settings/admin-keys")])
    let auth: UserAPIKeyStore
    let client: AnthropicUsageClient
    let now: @Sendable () -> Date
    init(files: TextFileAccessing = LocalTextFileAccessor(), environment: EnvironmentReading = ProcessEnvironmentReader(),
         client: AnthropicUsageClient = AnthropicUsageClient(), now: @escaping @Sendable () -> Date = Date.init) {
        auth = UserAPIKeyStore(configPaths: ["~/.config/tokenplan/anthropic.json"], environmentNames: ["ANTHROPIC_ADMIN_KEY"],
            files: files, environment: environment, makeError: { _ in AnthropicUsageError.storage })
        self.client = client; self.now = now
    }
    var widgetDescriptors: [WidgetDescriptor] { [
        .values(id: "anthropic.month", provider: provider, title: "This Month", metricLabel: "This Month", selection: .kind(.dollars), isUsagePeriod: true),
        .values(id: "anthropic.today", provider: provider, title: "Today", metricLabel: "Today", selection: .kind(.dollars), isUsagePeriod: true),
        .values(id: "anthropic.tokens", provider: provider, title: "Month Tokens", metricLabel: "Month Tokens", selection: .kind(.count), isUsagePeriod: true),
        .values(id: "anthropic.requests", provider: provider, title: "Month Requests", metricLabel: "Month Requests", selection: .kind(.count), isUsagePeriod: true)
    ] }
    func hasLocalCredentials() async -> Bool { await loadOffMainActor { [auth] in auth.loadKey() } != nil }
    var apiKeyStatus: APIKeyStatus { auth.keyStatus() }
    func currentAPIKey() -> String? { auth.loadKey() }
    func saveAPIKey(_ key: String) throws { try auth.saveKey(key) }
    func deleteAPIKey() throws { try auth.deleteKey() }
    func refresh() async -> ProviderSnapshot {
        guard let key = await loadOffMainActor({ [auth] in auth.loadKey() }) else { return .error(provider: provider, error: AnthropicUsageError.missing) }
        let date = now()
        do {
            async let costs = client.fetch(key: key, costs: true, now: date)
            async let usage = client.fetch(key: key, costs: false, now: date)
            let mapped = try await OpenAIUsageMapper.map(costs: costs, usage: usage, now: date)
            return .make(provider: provider, plan: nil, lines: mapped.lines, refreshedAt: date, usageHistory: mapped.history)
        } catch { return .error(provider: provider, error: error) }
    }
}

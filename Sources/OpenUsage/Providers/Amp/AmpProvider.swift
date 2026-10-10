import Foundation

@MainActor
final class AmpProvider: ProviderRuntime {
    let provider = Provider(id: "amp", displayName: "Amp", icon: .providerMark("amp"),
                            links: [.init(label: "Dashboard", url: "https://ampcode.com/settings")])
    let authStore: AmpAuthStore
    let usageClient: AmpUsageClient

    init(authStore: AmpAuthStore = AmpAuthStore(), usageClient: AmpUsageClient = AmpUsageClient()) {
        self.authStore = authStore
        self.usageClient = usageClient
    }

    var widgetDescriptors: [WidgetDescriptor] {
        [
            .percent(id: "amp.agent", provider: provider, title: "Agent", metricLabel: "Agent Usage")
                .exportingLimit("agent", unit: "percent"),
            .percent(id: "amp.orb", provider: provider, title: "Orbs", metricLabel: "Orb Usage")
                .exportingLimit("orb", unit: "percent"),
            WidgetDescriptor(id: "amp.balance", providerID: provider.id, metricLabel: "Balance",
                             sample: WidgetData(title: tr("Balance"), icon: provider.icon, kind: .dollars, used: 0,
                                                limit: nil, unboundedValueWord: "left", showsBalanceBand: true,
                                                selection: .kind(.dollars)))
        ]
    }

    func hasLocalCredentials() async -> Bool {
        await loadOffMainActor { [authStore] in
            do { return try authStore.loadConnection() != nil }
            catch AmpUsageError.credentialsUnreadable { return true }
            catch { return false }
        }
    }

    func refresh() async -> ProviderSnapshot {
        do {
            guard let connection = try await loadOffMainActor({ [authStore] in try authStore.loadConnection() }) else {
                throw AmpUsageError.notLoggedIn
            }
            let output = try await loadOffMainActor { [usageClient] in try usageClient.fetchUsage(connection: connection) }
            let mapped = try AmpUsageMapper.map(output)
            return ProviderSnapshot.make(provider: provider, plan: mapped.plan, lines: mapped.lines,
                                         refreshedAt: Date(), warning: mapped.warning)
        } catch {
            AppLog.warn(LogTag.plugin("amp"), "usage refresh failed: \(error.localizedDescription)")
            return ProviderSnapshot.error(provider: provider, error: error)
        }
    }
}

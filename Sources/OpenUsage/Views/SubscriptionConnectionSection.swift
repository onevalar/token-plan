import SwiftUI

/// Explains the existing provider connection, without implying a TokenPlan account is required.
struct SubscriptionConnectionSection: View {
    let providerID: String
    @Environment(AppContainer.self) private var container
    @Environment(WidgetDataStore.self) private var dataStore
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        VStack(alignment: .leading, spacing: density.sectionSpacing) {
            section("Connection") {
                HStack {
                    Text("Status")
                    Spacer(minLength: 8)
                    Text(status).foregroundStyle(.secondary)
                }
                HStack(alignment: .top) {
                    Text("Login Source")
                    Spacer(minLength: 8)
                    Text(sources).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
                }
                Text("Uses your provider login. No TokenPlan sign-in is needed.")
                    .font(.caption).foregroundStyle(.secondary)
                if let notice = dataStore.headerNotice(for: providerID) {
                    Text(notice).font(.caption).foregroundStyle(Theme.notice)
                }
            }
            section("Note") {
                TextField("Note (Optional)", text: Binding(
                    get: { container.subscriptionNotes.note(for: providerID) },
                    set: { container.subscriptionNotes.setNote($0, for: providerID) }
                ))
                .textFieldStyle(.roundedBorder)
                HStack {
                    Text("Show Note in Overview")
                    Spacer(minLength: 8)
                    Toggle("Show Note in Overview", isOn: Binding(
                        get: { container.subscriptionNotes.showsNote(for: providerID) },
                        set: { container.subscriptionNotes.setShowsNote($0, for: providerID) }
                    ))
                    .settingsSwitchStyle()
                }
            }
            section("Manage") {
                Button("Refresh Usage") {
                    Task { await dataStore.refresh(providerID: providerID, force: true) }
                }
                .disabled(dataStore.refreshingProviderIDs.contains(providerID))
                ProviderLoginHelpView()
            }
        }
    }

    private var status: String {
        if dataStore.refreshingProviderIDs.contains(providerID) { return tr("Refreshing…") }
        if dataStore.headerNotice(for: providerID) != nil { return tr("Needs Attention") }
        if dataStore.snapshots[providerID] != nil { return tr("Connected") }
        return tr("No data")
    }

    private var sources: String {
        if let record = container.accounts.records.first(where: { $0.id == providerID }), !record.sources.isEmpty {
            return Array(Set(record.sources.map { source in
                switch source.kind {
                case .defaultHome: tr("Local CLI")
                case .claudeSwap: "Claude Swap"
                case .codexSwap: "Codex Swap"
                case .codexHome: "Codex Home"
                case .pi: "pi"
                }
            })).sorted().joined(separator: " · ")
        }
        return container.apiKeyProviders.contains { $0.provider.id == providerID }
            ? tr("API Key") : tr("Provider App / CLI")
    }

    private func section(_ title: LocalizedStringKey, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: density.headerToCardSpacing) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(.secondary).padding(.horizontal, 8)
            VStack(alignment: .leading, spacing: 10) { content() }
                .padding(12).frame(maxWidth: .infinity, alignment: .leading).cardSurface()
        }
    }
}

/// Real provider logins remain owned by their apps/tools. A rescan requires a restart because the
/// runtime registry is assembled at launch; it must not reset the user's provider choices.
struct ProviderLoginHelpView: View {
    @State private var confirmingRestart = false

    var body: some View {
        DisclosureGroup("Add Service Login") {
            VStack(alignment: .leading, spacing: 10) {
                Text("Sign in to the provider's app or CLI, then restart TokenPlan to detect it. API keys can be entered in the service's settings.")
                Text("Additional Claude and Codex logins can come from Claude Swap, Codex Swap, supported Codex homes or pi. TokenPlan only reads these logins; it does not switch accounts.")
                Button("Restart and Detect Logins") { confirmingRestart = true }
            }
            .font(.caption).foregroundStyle(.secondary).padding(.top, 8)
        }
        .alert("Restart TokenPlan?", isPresented: $confirmingRestart) {
            Button("Restart Now") { LanguageSetting.relaunch() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Detects provider logins again without resetting your display preferences.")
        }
    }
}

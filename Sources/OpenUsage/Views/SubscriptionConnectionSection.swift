import SwiftUI

/// Per-subscription notes. Adding logins belongs to the service list.
struct SubscriptionNoteSection: View {
    let providerID: String
    @Environment(AppContainer.self) private var container
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        VStack(alignment: .leading, spacing: density.sectionSpacing) {
            DetailDisclosure(title: "Note", subtitle: "Optional, saved on this Mac. Use it for a renewal date or an account reminder.") {
                VStack(alignment: .leading, spacing: 10) {
                    TextField("Note (Optional)", text: Binding(
                        get: { container.subscriptionNotes.note(for: providerID) },
                        set: { container.subscriptionNotes.setNote($0, for: providerID) }
                    ), axis: .vertical)
                    .lineLimit(2...4)
                    .textFieldStyle(.plain)
                    .tokenPlanField()
                    Toggle("Show Note in Overview", isOn: Binding(
                        get: { container.subscriptionNotes.showsNote(for: providerID) },
                        set: { container.subscriptionNotes.setShowsNote($0, for: providerID) }
                    ))
                    .toggleStyle(.checkbox).font(.caption)
                }
                .padding(.horizontal, 12).padding(.bottom, 4)
            }
        }
    }


}

/// Real provider logins remain owned by their apps/tools. A rescan requires a restart because the
/// runtime registry is assembled at launch; it must not reset the user's provider choices.
struct ProviderLoginHelpView: View {
    @State private var confirmingRestart = false

    var body: some View {
        DetailDisclosure(
            title: "Add Service Login",
            subtitle: "Sign in to the provider's app or CLI, then restart TokenPlan to detect it. API keys can be entered in the service's settings."
        ) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Additional Claude and Codex logins can come from Claude Swap, Codex Swap, supported Codex homes or pi. TokenPlan only reads these logins; it does not switch accounts.")
                Button("Restart and Detect Logins") { confirmingRestart = true }
                    .buttonStyle(.bordered).controlSize(.small)
            }
            .font(.caption).foregroundStyle(.secondary)
            .padding(.horizontal, 12).padding(.bottom, 4)
        }
        .alert("Restart TokenPlan?", isPresented: $confirmingRestart) {
            Button("Restart Now") { LanguageSetting.relaunch() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Detects provider logins again without resetting your display preferences.")
        }
    }
}

/// Compact status alongside the service name; never consumes a full settings row.
struct SubscriptionStatusLabel: View {
    let providerID: String
    @Environment(WidgetDataStore.self) private var dataStore

    private var label: String {
        if dataStore.refreshingProviderIDs.contains(providerID) { return tr("Refreshing…") }
        if dataStore.headerNotice(for: providerID) != nil { return tr("Needs Attention") }
        return dataStore.snapshots[providerID] == nil ? tr("No data") : tr("Connected")
    }

    var body: some View {
        Text(label).font(.caption2).foregroundStyle(.secondary).fixedSize()
    }
}

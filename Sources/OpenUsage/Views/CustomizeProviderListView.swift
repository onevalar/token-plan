import SwiftUI

/// The Customize provider list (L1): every known provider as a row, in the user's saved order —
/// including disabled ones (greyed), so the user can re-enable them or open their detail. Each row
/// carries an on/off toggle, a metric-count label, and a chevron into the provider's detail (L2).
/// Enabled providers drag-reorder by the leading grip; tapping a row opens
/// L2 (`layout.customizeProviderID = id`).
struct CustomizeProviderListView: View {
    @Environment(LayoutStore.self) private var layout
    @Environment(AppContainer.self) private var container
    let reorderSpaceName: String
    @Binding var reorderLift: ReorderLift?
    let frameStore: ReorderFrameStore

    @State private var showsOtherServices = false
    @State private var activeProviderID: String?
    @State private var isPresentingResetConfirm = false
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    private var orderedRows: [ProviderRow] { layout.customizeProviderRows }

    var body: some View {
        VStack(alignment: .leading, spacing: density.sectionSpacing) {
            Text("Usage Overview").font(.subheadline.weight(.semibold)).padding(.horizontal, 8)
            if layout.hasSpendCapableProvider {
                TotalSpendCard()
            } else {
                Text("Enable a service with usage history to see totals here.")
                    .font(.subheadline).foregroundStyle(.secondary).padding(.horizontal, 8)
            }

            VStack(alignment: .leading, spacing: 0) {
                Text("Enabled Services")
                    .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                ForEach(orderedRows.filter(\.isEnabled)) { row in
                    providerRow(row)
                }
            }
            DisclosureGroup("Other Services", isExpanded: $showsOtherServices) {
                VStack(spacing: 0) {
                    ForEach(orderedRows.filter { !$0.isEnabled }) { row in
                        providerRow(row)
                    }
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            ProviderLoginHelpView()
            Button("Restore All Defaults…") { isPresentingResetConfirm = true }
                .buttonStyle(.plain).foregroundStyle(.secondary).padding(.horizontal, 8)
                .alert("Restore All Defaults?", isPresented: $isPresentingResetConfirm) {
                    Button("Restore", role: .destructive) {
                        withAnimation(Motion.spring) {
                            layout.resetToDefault()
                            container.reseedEnabledProviders()
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Restores service visibility, metric order and menu-bar selections to their defaults. Connection details and notes are unchanged.")
                }

        }
        .animation(Motion.spring, value: orderedRows.filter(\.isEnabled).map(\.id))
        .animation(Motion.spring, value: showsOtherServices)
        .onChange(of: layout.customizeProviderID) { _, _ in isPresentingResetConfirm = false }
        .onChange(of: layout.screen) { _, _ in isPresentingResetConfirm = false }
    }

    private func providerRow(_ row: ProviderRow) -> some View {
        ProviderListRow(
            provider: row.provider,
            isEnabled: row.isEnabled,
            metricCount: row.metricCount,
            // The grip leads the tappable bar; a tap opens L2, a drag reorders. Drag-reorder is enabled
            // only for active providers — `reorderProvider` operates on the enabled set, so a disabled
            // row's grip stays inert (the row still opens/toggles).
            handle: { grip in
                if row.isEnabled {
                    AnyView(grip.highPriorityGesture(providerDragGesture(for: row)))
                } else {
                    grip
                }
            },
            onToggle: { container.enablement.setEnabled($0, for: row.id) },
            onOpen: { withAnimation(Motion.navigation) { layout.customizeProviderID = row.id } }
        )
        .opacity(activeProviderID == row.id ? 0 : 1)
        .reorderFrame(id: row.id, in: .named(reorderSpaceName))
    }

    private func providerDragGesture(for row: ProviderRow) -> some Gesture {
        reorderDragGesture(
            id: row.id,
            coordinateSpaceName: reorderSpaceName,
            frameStore: frameStore,
            active: $activeProviderID,
            lift: $reorderLift,
            makeLift: { makeProviderLift(for: row, value: $0) },
            // Hit-test only enabled providers (the set `reorderProvider` can actually move); disabled
            // rows keep their tail position and aren't reorder targets.
            orderedIDs: { layout.customizeGroups.map(\.provider.id) },
            reorder: { layout.reorderProvider(dragged: row.id, target: $0) }
        )
    }

    private func makeProviderLift(for row: ProviderRow, value: DragGesture.Value) -> ReorderLift? {
        ReorderLift.make(
            id: row.id,
            payload: .customizeProviderRow(provider: row.provider, isEnabled: row.isEnabled, metricCount: row.metricCount),
            value: value,
            frames: frameStore.frames
        )
    }
}

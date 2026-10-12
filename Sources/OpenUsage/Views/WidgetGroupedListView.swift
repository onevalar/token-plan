import SwiftUI

/// The dashboard display: one inset group per provider. A provider's icon + name
/// leads its metric rows, with a separator between groups rather than a nested rounded card.
/// Rows are the shared `WidgetRowView`, fed by the same `WidgetDataStore` the menu bar
/// uses.
///
/// Reordering works here directly (no Customize needed): drag any metric row to reorder it within its
/// provider, or drag a provider's header line to reorder whole providers. Customize stays the discoverable,
/// obvious place to do the same plus toggle metrics on/off. Both surfaces use the same local gesture/geometry
/// helper so they work inside the menu-bar popover without a system drag/drop session.
struct WidgetGroupedListView: View {
    @Environment(AppContainer.self) private var container
    @Environment(LayoutStore.self) private var layout
    @Environment(WidgetDataStore.self) private var dataStore
    let reorderSpaceName: String
    @Binding var reorderLift: ReorderLift?

    @State private var frameStore = ReorderFrameStore()
    @State private var activeProviderID: String?
    @State private var activeMetricID: String?
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        let services = layout.displayServices
        let rowsByProvider = Dictionary(uniqueKeysWithValues: services.flatMap(\.accounts).map {
            ($0.id, resolvedRows($0.alwaysShownWidgets))
        })
        let columns = QuotaTableColumns(rows: rowsByProvider.values.flatMap { $0.map(\.data) }, density: density)
        // Provider-section spacing is noticeably wider than the in-card row rhythm (so groups
        // still read as groups); the exact step comes from the density setting.
        VStack(alignment: .leading, spacing: density.sectionSpacing) {
            ForEach(services) { service in
                VStack(alignment: .leading, spacing: density.headerToCardSpacing) {
                    if service.accounts.count > 1 {
                        ProviderSectionHeader(provider: service.provider)
                            .padding(.horizontal, 8)
                    }
                    ForEach(service.accounts) { group in
                        section(group, service: service, rows: rowsByProvider[group.id]!, columns: columns)
                    }
                }
                .overlay(alignment: .top) {
                    if service.id != services.first?.id {
                        Divider().offset(y: -density.sectionSpacing / 2)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .onPreferenceChange(ReorderFramePreferenceKey.self) { frameStore.frames = $0 }
        .animation(Motion.spring, value: layout.displayGroups.map(\.provider.id))
    }

    private func section(_ group: ProviderGroup, service: ProviderServiceGroup,
                         rows: [ResolvedRow], columns sharedColumns: QuotaTableColumns) -> some View {
        let providerID = group.provider.id
        // Amp quotas are not rolling 5h/1w windows. Share tracks within this card without
        // borrowing another service's deadline column; keep explicit Amp resets when reported.
        let columns = providerID == "amp" ? QuotaTableColumns(rows: rows.map(\.data), density: density) : sharedColumns
        let condensedIDs = condensedTextRowIDs(rows)
        return DashboardMetricCard(tableColumns: columns) {
            if service.accounts.count == 1 {
                header(group, service: service.provider, columns: columns)
            } else {
                Button { openCustomize(for: group.id) } label: {
                    HStack {
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(verbatim: group.provider.accountLabel ?? group.provider.displayName)
                                .font(.subheadline.weight(.medium))
                                .lineLimit(1)
                                .truncationMode(.middle)
                            if let plan = dataStore.plan(for: group.id) {
                                Text(verbatim: plan)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .fixedSize()
                            }
                        }
                        Spacer(minLength: 8)
                        Image(systemName: "chevron.right").foregroundStyle(.secondary)
                    }
                    .contentShape(Rectangle())
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(String(localized: "Open \(group.provider.displayName)"))
            }
            if let note = container.subscriptionNotes.overviewNote(for: group.id) {
                Text(note).font(.caption).foregroundStyle(.secondary).lineLimit(2).padding(.horizontal, 10)
            }
            if let notice = dataStore.headerNotice(for: providerID) {
                ProviderNoticeRow(message: notice)
            }
            ForEach(rows) { entry in
                row(entry.descriptor, data: entry.data, in: providerID,
                    condensedTop: condensedIDs.contains(entry.descriptor.id), columns: columns)
            }
        }
        .opacity(activeProviderID == group.provider.id ? 0 : 1)
        .reorderFrame(id: group.provider.id, in: .named(reorderSpaceName))
    }

    private func header(_ group: ProviderGroup, service: Provider, columns: QuotaTableColumns) -> some View {
        ProviderSectionHeader(
            provider: service,
            plan: dataStore.plan(for: group.provider.id),
            warning: dataStore.headerNotice(for: group.provider.id),
            refreshing: dataStore.refreshingProviderIDs.contains(group.provider.id),
            staleness: dataStore.stalenessHint(for: group.provider.id),
            onOpenDetails: { openCustomize(for: group.id) }
        )
        // Keep the provider mark and hover-revealed copy control aligned with the card's content edges.
        .padding(.horizontal, 12)
        .highPriorityGesture(providerDragGesture(for: group, columns: columns))
        .contextMenu {
            // Hides the whole provider section (the Customize provider list brings it back). Mirrors
            // the per-metric "Hide" but one level up, so the verb order reads the same on a header as a row.
            Button("Hide \(group.provider.displayName)") {
                container.enablement.setEnabled(false, for: group.provider.id)
            }
            Divider()
            Button("Refresh \(group.provider.displayName)") {
                Task { await dataStore.refresh(providerID: group.provider.id, force: true) }
            }
            Button("Customize…") {
                openCustomize(for: group.provider.id)
            }
        }
    }

    /// A row's placed widget paired with its resolved descriptor + data, so each `dataStore.data(for:)`
    /// is computed once per render and reused by both the condensing rule and the row. Keyed off the
    /// `PlacedWidget` so `ForEach` identity stays exactly what it was before this was precomputed.
    private struct ResolvedRow: Identifiable {
        let widget: PlacedWidget
        let descriptor: WidgetDescriptor
        let data: WidgetData
        var id: PlacedWidget.ID { widget.id }
    }

    private func resolvedRows(_ widgets: [PlacedWidget]) -> [ResolvedRow] {
        widgets.compactMap { widget -> ResolvedRow? in
            guard let descriptor = layout.descriptor(for: widget) else { return nil }
            return ResolvedRow(widget: widget, descriptor: descriptor, data: dataStore.data(for: descriptor))
        }
    }

    /// Consecutive text-only readings share a tighter rhythm.
    private func condensedTextRowIDs(_ rows: [ResolvedRow]) -> Set<String> {
        let offsets = WidgetData.condensedTextRowOffsets(in: rows.map(\.data))
        return Set(offsets.map { rows[$0].descriptor.id })
    }

    private func row(_ descriptor: WidgetDescriptor, data: WidgetData, in providerID: String,
                     condensedTop: Bool, columns: QuotaTableColumns) -> some View {
        return WidgetRowView(
            data: data,
            condensedTop: condensedTop
        )
            .contentShape(Rectangle())
            .opacity(activeMetricID == descriptor.id ? 0 : 1)
            .highPriorityGesture(metricDragGesture(for: descriptor, providerID: providerID, columns: columns))
            .contextMenu { rowMenu(descriptor, providerID: providerID) }
            .reorderFrame(id: descriptor.id, in: .named(reorderSpaceName))
    }

    /// Desktop-native management for a single metric: hide it, pin/unpin it, refresh its provider, or jump
    /// into Customize — without a trip through Customize first. Hide leads (the most-reached-for verb), then
    /// star, then a divider before the two provider-/app-level actions.
    @ViewBuilder
    private func rowMenu(_ descriptor: WidgetDescriptor, providerID: String) -> some View {
        Button("Hide") {
            layout.setMetricEnabled(descriptor.id, false)
        }
        if descriptor.pinnable {
            Button(layout.isPinned(descriptor.id) ? "Unstar" : "Star for menu bar") {
                if layout.isPinned(descriptor.id) {
                    layout.setPinned(false, for: descriptor.id)
                } else if layout.canPin(descriptor.id) {
                    layout.setPinned(true, for: descriptor.id)
                } else {
                    layout.notePinDenied(descriptor.id)
                }
            }
        }
        Divider()
        if let provider = layout.provider(id: providerID) {
            Button("Refresh \(provider.displayName)") {
                Task { await dataStore.refresh(providerID: providerID, force: true) }
            }
        }
        Button("Customize…") {
            openCustomize(for: providerID)
        }
    }

    /// From the dashboard, jump straight into this provider's Customize metrics (L2), not the provider list.
    private func openCustomize(for providerID: String) {
        withAnimation(Motion.navigation) {
            layout.customizeProviderID = providerID
            layout.isEditing = true
        }
    }

    private func providerDragGesture(for group: ProviderGroup, columns: QuotaTableColumns) -> some Gesture {
        reorderDragGesture(
            id: group.provider.id,
            coordinateSpaceName: reorderSpaceName,
            frameStore: frameStore,
            active: $activeProviderID,
            lift: $reorderLift,
            makeLift: { makeProviderLift(for: group, columns: columns, value: $0) },
            orderedIDs: { layout.displayGroups.map(\.provider.id) },
            reorder: { layout.reorderProvider(dragged: group.provider.id, target: $0) }
        )
    }

    private func metricDragGesture(for descriptor: WidgetDescriptor, providerID: String,
                                   columns: QuotaTableColumns) -> some Gesture {
        reorderDragGesture(
            id: descriptor.id,
            coordinateSpaceName: reorderSpaceName,
            frameStore: frameStore,
            active: $activeMetricID,
            lift: $reorderLift,
            makeLift: { makeMetricLift(for: descriptor, columns: columns, value: $0) },
            orderedIDs: { metricTargetIDs(for: providerID) },
            reorder: { layout.reorderMetric(dragged: descriptor.id, target: $0, in: providerID) }
        )
    }

    private func metricTargetIDs(for providerID: String) -> [String] {
        guard let group = layout.displayGroups.first(where: { $0.provider.id == providerID }) else {
            return []
        }
        return resolvedRows(group.alwaysShownWidgets).map { $0.descriptor.id }
    }

    private func makeProviderLift(for group: ProviderGroup, columns: QuotaTableColumns,
                                  value: DragGesture.Value) -> ReorderLift? {
        let rows = resolvedRows(group.alwaysShownWidgets).map(\.data)
        return ReorderLift.make(
            id: group.provider.id,
            payload: .dashboardProvider(
                provider: group.provider,
                plan: dataStore.plan(for: group.provider.id),
                rows: rows,
                columns: columns
            ),
            value: value,
            frames: frameStore.frames
        )
    }

    private func makeMetricLift(for descriptor: WidgetDescriptor, columns: QuotaTableColumns,
                                value: DragGesture.Value) -> ReorderLift? {
        return ReorderLift.make(
            id: descriptor.id,
            payload: .dashboardMetric(data: dataStore.data(for: descriptor),
                                      columns: columns),
            value: value,
            frames: frameStore.frames
        )
    }
}

import SwiftUI

/// Subscription details: connection and notes, followed by explicit metric placement and menu-bar
/// controls. Drag grips reorder within a placement; only the dropdown changes visibility.
/// A container-level gesture uses grip frames so row moves cannot tear down the active gesture.
struct CustomizeProviderDetailView: View {
    @Environment(LayoutStore.self) private var layout
    @Environment(AppContainer.self) private var container
    @Environment(WidgetDataStore.self) private var dataStore
    let providerID: String
    let reorderSpaceName: String
    @Binding var reorderLift: ReorderLift?
    let frameStore: ReorderFrameStore

    @State private var showsSettings = false
    @State private var activeMetricID: String?
    @State private var isPresentingResetConfirm = false
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        if let group = layout.customizeDetail(for: providerID) {
            VStack(alignment: .leading, spacing: density.sectionSpacing) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        if group.provider.accountLabel != nil {
                            ProviderSectionHeader(provider: Provider(
                                id: group.provider.id,
                                displayName: ProviderAccountID.family(of: providerID) == "claude" ? "Claude" : group.provider.displayName,
                                icon: group.provider.icon
                            ))
                        } else {
                            ProviderSectionHeader(provider: group.provider, plan: dataStore.plan(for: providerID))
                        }
                        Button {
                            Task { await dataStore.refresh(providerID: providerID, force: true) }
                        } label: {
                            Label("Refresh", systemImage: "arrow.clockwise")
                                .font(.caption.weight(.medium))
                                .padding(.horizontal, 9).frame(height: 28)
                                .background(.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain).foregroundStyle(.secondary)
                        .fixedSize()
                        .disabled(dataStore.refreshingProviderIDs.contains(providerID))
                        .accessibilityLabel("Refresh Usage")
                    }
                    if let email = group.provider.accountLabel {
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(verbatim: email)
                                .font(.subheadline.weight(.medium))
                                .lineLimit(1).truncationMode(.middle)
                            if let plan = dataStore.plan(for: providerID) {
                                Text(verbatim: plan)
                                    .font(.subheadline).foregroundStyle(.secondary)
                                    .fixedSize()
                            }
                        }
                        .padding(.leading, 2)
                    }
                }
                .padding(.horizontal, 8)
                HStack(spacing: 4) {
                    detailTab("Usage", settings: false)
                    detailTab("Settings", settings: true)
                }
                .padding(4)
                .background(.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 8))
                if showsSettings {
                    if let keyProvider = container.apiKeyProviders.first(where: { $0.provider.id == providerID }) {
                        APIKeysSection(provider: keyProvider)
                    }
                    metricSections(group).simultaneousGesture(metricDragGesture())
                    SubscriptionNoteSection(providerID: providerID)
                    Button("Restore Defaults…") { isPresentingResetConfirm = true }
                        .buttonStyle(.plain).font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .alert("Restore Defaults?", isPresented: $isPresentingResetConfirm) {
                            Button("Restore", role: .destructive) {
                                withAnimation(Motion.spring) { layout.resetProvider(providerID) }
                            }
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text("Restores this subscription's metric visibility, order and menu-bar selection. Other subscriptions are unchanged.")
                        }
                } else {
                    usageSection(group)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .animation(Motion.spring, value: layout.expandedMetricIDs)
            .onChange(of: layout.customizeProviderID) { _, _ in isPresentingResetConfirm = false }
            .onChange(of: layout.screen) { _, _ in isPresentingResetConfirm = false }
        } else {
            // Unknown provider — L1 only lists known providers, so this is unreachable in practice.
            EmptyView()
        }
    }

    private func detailTab(_ title: LocalizedStringKey, settings: Bool) -> some View {
        Button { showsSettings = settings } label: {
            Text(title).font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity).padding(.vertical, 7)
                .background(showsSettings == settings ? Theme.accent.opacity(0.14) : .clear,
                            in: RoundedRectangle(cornerRadius: 6))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(showsSettings == settings ? Theme.accent : Color.secondary)
        .accessibilityAddTraits(showsSettings == settings ? .isSelected : [])
    }

    private func usageSection(_ group: ProviderMetrics) -> some View {
        let enabled = group.metrics.filter { layout.isMetricEnabled($0.id) }
        let primary = enabled.filter { !$0.sample.isChart && !$0.sample.isUsagePeriod && !$0.sample.showsResetExpiries }
        let credits = enabled.filter { $0.sample.showsResetExpiries }
        let additional = enabled.filter { ($0.sample.isChart || $0.sample.isUsagePeriod) && !$0.sample.showsResetExpiries }
        return VStack(alignment: .leading, spacing: density.sectionSpacing) {
            if let notice = dataStore.headerNotice(for: providerID) {
                ProviderNoticeRow(message: notice)
            }
            DashboardMetricCard(tableColumns: QuotaTableColumns(rows: primary.map { dataStore.data(for: $0) }, density: density)) {
                ForEach(primary, id: \.id) { metric in
                    WidgetRowView(data: dataStore.data(for: metric), showsDetails: true)
                }
            }
            .cardSurface()
            ForEach(credits, id: \.id) { metric in
                WidgetRowView(data: dataStore.data(for: metric), showsDetails: true)
                    .padding(.vertical, density.cardGutter)
                    .cardSurface()
            }
            if !additional.isEmpty {
                VStack(spacing: 0) {
                    ForEach(additional, id: \.id) { metric in
                        WidgetRowView(data: dataStore.data(for: metric), showsDetails: true)
                    }
                }
                .padding(.vertical, density.cardGutter)
                .cardSurface()
            }
            if !group.provider.visibleLinks.isEmpty {
                ProviderLinksView(links: group.provider.visibleLinks)
            }
        }
    }

    private func metricSections(_ group: ProviderMetrics) -> some View {
        let pinCount = layout.pinnedCount(forProvider: providerID)
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Display Content").font(.subheadline.weight(.semibold))
                Spacer()
                Text(trf("Menu Bar: %lld/%lld", pinCount, LayoutStore.maxPinsPerProvider))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 6))
            }
            .padding(.horizontal, 8)
            Text("Choose where each item appears. Menu Bar shows up to two values beside the app icon; uncheck one before choosing a replacement.")
                .font(.caption).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true).padding(.horizontal, 8)
            VStack(spacing: 0) {
                CustomizeMetricRow(title: tr("Content Item"), handle: { AnyView($0.hidden()) }) {
                    Text("Display Configuration").frame(width: 100)
                    Text("Menu Bar").frame(width: 58)
                }
                .font(.caption).foregroundStyle(.secondary)
                Divider().padding(.horizontal, 12)
                ForEach(group.metrics, id: \.id) { metric in
                    metricRow(metric, in: group.provider.id)
                }
            }
            .cardSurface()
        }
    }

    private func metricRow(_ metric: WidgetDescriptor, in providerID: String) -> some View {
        let isActive = activeMetricID == metric.id
        return CustomizeMetricRow(
            title: metric.title,
            // The grip is visual-only and publishes its frame (id "grip:<metric>") so the container
            // gesture can tell which row a drag started on. The drag gesture itself is on the section
            // stack, not the grip — see `metricDragGesture`.
            handle: { grip in
                AnyView(grip.reorderFrame(id: "grip:\(metric.id)", in: .named(reorderSpaceName)))
            },
            trailing: {
                Menu {
                    if !metric.sample.isChart && !metric.sample.isUsagePeriod && !metric.sample.showsResetExpiries {
                        placementOption("Show on Home", .visible, metric: metric)
                    }
                    placementOption("Details Only", .details, metric: metric)
                    placementOption("Hidden", .hidden, metric: metric)
                } label: {
                    HStack(spacing: 6) {
                        Text(placement(of: metric) == .visible ? tr("Show on Home") : placement(of: metric) == .details ? tr("Details Only") : tr("Hidden"))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.up.chevron.down").font(.caption)
                    }
                    .padding(.horizontal, 10).frame(width: 100, height: 30)
                    .background(.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 8))
                    .contentShape(Rectangle())
                }
                .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).fixedSize()
                .accessibilityLabel(trf("Display Configuration: %@", metric.title))
                StarButton(metric: metric).frame(width: 58)
            }
        )
        .contentShape(Rectangle())
        .opacity(isActive ? 0 : 1)
        .reorderFrame(id: metric.id, in: .named(reorderSpaceName))
    }

    private func placementOption(_ title: LocalizedStringKey, _ value: MetricPlacement, metric: WidgetDescriptor) -> some View {
        Button { setPlacement(value, for: metric) } label: {
            if placement(of: metric) == value { Label(title, systemImage: "checkmark") }
            else { Text(title) }
        }
    }

    // MARK: - Container drag-reorder

    private enum MetricPlacement: Hashable { case visible, details, hidden }

    private func placement(of metric: WidgetDescriptor) -> MetricPlacement {
        guard layout.isMetricEnabled(metric.id) else { return .hidden }
        if metric.sample.isChart || metric.sample.isUsagePeriod || metric.sample.showsResetExpiries { return .details }
        // Keep saved placements editable even when the whole service is off.
        let visible = layout.customizeDetail(for: providerID)?.alwaysShownMetrics
            .filter { layout.isMetricEnabled($0.id) } ?? []
        return visible.contains { $0.id == metric.id } ? .visible : .details
    }

    private func setPlacement(_ placement: MetricPlacement, for metric: WidgetDescriptor) {
        layout.recordingUndoStep {
            layout.setMetricEnabled(metric.id, placement != .hidden)
            guard placement != .hidden else { return }
            let divider = expandedDividerID(for: providerID)
            var order = layout.metricOrderWithDivider(for: providerID, dividerID: divider).filter { $0 != metric.id }
            let index = order.firstIndex(of: divider)!
            order.insert(metric.id, at: placement == .visible ? index : index + 1)
            _ = layout.applyMetricDividerOrder(order, dragged: metric.id, dividerID: divider, in: providerID)
        }
    }

    /// Reorder within the current placement. A drag in this single table must not silently move
    /// an overview row into Details — that is the dropdown's job.
    private func metricDragGesture() -> some Gesture {
        DragGesture(minimumDistance: 4, coordinateSpace: .named(reorderSpaceName))
            .onChanged { value in
                if activeMetricID == nil {
                    if let id = metricID(at: value.startLocation) {
                        activeMetricID = id
                        if let lift = makeLift(metricID: id, value: value) {
                            reorderLift = lift
                        }
                    }
                }
                guard let id = activeMetricID else { return }
                reorderLift?.location = value.location
                let divider = expandedDividerID(for: providerID)
                let ordered = reorderTargetIDs(for: providerID)
                guard let target = reorderTarget(
                    at: value.location,
                    in: frameStore.frames,
                    excluding: id,
                    orderedIDs: ordered
                ),
                      layout.expandedMetricIDs.contains(id) == layout.expandedMetricIDs.contains(target),
                      let next = LayoutStore.reordered(ordered, dragged: id, target: target) else { return }
                withAnimation(Motion.spring) {
                    _ = layout.applyMetricDividerOrder(next, dragged: id, dividerID: divider, in: providerID)
                }
            }
            .onEnded { _ in
                activeMetricID = nil
                reorderLift = nil
            }
    }

    /// The metric a drag started on, by hit-testing the drag start against the grip frames
    /// ("grip:<metric>" entries in the frame store). Nil when the drag didn't start on a grip.
    private func metricID(at point: CGPoint) -> String? {
        for (key, frame) in frameStore.frames {
            guard key.hasPrefix("grip:"), frame.insetBy(dx: 0, dy: -2).contains(point) else { continue }
            return String(key.dropFirst("grip:".count))
        }
        return nil
    }

    private func reorderTargetIDs(for providerID: String) -> [String] {
        layout.metricOrderWithDivider(for: providerID, dividerID: expandedDividerID(for: providerID))
    }

    private func expandedDividerID(for providerID: String) -> String {
        "\(providerID)::expanded-divider"
    }

    private func makeLift(metricID: String, value: DragGesture.Value) -> ReorderLift? {
        let title = layout.customizeDetail(for: providerID)?.metrics.first { $0.id == metricID }?.title ?? ""
        return ReorderLift.make(
            id: metricID,
            payload: .customizeMetric(title: title),
            value: value,
            frames: frameStore.frames
        )
    }
}

/// Disable unavailable slots before interaction; selected items stay enabled for removal.
private struct StarButton: View {
    let metric: WidgetDescriptor
    @Environment(LayoutStore.self) private var layout

    var body: some View {
        if metric.pinnable {
            let pinned = layout.isPinned(metric.id)
            Toggle("Menu Bar", isOn: Binding(get: { pinned }, set: { selected in
                layout.setPinned(selected, for: metric.id)
            }))
            .toggleStyle(.checkbox).labelsHidden()
            .disabled(!layout.canPin(metric.id))
            .accessibilityLabel(trf("Menu Bar: %@", metric.title))
            .animation(Motion.spring, value: pinned)
        } else {
            Text("—").foregroundStyle(.tertiary).accessibilityLabel("Unavailable")
        }
    }
}

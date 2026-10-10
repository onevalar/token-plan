import SwiftUI

/// Subscription details: connection and notes, followed by explicit metric placement and menu-bar
/// controls. Drag grips reorder within a placement; only the dropdown changes visibility.
/// A container-level gesture uses grip frames so row moves cannot tear down the active gesture.
struct CustomizeProviderDetailView: View {
    @Environment(LayoutStore.self) private var layout
    @Environment(AppContainer.self) private var container
    @Environment(WidgetDataStore.self) private var dataStore
    @Environment(\.codexResetClaims) private var codexResetClaims
    let providerID: String
    let reorderSpaceName: String
    @Binding var reorderLift: ReorderLift?
    let frameStore: ReorderFrameStore

    @State private var activeMetricID: String?
    @State private var isPresentingResetConfirm = false
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        if let group = layout.customizeDetail(for: providerID) {
            VStack(alignment: .leading, spacing: density.sectionSpacing) {
                usageSection(group)
                SubscriptionConnectionSection(providerID: providerID)
                metricSections(group)
                    .simultaneousGesture(metricDragGesture())
                Button("Restore Defaults…") { isPresentingResetConfirm = true }
                    .buttonStyle(.plain).foregroundStyle(.secondary).padding(.horizontal, 8)
                    .alert("Restore Defaults?", isPresented: $isPresentingResetConfirm) {
                        Button("Restore", role: .destructive) {
                            withAnimation(Motion.spring) { layout.resetProvider(providerID) }
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("Restores this subscription's metric visibility, order and menu-bar selection. Other subscriptions are unchanged.")
                    }
                if let keyProvider = container.apiKeyProviders.first(where: { $0.provider.id == providerID }) {
                    APIKeysSection(provider: keyProvider)
                }
                if ProviderAccountID.family(of: providerID) == "codex" {
                    CodexPricingSection(providerIDs: container.registry.providers
                        .map(\.id)
                        .filter { ProviderAccountID.family(of: $0) == "codex" })
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

    private func usageSection(_ group: ProviderMetrics) -> some View {
        VStack(alignment: .leading, spacing: density.headerToCardSpacing) {
            ProviderSectionHeader(provider: group.provider, plan: dataStore.plan(for: providerID))
                .padding(.horizontal, 8)
            DashboardMetricCard {
                if let notice = dataStore.headerNotice(for: providerID) {
                    ProviderNoticeRow(message: notice)
                }
                ForEach(group.metrics.filter { layout.isMetricEnabled($0.id) }, id: \.id) { metric in
                    if metric.sample.showsResetExpiries { Divider().padding(.horizontal, 14) }
                    WidgetRowView(data: dataStore.data(for: metric), showsDetails: true)
                        .environment(\.codexResetClaim, codexResetClaims[providerID])
                }
                if !group.provider.visibleLinks.isEmpty {
                    ProviderLinksView(links: group.provider.visibleLinks)
                }
            }
        }
    }

    private func metricSections(_ group: ProviderMetrics) -> some View {
        VStack(alignment: .leading, spacing: density.sectionSpacing) {
            metricSection("Display Metrics", metrics: group.metrics, providerID: group.provider.id)
            Text("Menu Bar: Percentage shows up to 2 starred metrics; Ring shows one primary quota per selected account.")
                .font(.caption).foregroundStyle(.secondary).padding(.horizontal, 8)
        }
    }

    // MARK: - Metric sections

    private func metricSection(_ title: String, metrics: [WidgetDescriptor], providerID: String) -> some View {
        VStack(alignment: .leading, spacing: density.headerToCardSpacing) {
            Text(tr(title))
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 8)
            VStack(spacing: 0) {
                HStack {
                    Text("Metric")
                    Spacer(minLength: 8)
                    Text("Overview").frame(width: 100)
                    Text("Menu Bar").frame(width: 58)
                }
                .font(.caption).foregroundStyle(.secondary).padding(.horizontal, 12).padding(.vertical, 8)
                ForEach(metrics, id: \.id) { metric in
                    metricRow(metric, in: providerID)
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
                Picker("Overview", selection: Binding(
                    get: { placement(of: metric) },
                    set: { setPlacement($0, for: metric) }
                )) {
                    if !metric.sample.isChart && !metric.sample.isUsagePeriod && !metric.sample.showsResetExpiries {
                        Text("Visible").tag(MetricPlacement.visible)
                    }
                    Text("Details").tag(MetricPlacement.details)
                    Text("Hidden").tag(MetricPlacement.hidden)
                }
                .labelsHidden().pickerStyle(.menu).frame(width: 100)
                .accessibilityLabel(trf("Overview: %@", metric.title))
                StarButton(metric: metric).frame(width: 58)
            }
        )
        .contentShape(Rectangle())
        .opacity(isActive ? 0 : 1)
        .reorderFrame(id: metric.id, in: .named(reorderSpaceName))
    }

    // MARK: - Container drag-reorder

    private enum MetricPlacement: Hashable { case visible, details, hidden }

    private func placement(of metric: WidgetDescriptor) -> MetricPlacement {
        guard layout.isMetricEnabled(metric.id) else { return .hidden }
        if metric.sample.isChart || metric.sample.isUsagePeriod || metric.sample.showsResetExpiries { return .details }
        // Keep saved placements editable even when the whole service is off. Match the overview's
        // all-On-Demand promotion without relying on its enabled-service-only list.
        let visible = layout.customizeDetail(for: providerID)?.alwaysShownMetrics
            .filter { layout.isMetricEnabled($0.id) } ?? []
        return visible.isEmpty || visible.contains { $0.id == metric.id } ? .visible : .details
    }

    private func setPlacement(_ placement: MetricPlacement, for metric: WidgetDescriptor) {
        if placement == .details && !metric.sample.isChart && !metric.sample.isUsagePeriod && !metric.sample.showsResetExpiries {
            let otherVisible = layout.customizeDetail(for: providerID)?.alwaysShownMetrics
                .contains { $0.id != metric.id && !$0.sample.isChart && !$0.sample.isUsagePeriod && !$0.sample.showsResetExpiries && layout.isMetricEnabled($0.id) } == true
            guard otherVisible else {
                layout.presentCustomizationNotice("Keep at least one metric in the overview.", tone: .notice)
                return
            }
        }
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

/// The labeled menu-bar checkbox preserves pin feedback and the per-provider cap. No tooltips.
private struct StarButton: View {
    let metric: WidgetDescriptor
    @Environment(LayoutStore.self) private var layout
    @State private var shakeTrigger = 0

    var body: some View {
        if metric.pinnable {
            let pinned = layout.isPinned(metric.id)
            Toggle("Menu Bar", isOn: Binding(get: { pinned }, set: { _ in
                if layout.canPin(metric.id) {
                    layout.togglePin(metric.id)
                    layout.presentCustomizationNotice(pinned ? "Removed from menu bar" : "Starred for menu bar")
                } else {
                    shakeTrigger += 1
                    layout.presentCustomizationNotice(layout.pinDenialReason(metric.id) ?? "Up to 2 stars per provider", tone: .notice)
                }
            }))
            .toggleStyle(.checkbox).labelsHidden()
            .accessibilityLabel(trf("Menu Bar: %@", metric.title))
            .denyShake(trigger: shakeTrigger)
            .animation(Motion.spring, value: pinned)
        } else {
            Text("—").foregroundStyle(.tertiary).accessibilityLabel("Unavailable")
        }
    }
}

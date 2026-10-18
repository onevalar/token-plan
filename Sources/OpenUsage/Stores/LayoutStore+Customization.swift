extension LayoutStore {
    func provider(id: String) -> Provider? { registry.provider(id: id) }

    func descriptor(for widget: PlacedWidget) -> WidgetDescriptor? {
        registry.descriptor(id: widget.descriptorID)
    }

    private func providerID(of widget: PlacedWidget) -> String? {
        registry.descriptor(id: widget.descriptorID)?.providerID
    }

    var visiblePlaced: [PlacedWidget] {
        placed.filter { widget in
            guard let providerID = providerID(of: widget) else { return true }
            return isProviderEnabled(providerID)
        }
    }

    func isMetricEnabled(_ descriptorID: String) -> Bool {
        placed.contains { $0.descriptorID == descriptorID }
    }

    /// Whether any enabled provider ships the local spend tiles — the capability gate for the
    /// Total Spend card. Keyed off the registry's descriptors, not off refreshed data, so the card
    /// can show its "No spend data" state on a fresh morning instead of vanishing.
    var hasSpendCapableProvider: Bool {
        !spendCapableProviders.isEmpty
    }

    /// Enabled providers that ship the local spend tiles (`WidgetDescriptor.spendTiles`), in the
    /// user's provider order — the exact set the Total Spend card aggregates. Deliberately *not*
    /// `displayGroups`: a provider whose every metric is hidden in Customize still spends money and
    /// must still count, and look-alike dollar rows from other providers (OpenRouter's API-spend
    /// "Today") must not.
    var spendCapableProviders: [Provider] {
        let capableIDs = Set(registry.descriptors.filter(\.isSpendTile).map(\.providerID))
        return orderedProviders().filter { capableIDs.contains($0.id) && isProviderEnabled($0.id) }
    }

    // MARK: - Provider grouping

    /// Known providers in the user's saved order, with any not-yet-seen provider appended in registry order
    /// so a newly added provider still shows up.
    func orderedProviderIDs() -> [String] {
        registry.orderedProviderIDs(savedOrder: providerOrder)
    }

    private func orderedProviders() -> [Provider] {
        orderedProviderIDs().filter { !isProviderRemoved($0) }.compactMap { registry.provider(id: $0) }
    }

    /// History and reset credits live in details. Hide still wins; saved visibility is not erased.
    private func isAlwaysShownMetric(_ id: String) -> Bool {
        guard let sample = registry.descriptor(id: id)?.sample else { return false }
        if sample.isChart || sample.isUsagePeriod || sample.showsResetExpiries { return false }
        return !expandedMetricIDs.contains(id)
    }

    /// Enabled (and provider-enabled) widgets grouped by provider, in the user's provider order, each
    /// provider's metrics kept in the provider's custom metric order. Enabled providers retain their
    /// heading and details entry even without overview metrics.
    var displayGroups: [ProviderGroup] {
        orderedProviders().compactMap { provider in
            guard isProviderEnabled(provider.id) else { return nil }
            let widgetsByDescriptor = Dictionary(
                visiblePlaced
                    .filter { providerID(of: $0) == provider.id }
                    .map { ($0.descriptorID, $0) },
                uniquingKeysWith: { first, _ in first }
            )
            let widgets = metricOrder(for: provider.id).compactMap { widgetsByDescriptor[$0] }
            let alwaysShown = widgets.filter { isAlwaysShownMetric($0.descriptorID) }
            let expanded = widgets.filter { !isAlwaysShownMetric($0.descriptorID) }
            return ProviderGroup(provider: provider, alwaysShownWidgets: alwaysShown, expandedWidgets: expanded)
        }
    }

    var displayServices: [ProviderServiceGroup] {
        var services: [ProviderServiceGroup] = []
        for group in displayGroups {
            let family = ProviderAccountID.family(of: group.id)
            if let index = services.firstIndex(where: { $0.id == family }) {
                services[index].accounts.append(group)
            } else {
                services.append(ProviderServiceGroup(id: family, accounts: [group]))
            }
        }
        return services
    }

    /// Every enabled provider with *all* the metrics it supports, in its saved metric order. Enabled and
    /// disabled rows stay in-place; the switch only controls visibility.
    var customizeGroups: [ProviderMetrics] {
        orderedProviders().compactMap { provider in
            guard isProviderEnabled(provider.id) else { return nil }
            let metrics = orderedSupportedMetrics(for: provider.id)
            guard !metrics.isEmpty else { return nil }
            return ProviderMetrics(
                provider: provider,
                alwaysShownMetrics: metrics.filter { isAlwaysShownMetric($0.id) },
                expandedMetrics: metrics.filter { !isAlwaysShownMetric($0.id) }
            )
        }
    }

    /// The L1 Customize list: every known provider in the user's saved order, regardless of enablement.
    /// Disabled providers appear here (greyed in the UI) so the user can re-enable them or open their
    /// detail — unlike the enabled-provider reorder list exposed by `customizeGroups`, which filters them
    /// out. Each row carries the enablement flag and total metric count shown by the list.
    var customizeProviderRows: [ProviderRow] {
        orderedProviders().map { provider in
            ProviderRow(
                provider: provider,
                isEnabled: isProviderEnabled(provider.id),
                metricCount: metricCount(for: provider.id)
            )
        }
    }

    /// Total metrics a provider supports — the L1 row's badge number. Registry descriptor count,
    /// independent of how many the user has enabled.
    func metricCount(for providerID: String) -> Int {
        registry.descriptors(for: providerID).count
    }

    /// The L2 Customize detail for one provider: every metric it supports, split across the
    /// "Always Visible" / "On Demand" divider, in its saved metric order. Available even when the
    /// provider is disabled so L2 can render dimmed-but-editable. nil for an unknown provider or one
    /// with no metrics — the per-provider slice of `customizeGroups` without the enablement guard.
    func customizeDetail(for providerID: String) -> ProviderMetrics? {
        guard let provider = registry.provider(id: providerID) else { return nil }
        let metrics = orderedSupportedMetrics(for: providerID)
        guard !metrics.isEmpty else { return nil }
        return ProviderMetrics(
            provider: provider,
            alwaysShownMetrics: metrics.filter { isAlwaysShownMetric($0.id) },
            expandedMetrics: metrics.filter { !isAlwaysShownMetric($0.id) }
        )
    }

    /// A provider's supported metrics in custom order, independent of whether each metric is enabled.
    func orderedSupportedMetrics(for providerID: String) -> [WidgetDescriptor] {
        metricOrder(for: providerID).compactMap { registry.descriptor(id: $0) }
    }

    func metricOrderWithDivider(for providerID: String, dividerID: String) -> [String] {
        let ordered = orderedSupportedMetrics(for: providerID).map(\.id)
        return ordered.filter { !expandedMetricIDs.contains($0) }
            + [dividerID]
            + ordered.filter { expandedMetricIDs.contains($0) }
    }

    /// Enabled service families in saved provider order, including services with no pins or data.
    /// One Settings toggle controls all account cards in a family; hiding it must not remove its row.
    var menuBarServices: [Provider] {
        var seen = Set<String>()
        return orderedProviders().compactMap { provider in
            guard isProviderEnabled(provider.id) else { return nil }
            let family = ProviderAccountID.family(of: provider.id)
            guard seen.insert(family).inserted else { return nil }
            let name = family == "claude" ? "Claude" : family == "codex" ? "Codex" : provider.displayName
            return Provider(id: family, displayName: name, icon: provider.icon)
        }
    }

    func menuBarAccounts(for serviceID: String) -> [Provider] {
        orderedProviders().filter { ProviderAccountID.family(of: $0.id) == serviceID && isProviderEnabled($0.id) }
    }

    /// Number known sibling accounts in saved order, before visibility/no-data filtering. Hiding
    /// account 1 must not rename account 2 to 1. Single-account services need no badge.
    var menuBarAccountNumbers: [String: Int] {
        let families = Dictionary(grouping: orderedProviders(), by: { ProviderAccountID.family(of: $0.id) })
        var numbers: [String: Int] = [:]
        for accounts in families.values where accounts.count > 1 {
            for (index, account) in accounts.enumerated() { numbers[account.id] = index + 1 }
        }
        return numbers
    }

    /// The settings list and rendered strip share one order, keeping sibling accounts adjacent.
    var menuBarEntries: [Provider] {
        menuBarServices.flatMap { menuBarAccounts(for: $0.id) }
    }

    func isMenuBarEntrySelected(_ providerID: String) -> Bool {
        isMenuBarServiceVisible(providerID) && isMenuBarAccountVisible(providerID)
    }

    /// Convert an old hidden-family preference to individual choices without revealing siblings.
    func setMenuBarEntrySelected(_ visible: Bool, for providerID: String) {
        if !isMenuBarServiceVisible(providerID) {
            let family = ProviderAccountID.family(of: providerID)
            for provider in orderedProviders() where ProviderAccountID.family(of: provider.id) == family {
                setMenuBarAccountVisible(false, for: provider.id)
            }
            setMenuBarServiceVisible(true, for: providerID)
        }
        setMenuBarAccountVisible(visible, for: providerID)
    }

    /// Numeric pins and automatic primary rings share visibility and the settings list's order.
    var menuBarGroups: [ProviderMetrics] {
        let groups = customizeGroups.filter {
            isMenuBarEntrySelected($0.provider.id)
        }
        let byID = Dictionary(uniqueKeysWithValues: groups.map { ($0.id, $0) })
        return menuBarEntries.compactMap { byID[$0.id] }
    }

    /// Pinned metrics grouped by provider, in the user's Customize order (provider order, then each
    /// provider's metric order). A disabled provider or menu-bar-hidden service is excluded from the
    /// rendered groups but keeps its pins. Drives only the menu-bar strip, not the dashboard/refresh.
    var pinnedGroups: [ProviderMetrics] {
        orderedProviders().compactMap { provider in
            guard isProviderEnabled(provider.id), isMenuBarServiceVisible(provider.id),
                  isMenuBarAccountVisible(provider.id) else { return nil }
            // Keep the strip order matching Customize: always-shown pins first, then expanded ones.
            let metrics = orderedSupportedMetrics(for: provider.id).filter { pinnedMetricIDs.contains($0.id) }
            return metrics.isEmpty ? nil : ProviderMetrics(
                provider: provider,
                alwaysShownMetrics: metrics.filter { !expandedMetricIDs.contains($0.id) },
                expandedMetrics: metrics.filter { expandedMetricIDs.contains($0.id) }
            )
        }
    }

    /// Reorder whole providers when `dragged`'s header is dropped onto `target`'s. Works on the currently
    /// shown (enabled) provider order; disabled providers keep their relative tail position.
    /// Returns whether the order actually changed — the drag gestures key haptics off it.
    @discardableResult
    func reorderProvider(dragged: String, target: String) -> Bool {
        recordingUndoStep {
            let shown = customizeGroups.map(\.provider.id)
            guard let next = Self.reordered(shown, dragged: dragged, target: target) else { return false }
            let rest = orderedProviderIDs().filter { !next.contains($0) }
            providerOrder = next + rest
            persistProviderOrder()
            syncPlacedOrder()
            return true
        }
    }

    /// Reorder metrics within one provider when `dragged` is dropped onto `target` (both descriptor ids of
    /// that provider). Operates on the provider's full metric order so disabled metrics keep their place too.
    ///
    /// Dropping onto a row in the *other* section moves `dragged` between Always Visible and On Demand:
    /// its On Demand membership follows the target's, so dragging a metric under an On Demand one tucks it
    /// away too (and vice versa). The stored order is rebuilt in those two sections, so it always matches
    /// the partitioned layout the UI draws. Returns whether anything actually changed —
    /// the drag gestures key haptics off it.
    @discardableResult
    func reorderMetric(dragged: String, target: String, in providerID: String) -> Bool {
        recordingUndoStep { reorderMetricImpl(dragged: dragged, target: target, in: providerID) }
    }

    private func reorderMetricImpl(dragged: String, target: String, in providerID: String) -> Bool {
        guard dragged != target else { return false }
        let ordered = metricOrder(for: providerID)
        guard ordered.contains(dragged), ordered.contains(target) else { return false }

        var expanded = expandedMetricIDs
        let membershipChanged = expanded.contains(dragged) != expanded.contains(target)
        if expanded.contains(target) {
            expanded.insert(dragged)
        } else {
            expanded.remove(dragged)
        }

        // Landing a metric in the always-shown section is an explicit placement, so it consumes its
        // expand-on-enable default — otherwise enabling it later would tuck it back below the caret,
        // overriding this drag.
        let consumedExpandOnEnable = !expanded.contains(dragged)
            && defaultExpandedOnEnableIDs.remove(dragged) != nil

        // Lay the provider out the way it renders — Always Visible rows, then On Demand rows — keeping each
        // section in its current order, then drop `dragged` next to `target` within that combined sequence.
        let partitioned = ordered.filter { !expanded.contains($0) } + ordered.filter { expanded.contains($0) }
        guard let next = Self.reordered(partitioned, dragged: dragged, target: target) else {
            guard membershipChanged || consumedExpandOnEnable else { return false }
            metricOrderByProvider[providerID] = partitioned
            expandedMetricIDs = expanded
            persistMetricOrder()
            persistExpanded()
            if consumedExpandOnEnable { persistExpandOnEnable() }
            syncPlacedOrder()
            return true
        }
        metricOrderByProvider[providerID] = next
        expandedMetricIDs = expanded
        persistMetricOrder()
        if membershipChanged { persistExpanded() }
        if consumedExpandOnEnable { persistExpandOnEnable() }
        syncPlacedOrder()
        return true
    }

    /// Apply a provider metric order that includes one visual divider sentinel. Metrics before the
    /// sentinel become Always Visible; metrics after it become On Demand. This is the clean drag
    /// model for Customize: the divider participates in target geometry like a row, but persistence
    /// remains metric-only.
    @discardableResult
    func applyMetricDividerOrder(_ orderedIDsWithDivider: [String], dragged: String, dividerID: String, in providerID: String) -> Bool {
        recordingUndoStep {
            applyMetricDividerOrderImpl(orderedIDsWithDivider, dragged: dragged, dividerID: dividerID, in: providerID)
        }
    }

    private func applyMetricDividerOrderImpl(_ orderedIDsWithDivider: [String], dragged: String, dividerID: String, in providerID: String) -> Bool {
        let validIDs = metricOrder(for: providerID)
        let validSet = Set(validIDs)
        guard orderedIDsWithDivider.contains(dividerID) else { return false }

        var seen = Set<String>()
        var alwaysShown: [String] = []
        var expanded: [String] = []
        var isBelowDivider = false

        for id in orderedIDsWithDivider {
            if id == dividerID {
                isBelowDivider = true
                continue
            }
            guard validSet.contains(id), seen.insert(id).inserted else { continue }
            if isBelowDivider {
                expanded.append(id)
            } else {
                alwaysShown.append(id)
            }
        }

        // Dashboard rows only render enabled metrics. Merge disabled rows back into their previous
        // sections so a dashboard drag does not push hidden Customize rows to the end.
        let desiredAlwaysShown = Set(alwaysShown)
        let desiredExpanded = Set(expanded)
        let previousAlwaysShown = validIDs.filter { !expandedMetricIDs.contains($0) && !desiredExpanded.contains($0) }
        let previousExpanded = validIDs.filter { expandedMetricIDs.contains($0) && !desiredAlwaysShown.contains($0) }
        alwaysShown = Self.mergingMissingMetrics(into: alwaysShown, previous: previousAlwaysShown)
        expanded = Self.mergingMissingMetrics(into: expanded, previous: previousExpanded)

        let nextOrder = alwaysShown + expanded
        let providerExpanded = Set(expanded)
        let providerIDs = Set(validIDs)
        let nextExpanded = expandedMetricIDs.subtracting(providerIDs).union(providerExpanded)
        // Only the dragged metric's expand-on-enable entry is consumed — an explicit placement.
        // Clearing every metric in the list (the old `subtracting(seen)`) also cleared disabled
        // optional metrics that `metricOrderWithDivider` includes by default but the user never moved,
        // so they lost their below-caret default. Matches `reorderMetric`, which consumes only the
        // dragged id.
        var nextDefaultExpandedOnEnableIDs = defaultExpandedOnEnableIDs
        let consumedExpandOnEnable = nextDefaultExpandedOnEnableIDs.remove(dragged) != nil
        guard metricOrderByProvider[providerID] != nextOrder || expandedMetricIDs != nextExpanded || consumedExpandOnEnable else {
            return false
        }

        metricOrderByProvider[providerID] = nextOrder
        expandedMetricIDs = nextExpanded
        defaultExpandedOnEnableIDs = nextDefaultExpandedOnEnableIDs
        persistMetricOrder()
        persistExpanded()
        if consumedExpandOnEnable { persistExpandOnEnable() }
        syncPlacedOrder()
        return true
    }

    private static func mergingMissingMetrics(into ordered: [String], previous: [String]) -> [String] {
        let orderedSet = Set(ordered)
        var result: [String] = []
        var emitted = Set<String>()
        var orderedIndex = ordered.startIndex

        func emitDesiredRows(through id: String) {
            while orderedIndex < ordered.endIndex {
                let next = ordered[orderedIndex]
                orderedIndex = ordered.index(after: orderedIndex)
                if emitted.insert(next).inserted {
                    result.append(next)
                }
                if next == id { break }
            }
        }

        for id in previous {
            if orderedSet.contains(id) {
                emitDesiredRows(through: id)
            } else if emitted.insert(id).inserted {
                result.append(id)
            }
        }

        while orderedIndex < ordered.endIndex {
            let next = ordered[orderedIndex]
            orderedIndex = ordered.index(after: orderedIndex)
            if emitted.insert(next).inserted {
                result.append(next)
            }
        }

        return result
    }

    /// Pure reorder: remove `dragged`, reinsert it adjacent to `target` (after it when moving down, before
    /// it when moving up). Returns nil when either id is missing or they're identical. Mirrors the proven
    /// macOS drag-reorder math from crafcat7/Peakmon (Apache-2.0).
    static func reordered(_ ids: [String], dragged: String, target: String) -> [String]? {
        guard dragged != target,
              let from = ids.firstIndex(of: dragged),
              let to = ids.firstIndex(of: target) else { return nil }
        var next = ids
        next.remove(at: from)
        guard let adjusted = next.firstIndex(of: target) else { return nil }
        let insert = from < to ? adjusted + 1 : adjusted
        next.insert(dragged, at: min(insert, next.count))
        return next
    }
}

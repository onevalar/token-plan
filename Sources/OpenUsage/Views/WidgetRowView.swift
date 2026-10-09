import SwiftUI

/// Quota rows: cycle and reading, a full-width bar, and icon-led reset time.
/// Balances/spend remain text rows; reset credits also expose their nearest expiry inline.
struct WidgetRowView: View {
    let data: WidgetData
    /// The overview is read-only; breakdowns and credit actions belong in subscription details.
    var showsDetails = false
    /// True when this text-only row sits directly under another text-only row. Rows don't know
    /// their neighbors — the list supplies it — and both densities use it to pull consecutive
    /// one-liners into a single cluster (Compact a step harder).
    var condensedTop: Bool = false

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular
    @Environment(\.reduceAnimations) private var reduceAnimations
    @State private var modelHover = HoverPopoverState()
    /// Backs the reset-credit claim flow; previews and providers without a service remain read-only.
    @Environment(\.codexResetClaim) private var codexResetClaim
    /// Party easter egg: fill meter bars with the party gradient instead of the severity color. Off by
    /// default everywhere else.
    @Environment(\.popoverPartyMode) private var partyMode

    private var supportingFont: Font {
        .system(size: density.supportingPointSize, weight: .regular)
    }

    var body: some View {
        // A row with a concrete deadline re-renders its countdown on a 30s tick — the cadence the
        // original app uses — instead of waiting for the next data refresh. TimelineView only schedules
        // ticks while the popover is actually visible. Rows without a reset date are static.
        Group {
            if data.resetsAt != nil || !data.expiriesAt.isEmpty {
                TimelineView(.periodic(from: .now, by: 30)) { _ in
                    rowContent
                }
            } else {
                rowContent
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        // Bar rows are multi-line and earn breathing room; single-line text rows (Today / Yesterday /
        // Last 30 Days) stay tighter so consecutive ones read as a cluster, not evenly-spaced
        // full-height rows. This differentiation — not the fonts — is what kills the "jumpy" rhythm.
        // All values come from the global density setting; a text row pulls up against a preceding
        // text row (`condensedTop`) in both densities.
        .padding(.top, topPadding)
        .padding(.bottom, bottomPadding)
    }

    private var topPadding: CGFloat {
        if data.isBounded { return density.barRowPadding }
        return condensedTop ? density.condensedTextRowTopPadding : density.textRowPadding
    }

    private var bottomPadding: CGFloat {
        data.isBounded ? density.barRowPadding : density.textRowPadding
    }

    @ViewBuilder
    private var rowContent: some View {
        if data.isChart, data.hasData {
            // The sparkline owns its own label + bars; a chart with no real points falls through to the
            // unbounded "No data" row below (and so descriptor template data never leaks here).
            UsageSparkline(data: data)
        } else if data.isBounded {
            boundedRow
        } else {
            unboundedRow
        }
    }

    /// Text never competes with the track for horizontal space. Every row has the same track width.
    private var boundedRow: some View {
        VStack(alignment: .leading, spacing: density.rowInnerSpacing) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(data.overviewTitle).font(supportingFont)
                Spacer(minLength: 4)
                headlineText.fixedSize()
            }
            meter
            trailingContext.frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    /// Bar/copy color for a severity, or the inactive gray when there's none (the no-data track).
    private func severityColor(_ severity: WidgetData.MeterSeverity?) -> AnyShapeStyle {
        severity.map(Theme.meterFill) ?? AnyShapeStyle(Color.secondary)
    }

    // The headline value is the row's payload — the number the user opened the popover to read —
    // so it sits at `.primary` (vibrant full-contrast on the popover glass); the surrounding
    // context (reset countdown, deficit) stays `.secondary`.
    private var headlineText: some View {
        Text(data.valueText)
            .font(.system(size: density.supportingPointSize, weight: .semibold))
            .monospacedDigit()
            .foregroundStyle(.primary)
            .contentTransition(.numericText())
            .accessibilityLabel(data.headline)
    }

    /// Display-only: global preferences now live in Settings, not hidden number-click actions.
    @ViewBuilder
    private var trailingContext: some View {
        if let text = data.boundedTrailingText() {
            if data.hasResetLabel(), let date = data.resetsAt {
                Label(text, systemImage: data.resetDisplayMode == .relative ? "hourglass" : "calendar")
                    .font(supportingFont)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(Formatters.deadlineLabel("Resets", at: date, mode: data.resetDisplayMode) ?? text)
            } else {
                Text(text).font(supportingFont).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var nearestExpiry: some View {
        if data.showsResetExpiries, data.hasData, let expiry = data.expiriesAt.min(),
           let text = Formatters.compactDeadline(at: expiry, mode: data.resetDisplayMode) {
            // Unlike a quota's elapsed reset date, a credit's elapsed expiry is not "soon".
            if expiry <= Date() {
                Text("Expired").font(.caption).foregroundStyle(.secondary)
            } else {
                Label(text, systemImage: "calendar")
                    .font(.caption).foregroundStyle(.secondary).monospacedDigit()
                    .accessibilityLabel(Formatters.deadlineLabel("Reset expires", at: expiry, mode: data.resetDisplayMode) ?? text)
            }
        } else if data.showsResetExpiries, data.hasData, data.resetCreditCount > 0 {
            Text("Expiry unavailable").font(.caption).foregroundStyle(.secondary)
        }
    }

    /// Unbounded: no bar. Label on the left, with a single right-aligned descriptive line ("1,503 left")
    /// and an optional secondary line ("on-device estimate") beneath it.
    private var unboundedRow: some View {
        unboundedRowContent
            .onChange(of: data.modelBreakdown) { _, _ in modelHover.dismiss() }
            // A refresh can replace the reset credits (count and expiries) while the popover is open;
            // drop it so it never lingers over a stale timeline — except while the claim flow has the
            // popover pinned: the claim's own forced refresh is what changes the credits, and dismissing
            // on it would close the popover before the claim's result banner ever renders. The pinned
            // popover re-renders from the new data instead (the detail view reconciles its own state).
            .onChange(of: data.expiriesAt) { _, _ in
                if !modelHover.isPinned { modelHover.dismiss() }
            }
            .onDisappear { modelHover.dismiss() }
    }

    /// The value column reveals the model breakdown on hover, so it lights up under the pointer the way
    /// a Finder / System Settings list row does — the native cue that "this is a target." Lit the moment
    /// the pointer arrives (`overInline`, before the reveal dwell) and held lit while the popover is open,
    /// so the value reads as the popover's source. Both flags live on `modelHover`, so the panel's close
    /// path (`dismissAll`) clears the highlight even though this view's state survives `orderOut`. Only
    /// rows that actually have a breakdown light up.
    private var showValueHighlight: Bool {
        hasHoverPopover && (modelHover.overInline || modelHover.isPresented)
    }

    /// Whether the value column reveals a hover popover: the model breakdown on spend rows, or the
    /// resets timeline on the Codex rate-limit-resets row. One `modelHover` coordinator drives both — a
    /// row is only ever one kind — so lighting the value and anchoring the popover share the spend
    /// row's machinery. The resets row qualifies even at "0 available" (empty `expiriesAt`), so its
    /// empty-state popover stays reachable — but only with real data: a "No data" tile must not open a
    /// popover that reads as "zero credits" (`hasModelBreakdown` already carries its own `hasData`).
    private var hasHoverPopover: Bool {
        showsDetails && (data.hasModelBreakdown || (data.showsResetExpiries && data.hasData))
    }

    private var unboundedRowContent: some View {
        HStack(alignment: .center, spacing: 10) {
            labelColumn
            Spacer(minLength: 12)
            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 4) {
                    Text(data.showsResetExpiries && data.hasData
                         ? MetricFormatter.number(Double(data.resetCreditCount), kind: .count, style: .row)
                         : data.unboundedDetail)
                        .font(supportingFont)
                        .foregroundStyle(.primary) // the value is the row's payload — match the bounded headline
                        .contentTransition(.numericText())
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                        // Hover target is the value text itself, not the whole row — the same
                        // per-element pattern the bounded row uses for "x left" and "Resets in …". Reveals
                        // the exact figures the compact value shortens, or "No usage in this period" on a
                        // zero row; nil (no tooltip) on a small, already-full, non-zero row. Suppressed
                        // when the model-breakdown popover is wired up — a text bubble and a popover
                        // fighting over the same hover reads as two competing surfaces, and the panel's
                        // per-model tooltips carry the exact figures instead. The resets row likewise
                        // drops its tooltip — the timeline popover replaces it.
                        .hoverTooltip(hasHoverPopover ? nil : data.unboundedValueTooltip)
                    nearestExpiry
                    if hasHoverPopover {
                        Button {
                            modelHover.setPinned(true)
                            modelHover.isPresented = true
                        } label: {
                            Image(systemName: "chevron.right")
                                .frame(width: 24, height: 24).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Details")
                    }
                }
                if !data.showsResetExpiries, let subtitle = data.unboundedSubtitle {
                    // Secondary, not tertiary: the subtitle is informational ("on-device estimate"),
                    // and tertiary is reserved for inactive content on glass.
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .multilineTextAlignment(.trailing)
            // A quaternary chip behind the value — the app's subtle-fill token, in the shared 6pt
            // continuous corner — signals the value is interactive before the breakdown even opens.
            // Negative-inset so it hugs the figure without changing the row's height (the text-row
            // rhythm that clusters Today / Yesterday / Last 30 Days must not shift), and a quick
            // opacity fade in/out matches macOS hover states.
            .background {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(.quaternary)
                    .padding(.horizontal, -7)
                    .padding(.vertical, -4)
                    .opacity(showValueHighlight ? 1 : 0)
            }
            .animation(.easeOut(duration: 0.12), value: showValueHighlight)
            // Both the hover trigger and the popover anchor live on the value column, not the whole
            // row: hovering the label (or empty gap) shouldn't reveal the breakdown — only the figure
            // it explains should — and the arrow then centers on that figure, matching the trend
            // popover's anchoring off the sparkline strip.
            .contentShape(Rectangle())
            .onContinuousHover { phase in
                guard hasHoverPopover else {
                    modelHover.dismiss()
                    return
                }
                if case .active = phase {
                    modelHover.inlineHover(true)
                } else {
                    modelHover.inlineHover(false)
                }
            }
            .motionAwareHoverPopover(
                isPresented: Binding(
                    get: { hasHoverPopover && modelHover.isPresented },
                    // A click-outside dismiss removes the detail view without an `.ended` hover event,
                    // so a plain assignment would strand `overDetail == true` and block future hides.
                    set: { if !$0 { modelHover.dismiss() } }
                ),
                reduceAnimations: reduceAnimations
            ) {
                if let breakdown = data.modelBreakdown {
                    ModelUsageDetail(title: data.title, breakdown: breakdown) { inside in
                        modelHover.detailHover(inside)
                    }
                } else if data.showsResetExpiries {
                    RateLimitResetsDetail(
                        count: data.resetCreditCount, expiries: data.expiriesAt,
                        onHoverChange: { inside in modelHover.detailHover(inside) },
                        onPinChange: { pinned in modelHover.setPinned(pinned) },
                        // Only Codex details get a claim service keyed by account;
                        // Claude's resets row and previews show
                        // the read-only timeline.
                        claim: codexResetClaim.map { service in
                            { expiry, redeemRequestID in
                                await service.claim(creditExpiringAt: expiry, redeemRequestID: redeemRequestID)
                            }
                        }
                    )
                }
            }
        }
    }

    private var labelColumn: some View {
        HStack(spacing: 4) {
            Text(data.showsResetExpiries ? tr("Reset Count") : data.title)
                // Same point size as the trailing value so the single-line row reads tight;
                // semibold alone keeps the name/value hierarchy.
                .font(.system(size: density.supportingPointSize, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
            unknownModelWarningIcon
        }
    }

    /// Amber warning triangle shown just after a spend tile's label (Today / Yesterday / Last 30 Days)
    /// when the period used a model the pricing manifest can't price, so its cost is incomplete. Hovering
    /// lists the unknown model names. Renders nothing otherwise.
    @ViewBuilder
    private var unknownModelWarningIcon: some View {
        if data.hasUnknownModels {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: density.supportingPointSize - 1))
                .foregroundStyle(severityColor(.warning))
                .hoverTooltip(data.unknownModelTooltip)
                .accessibilityLabel("This period used a model with unknown pricing")
        }
    }

    /// Full-width track; color reflects only the actual remaining quota, never projected pace.
    private var meter: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                // Semantic quaternary fill (not an opacity-faded color) so the track stays vibrant
                // on glass and adapts to Increase Contrast / Reduce Transparency.
                Capsule().fill(.quaternary)
                Capsule()
                    .fill(partyMode ? PartyMode.meterFill : severityColor(data.quotaSeverity))
                    .frame(width: fillWidth(track: proxy.size.width))
            }
        }
        .frame(height: density.meterHeight)
        .animation(Motion.spring, value: data.fraction)
        // VoiceOver reads the bar as "<metric>, <reading>" instead of skipping the purely graphic fill.
        .accessibilityElement()
        .accessibilityLabel(data.title)
        .accessibilityValue(data.headline)
    }

    /// Fill width with a minimum-visible rule: any non-zero fraction renders at least a full circle
    /// (width = bar height) so 1–2% never squashes into an invisible sliver — the same idea as the
    /// menu-bar bars' minimum fill.
    private func fillWidth(track: CGFloat) -> CGFloat {
        guard data.hasData, data.fraction > 0 else { return 0 }
        return max(density.meterHeight, track * data.fraction)
    }
}

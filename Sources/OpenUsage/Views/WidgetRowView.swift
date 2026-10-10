import SwiftUI

/// Overview quota rows share cycle, track, reading and deadline columns; details stay stacked.
/// Balances/spend remain text rows; reset credits render their timeline directly in details.
struct WidgetRowView: View {
    let data: WidgetData
    /// The overview is read-only; breakdowns and credit actions belong in subscription details.
    var showsDetails = false
    /// True when this text-only row sits directly under another text-only row. Rows don't know
    /// their neighbors — the list supplies it — and both densities use it to pull consecutive
    /// one-liners into a single cluster (Compact a step harder).
    var condensedTop: Bool = false

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular
    @Environment(\.quotaTableColumns) private var tableColumns
    @Environment(\.reduceAnimations) private var reduceAnimations
    @State private var modelHover = HoverPopoverState()
    /// Backs the reset-credit claim flow; previews and providers without a service remain read-only.
    @Environment(\.codexResetClaim) private var codexResetClaim

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
        // Stacked detail bars earn breathing room; single-line overview and text rows (Today / Yesterday /
        // Last 30 Days) stay tighter so consecutive ones read as a cluster, not evenly-spaced
        // full-height rows. This differentiation — not the fonts — is what kills the "jumpy" rhythm.
        // All values come from the global density setting; a text row pulls up against a preceding
        // text row (`condensedTop`) in both densities.
        .padding(.top, topPadding)
        .padding(.bottom, bottomPadding)
    }

    private var topPadding: CGFloat {
        if data.isBounded { return tableColumns == nil ? density.barRowPadding : density.textRowPadding }
        return condensedTop ? density.condensedTextRowTopPadding : density.textRowPadding
    }

    private var bottomPadding: CGFloat {
        data.isBounded && tableColumns == nil ? density.barRowPadding : density.textRowPadding
    }

    @ViewBuilder
    private var rowContent: some View {
        if data.showsResetExpiries, showsDetails {
            resetCredits
        } else if data.isChart, data.hasData {
            // The sparkline owns its own label + bars; a chart with no real points falls through to the
            // unbounded "No data" row below (and so descriptor template data never leaks here).
            UsageSparkline(data: data)
        } else if data.isBounded {
            boundedRow
        } else if data.showsBalanceBand {
            balanceBand
        } else {
            unboundedRow
        }
    }

    /// Shared columns keep tracks equal even when cycle labels or countdowns have different lengths.
    @ViewBuilder
    private var boundedRow: some View {
        if let columns = tableColumns {
            HStack(alignment: .center, spacing: 8) {
                Text(verbatim: data.overviewTitle).font(supportingFont)
                    .frame(width: columns.title, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                meter.frame(minWidth: 60)
                headlineText
                    .frame(width: columns.reading, alignment: .trailing)
                    .fixedSize(horizontal: false, vertical: true)
                if columns.context > 0 {
                    HStack(spacing: 0) { trailingContext }
                        .multilineTextAlignment(.trailing)
                        .frame(width: columns.context, alignment: .trailing)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        } else {
            VStack(alignment: .leading, spacing: density.rowInnerSpacing) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(verbatim: data.overviewTitle).font(supportingFont)
                    Spacer(minLength: 4)
                    headlineText.fixedSize()
                }
                meter
                trailingContext.frame(maxWidth: .infinity, alignment: .trailing)
            }
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
                HStack(spacing: 4) {
                    Image(systemName: "hourglass")
                        .frame(width: 12)
                    Text(text)
                }
                .font(supportingFont)
                .monospacedDigit()
                .foregroundStyle(.secondary)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Formatters.deadlineLabel("Resets", at: date, mode: .relative) ?? text)
            } else {
                Text(text).font(supportingFont).foregroundStyle(.secondary)
            }
        }
    }

    private var resetCredits: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Reset Credits").font(supportingFont.weight(.semibold))
                Spacer(minLength: 8)
                Text(data.hasData ? MetricFormatter.number(Double(data.resetCreditCount), kind: .count, style: .row)
                                 : WidgetData.noDataHeadline)
                    .font(supportingFont).monospacedDigit()
            }
            if data.hasData {
                if codexResetClaim == nil {
                    Text("Read-only in TokenPlan. Use reset credits in the provider's own app.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                RateLimitResetsDetail(count: data.resetCreditCount, expiries: data.expiriesAt,
                                      claim: codexResetClaim.map { service in
                    { expiry, requestID in
                        await service.claim(creditExpiringAt: expiry, redeemRequestID: requestID)
                    }
                })
            } else {
                Text("No data").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private var balanceBand: some View {
        HStack(spacing: 10) {
            Text("Individual Credits").font(supportingFont.weight(.semibold))
            Spacer(minLength: 8)
            Text(data.hasData ? data.valueText : tr("No data"))
                .font(supportingFont.weight(.semibold)).monospacedDigit()
                .contentTransition(.numericText())
        }
        .padding(.horizontal, 10).padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 8).fill(.quaternary))
        .accessibilityElement(children: .combine)
    }

    /// Unbounded: no bar. Label on the left, with a single right-aligned descriptive line ("1,503 left")
    /// and an optional secondary line ("on-device estimate") beneath it.
    private var unboundedRow: some View {
        unboundedRowContent
            .onChange(of: data.modelBreakdown) { _, _ in modelHover.dismiss() }
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

    /// Only spend breakdowns use a hover popover; resets are visible directly in details.
    private var hasHoverPopover: Bool {
        showsDetails && data.hasModelBreakdown
    }

    private var unboundedRowContent: some View {
        return HStack(alignment: .center, spacing: 10) {
            labelColumn
            Spacer(minLength: 12)
            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 4) {
                    Text(data.unboundedDetail)
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
                if let subtitle = data.unboundedSubtitle {
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
                }
            }
        }
    }

    private var labelColumn: some View {
        HStack(spacing: 4) {
            Text(data.title)
                // Same point size as the trailing value so the single-line row reads tight;
                // semibold alone keeps the name/value hierarchy.
                .font(.system(size: density.supportingPointSize, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(tableColumns == nil ? 1 : nil)
                .fixedSize(horizontal: tableColumns == nil, vertical: true)
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

    private var meter: some View { QuotaMeterView(data: data) }
}

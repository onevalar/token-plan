import SwiftUI

/// Inline subscription timeline, soonest expiry first. Dates are numeric; countdowns always use d/h/m.
/// Codex exposes an explicit Use Credit → Use Credit/Cancel confirmation; Claude remains read-only.
/// Retry keys are preserved so retrying cannot spend a second credit.
struct RateLimitResetsDetail: View {
    /// The row's "N available" count. Only used to disambiguate an empty `expiries` list: 0 → genuinely
    /// no credits (empty state); > 0 → credits we have but whose expiry times weren't fetched.
    let count: Int
    let expiries: [Date]
    /// Claims the reset credit expiring at the given instant, using the given idempotency key (see the
    /// type doc). `nil` makes the timeline read-only (no "Use" affordance).
    var claim: ((_ expiry: Date, _ redeemRequestID: String) async -> ResetClaimOutcome)? = nil

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    /// Claimed deadlines leave this detail session's timeline immediately, before refresh completes.
    @State private var claimedExpiries: Set<Date> = []
    /// The node currently in its inline confirm step, or being claimed, keyed by expiry instant.
    @State private var confirmingExpiry: Date?
    @State private var claimingExpiry: Date?
    /// Per-credit idempotency keys, minted the first time a credit enters confirm and reused for every
    /// retry of that credit — the CLI's double-spend protection, copied exactly.
    @State private var redeemRequestIDs: [Date: String] = [:]
    /// The result banner shown above the timeline after a claim resolves.
    @State private var banner: Banner?
    /// True once this detail session learned there's nothing left to reset — either a claim just
    /// reset usage, or the server refused one with `nothing_to_reset` (which spends no credit). The
    /// remaining "Use" buttons disable: another claim right now would be refused the
    /// same way. Deliberately NOT "usage is at 0%" — after a refusal we only know the server's verdict,
    /// not the meter reading. Cleared when details close (fresh @State) — by then real usage may
    /// have resumed, and the server refuses a pointless claim without spending the credit anyway.
    @State private var nothingToReset = false

    /// A claim in flight or awaiting confirmation — freezes the other nodes so only one claim happens at
    /// a time and the focus stays on the active node.
    private var claimInProgress: Bool { confirmingExpiry != nil || claimingExpiry != nil }

    /// The credits still shown: the supplied expiries minus any claimed this session.
    private var visibleExpiries: [Date] {
        expiries.filter { !claimedExpiries.contains($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let banner {
                bannerView(banner)
                    // Unfold from the top edge as the claimed node collapses below — one combined motion.
                    .transition(.scale(scale: 0.95, anchor: .top).combined(with: .opacity))
            }
            // The claim's forced refresh can remove the in-flight credit from `expiries` a beat before
            // the outcome resolves; keep the "Resetting…" row alive across that gap so the spinner
            // hands off to the banner instead of blinking out. While that detached row shows, only a
            // surviving timeline renders under it — the empty/unknown states are suppressed, because
            // "You have no rate limit resets" under a still-running spinner reads as a contradiction.
            if let claimingExpiry, !visibleExpiries.contains(claimingExpiry) {
                claimingRow().transition(.opacity)
                if case .timeline(let entries) = Self.content(count: count - claimedExpiries.count, expiries: visibleExpiries) {
                    timeline(entries)
                }
            } else {
                switch Self.content(count: count - claimedExpiries.count, expiries: visibleExpiries) {
                case .timeline(let entries):
                    timeline(entries)
                    if count - claimedExpiries.count > entries.count {
                        Text(trf("%lld expiry times unavailable", count - claimedExpiries.count - entries.count))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                case .unknownExpiries: unknownExpiriesState
                case .empty: emptyState
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
        // A refresh may remove a credit during confirmation. Dismiss that confirmation, but let
        // an in-flight claim's outcome handler complete normally.
        .onChange(of: expiries) { _, newValue in
            if let confirming = confirmingExpiry, !newValue.contains(confirming) {
                cancelConfirm()
            }
        }
    }

    /// Centered "no resets" state — an invitation-free statement, not an apology, matching the app's
    /// other empty copy.
    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "clock.badge.xmark")
                .font(.system(size: 20))
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text("You have no rate limit resets")
                .font(.system(size: density.supportingPointSize))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    /// The parent states the count; unavailable dates must not look like an empty balance.
    private var unknownExpiriesState: some View {
        VStack(spacing: 8) {
            Image(systemName: "clock.badge.questionmark")
                .font(.system(size: 20))
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text("Expiry times unavailable")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    /// The nodes, connected top-to-bottom by a hairline rail so the credits read as a soonest-first
    /// sequence. The numbered dot always lives in the left rail column — never inside a node's content —
    /// so an expanded node (the confirm card) keeps its dot on the rail, top-aligned with its first line,
    /// and the connector runs unbroken down to the next node.
    private func timeline(_ entries: [Entry]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Identity by expiry instant, not positional index: after a claim removes a node the others
            // renumber, and index identity would read as "every row replaced" instead of one row leaving
            // — date identity lets the removal collapse while the survivors slide up. `key` adds an
            // ordinal so several resets sharing one deadline (a Claude grant with 2 left) stay distinct.
            ForEach(entries, id: \.key) { entry in
                let isFirst = entry.id == 0
                let isLast = entry.id == entries.count - 1
                HStack(alignment: .top, spacing: 10) {
                    rail(for: entry, isFirst: isFirst, isLast: isLast, dotCenterY: dotCenterY(for: entry))
                    node(entry)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    /// Where the dot's center sits from the top of the row, so the rail can place the dot and route the
    /// connector through it. A single-line node centers the dot on its one line; the confirm card aligns
    /// it with the card's first line ("Use this reset?") rather than the card's middle.
    private func dotCenterY(for entry: Entry) -> CGFloat {
        confirmingExpiry == entry.date ? confirmCardPadding + 9 : nodeHeight / 2
    }

    /// The connector rail: a hairline in two segments — a fixed-height top segment (row top → dot
    /// center) and a stretchy bottom segment (dot center → row bottom) — so it runs unbroken through the
    /// dot and, on a tall confirm node, all the way down to the next node. The first node hides its top
    /// segment and the last its bottom (nothing to connect to beyond the ends). Segments, not a
    /// GeometryReader path: `maxHeight: .infinity` rectangles reliably stretch to the row's full height
    /// inside the HStack, where a GeometryReader collapses to its 10pt default and cuts the line short.
    private func rail(for entry: Entry, isFirst: Bool, isLast: Bool, dotCenterY: CGFloat) -> some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                Rectangle().fill(.quaternary).frame(width: 1.5).frame(height: dotCenterY)
                    .opacity(isFirst ? 0 : 1)
                Rectangle().fill(.quaternary).frame(width: 1.5).frame(maxHeight: .infinity)
                    .opacity(isLast ? 0 : 1)
            }
            numberedDot(entry).padding(.top, dotCenterY - 9)
        }
        .frame(width: 18)
        .accessibilityHidden(true)
    }

    private func numberedDot(_ entry: Entry) -> some View {
        ZStack {
            Circle().fill(Theme.meterFill(entry.severity)).frame(width: 18, height: 18)
            Text("\(entry.number)")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Self.numberColor(entry.severity))
        }
    }

    /// The number sits on a saturated system fill, so it takes the fill's paired foreground: dark on the
    /// bright yellow, white on the blue and red.
    private static func numberColor(_ severity: WidgetData.MeterSeverity) -> Color {
        severity == .warning ? .black : .white
    }

    /// One timeline node's content (no dot — that lives on the rail): the read-only/claimable line, or,
    /// when it's the active node, the inline confirm or in-flight treatment.
    @ViewBuilder
    private func node(_ entry: Entry) -> some View {
        if confirmingExpiry == entry.date {
            confirmRow(entry)
                // Grow out of / collapse back into the one-line node it replaces: anchored at the top so
                // the first line (which the rail dot aligns to) stays put while the card unfolds below it.
                .transition(.scale(scale: 0.95, anchor: .top).combined(with: .opacity))
        } else if claimingExpiry == entry.date {
            claimingRow()
                .transition(.opacity)
        } else {
            row(entry)
                // Freeze and fade the other nodes while a claim is being confirmed or run, so only the
                // active node reads as live.
                .opacity(claimInProgress ? 0.45 : 1)
                .allowsHitTesting(!claimInProgress)
                .transition(.opacity)
        }
    }

    /// Resting rows remain stable when a claim confirmation expands below them.
    private var nodeHeight: CGFloat { density.supportingPointSize + 18 }
    /// Inner padding of the confirm card, shared with `dotCenterY` so the rail dot lines up with the
    /// card's first line.
    private let confirmCardPadding: CGFloat = 10

    private func row(_ entry: Entry) -> some View {
        let time = Text(entry.time)
            .font(.system(size: density.supportingPointSize))
            .foregroundStyle(.primary)
            .fixedSize()
        return ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) {
                time
                Spacer(minLength: 8)
                trailing(entry)
            }
            .frame(height: nodeHeight)
            VStack(alignment: .leading, spacing: 4) {
                time
                HStack {
                    Spacer(minLength: 0)
                    trailing(entry)
                }
            }
            .padding(.vertical, 6)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel(entry.accessibilityLabel)
    }

    /// Countdown and action are both visible; no hover is needed to discover a reset.
    private func trailing(_ entry: Entry) -> some View {
        HStack(spacing: 8) {
            if let countdown = entry.countdown {
                HStack(spacing: 4) {
                    Image(systemName: "hourglass").accessibilityHidden(true)
                    Text(countdown).monospacedDigit()
                }
                .font(.system(size: density.supportingPointSize)).foregroundStyle(.secondary)
                .fixedSize(horizontal: true, vertical: false)
            }
            if claim != nil {
                Button("Use Credit") { beginConfirm(entry.date) }.controlSize(.small)
                    .fixedSize()
                    .disabled(nothingToReset || entry.expired)
            }
        }
    }

    /// The active node's inline confirm: a scope-aware question and Use Credit / Cancel. The numbered
    /// dot stays on the rail (top-aligned with the question), so this is just the card body — no modal,
    /// the claim stays inside the subscription page.
    private func confirmRow(_ entry: Entry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Use This Reset Credit?")
                .font(.system(size: density.supportingPointSize, weight: .medium))
                .foregroundStyle(.primary)
            Text("Consumes one reset credit. Only the usage windows eligible on the server will be reset. This can't be undone.")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                Button { runClaim(entry.date) } label: {
                    Text("Use Credit").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                Button { cancelConfirm() } label: {
                    Text("Cancel").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(confirmCardPadding)
        .background {
            RoundedRectangle(cornerRadius: 8, style: .continuous).fill(.quaternary.opacity(0.5))
        }
        .padding(.vertical, 4)
    }

    /// The active node while the claim runs — the dot stays on the rail; the content reads "Using reset credit…"
    /// with a trailing spinner.
    private func claimingRow() -> some View {
        HStack(spacing: 8) {
            Text("Using reset credit…")
                .font(.system(size: density.supportingPointSize))
                .foregroundStyle(.secondary)
            Spacer(minLength: 8)
            MotionAwareProgressView(controlSize: .small)
        }
        .frame(height: nodeHeight)
    }

    /// The result banner: a leading icon and a short line, tinted by outcome (green success, blue info,
    /// amber/red for the unavailable and failure cases).
    private func bannerView(_ banner: Banner) -> some View {
        HStack(spacing: 8) {
            Image(systemName: banner.icon)
                .font(.system(size: 14))
                .foregroundStyle(banner.tint)
                .accessibilityHidden(true)
            Text(tr(banner.text))
                .font(.system(size: density.supportingPointSize, weight: .medium))
                .foregroundStyle(banner.tint)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(9)
        .background {
            RoundedRectangle(cornerRadius: 8, style: .continuous).fill(banner.tint.opacity(0.12))
        }
    }

    // MARK: - Claim flow actions

    /// One clock for every claim-flow layout change (card expand/collapse, node swap, banner, credit
    /// removal), so the rail, the rows, and the popover height all move together.
    private static let flowAnimation: Animation = .snappy(duration: 0.25)

    private func beginConfirm(_ date: Date) {
        if redeemRequestIDs[date] == nil {
            redeemRequestIDs[date] = UUID().uuidString
        }
        withAnimation(Self.flowAnimation) {
            banner = nil
            confirmingExpiry = date
        }
    }

    private func cancelConfirm() {
        withAnimation(Self.flowAnimation) {
            confirmingExpiry = nil
        }
    }

    private func runClaim(_ date: Date) {
        guard let claim else { return }
        // Reuse the key minted at confirm time; minting here as a fallback covers only a state loss
        // between confirm and click (popover teardown re-runs confirm first).
        let redeemRequestID = redeemRequestIDs[date] ?? UUID().uuidString
        withAnimation(Self.flowAnimation) {
            confirmingExpiry = nil
            claimingExpiry = date
        }
        Task {
            let outcome = await claim(date, redeemRequestID)
            withAnimation(Self.flowAnimation) {
                claimingExpiry = nil
                apply(outcome, for: date)
            }
        }
    }

    private func apply(_ outcome: ResetClaimOutcome, for date: Date) {
        switch outcome {
        case .success:
            claimedExpiries.insert(date)
            nothingToReset = true
            banner = .init(text: "Reset credit used.", icon: "checkmark.circle.fill", tint: .green)
        case .nothingToReset:
            nothingToReset = true
            banner = .init(text: "Your usage doesn't need a reset yet", icon: "info.circle.fill", tint: .accentColor)
        case .noCredit:
            claimedExpiries.insert(date)
            banner = .init(text: "That reset is no longer available", icon: "exclamationmark.triangle.fill", tint: .orange)
        case .failed:
            banner = .init(text: "Couldn't reset usage. Please try again.", icon: "xmark.circle.fill", tint: .red)
        }
    }

    /// The tint + glyph for a result banner.
    struct Banner: Equatable {
        let text: String
        let icon: String
        let tint: Color
    }

    /// What the body renders, resolved once from the count and expiry list so the "empty vs. count-only
    /// vs. timeline" choice is unit-testable and can't drift between the view and its tests.
    enum Content: Equatable {
        case timeline([Entry])
        case unknownExpiries(count: Int)
        case empty
    }

    /// Empty `expiries` is ambiguous: a genuinely empty balance (`count == 0`) shows the empty state,
    /// but a positive `count` with no expiries means the dedicated expiry fetch was unavailable and the
    /// row fell back to the usage-body count — show that count rather than "no resets".
    static func content(count: Int, expiries: [Date], now: Date = Date()) -> Content {
        let entries = entries(from: expiries, now: now)
        if !entries.isEmpty { return .timeline(entries) }
        if count > 0 { return .unknownExpiries(count: count) }
        return .empty
    }

    /// One timeline node's display strings, derived from a credit's expiry instant. Pure and static so
    /// the phrasing is unit-testable without a view.
    struct Entry: Identifiable, Equatable {
        let id: Int          // 0-based row index (soonest first)
        let number: Int      // 1-based reset number, shown inside the dot
        let date: Date       // the credit's expiry instant — identity for the claim flow
        let key: Key         // view identity: the expiry plus its ordinal among equal expiries
        let severity: WidgetData.MeterSeverity
        let time: String       // numeric local expiry, e.g. "2026-10-23 11:35"
        let countdown: String? // "12d 18h", "3m", or "Expired" for an elapsed expiry
        let expired: Bool

        struct Key: Hashable {
            let date: Date
            let ordinal: Int
        }

        var accessibilityLabel: String {
            let identity = String(localized: "Reset \(number), \(time)")
            if expired { return identity + " · " + tr("Expired") }
            return identity + (countdown.map { String(localized: ", expires in \($0)") } ?? "")
        }
    }

    /// Keep each reported expiry, including elapsed snapshots, distinct from a quota recovering "soon".
    static func entries(from expiries: [Date], now: Date = Date()) -> [Entry] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        var seen: [Date: Int] = [:]
        return expiries.sorted().enumerated().map { index, date in
            let ordinal = seen[date, default: 0]
            seen[date] = ordinal + 1
            return Entry(
                id: index,
                number: index + 1,
                date: date,
                key: Entry.Key(date: date, ordinal: ordinal),
                severity: WidgetData.expirySeverity(secondsRemaining: date.timeIntervalSince(now)),
                time: formatter.string(from: date),
                countdown: date <= now ? tr("Expired") : Formatters.compactDuration(date.timeIntervalSince(now)),
                expired: date <= now
            )
        }
    }
}

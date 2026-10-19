import XCTest
@testable import OpenUsage

/// Quota countdowns, numeric credit expiries, and the internal detail-date formatters.
final class ResetDisplayTests: XCTestCase {
    private func utcCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }

    func testAbsoluteLabelDayBuckets() {
        let calendar = utcCalendar()
        let now = calendar.date(from: DateComponents(year: 2024, month: 6, day: 1, hour: 12))! // noon, stable

        XCTAssertTrue(Formatters.resetAbsoluteLabel(at: now.addingTimeInterval(2 * 3600),
                                                    now: now, calendar: calendar)!.hasPrefix("Resets today at "))

        let tomorrow = calendar.date(byAdding: .day, value: 1, to: now)!.addingTimeInterval(3600)
        XCTAssertTrue(Formatters.resetAbsoluteLabel(at: tomorrow,
                                                    now: now, calendar: calendar)!.hasPrefix("Resets tomorrow at "))

        let later = calendar.date(byAdding: .day, value: 5, to: now)!
        let label = Formatters.resetAbsoluteLabel(at: later, now: now, calendar: calendar)!
        XCTAssertTrue(label.hasPrefix("Resets ") && label.contains(" at "))
        XCTAssertFalse(label.hasPrefix("Resets today"))
        XCTAssertFalse(label.hasPrefix("Resets tomorrow"))

        XCTAssertEqual(Formatters.resetAbsoluteLabel(at: now.addingTimeInterval(-1),
                                                     now: now, calendar: calendar), "Resets soon")
    }

    func testWidgetDataUsesCountdownWithExactInstantAvailableForDetails() {
        var data = WidgetData(title: "Weekly", icon: .providerMark("codex"),
                              kind: .percent, used: 50, limit: 100)
        data.resetsAt = Date().addingTimeInterval(4 * 24 * 3600 + 17 * 3600) // ~4d17h out
        data.periodDurationMs = 7 * 24 * 60 * 60 * 1000
        XCTAssertTrue(data.hasResetLabel())

        XCTAssertEqual(data.boundedTrailingText(), "4d 17h")
        XCTAssertEqual(data.resetTooltip()?.hasPrefix("Resets "), true)
    }

    func testFreshSessionWindowShowsNotStartedAndSuppressesPacing() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let period: TimeInterval = 5 * 3600
        var data = WidgetData(title: "Session", icon: .providerMark("codex"), kind: .percent, used: 0, limit: 100)
        data.sessionStartSignal = .zeroUsage
        data.periodDurationMs = Int(period * 1000)
        data.resetsAt = now.addingTimeInterval(period / 2)

        XCTAssertEqual(data.boundedTrailingText(now: now), "Not started")
        XCTAssertFalse(data.hasResetLabel(now: now))
        XCTAssertEqual(data.resetTooltip(now: now), WidgetData.freshSessionTooltip)

        let state = data.meterState(now: now)
        XCTAssertEqual(state, .level(.normal))
        XCTAssertNil(state.tooltip)
    }

    @MainActor
    func testSessionWindowSignalIsWiredOnExactlyTheShippingSessionDescriptors() {
        // The tests around this hand-set `sessionStartSignal`, so they pin the mechanism but not the
        // wiring. This one pins the wiring: the descriptor opt-in replaced a model-level widget-ID set,
        // so a provider dropping (or spuriously gaining) the signal — or flipping which signal it uses —
        // must fail here, not ship silently. Claude and OpenCode must stay on `.missingResetDate`: both
        // report whole-percent utilization, which reads 0 for an in-flight window under 1%, so
        // `.zeroUsage` would regress #1160 on either.
        let providers: [ProviderRuntime] = [
            ClaudeProvider(), CodexProvider(), CursorProvider(),
            AntigravityProvider(), CopilotProvider(), DevinProvider(),
            GrokProvider(), OpenRouterProvider(), ZAIProvider(), OpenCodeProvider()
        ]
        let descriptors = providers.flatMap(\.widgetDescriptors)
        let signals = Dictionary(uniqueKeysWithValues: descriptors
            .compactMap { d in d.sample.sessionStartSignal.map { (d.id, $0) } })
        XCTAssertEqual(signals, ["claude.session": .missingResetDate,
                                 "antigravity.geminiPro": .zeroUsage,
                                 "antigravity.claude": .zeroUsage,
                                 "opencode.session": .missingResetDate])

        // Same wiring pin for the menu-bar tray suffix (it replaced a title-string match).
        let suffixed = descriptors.filter { $0.sample.traySuffix != nil }
        XCTAssertEqual(suffixed.map(\.id), ["claude.rateLimitResets", "codex.rateLimitResets"])
        XCTAssertEqual(suffixed.first?.sample.traySuffix, "resets")
    }

    func testMissingResetDateSignalKeepsCountdownForSubOnePercentSession() {
        // #1160: Claude reports utilization in whole percents, so an in-flight session under 1% reads
        // used == 0 — but its reset date exists precisely because the window started. The row must show
        // the normal countdown, never "Not started".
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        var data = WidgetData(title: "Session", icon: .providerMark("claude"), kind: .percent, used: 0, limit: 100)
        data.sessionStartSignal = .missingResetDate
        data.periodDurationMs = 5 * 3600 * 1000
        data.resetsAt = now.addingTimeInterval(2 * 3600)

        XCTAssertFalse(data.isFreshSessionWindow(now: now))
        XCTAssertTrue(data.hasResetLabel(now: now))
        XCTAssertEqual(data.boundedTrailingText(now: now), "2h")

        // A genuinely fresh session carries no reset date — that is this signal's "Not started" state.
        data.resetsAt = nil
        XCTAssertTrue(data.isFreshSessionWindow(now: now))
        XCTAssertEqual(data.boundedTrailingText(now: now), "Not started")
        XCTAssertEqual(data.resetTooltip(now: now), WidgetData.freshSessionTooltip)
    }

    func testNonSessionWindowNeverReadsNotStarted() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let period: TimeInterval = 7 * 24 * 3600
        var data = WidgetData(title: "Weekly", icon: .providerMark("codex"), kind: .percent, used: 0, limit: 100)
        data.periodDurationMs = Int(period * 1000)
        data.resetsAt = now.addingTimeInterval(period / 2)

        XCTAssertFalse(data.isFreshSessionWindow(now: now))
        XCTAssertEqual(data.boundedTrailingText(now: now), "3d 12h")
    }

    func testExpiryTooltipSingleCreditUsesCountdown() {
        var data = WidgetData(title: "Rate Limit Resets", icon: .providerMark("codex"),
                              kind: .count, used: 0, limit: nil)
        data.values = [MetricValue(number: 1, kind: .count, label: "available")]
        data.expiriesAt = [Date().addingTimeInterval(12 * 24 * 3600 + 18 * 3600)] // ~12d18h out

        XCTAssertEqual(data.unboundedDetail, "1 available")

        XCTAssertEqual(data.expiryTooltip, "Reset expires in 12d 18h")
    }

    func testExpiryTooltipMultipleCreditsIsNumberedList() {
        // Several credits: the tooltip is a numbered list under a header, sorted soonest-first, each
        // entry using a countdown. The row itself still reads just the count.
        var data = WidgetData(title: "Rate Limit Resets", icon: .providerMark("codex"),
                              kind: .count, used: 0, limit: nil)
        data.values = [MetricValue(number: 2, kind: .count, label: "available")]
        data.expiriesAt = [
            Date().addingTimeInterval(12 * 24 * 3600 + 18 * 3600), // ~12d18h
            Date().addingTimeInterval(22 * 24 * 3600 + 12 * 3600)  // ~22d12h
        ]
        XCTAssertEqual(data.unboundedDetail, "2 available")
        XCTAssertEqual(data.expiryTooltip, "Resets expire in:\n1. 12d 18h\n2. 22d 12h")
    }

    func testExpirySeverityTracksSoonestExpiry() {
        // The reset-credit dot reflects the soonest expiry: blue normally, yellow under 7 days, red under
        // 48 hours.
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        var data = WidgetData(title: "Rate Limit Resets", icon: .providerMark("codex"),
                              kind: .count, used: 0, limit: nil)
        data.values = [MetricValue(number: 2, kind: .count, label: "available")]

        // Soonest under 48 hours -> red, even though a later credit is well outside it.
        data.expiriesAt = [
            now.addingTimeInterval(WidgetData.expiryCriticalWindow - 3600),
            now.addingTimeInterval(WidgetData.expiryWarningWindow + 10 * 24 * 3600)
        ]
        XCTAssertEqual(data.expirySeverity(now: now), .critical)

        // Under 7 days but outside 48 hours -> yellow.
        data.expiriesAt = [now.addingTimeInterval(WidgetData.expiryCriticalWindow + 3600)]
        XCTAssertEqual(data.expirySeverity(now: now), .warning)

        // Every credit comfortably outside the warning window -> blue.
        data.expiriesAt = [now.addingTimeInterval(WidgetData.expiryWarningWindow + 24 * 3600)]
        XCTAssertEqual(data.expirySeverity(now: now), .normal)

        // No expiries at all -> no dot.
        data.expiriesAt = []
        XCTAssertNil(data.expirySeverity(now: now))
    }

    func testNoExpiryTooltipWhenNoExpiries() {
        // The empty state — "0 available" — and any row without expiries carry no expiry tooltip.
        var data = WidgetData(title: "Rate Limit Resets", icon: .providerMark("codex"),
                              kind: .count, used: 0, limit: nil)
        data.values = [MetricValue(number: 0, kind: .count, label: "available")]
        XCTAssertEqual(data.unboundedDetail, "0 available")
        XCTAssertNil(data.expiryTooltip)
    }

    func testResetsPopoverEntriesAreSoonestFirstAndNumbered() {
        // The read-only list preserves each expiry and numbers cards in soonest-first order.
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let entries = RateLimitResetsDetail.entries(
            from: [
                // Deliberately out of order to prove the sort.
                now.addingTimeInterval(12 * 24 * 3600 + 18 * 3600),          // ~12d18h -> blue
                now.addingTimeInterval(WidgetData.expiryCriticalWindow - 3600) // <48h  -> red, soonest
            ],
            now: now
        )

        XCTAssertEqual(entries.map(\.number), [1, 2])
        XCTAssertLessThan(entries[0].date, entries[1].date)
        XCTAssertNotNil(entries[1].time.range(of: #"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$"#, options: .regularExpression))
    }

    func testCreditExpiryKeepsExactDatesAndMarksElapsedDatesExpired() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        for (offset, expired) in [(-60.0, true), (0, true), (1, false), (180, false)] {
            let entries = RateLimitResetsDetail.entries(from: [now.addingTimeInterval(offset)], now: now)

            XCTAssertEqual(entries.count, 1)
            XCTAssertEqual(entries[0].date, now.addingTimeInterval(offset))
            XCTAssertEqual(entries[0].expired, expired)
            XCTAssertFalse(entries[0].time.contains("soon"), "Keep the reported expiry even when it elapsed")
            XCTAssertEqual(entries[0].accessibilityLabel.contains("Expired"), expired)
        }
    }

    func testResetsPopoverEmptyWhenNoCredits() {
        XCTAssertTrue(RateLimitResetsDetail.entries(from: [], now: Date()).isEmpty)
    }

    func testCompactDurationAlwaysShowsHoursAtDayScale() {
        // Day-scale durations always show two units so a whole-day-ish span never reads as a flat "Xd"
        // that hides the sub-day remainder. Sub-day durations are unchanged.
        XCTAssertEqual(Formatters.compactDuration(4 * 24 * 3600 + 52 * 60), "4d 0h") // 4d 52m -> "4d 0h"
        XCTAssertEqual(Formatters.compactDuration(7 * 24 * 3600), "7d 0h")            // exact week
        XCTAssertEqual(Formatters.compactDuration(9 * 24 * 3600 + 21 * 3600), "9d 21h")
        XCTAssertEqual(Formatters.compactDuration(5 * 3600), "5h")                    // sub-day unchanged
        XCTAssertEqual(Formatters.compactDuration(52 * 60), "52m")
    }

    func testResetsPopoverContentResolvesEmptyCountOnlyAndTimeline() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)

        // Zero credits -> the genuine empty state.
        XCTAssertEqual(RateLimitResetsDetail.content(count: 0, expiries: [], now: now), .empty)

        // Credits present but no expiry list (dedicated fetch unavailable -> usage-body count fallback):
        // must NOT read "no resets"; it states the count instead.
        XCTAssertEqual(
            RateLimitResetsDetail.content(count: 3, expiries: [], now: now),
            .unknownExpiries(count: 3)
        )

        // Expiries present -> the timeline.
        let expiries = [now.addingTimeInterval(4 * 24 * 3600)]
        guard case .timeline(let entries) = RateLimitResetsDetail.content(count: 1, expiries: expiries, now: now) else {
            return XCTFail("expected timeline")
        }
        XCTAssertEqual(entries.count, 1)
    }

    func testDeadlineLabelSharesFormatAcrossPrefixesAndModes() {
        let calendar = utcCalendar()
        let now = calendar.date(from: DateComponents(year: 2024, month: 6, day: 1, hour: 12))!

        XCTAssertEqual(Formatters.deadlineLabel("Runs out", at: now.addingTimeInterval(2 * 3600 + 360),
                                                mode: .relative, now: now), "Runs out in 2h 6m")
        XCTAssertTrue(Formatters.deadlineLabel("Runs out", at: now.addingTimeInterval(2 * 3600),
                                               mode: .absolute, now: now, calendar: calendar)!
            .hasPrefix("Runs out today at "))
        // Imminent deadlines collapse to "soon" in both modes, same as the reset label.
        XCTAssertEqual(Formatters.deadlineLabel("Runs out", at: now.addingTimeInterval(60),
                                                mode: .relative, now: now), "Runs out soon")
        XCTAssertEqual(Formatters.deadlineLabel("Runs out", at: now.addingTimeInterval(-1),
                                                mode: .absolute, now: now, calendar: calendar), "Runs out soon")
    }

    /// The `runningOut` run-out time, present only when the bar is red and projects to run out
    /// before the reset. Evaluated against the real clock (default `now`) to match the resetsAt set
    /// from `Date()` below.
    private func runningOutEta(_ data: WidgetData) -> String? {
        if case .runningOut(let eta, _) = data.meterState() { return eta }
        return nil
    }

    func testRunningOutEtaUsesCountdown() {
        // Halfway through a 10h window with 90/100 used → behind pace, projected run-out ~34m away,
        // safely before the reset 5h out. The label carries its own "Limit" verb (no flame in tests),
        // so the copy reads "Limit in 34m".
        var data = WidgetData(title: "Session", icon: .providerMark("codex"),
                              kind: .percent, used: 90, limit: 100)
        data.resetsAt = Date().addingTimeInterval(5 * 3600)
        data.periodDurationMs = 10 * 3600 * 1000

        XCTAssertEqual(runningOutEta(data)?.hasPrefix("Limit in "), true) // e.g. "Limit in 34m"
        XCTAssertEqual(runningOutEta(data)?.hasSuffix("m"), true)         // compact duration like "34m"
    }

    func testNoResetLabelWithoutResetDate() {
        var data = WidgetData(title: "Credits", icon: .providerMark("codex"),
                              kind: .dollars, used: 12, limit: 20)
        XCTAssertFalse(data.hasResetLabel())        // no resetsAt → not a clickable reset
        XCTAssertNil(data.resetTooltip())
        XCTAssertEqual(data.boundedTrailingText(), "$20 limit") // falls back to limit context, unflipped
    }

    func testWholeDayQuotaPeriodsOmitZeroHours() {
        XCTAssertEqual(Formatters.periodLabel(milliseconds: 30 * 86_400_000), "30d")
        XCTAssertEqual(Formatters.periodLabel(milliseconds: 86_400_000), "1d")
        XCTAssertEqual(Formatters.periodLabel(milliseconds: MetricPeriod.weekMs), "1w")
        XCTAssertEqual(Formatters.periodLabel(milliseconds: 30 * 86_400_000 + 3_600_000), "30d 1h")
        var data = WidgetData(title: tr("Monthly"), icon: .providerMark("opencode"), kind: .percent, used: 20, limit: 100)
        data.periodDurationMs = 30 * 86_400_000
        XCTAssertEqual(data.overviewTitle, "30d")
    }

    func testModelScopedWeeklyTitlesDoNotRepeatTheCycle() {
        for (title, scope) in [(tr("Claude Weekly"), "Claude"), (tr("Spark Weekly"), "Spark"), (tr("Argon Weekly"), "Argon")] {
            var data = WidgetData(title: title, icon: .providerMark("antigravity"), kind: .percent, used: 0, limit: 100)
            data.periodDurationMs = MetricPeriod.weekMs
            XCTAssertEqual(data.overviewTitle, "\(scope) · 1w")
        }
    }

    func testOverviewNamesCycleWithoutInventingDeadlineAndPreservesModelScope() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        var data = WidgetData(title: "Weekly", icon: .providerMark("claude"), kind: .percent, used: 18, limit: 100)
        data.periodDurationMs = MetricPeriod.weekMs
        XCTAssertEqual(data.overviewTitle, "1w")
        XCTAssertNil(data.boundedTrailingText(now: now), "A cadence is not a known deadline")
        data = WidgetData(title: "Sonnet", icon: .providerMark("claude"), kind: .percent, used: 18, limit: 100)
        data.periodDurationMs = MetricPeriod.weekMs
        XCTAssertEqual(data.overviewTitle, "Sonnet · 1w")
        data.resetsAt = now.addingTimeInterval(121)
        XCTAssertEqual(data.boundedTrailingText(now: now), "3m")
        data.resetsAt = now.addingTimeInterval(1)
        XCTAssertEqual(data.boundedTrailingText(now: now), "1m")
        data.resetsAt = now
        XCTAssertEqual(data.boundedTrailingText(now: now), "soon", "An elapsed snapshot is not proof of restored quota")
        data.hasData = false
        XCTAssertEqual(data.boundedTrailingText(now: now), "No data")
    }
}

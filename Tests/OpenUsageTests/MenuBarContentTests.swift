import XCTest
@testable import OpenUsage

/// Covers `MenuBarContentBuilder`: order, labels, unit-aware values, and no-data filtering.
@MainActor
final class MenuBarContentTests: XCTestCase {
    func testEmptyWhenNoGroups() {
        let content = MenuBarContentBuilder.build(groups: [], data: { $0.sample })
        XCTAssertTrue(content.isEmpty)
    }

    func testTextGroupsPreserveOrderLabelsAndValues() {
        let m1 = percent("a.m1", "Session", 97)
        let m2 = percent("a.m2", "Weekly", 12)
        let b1 = percent("b.m1", "Total", 50)
        let content = MenuBarContentBuilder.build(groups: [group("a", m1, m2), group("b", b1)], data: { $0.sample })

        XCTAssertEqual(content.groups.map(\.providerID), ["a", "b"])
        XCTAssertEqual(content.groups[0].metrics.map(\.id), ["a.m1", "a.m2"])
        XCTAssertEqual(content.groups[0].metrics[0].label, "Session")
        XCTAssertEqual(content.groups[0].metrics[0].value, m1.sample.valueText)
        XCTAssertEqual(content.groups[1].metrics.map(\.id), ["b.m1"])
    }

    func testStripIncludesBoundedAndUnboundedMetrics() {
        let content = MenuBarContentBuilder.build(
            groups: [group("a",
                percent("a.pct", "Pct", 40),
                boundedDollars("a.credits", "Credits", used: 12000, limit: 18000),
                unbounded("a.spend", "Spend"))],
            data: { $0.sample }
        )

        XCTAssertEqual(content.groups[0].metrics.map(\.id), ["a.pct", "a.credits", "a.spend"])
        XCTAssertEqual(content.groups[0].metrics[0].fraction, 0.4)
        XCTAssertEqual(content.groups[0].metrics[1].fraction, 12000.0 / 18000)
        XCTAssertNil(content.groups[0].metrics[2].fraction)
    }

    func testBoundedFractionsFollowWidgetDataUsedLeftAndRounding() {
        for used in [0.0, 0.4, 27, 100] {
            let metric = percent("a.session", "Session", used)
            for mode in [WidgetDisplayMode.used, .remaining] {
                var data = metric.sample
                data.displayMode = mode
                let content = MenuBarContentBuilder.build(groups: [group("a", metric)], data: { _ in data })
                XCTAssertEqual(content.groups[0].metrics[0].fraction, data.fraction)
                XCTAssertEqual(content.groups[0].metrics[0].value, data.menuBarValue)
            }
        }
    }

    func testMixedUnboundedBalanceKeepsActualValueInBothDisplayModes() {
        let quota = percent("a.quota", "Quota", 27)
        let balance = unbounded("a.balance", "Balance", 42)
        for mode in [WidgetDisplayMode.used, .remaining] {
            let content = MenuBarContentBuilder.build(groups: [group("a", quota, balance)], data: {
                var data = $0.sample
                data.displayMode = mode
                return data
            })
            XCTAssertEqual(content.groups[0].metrics.map(\.id), ["a.quota", "a.balance"])
            XCTAssertEqual(content.groups[0].metrics[0].fraction, mode == .used ? 0.27 : 0.73)
            XCTAssertNil(content.groups[0].metrics[1].fraction)
            XCTAssertEqual(content.groups[0].metrics[1].value, "$42")
        }
    }

    func testAllProviderGroupsRenderWithoutAGlobalMetricCap() {
        let content = MenuBarContentBuilder.build(
            groups: [
                group("a", percent("a.m1", "M1", 10), percent("a.m2", "M2", 20)),
                group("b", percent("b.m1", "M1", 30), percent("b.m2", "M2", 40)),
                group("c", percent("c.m1", "M1", 50), percent("c.m2", "M2", 60))
            ],
            data: { $0.sample }
        )

        XCTAssertEqual(content.groups.flatMap { $0.metrics.map(\.id) },
                       ["a.m1", "a.m2", "b.m1", "b.m2", "c.m1", "c.m2"])
    }

    func testNoDataMetricsDropFromStrip() {
        // The strip is dynamic: a pinned metric without data vanishes instead of rendering "—", and
        // the surviving pin renders alone (full size). A provider whose pins all lack data
        // contributes no icon at all.
        let content = MenuBarContentBuilder.build(
            groups: [
                group("a", percent("a.live", "Session", 41), noDataPercent("a.dark", "Weekly")),
                group("b", noDataPercent("b.nd", "ND"))
            ],
            data: { $0.sample }
        )

        XCTAssertEqual(content.groups.map(\.providerID), ["a"])
        XCTAssertEqual(content.groups[0].metrics.map(\.id), ["a.live"])
    }

    func testAllPinsWithoutDataFallBackToAppIcon() {
        let content = MenuBarContentBuilder.build(
            groups: [group("a", noDataPercent("a.nd", "ND"))],
            data: { $0.sample }
        )
        XCTAssertTrue(content.isEmpty)
    }

    func testAccessibilityTextSummarizesGroups() {
        let content = MenuBarContentBuilder.build(
            groups: [group("a", percent("a.m1", "Session", 41), percent("a.m2", "Weekly", 12))],
            data: { $0.sample }
        )
        XCTAssertEqual(content.accessibilityText, "A Session 41%, Weekly 12%")
    }

    func testAccessibilityKeepsFullMetricNamesEvenWithoutVisibleLabels() {
        let content = MenuBarContentBuilder.build(
            groups: [group("a", percent("a.today", "Today", 5), percent("a.month", "Last 30 Days", 80))],
            data: { $0.sample }
        )
        XCTAssertEqual(content.groups[0].metrics.map(\.label), ["Today", "Last 30 Days"])
        XCTAssertEqual(content.accessibilityText, "A Today 5%, Last 30 Days 80%")
    }

    func testRingSelectsOnePrimaryQuotaForClaudeAndActualCodexPlan() {
        for (provider, tier, session, weekly, expectedID, expectedUsed) in [
            ("claude", "Max", 13.0, 95.0, "claude.session", 13.0),
            ("codex", "Pro 100", 95.0, 13.0, "codex.weekly", 13.0),
            ("codex", "Pro 200", 95.0, 13.0, "codex.weekly", 13.0),
            ("codex", "Pro 500", 95.0, 13.0, "codex.weekly", 13.0),
            ("codex", "Plus", 13.0, 95.0, "codex.session", 13.0)
        ] {
            for mode in [WidgetDisplayMode.used, .remaining] {
                let content = MenuBarContentBuilder.build(
                    groups: [group(provider, percent("\(provider).weekly", "Weekly", weekly),
                                   unbounded("\(provider).balance", "Balance"),
                                   percent("\(provider).session", "Session", session))],
                    style: .ring, plan: { _ in tier }, data: {
                        var data = $0.sample
                        data.displayMode = mode
                        return data
                    }
                )
                XCTAssertEqual(content.groups.flatMap { $0.metrics.map(\.id) }, [expectedID])
                XCTAssertEqual(content.groups[0].metrics[0].fraction,
                               mode == .used ? expectedUsed / 100 : (100 - expectedUsed) / 100)
            }
        }
    }

    func testOtherOrUnknownPlanChoosesActualTightestQuotaNotRoundedDisplayOrGuessedTier() {
        for provider in ["amp", "codex"] {
            let content = MenuBarContentBuilder.build(
                groups: [group(provider, percent("\(provider).session", "Session", 69.9),
                               percent("\(provider).weekly", "Weekly", 70.1))],
                style: .ring, data: { $0.sample }
            )
            XCTAssertEqual(content.groups[0].metrics.map(\.id), ["\(provider).weekly"])
        }
        let missing = MenuBarContentBuilder.build(
            groups: [group("claude", noDataPercent("claude.session", "Session"),
                           percent("claude.weekly", "Weekly", 31))], style: .ring, data: { $0.sample }
        )
        XCTAssertEqual(missing.groups[0].metrics.map(\.id), ["claude.weekly"])
    }

    func testRingKeepsEverySelectedAccountEvenWhenTheirUsageIsAsymmetric() {
        let content = MenuBarContentBuilder.build(
            groups: [group("claude", percent("claude.session", "Session", 13), percent("claude.weekly", "Weekly", 95)),
                     group("claude@work", percent("claude@work.session", "Session", 79),
                           percent("claude@work.weekly", "Weekly", 5))],
            style: .ring, accountNumbers: ["claude": 1, "claude@work": 2], data: { $0.sample }
        )
        XCTAssertEqual(content.groups.map(\.providerID), ["claude", "claude@work"])
        XCTAssertEqual(content.groups.flatMap { $0.metrics.map(\.id) }, ["claude.session", "claude@work.session"])
        XCTAssertEqual(content.groups.map(\.accountBadge), [1, 2])
    }

    func testBoundedTrayValuesStayUnitAware() {
        // Percent meters still read as percentages, while bounded dollars/counts keep their natural
        // unit in the strip instead of collapsing to "used / limit" percentages.
        let usage = percent("a.usage", "Usage", 67)
        let credits = boundedDollars("a.credits", "Credits", used: 12000, limit: 18000)
        let requests = boundedCount("a.requests", "Requests", used: 412, limit: 500)
        let spend = unbounded("a.spend", "Spend")   // unbounded $42
        let content = MenuBarContentBuilder.build(groups: [group("a", usage, credits, requests, spend)], data: { $0.sample })

        XCTAssertEqual(content.groups[0].metrics.map(\.value), ["67%", "$12K", "412", "$42"])
    }

    // Compact-notation rules for tray values (abbreviation, decimal rounding) are pinned exactly in
    // MetricFormatterTests — the strip only relays MetricFormatter output.

    // MARK: - Fixtures

    func testPercentageRetainsAccountsWithoutPinsAndFallsBackWhenPinnedDataMissing() {
        let groups = [
            group("claude", percent("claude.session", "Session", 70)),
            group("claude@work", percent("claude@work.session", "Session", 12), noDataPercent("claude@work.weekly", "Weekly")),
            group("codex", percent("codex.weekly", "Weekly", 35))
        ]
        for pins: Set<String> in [["claude.session"], ["claude.session", "claude@work.weekly"]] {
            let text = MenuBarContentBuilder.build(groups: groups, style: .percentage, plan: { _ in "Pro" },
                                                  accountNumbers: ["claude": 1, "claude@work": 2], pinnedMetricIDs: pins, data: { $0.sample })
            let rings = MenuBarContentBuilder.build(groups: groups, style: .ring, plan: { _ in "Pro" }, data: { $0.sample })
            XCTAssertEqual(text.groups.map(\.providerID), rings.groups.map(\.providerID))
            XCTAssertEqual(text.groups[1].metrics.first?.id, "claude@work.session")
            XCTAssertEqual(text.groups[1].accountBadge, 2)
        }
    }

    func testVisibleAccountsAreRenumberedAfterHiddenOrMissingSibling() {
        let first = group("claude", percent("claude.session", "Session", 70))
        let third = group("claude@third", percent("claude@third.session", "Session", 12))
        let missing = group("claude@second", noDataPercent("claude@second.session", "Session"))
        for style: MenuBarStyle in [.ring, .percentage] {
            for groups in [[first, third], [first, missing, third], [third, first]] {
                let result = MenuBarContentBuilder.build(groups: groups, style: style,
                    accountNumbers: ["claude": 1, "claude@second": 2, "claude@third": 3], pinnedMetricIDs: [], data: { $0.sample })
                XCTAssertEqual(result.groups.map(\.accountBadge), [1, 2])
            }
        }
    }

    func testOnlyMultipleRenderedSiblingAccountsHaveBadgesInBothStyles() {
        let first = group("claude", percent("claude.session", "Session", 70))
        let second = group("claude@work", percent("claude@work.session", "Session", 12))
        let missing = group("claude@work", noDataPercent("claude@work.session", "Session"))
        let other = group("codex", percent("codex.weekly", "Weekly", 35))
        for style: MenuBarStyle in [.ring, .percentage] {
            for accounts in [[first, other], [second, other], [first, missing, other]] {
                let result = MenuBarContentBuilder.build(groups: accounts, style: style,
                    accountNumbers: ["claude": 1, "claude@work": 2], pinnedMetricIDs: [], data: { $0.sample })
                XCTAssertTrue(result.groups.allSatisfy { $0.accountBadge == nil })
            }
            let restored = MenuBarContentBuilder.build(groups: [first, second, other], style: style,
                accountNumbers: ["claude": 1, "claude@work": 2], pinnedMetricIDs: [], data: { $0.sample })
            XCTAssertEqual(restored.groups.map(\.accountBadge), [1, 2, nil])
        }
    }

    private func group(_ providerID: String, _ metrics: WidgetDescriptor...) -> ProviderMetrics {
        let provider = Provider(
            id: providerID,
            displayName: providerID.uppercased(),
            icon: .providerMark("cursor")
        )
        return ProviderMetrics(provider: provider, metrics: metrics)
    }

    private func percent(_ id: String, _ label: String, _ used: Double) -> WidgetDescriptor {
        descriptor(id, label, WidgetData(title: label, icon: .providerMark("cursor"), kind: .percent, used: used, limit: 100))
    }

    private func boundedDollars(_ id: String, _ label: String, used: Double, limit: Double) -> WidgetDescriptor {
        descriptor(id, label, WidgetData(title: label, icon: .providerMark("cursor"), kind: .dollars, used: used, limit: limit))
    }

    private func boundedCount(_ id: String, _ label: String, used: Double, limit: Double) -> WidgetDescriptor {
        descriptor(id, label, WidgetData(title: label, icon: .providerMark("cursor"), kind: .count, used: used, limit: limit))
    }

    private func unbounded(_ id: String, _ label: String, _ used: Double = 42) -> WidgetDescriptor {
        descriptor(id, label, WidgetData(title: label, icon: .providerMark("cursor"), kind: .dollars, used: used, limit: nil))
    }

    private func noDataPercent(_ id: String, _ label: String) -> WidgetDescriptor {
        var sample = WidgetData(title: label, icon: .providerMark("cursor"), kind: .percent, used: 0, limit: 100)
        sample.hasData = false
        return descriptor(id, label, sample)
    }

    private func descriptor(_ id: String, _ label: String, _ sample: WidgetData) -> WidgetDescriptor {
        WidgetDescriptor(
            id: id,
            providerID: String(id.prefix { $0 != "." }),
            metricLabel: label,
            sample: sample
        )
    }
}

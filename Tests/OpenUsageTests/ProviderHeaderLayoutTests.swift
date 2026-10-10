import AppKit
import SwiftUI
import XCTest
@testable import OpenUsage

@MainActor
final class ProviderHeaderLayoutTests: XCTestCase {
    private let longPlan = String(repeating: "Future Enterprise Entitlement ", count: 12)

    func testDashboardHeaderFitsOversizedPlanInBothDensities() throws {
        for density in DensitySetting.allCases {
            let suite = "ProviderHeaderLayoutTests.\(UUID().uuidString)"
            let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
            defaults.set(density.rawValue, forKey: DensitySetting.key)
            defer { defaults.removePersistentDomain(forName: suite) }

            let header = ProviderSectionHeader(
                provider: CodexProvider.makeProvider(),
                plan: longPlan,
                warning: "Refresh failed",
                staleness: StalenessHint(label: "Outdated", tooltip: "Last updated 2h ago"),
                onOpenDetails: {}
            )
            .defaultAppStorage(defaults)
            .environment(\.hoverTooltipsDisabled, true)

            // Oversized plans must fit even a section narrower than the new panel's content width.
            try assertFits(header, width: 276)
        }
    }

    func testOverviewTracksStayEqualWhenOneQuotaHasNoDeadline() throws {
        for density in DensitySetting.allCases {
            let suite = "ProviderHeaderLayoutTests.\(UUID().uuidString)"
            let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
            defaults.set(density.rawValue, forKey: DensitySetting.key)
            defer { defaults.removePersistentDomain(forName: suite) }

            var dated = WidgetData(title: "5h", icon: .providerMark("claude"), kind: .percent, used: 25, limit: 100)
            dated.resetsAt = Date().addingTimeInterval(9000)
            let undated = WidgetData(title: "1w", icon: .providerMark("claude"), kind: .percent, used: 54, limit: 100)
            XCTAssertNil(undated.boundedTrailingText())

            let renderer = ImageRenderer(content:
                DashboardMetricCard(tableColumns: QuotaTableColumns(rows: [dated, undated], density: density)) {
                    WidgetRowView(data: dated)
                    WidgetRowView(data: undated)
                }
                .defaultAppStorage(defaults)
                .environment(\.colorScheme, .light)
                .environment(\.hoverTooltipsDisabled, true)
            )
            // 340pt panel minus the two 14pt outer gutters.
            renderer.proposedSize = ProposedViewSize(width: 312, height: nil)
            renderer.scale = 1
            let bitmap = NSBitmapImageRep(cgImage: try XCTUnwrap(renderer.cgImage))
            let fills = blueFillSpans(bitmap)
            XCTAssertEqual(fills.count, 2)
            guard fills.count == 2 else { continue }
            // Different usage levels must imply the same complete track. Losing an empty date cell
            // stretches only the second track; tolerate a few pixels of capsule-edge antialiasing.
            XCTAssertEqual(Double(fills[0]) / 0.25, Double(fills[1]) / 0.54, accuracy: 4)
        }
    }

    func testUndatedAmpQuotasUseFullHorizontalTracksInBothDensities() throws {
        for density in DensitySetting.allCases {
            let suite = "ProviderHeaderLayoutTests.Amp.\(UUID().uuidString)"
            let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
            defaults.set(density.rawValue, forKey: DensitySetting.key)
            defaults.set("ring", forKey: "quotaPresentation") // Retired geometry cannot shrink the overview.
            defer { defaults.removePersistentDomain(forName: suite) }
            let agent = WidgetData(title: "Agent", icon: .providerMark("amp"), kind: .percent, used: 25, limit: 100)
            let orbs = WidgetData(title: "Orbs", icon: .providerMark("amp"), kind: .percent, used: 54, limit: 100)
            let renderer = ImageRenderer(content:
                DashboardMetricCard(tableColumns: QuotaTableColumns(rows: [agent, orbs], density: density)) {
                    WidgetRowView(data: agent)
                    WidgetRowView(data: orbs)
                }
                .defaultAppStorage(defaults)
                .environment(\.colorScheme, .light)
                .environment(\.hoverTooltipsDisabled, true)
            )
            renderer.proposedSize = ProposedViewSize(width: 312, height: nil)
            renderer.scale = 1
            let fills = blueFillSpans(NSBitmapImageRep(cgImage: try XCTUnwrap(renderer.cgImage)))
            XCTAssertEqual(fills.count, 2)
            guard fills.count == 2 else { continue }
            XCTAssertGreaterThan(Double(fills[0]) / 0.25, 190, "No empty reset-date cell should shorten these tracks")
            XCTAssertEqual(Double(fills[0]) / 0.25, Double(fills[1]) / 0.54, accuracy: 4)
        }
    }

    func testOverviewLongLabelsAndContextWrapWithoutWideningOrLosingTheTrack() throws {
        for density in DensitySetting.allCases {
            let suite = "ProviderHeaderLayoutTests.LongQuota.\(UUID().uuidString)"
            let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
            defaults.set(density.rawValue, forKey: DensitySetting.key)
            defer { defaults.removePersistentDomain(forName: suite) }
            var quota = WidgetData(title: "Extended Subscription Quota", icon: .providerMark("claude"), kind: .percent, used: 25, limit: 100)
            quota.subtitleOverride = "Waiting for the provider's next billing cycle"
            let renderer = ImageRenderer(content:
                DashboardMetricCard(tableColumns: QuotaTableColumns(rows: [quota], density: density)) {
                    WidgetRowView(data: quota)
                }
                .defaultAppStorage(defaults)
                .environment(\.colorScheme, .light)
                .environment(\.hoverTooltipsDisabled, true)
            )
            renderer.proposedSize = ProposedViewSize(width: 312, height: nil)
            renderer.scale = 1
            let image = try XCTUnwrap(renderer.cgImage)
            XCTAssertLessThanOrEqual(image.width, 312, "Long copy must wrap instead of overflowing the 340pt panel")
            let fills = blueFillSpans(NSBitmapImageRep(cgImage: image))
            XCTAssertEqual(fills.count, 1, "The track must actually render, not just produce an empty fitting image")
            if let fill = fills.first {
                // A 25% reading on the minimum 60pt track, allowing three pixels of edge antialiasing.
                XCTAssertGreaterThanOrEqual(fill, 12)
            }
        }
    }

    private func blueFillSpans(_ bitmap: NSBitmapImageRep) -> [Int] {
        var spans: [Int] = []
        var insideTrack = false
        for y in 0..<bitmap.pixelsHigh {
            var run = 0
            var longestRun = 0
            for x in 0..<bitmap.pixelsWide {
                if let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB),
                   color.blueComponent > color.redComponent + 0.2,
                   color.blueComponent > color.greenComponent + 0.2 {
                    run += 1
                    longestRun = max(longestRun, run)
                } else {
                    run = 0
                }
            }
            if longestRun == 0 {
                insideTrack = false
            } else if insideTrack {
                spans[spans.count - 1] = max(spans.last!, longestRun)
            } else {
                spans.append(longestRun)
                insideTrack = true
            }
        }
        return spans
    }

    private func assertFits<Content: View>(
        _ content: Content, width: CGFloat, file: StaticString = #filePath, line: UInt = #line
    ) throws {
        let renderer = ImageRenderer(content: content)
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        renderer.scale = 1
        let image = try XCTUnwrap(renderer.cgImage, file: file, line: line)
        XCTAssertLessThanOrEqual(image.width, Int(width), file: file, line: line)
        XCTAssertGreaterThan(image.height, 0, file: file, line: line)
    }
}

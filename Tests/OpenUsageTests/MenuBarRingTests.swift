import AppKit
import XCTest
@testable import OpenUsage

/// Exercises the shipped image API, not a second geometry model: template output, quota fill,
/// account badges, numeric unbounded readings, and identical no-data filtering in both styles.
@MainActor
final class MenuBarRingTests: XCTestCase {
    func testZeroFullAndAsymmetricUsedLeftRenderDifferentQuotaFill() throws {
        let empty = try renderQuota(used: 0, mode: .used)
        let full = try renderQuota(used: 100, mode: .used)
        let used = try renderQuota(used: 27, mode: .used)
        let left = try renderQuota(used: 27, mode: .remaining)

        XCTAssertLessThan(try alphaMass(empty), try alphaMass(used))
        XCTAssertLessThan(try alphaMass(used), try alphaMass(left))
        XCTAssertLessThan(try alphaMass(left), try alphaMass(full))
        XCTAssertEqual(try pixels(empty), try pixels(renderQuota(used: 100, mode: .remaining)))
        XCTAssertEqual(try pixels(full), try pixels(renderQuota(used: 0, mode: .remaining)))
        XCTAssertEqual(try pixels(empty), try pixels(renderQuota(used: 0.4, mode: .used)))
        XCTAssertEqual(used.accessibilityDescription, "Claude Session 27%")
        XCTAssertEqual(left.accessibilityDescription, "Claude Session 73%")
    }

    func testRingIsCompactTrimmedMonochromeTemplateWithAccessibleReadings() throws {
        let image = try renderQuota(used: 27, mode: .used)
        XCTAssertTrue(image.isTemplate)
        XCTAssertGreaterThanOrEqual(image.size.height, 18)
        XCTAssertLessThanOrEqual(image.size.height, 20)
        XCTAssertLessThanOrEqual(image.size.width, 20) // No duplicate provider logo beside the ring.
        let cgImage = try cgImage(image)
        XCTAssertEqual(MenuBarStripRenderer.visibleBounds(of: cgImage),
                       CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))
        let rgba = try pixels(image)
        for offset in stride(from: 0, to: rgba.count, by: 4) where rgba[offset + 3] > 0 {
            XCTAssertEqual(rgba[offset], 0)
            XCTAssertEqual(rgba[offset + 1], 0)
            XCTAssertEqual(rgba[offset + 2], 0)
        }
    }

    func testAccountBadgeIsVisibleAndDistinguishesAccountsInBothStyles() throws {
        let plain = content([.init(id: "claude.session", label: "Session", value: "27%", fraction: 0.27)])
        var first = plain.groups[0]
        first.accountBadge = 1
        var second = first
        second.accountBadge = 2
        for style in MenuBarStyle.allCases {
            let noBadge = try XCTUnwrap(MenuBarStripRenderer.image(for: plain, style: style))
            let one = try XCTUnwrap(MenuBarStripRenderer.image(for: MenuBarContent(groups: [first]), style: style))
            let two = try XCTUnwrap(MenuBarStripRenderer.image(for: MenuBarContent(groups: [second]), style: style))
            XCTAssertGreaterThan(one.size.width, noBadge.size.width)
            XCTAssertLessThanOrEqual(one.size.height, 20)
            XCTAssertNotEqual(try pixels(one), try pixels(two))
            XCTAssertEqual(two.accessibilityDescription, "Claude · 2 Session 27%")
        }
    }

    func testAllUnboundedPinsRenderExactlyTheNumericStripNotQuotaCircles() throws {
        let input = content([
            .init(id: "claude.balance", label: "Balance", value: "$42"),
            .init(id: "claude.resets", label: "Resets", value: "2 resets")
        ])
        let numbers = try XCTUnwrap(MenuBarStripRenderer.image(for: input, style: .percentage))
        let rings = try XCTUnwrap(MenuBarStripRenderer.image(for: input, style: .ring))
        XCTAssertEqual(numbers.size, rings.size)
        XCTAssertEqual(try pixels(numbers), try pixels(rings))
        XCTAssertEqual(rings.accessibilityDescription, "Claude Balance $42, Resets 2 resets")
    }

    func testNoDataPinsAndOrphanServiceMarksAreExcludedInBothStyles() throws {
        let live = descriptor("claude.session", used: 27)
        var dark = descriptor("claude.weekly", used: 12).sample
        dark.hasData = false
        let noData = WidgetDescriptor(id: "claude.weekly", providerID: "claude", metricLabel: "Weekly", sample: dark)
        let empty = MenuBarContentBuilder.build(groups: [group("claude", [noData])], data: { $0.sample })
        let mixed = MenuBarContentBuilder.build(
            groups: [group("claude", [live, noData]), group("codex", [noData])], data: { $0.sample }
        )
        let onlyLive = MenuBarContentBuilder.build(groups: [group("claude", [live])], data: { $0.sample })
        XCTAssertEqual(mixed, onlyLive)
        for style in MenuBarStyle.allCases {
            XCTAssertNil(MenuBarStripRenderer.image(for: empty, style: style))
            let rendered = try XCTUnwrap(MenuBarStripRenderer.image(for: mixed, style: style))
            let control = try XCTUnwrap(MenuBarStripRenderer.image(for: onlyLive, style: style))
            XCTAssertIdentical(rendered, control)
            XCTAssertEqual(rendered.accessibilityDescription, "Claude Session 27%")
        }
    }

    private func renderQuota(used: Double, mode: WidgetDisplayMode) throws -> NSImage {
        let metric = descriptor("claude.session", used: used)
        let input = MenuBarContentBuilder.build(groups: [group("claude", [metric])], data: {
            var data = $0.sample
            data.displayMode = mode
            return data
        })
        return try XCTUnwrap(MenuBarStripRenderer.image(for: input, style: .ring))
    }

    private func descriptor(_ id: String, used: Double) -> WidgetDescriptor {
        WidgetDescriptor(id: id, providerID: "claude", metricLabel: "Session",
                         sample: WidgetData(title: "Session", icon: .providerMark("claude"),
                                            kind: .percent, used: used, limit: 100))
    }

    private func group(_ id: String, _ metrics: [WidgetDescriptor]) -> ProviderMetrics {
        ProviderMetrics(provider: Provider(id: id, displayName: id == "claude" ? "Claude" : "Codex",
                                           icon: .providerMark(id)), metrics: metrics)
    }

    private func content(_ metrics: [MenuBarContent.Metric]) -> MenuBarContent {
        MenuBarContent(groups: [.init(providerID: "claude", displayName: "Claude",
                                      icon: .providerMark("claude"), metrics: metrics)])
    }

    private func cgImage(_ image: NSImage) throws -> CGImage {
        var rect = CGRect(origin: .zero, size: image.size)
        return try XCTUnwrap(image.cgImage(forProposedRect: &rect, context: nil, hints: nil))
    }

    private func pixels(_ image: NSImage) throws -> [UInt8] {
        let cgImage = try cgImage(image)
        var rgba = [UInt8](repeating: 0, count: cgImage.width * cgImage.height * 4)
        let context = try XCTUnwrap(CGContext(
            data: &rgba, width: cgImage.width, height: cgImage.height, bitsPerComponent: 8,
            bytesPerRow: cgImage.width * 4, space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
        ))
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))
        return rgba
    }

    private func alphaMass(_ image: NSImage) throws -> Int {
        let rgba = try pixels(image)
        return stride(from: 3, to: rgba.count, by: 4).reduce(0) { $0 + Int(rgba[$1]) }
    }
}

import XCTest
@testable import OpenUsage

/// Covers the strip renderer's single-entry memo (#18): equal content and style return the
/// previously rendered `NSImage` instance — so the hundreds of observation-loop re-renders between
/// real data changes never re-run `ImageRenderer`, and `StatusItemImageUpdater` can skip `apply`
/// on that same instance — while a changed value renders fresh.
@MainActor
final class MenuBarStripMemoTests: XCTestCase {
    func testEqualContentReturnsSameImageInstance() throws {
        for style in MenuBarStyle.allCases {
            let first = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "42%"), style: style))
            let second = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "42%"), style: style))
            XCTAssertIdentical(first, second)
        }
    }

    func testChangedValueRendersFreshImage() throws {
        let first = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "42%")))
        let changed = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "43%")))
        XCTAssertNotIdentical(first, changed)
    }

    func testEmptyContentReturnsNilForAppIconFallback() {
        for style in MenuBarStyle.allCases {
            XCTAssertNil(MenuBarStripRenderer.image(for: MenuBarContent(groups: []), style: style))
            XCTAssertNil(MenuBarStripRenderer.image(for: MenuBarContent(groups: []), style: style))
        }
    }

    func testDefaultConsumerStyleIsPercentage() throws {
        let content = makeContent(value: "42%")
        let implicit = try XCTUnwrap(MenuBarStripRenderer.image(for: content))
        let explicit = try XCTUnwrap(MenuBarStripRenderer.image(for: content, style: .percentage))
        XCTAssertIdentical(implicit, explicit)
    }

    func testStyleChangeInvalidatesMemoAndApplyGate() throws {
        let content = makeContent(value: "42%")
        let percentage = try XCTUnwrap(MenuBarStripRenderer.image(for: content, style: .percentage))
        let ring = try XCTUnwrap(MenuBarStripRenderer.image(for: content, style: .ring))
        let ringAgain = try XCTUnwrap(MenuBarStripRenderer.image(for: content, style: .ring))
        let back = try XCTUnwrap(MenuBarStripRenderer.image(for: content, style: .percentage))
        XCTAssertNotIdentical(percentage, ring)
        XCTAssertIdentical(ring, ringAgain)
        XCTAssertNotIdentical(ring, back)
        XCTAssertEqual(ring.accessibilityDescription, percentage.accessibilityDescription)
        var applied: [NSImage] = []
        var gate = StatusItemImageUpdater.ApplyGate()
        for image in [percentage, ring, ringAgain, back] { gate.apply(image, using: { applied.append($0) }) }
        XCTAssertEqual(applied.count, 3)
    }

    func testFractionChangeInvalidatesRingMemoEvenWhenFormattedValueIsEqual() throws {
        let first = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "$42", fraction: 0.27), style: .ring))
        let changed = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "$42", fraction: 0.73), style: .ring))
        XCTAssertNotIdentical(first, changed)
    }

    func testUnchangedMemoizedImageIsNotApplied() throws {
        var applied: [NSImage] = []
        var gate = StatusItemImageUpdater.ApplyGate()
        let first = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "42%")))
        let second = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "42%")))
        gate.apply(first, using: { applied.append($0) })
        gate.apply(second, using: { applied.append($0) })
        XCTAssertIdentical(first, second)
        XCTAssertEqual(applied.count, 1)
        XCTAssertIdentical(applied[0], first)
    }

    func testChangedImageIsApplied() throws {
        var applied: [NSImage] = []
        var gate = StatusItemImageUpdater.ApplyGate()
        let first = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "42%")))
        let changed = try XCTUnwrap(MenuBarStripRenderer.image(for: makeContent(value: "43%")))
        gate.apply(first, using: { applied.append($0) })
        gate.apply(changed, using: { applied.append($0) })
        gate.apply(changed, using: { applied.append($0) })
        XCTAssertNotIdentical(first, changed)
        XCTAssertEqual(applied.count, 2)
        XCTAssertIdentical(applied[0], first)
        XCTAssertIdentical(applied[1], changed)
    }

    private func makeContent(value: String, fraction: Double? = 0.42) -> MenuBarContent {
        let metric = MenuBarContent.Metric(
            id: "claude.session", label: "Session", value: value, fraction: fraction
        )
        return MenuBarContent(
            groups: [MenuBarContent.Group(
                providerID: "claude",
                displayName: "Claude",
                icon: .providerMark("claude"),
                metrics: [metric]
            )]
        )
    }
}

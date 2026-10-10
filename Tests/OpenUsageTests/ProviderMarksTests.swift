import XCTest
@testable import OpenUsage

@MainActor
final class ProviderMarksTests: XCTestCase {
    func testProviderVectorMarksLoadWithoutFallbacks() throws {
        for id in ["tokenplan", "claude", "codex", "cursor", "amp", "antigravity", "copilot", "deepseek", "devin", "grok", "moonshot", "minimax", "ollama", "opencode", "openrouter", "siliconflow", "zai"] {
            let mark = try XCTUnwrap(ProviderMarks.mark(for: id), "\(id) should load a vector mark")
            XCTAssertFalse(mark.path.isEmpty, "\(id) mark must carry SVG path data")
        }
    }

    func testAppLauncherIconHasVisibleArtworkAtMenuBarSize() throws {
        let image = try XCTUnwrap(MenuBarIcon.image)
        XCTAssertEqual(image.size, NSSize(width: 18, height: 18))
        XCTAssertTrue(image.isTemplate)
        var rect = CGRect(origin: .zero, size: image.size)
        let cgImage = try XCTUnwrap(image.cgImage(forProposedRect: &rect, context: nil, hints: nil))
        let bounds = try XCTUnwrap(MenuBarStripRenderer.visibleBounds(of: cgImage))
        XCTAssertGreaterThan(bounds.width, 8)
        XCTAssertGreaterThan(bounds.height, 12)
    }
}

import AppKit
import SwiftUI

/// Renders menu-bar readings (`MenuBarContent`) into a template `NSImage`: Percentage uses provider
/// mark + values; Ring uses compact quota rings with the mark inside, retaining unbounded numbers.
/// Black-on-clear so macOS tints it for light/dark; sized to its natural width. The image is built
/// outside the `label:` view builder (an `ImageRenderer` inline there throws obscure errors).
@MainActor
enum MenuBarStripRenderer {
    /// Last render, memoized on content and style. The observation loop re-renders on every snapshot
    /// write — several times per refresh pass — but the strip's visible content rarely changes.
    /// Returning the same `NSImage` instance lets `StatusItemImageUpdater` skip the status-item set
    /// (an unconditional set still costs a WindowServer redraw), and keeps `ImageRenderer` (which
    /// retains a little memory per run on macOS) to actual visual changes.
    private static var lastRender: (content: MenuBarContent, style: MenuBarStyle, image: NSImage?)?

    /// The strip image for the given content, or `nil` when the content renders nothing
    /// (caller falls back to the app icon). Memoized: equal inputs return the
    /// previously rendered instance.
    static func image(for content: MenuBarContent, style: MenuBarStyle = .percentage) -> NSImage? {
        if let lastRender, lastRender.content == content, lastRender.style == style {
            AppLog.debug(.menubar, "strip cache hit")
            return lastRender.image
        }
        AppLog.debug(.menubar, "strip cache miss (rendering)")
        let image: NSImage?
        switch style {
        case .percentage: image = textImage(for: content)
        case .ring: image = ringImage(for: content)
        }
        lastRender = (content, style, image)
        return image
    }

    /// The pinned-metrics strip, or `nil` when nothing is pinned or no pinned metric has data yet
    /// (caller falls back to the app icon).
    ///
    /// The render is trimmed to its visible pixels: the view's anti-aliasing padding and the provider
    /// glyph's normalization inset would otherwise ship as transparent margins, widening the status
    /// item past its artwork (the menu bar already pads every item, so baked-in margins read as an
    /// extra-large gap next to neighboring items).
    static func textImage(for content: MenuBarContent) -> NSImage? {
        guard !content.isEmpty else { return nil }
        return renderedImage(MenuBarTextStrip(content: content), summary: content.accessibilityText)
    }

    static func ringImage(for content: MenuBarContent) -> NSImage? {
        guard !content.isEmpty else { return nil }
        if content.groups.allSatisfy({ $0.metrics.allSatisfy { $0.fraction == nil } }) {
            return textImage(for: content)
        }
        return renderedImage(MenuBarRingStrip(content: content), summary: content.accessibilityText)
    }

    private static func renderedImage(_ view: some View, summary: String) -> NSImage? {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let rendered = renderer.cgImage else { return nil }
        let cgImage = trimmedToVisibleContent(rendered) ?? rendered
        let image = NSImage(
            cgImage: cgImage,
            size: NSSize(width: CGFloat(cgImage.width) / renderer.scale, height: CGFloat(cgImage.height) / renderer.scale)
        )
        image.isTemplate = true
        image.accessibilityDescription = summary
        return image
    }

    /// Crops fully transparent margins off a rendered strip, or `nil` when the image has no visible
    /// pixels (caller keeps the untrimmed render).
    nonisolated static func trimmedToVisibleContent(_ image: CGImage) -> CGImage? {
        guard let bounds = visibleBounds(of: image) else { return nil }
        return image.cropping(to: bounds)
    }

    /// The bounding box of pixels with non-zero alpha, in pixel coordinates (origin at the top-left
    /// row, matching `CGImage.cropping(to:)`), or `nil` for a fully transparent image.
    nonisolated static func visibleBounds(of image: CGImage) -> CGRect? {
        let width = image.width
        let height = image.height
        guard width > 0, height > 0 else { return nil }
        var alpha = [UInt8](repeating: 0, count: width * height)
        guard let context = CGContext(
            data: &alpha, width: width, height: height, bitsPerComponent: 8,
            bytesPerRow: width, space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGImageAlphaInfo.alphaOnly.rawValue
        ) else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

        var minX = width, maxX = -1, minY = height, maxY = -1
        for y in 0..<height {
            let row = y * width
            for x in 0..<width where alpha[row + x] != 0 {
                if x < minX { minX = x }
                if x > maxX { maxX = x }
                if y < minY { minY = y }
                if y > maxY { maxY = y }
            }
        }
        guard maxX >= minX else { return nil }
        return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
    }

    /// The screen-share privacy stand-in: the wordmark instead of usage values, shown while
    /// `MenuBarPrivacyStore.concealUsage` is true so a shared or recorded screen never carries token
    /// counts or spend. Deterministic, so rendered once; `nil` only if `ImageRenderer` fails entirely
    /// (caller falls back to the app icon).
    static let privacyImage: NSImage? = {
        let renderer = ImageRenderer(content: MenuBarPrivacyLabel())
        renderer.scale = 2
        guard let rendered = renderer.cgImage else { return nil }
        let cgImage = trimmedToVisibleContent(rendered) ?? rendered
        let image = NSImage(
            cgImage: cgImage,
            size: NSSize(width: CGFloat(cgImage.width) / renderer.scale, height: CGFloat(cgImage.height) / renderer.scale)
        )
        image.isTemplate = true
        image.accessibilityDescription = "\(AppInfo.displayName), usage hidden while the screen is shared"
        return image
    }()

    /// Last-resort icon if the brand mark fails to load.
    static let fallbackIcon: NSImage = {
        let image = NSImage(
            systemSymbolName: "gauge.with.dots.needle.bottom.50percent",
            accessibilityDescription: AppInfo.displayName
        ) ?? NSImage()
        image.isTemplate = true
        return image
    }()
}

/// The brand reservoir mark plus wordmark drawn in place of the strip while screen-share privacy is
/// concealing usage. Same black-on-clear template treatment, glyph box, and type size as a
/// single-metric text strip, so the swap doesn't jump the menu bar's rhythm.
private struct MenuBarPrivacyLabel: View {
    var body: some View {
        HStack(spacing: 5) {
            // The same mark and inset as `MenuBarIcon` (the art carries its own margin), sized to the
            // strip's glyph box so the swap keeps the provider-glyph scale.
            if let mark = ProviderMarks.mark(for: "tokenplan") {
                ProviderIconShape(mark: mark, inset: 0.08)
                    .fill(Color.black)
                    .frame(width: 16, height: 16)
            }
            Text(verbatim: AppInfo.displayName)
                .font(.system(size: 12, weight: .bold))
        }
        .foregroundStyle(.black)
        .padding(.horizontal, 2)
        .padding(.vertical, 1)
        .fixedSize()
    }
}

private struct MenuBarTextStrip: View {
    let content: MenuBarContent

    var body: some View {
        HStack(spacing: 11) {
            ForEach(content.groups, id: \.providerID) { group in
                MenuBarTextGroup(group: group)
            }
        }
        .foregroundStyle(.black)
        .monospacedDigit()
        .padding(.horizontal, 2)
        .padding(.vertical, 1)
        .fixedSize()
    }
}

/// Shared numeric treatment, including Ring's all-unbounded service groups.
struct MenuBarTextGroup: View {
    let group: MenuBarContent.Group

    var body: some View {
        HStack(spacing: 4) {
            HStack(alignment: .top, spacing: 0) {
                MenuBarProviderGlyph(icon: group.icon, side: 16)
                if let badge = group.accountBadge {
                    Text(verbatim: String(badge)).font(.system(size: 7, weight: .bold))
                        .accessibilityHidden(true)
                }
            }
            metricsView(group.metrics)
        }
    }

    /// A provider's pinned values, no labels: one metric as a single large number, two stacked on two
    /// tight lines (much narrower than side-by-side), read positionally.
    @ViewBuilder
    private func metricsView(_ metrics: [MenuBarContent.Metric]) -> some View {
        if metrics.count <= 1 {
            Text(metrics.first?.value ?? "")
                .font(.system(size: 12, weight: .bold))
        } else {
            VStack(alignment: .trailing, spacing: -2) {
                ForEach(metrics, id: \.id) { metric in
                    Text(metric.value)
                }
            }
            .font(.system(size: 9, weight: .semibold))
            .fixedSize()
        }
    }
}

/// One normalized provider mark per group, beside numbers or centered inside its quota ring.
struct MenuBarProviderGlyph: View {
    let icon: IconSource
    let side: CGFloat

    var body: some View {
        if let mark = ProviderMarks.mark(for: icon.providerID) {
            ProviderIconShape(mark: mark, inset: 0.04)
                .fill(Color.black)
                .frame(width: side, height: side)
        } else {
            Circle().fill(Color.black).frame(width: side - 1, height: side - 1)
        }
    }
}

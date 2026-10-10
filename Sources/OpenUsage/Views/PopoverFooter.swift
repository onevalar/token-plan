import SwiftUI

/// Settings-only version footer. The overview and subscription pages have no bottom bar.
struct PopoverFooter: View {
    let horizontalPadding: CGFloat
    let onHeightChange: (CGFloat) -> Void

    var body: some View {
        Text(verbatim: "\(AppInfo.displayName) \(AppInfo.version)")
            .font(.caption2).foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, 12)
            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { onHeightChange($0) }
    }
}

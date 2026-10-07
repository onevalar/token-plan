import SwiftUI

/// A provider's current problem, spelled out inside its dashboard card: an amber caution glyph and the
/// message (for example "Not logged in. Run `codex` to authenticate."). The header triangle carries the
/// same text as a hover tooltip; this row is for people who never hover.
struct ProviderNoticeRow: View {
    let message: String

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Theme.notice)
                .accessibilityHidden(true)
            Text(message)
                .font(.system(size: density.supportingPointSize))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, density.textRowPadding + 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

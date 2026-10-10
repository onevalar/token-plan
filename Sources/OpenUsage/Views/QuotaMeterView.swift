import SwiftUI

/// Horizontal quota track. Fill follows Used/Left; color always follows actual remaining.
struct QuotaMeterView: View {
    let data: WidgetData
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular
    @Environment(\.popoverPartyMode) private var partyMode

    private var fill: AnyShapeStyle {
        partyMode ? PartyMode.meterFill : data.quotaSeverity.map(Theme.meterFill) ?? AnyShapeStyle(Color.secondary)
    }

    private var fraction: Double { data.hasData ? data.fraction : 0 }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(.quaternary)
                Capsule().fill(fill)
                    .frame(width: fraction > 0 ? max(density.meterHeight, proxy.size.width * fraction) : 0)
            }
        }
        .frame(height: density.meterHeight)
        .frame(maxWidth: .infinity)
        .animation(Motion.spring, value: fraction)
        .accessibilityElement()
        .accessibilityLabel(data.title)
        .accessibilityValue(data.headline)
    }
}

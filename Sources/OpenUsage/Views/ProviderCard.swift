import AppKit
import SwiftUI

/// The grouped metric-card body shared by the live dashboard list and its lifted drag preview:
/// a spacing-0 stack of rows (separated by row padding), the density gutter that
/// keeps the first/last row clear, and a separator below the group. Both surfaces build the
/// card through this so the floating preview can't drift from the live card (it once hard-coded its
/// spacing and even drew dividers the live list doesn't).
///
/// The live list threads per-row gestures/opacity/frames through `rows`; the preview passes plain
/// `WidgetRowView`s; the preview's shadow supplies its lifted depth.
struct DashboardMetricCard<Rows: View>: View {
    /// All overview cards share columns; details keep the stacked presentation.
    var tableColumns: QuotaTableColumns? = nil
    @ViewBuilder var rows: Rows

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        VStack(spacing: 0) {
            rows
        }
        .environment(\.quotaTableColumns, tableColumns)
        .padding(.vertical, density.cardGutter)
        .cardSurface()
    }
}

/// Shared column widths leave the track flexible, but never let a long label or date consume it.
/// Text can wrap in exceptional long-label/exact-date states instead of disappearing.
@MainActor
struct QuotaTableColumns {
    let title: CGFloat
    let reading: CGFloat
    let context: CGFloat

    init(rows: [WidgetData], density: DensitySetting) {
        let quotas = rows.filter(\.isBounded)
        let font = NSFont.systemFont(ofSize: density.supportingPointSize)
        let numberFont = NSFont.monospacedDigitSystemFont(ofSize: density.supportingPointSize, weight: .semibold)
        let contextFont = NSFont.monospacedDigitSystemFont(ofSize: density.supportingPointSize, weight: .regular)
        let readingWidth = quotas.map {
            ($0.valueText as NSString).size(withAttributes: [.font: numberFont]).width
        }.max() ?? 0
        reading = min(48, max(36, ceil(readingWidth)))
        let contextWidth = quotas.map { data in
            let text = data.boundedTrailingText() ?? ""
            let iconWidth: CGFloat = data.hasResetLabel() && data.resetsAt != nil ? 18 : 0
            return (text as NSString).size(withAttributes: [.font: contextFont]).width + iconWidth
        }.max() ?? 0
        // 14pt outer and row insets on both sides, three 8pt column gaps, at least a 60pt track.
        // Reserve the minimum title too; unusually long deadlines wrap instead of widening the panel.
        let contextBudget = PanelHeightController.panelWidth - 56 - reading - 24 - 32 - 60
        context = contextWidth == 0 ? 0 : min(contextBudget, min(140, max(64, ceil(contextWidth))))
        let titleBudget = PanelHeightController.panelWidth - 56 - reading - context - 24 - 60
        let titleWidth = quotas.map {
            ($0.overviewTitle as NSString).size(withAttributes: [.font: font]).width
        }.max() ?? 0
        title = min(72, min(max(32, titleBudget), max(32, ceil(titleWidth))))
    }
}

extension EnvironmentValues {
    @Entry var quotaTableColumns: QuotaTableColumns? = nil
}

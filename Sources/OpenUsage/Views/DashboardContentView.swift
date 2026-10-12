import SwiftUI

/// The dashboard-only scrolling content. Screen switching, panel sizing, fixed bars, keyboard handling,
/// and close/reset behavior stay with `DashboardView`.
struct DashboardContentView: View {
    let container: AppContainer
    let layout: LayoutStore
    let updater: UpdaterController
    let reorderSpaceName: String
    let horizontalPadding: CGFloat
    let bottomGap: CGFloat
    let onRefresh: () -> Void

    @Binding var reorderLift: ReorderLift?
    @Binding var scrollPosition: ScrollPosition

    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        PopoverScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    HStack(spacing: 4) {
                        Image(nsImage: AppInfo.icon)
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(width: 20, height: 20)
                            .accessibilityHidden(true)
                        Text(verbatim: AppInfo.displayName)
                            .font(.title3.weight(.semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                    }
                    Spacer(minLength: 8)
                    Button(action: onRefresh) {
                        HStack(spacing: 5) {
                            if container.dataStore.refreshingProviderIDs.isEmpty {
                                Image(systemName: "arrow.clockwise")
                            } else {
                                MotionAwareProgressView(controlSize: .mini)
                            }
                            Text("Refresh")
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 9)
                        .frame(height: 28).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .background(.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 8))
                    .disabled(!container.dataStore.refreshingProviderIDs.isEmpty)
                    .accessibilityLabel(container.dataStore.refreshingProviderIDs.isEmpty ? tr("Refresh now") : tr("Refreshing…"))
                    HeaderView(screen: .dashboard)
                }
                .padding(.bottom, density.cardGutter * 2)
                // A pending update found by a scheduled Sparkle check tops everything — it's the
                // reminder the buried Sparkle window can't deliver for a dockless app.
                if let updateVersion = updater.availableUpdateVersion {
                    UpdateBannerCard(version: updateVersion)
                        .padding(.bottom, density.sectionSpacing)
                        .transition(.scale(scale: 0.95).combined(with: .opacity))
                }
                // The one-time first-run hint sits above the provider sections (and above the
                // empty-state line, which a fresh install can hit while nothing has data yet).
                if container.onboarding.isCustomizeHintPending {
                    CustomizeHintCard()
                        .padding(.bottom, density.sectionSpacing)
                        .transition(.scale(scale: 0.95).combined(with: .opacity))
                }
                widgetContent
            }
            .animation(Motion.spring, value: container.onboarding.isCustomizeHintPending)
            .animation(Motion.spring, value: updater.availableUpdateVersion)
            .padding(.horizontal, horizontalPadding)
            .padding(.top, density.contentTopPadding)
            .padding(.bottom, bottomGap)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollPosition($scrollPosition)
    }

    @ViewBuilder
    private var widgetContent: some View {
        if layout.displayGroups.isEmpty {
            VStack(spacing: 10) {
                Text("Nothing is being tracked yet. Choose which services and metrics to show.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button("Subscription Services") {
                    withAnimation(Motion.modeSwitch) { layout.screen = .customize }
                }
                .controlSize(.small)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .padding(.horizontal, 16)
        } else {
            WidgetGroupedListView(
                reorderSpaceName: reorderSpaceName,
                reorderLift: $reorderLift
            )
        }
    }
}

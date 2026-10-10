import SwiftUI

/// Display semantics and appearance share one page; menu-bar controls have their own page.
struct SettingsAppearanceSection: View {
    @Environment(WidgetDataStore.self) private var dataStore
    @Environment(PopoverTransparencyStore.self) private var transparency
    @AppStorage(AppearanceSetting.key) private var appearance = AppearanceSetting.system
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular
    @AppStorage(ReduceAnimationsSetting.key) private var reduceAnimations = ReduceAnimationsSetting.fallback

    var body: some View {
        VStack(spacing: density.sectionSpacing) {
            usageSection
            appearanceSection
        }
    }

    private var usageSection: some View {
        @Bindable var dataStore = dataStore
        return VStack(spacing: 0) {
            row("Show Usage As") {
                picker($dataStore.meterStyle, options: WidgetDisplayMode.allCases, label: \.label)
            }
            Text("Preview").font(.caption).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 12)
            WidgetRowView(data: displayPreview)
                .environment(\.quotaTableColumns, QuotaTableColumns(rows: [displayPreview], density: density))
            Text("Overview and details always use horizontal bars. Ring is available only in the menu bar.")
                .font(.caption).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12).padding(.bottom, 8)
        }
        .cardSurface()
    }

    private var displayPreview: WidgetData {
        var data = WidgetData(title: tr("Session"), icon: .providerMark("claude"), kind: .percent, used: 18, limit: 100)
        data.periodDurationMs = MetricPeriod.sessionMs
        data.resetsAt = Date().addingTimeInterval(2 * 3600 + 35 * 60)
        data.displayMode = dataStore.meterStyle
        return data
    }

    private var appearanceSection: some View {
        @Bindable var transparency = self.transparency
        return VStack(spacing: 0) {
            row("Theme") {
                picker($appearance, options: AppearanceSetting.allCases, label: \.label)
                    .onChange(of: appearance) { AppearanceSetting.applyCurrent() }
            }
            row("Density") { picker($density, options: DensitySetting.allCases, label: \.label) }
            row("Reduce Animations") {
                Toggle("Reduce Animations", isOn: $reduceAnimations).labelsHidden().settingsSwitchStyle()
            }
            row("Increase Transparency") {
                Toggle("Increase Transparency", isOn: $transparency.increaseTransparency)
                    .labelsHidden().settingsSwitchStyle().disabled(transparency.secretCodeActive)
            }
            if transparency.secretCodeActive {
                notice("Party mode is on, so this stays paused.")
                row("Party Mode") {
                    Toggle("Party Mode", isOn: $transparency.partyModeActive).labelsHidden().settingsSwitchStyle()
                }
                row("Drunk Mode") {
                    Toggle("Drunk Mode", isOn: $transparency.drunkMode).labelsHidden().settingsSwitchStyle()
                }
                if transparency.partyPaused {
                    notice("macOS Reduce Transparency or Increase Contrast is on, so the party stays paused.")
                }
            } else if transparency.isPaused {
                notice("macOS Reduce Transparency or Increase Contrast is on, so this stays paused.")
            }
        }
        .cardSurface()
    }

    private func row(_ title: LocalizedStringKey, @ViewBuilder control: () -> some View) -> some View {
        HStack(spacing: 10) {
            Text(title)
            Spacer(minLength: 8)
            control().accessibilityLabel(title)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, density.controlRowPadding)
    }

    private func picker<Value: Hashable>(
        _ selection: Binding<Value>, options: [Value], label: @escaping (Value) -> String
    ) -> some View {
        Picker("", selection: selection) {
            ForEach(options, id: \.self) { Text(label($0)).tag($0) }
        }
        .pickerStyle(.menu).labelsHidden().fixedSize()
    }

    private func notice(_ text: String) -> some View {
        Text(text).font(.caption).foregroundStyle(Theme.notice)
            .padding(.horizontal, 12).padding(.bottom, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

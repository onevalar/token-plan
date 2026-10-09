import SwiftUI

/// Secondary settings: appearance and menu-bar chrome, kept off the common preferences page.
struct SettingsAppearanceSection: View {
    @Environment(AppContainer.self) private var container
    @AppStorage(AppearanceSetting.key) private var appearance = AppearanceSetting.system
    @AppStorage(TimeFormatSetting.key) private var timeFormat = TimeFormatSetting.auto
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular
    @AppStorage(ReduceAnimationsSetting.key) private var reduceAnimations = ReduceAnimationsSetting.fallback

    var body: some View {
        @Bindable var layout = container.layout
        @Bindable var transparency = container.transparency
        VStack(spacing: 0) {
            row("Icon Style") {
                picker($layout.menuBarStyle, options: MenuBarStyle.allCases, label: \.label)
            }
            row("Theme") {
                picker($appearance, options: AppearanceSetting.allCases, label: \.label)
                    .onChange(of: appearance) { AppearanceSetting.applyCurrent() }
            }
            row("Density") { picker($density, options: DensitySetting.allCases, label: \.label) }
            row("Time Format") { picker($timeFormat, options: TimeFormatSetting.allCases, label: \.label) }
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

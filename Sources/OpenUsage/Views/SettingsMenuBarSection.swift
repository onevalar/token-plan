import SwiftUI

/// Menu-bar presentation and account visibility, independent of dashboard placement and stars.
struct SettingsMenuBarSection: View {
    @Environment(LayoutStore.self) private var layout
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        @Bindable var layout = layout
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Text("Menu Bar Style")
                Spacer(minLength: 8)
                Picker("Menu Bar Style", selection: $layout.menuBarStyle) {
                    ForEach(MenuBarStyle.allCases, id: \.self) { Text($0.label).tag($0) }
                }
                .pickerStyle(.menu).labelsHidden().fixedSize()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, density.controlRowPadding)
            Text("Shown Services").font(.caption.weight(.medium)).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12).padding(.top, 10).padding(.bottom, 4)
            if layout.menuBarServices.isEmpty {
                Text("Enable services in Service Configuration to configure their menu-bar visibility.")
                    .font(.caption).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12).padding(.bottom, 8)
            }
            ForEach(layout.menuBarEntries) { account in
                let label = account.menuBarEntryLabel
                HStack(spacing: 10) {
                    Text(verbatim: label)
                        .font(.subheadline)
                        .lineLimit(1).truncationMode(.middle)
                    Spacer(minLength: 8)
                    Toggle(isOn: Binding(
                        get: { layout.isMenuBarEntrySelected(account.id) },
                        set: { layout.setMenuBarEntrySelected($0, for: account.id) }
                    )) { Text(verbatim: label) }
                    .settingsSwitchStyle()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, density.controlRowPadding)
            }
        }
        .cardSurface()
    }
}

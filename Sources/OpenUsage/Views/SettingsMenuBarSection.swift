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
            Divider().padding(.vertical, 8)
            VStack(alignment: .leading, spacing: 4) {
                Text("Menu Bar Services").font(.subheadline.weight(.semibold))
                Text("Choose services and accounts to show. Hiding them keeps stars, overview and refresh unchanged.")
                    .font(.caption).foregroundStyle(.secondary)
                if layout.menuBarStyle == .ring {
                    Text("One ring per selected account: Claude 5h, Codex Pro 1w, Plus 5h. Other plans use the quota with least remaining.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12).padding(.bottom, 8)
            if layout.menuBarServices.isEmpty {
                Text("Enable services in Services & Subscriptions to configure their menu-bar visibility.")
                    .font(.caption).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12).padding(.bottom, 8)
            }
            ForEach(layout.menuBarServices) { service in
                HStack(spacing: 10) {
                    Text(verbatim: service.displayName)
                    Spacer(minLength: 8)
                    Toggle(isOn: Binding(
                        get: { layout.isMenuBarServiceVisible(service.id) },
                        set: { layout.setMenuBarServiceVisible($0, for: service.id) }
                    )) { Text(verbatim: service.displayName) }
                    .settingsSwitchStyle()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, density.controlRowPadding)
                let accounts = layout.menuBarAccounts(for: service.id)
                if accounts.count > 1 || accounts.contains(where: { !layout.isMenuBarAccountVisible($0.id) }) {
                    ForEach(accounts) { account in
                        let number = layout.menuBarAccountNumbers[account.id] ?? 1
                        let label = "\(number) · \(account.displayName)"
                        HStack(spacing: 10) {
                            Text(verbatim: label).font(.caption)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 8)
                            Toggle(isOn: Binding(
                                get: { layout.isMenuBarAccountVisible(account.id) },
                                set: { layout.setMenuBarAccountVisible($0, for: account.id) }
                            )) { Text(verbatim: label) }
                            .settingsSwitchStyle()
                            .disabled(!layout.isMenuBarServiceVisible(service.id))
                        }
                        .padding(.leading, 24).padding(.trailing, 12)
                        .padding(.vertical, density.controlRowPadding)
                    }
                }
            }
        }
        .cardSurface()
    }
}

import Foundation
import Darwin

/// Private JSON-lines protocol for the bundled Tauri helper. Never exports auth stores or keys.
@MainActor
public final class DesktopBridge {
    private let defaults: UserDefaults
    private let registry: WidgetRegistry
    private let runtimes: [ProviderRuntime]
    private let accounts: ProviderAccountsStore
    private let enablement: ProviderEnablementStore
    private let layout: LayoutStore
    private let store: WidgetDataStore
    private let notes: SubscriptionNotesStore

    public init(defaults: UserDefaults) async {
        self.defaults = defaults
        // Only the private bundled helper sets this callback; notify its owning shell.
        let shellPID = getppid()
        if ProcessInfo.processInfo.environment["TOKENPLAN_DESKTOP_SHELL_PID"] == String(shellPID) {
            AppNotifications.shared.onActivate = { if shellPID > 1 && getppid() == shellPID { kill(shellPID, SIGUSR1) } }
        }
        let domain = ProcessInfo.processInfo.environment["TOKENPLAN_DEFAULTS_SUITE"] ?? "com.onevalar.tokenplan"
        let fresh = SettingsMigrator.isFreshInstall(defaults: defaults, domainName: domain)
        SettingsMigrator.migrate(defaults: defaults, domainName: domain)
        let assembly = await ProviderAccountAssembly.make(defaults: defaults, waitsForLoginShell: true)
        let accounts = ProviderAccountsStore(defaults: defaults)
        let enablement = ProviderEnablementStore(defaults: defaults)
        let runtimes = ProviderCatalog.make(defaults: defaults, claudeCards: assembly.claudeCards,
            codex: assembly.codex, claudeIdentityKeys: assembly.identityKeysByCard)
        if let seed = FirstRunSeeder.seedIfNeeded(isFreshInstall: fresh, providers: runtimes, enablement: enablement, onboarding: OnboardingStore(defaults: defaults)) { await seed.value }
        if let seed = NewProviderSeeder.reconcileIfNeeded(providers: runtimes, enablement: enablement) { await seed.value }
        let registry = WidgetRegistry.from(runtimes)
        let expand: ([String]) -> [String] = { DefaultLayout.expandingAccounts($0, providerIDs: registry.providers.map(\.id)) }
        let layout = LayoutStore(registry: registry, defaults: defaults,
            defaultMetricIDs: expand(DefaultLayout.metricIDs),
            defaultPinnedMetricIDs: expand(DefaultLayout.pinnedMetricIDs),
            defaultExpandedMetricIDs: expand(DefaultLayout.expandedMetricIDs),
            isProviderEnabled: { enablement.isEnabled($0) && !accounts.isRemoved($0) })
        layout.isProviderRemoved = { accounts.isRemoved($0) }
        self.runtimes = runtimes; self.registry = registry
        self.accounts = accounts; self.enablement = enablement; self.layout = layout
        self.notes = SubscriptionNotesStore(defaults: defaults)
        self.store = WidgetDataStore(registry: registry, providers: runtimes,
            cache: ProviderSnapshotCache(userDefaults: defaults, allowsPersistedFreshness: true),
            defaults: defaults, isProviderEnabled: { enablement.isEnabled($0) && !accounts.isRemoved($0) },
            providerIdentityKeys: assembly.identityKeysByCard)
    }

    public func execute(_ input: Data) async -> Data {
        do {
            guard input.count <= 65536,
                  let request = try JSONSerialization.jsonObject(with: input) as? [String: Any],
                  let method = request["method"] as? String else { throw Failure.invalid }
            let id = request["accountId"] as? String ?? ""
            let value = request["value"]
            if !["state", "refresh", "settings", "notificationPermission", "notify"].contains(method) {
                guard registry.provider(id: id) != nil, !accounts.isRemoved(id) else { throw Failure.invalid }
            }
            switch method {
            case "state": break
            case "notificationPermission":
                AppNotifications.shared.registerAsDelegate()
                let status = await AppNotifications.shared.authorizationStatus()
                if status == .denied { throw Failure.notification }
                if ![.authorized, .provisional].contains(status) {
                    guard await AppNotifications.shared.requestAuthorization().value else { throw Failure.notification }
                }
            case "notify":
                guard let fields = value as? [String: String],
                      let title = fields["title"], let body = fields["body"],
                      title.count < 500, body.count < 2000 else { throw Failure.invalid }
                AppNotifications.shared.registerAsDelegate()
                guard await AppNotifications.shared.post(idPrefix: "desktop", title: title, subtitle: "", body: body) else { throw Failure.notification }
            case "refresh":
                if id.isEmpty { await store.refreshAll(force: false) }
                else {
                    guard registry.provider(id: id) != nil, enablement.isEnabled(id), !accounts.isRemoved(id) else { throw Failure.invalid }
                    _ = await store.refresh(providerID: id, force: false)
                }
                await PersistentJSONLScanCaches.flushPendingWrites()
            case "enabled":
                guard let enabled = value as? Bool else { throw Failure.invalid }
                enablement.setEnabled(enabled, for: id)
            case "remove":
                guard accounts.records.contains(where: { $0.id == id }) else { throw Failure.invalid }
                accounts.remove(id); enablement.setEnabled(false, for: id)
            case "tray":
                guard let enabled = value as? Bool else { throw Failure.invalid }
                layout.setMenuBarEntrySelected(enabled, for: id)
            case "note":
                guard let note = value as? String, note.count <= 2000 else { throw Failure.invalid }
                notes.setNote(note, for: id)
            case "move":
                guard let offset = value as? Int, abs(offset) == 1 else { throw Failure.invalid }
                var order = registry.orderedProviderIDs(savedOrder: layout.providerOrder)
                guard let index = order.firstIndex(of: id), order.indices.contains(index + offset) else { break }
                order.swapAt(index, index + offset); layout.providerOrder = order; layout.persistProviderOrder()
            case "metric":
                guard let metricID = request["metricId"] as? String,
                      registry.descriptor(id: metricID)?.providerID == id,
                      let options = value as? [String: Any] else { throw Failure.invalid }
                if let placement = options["placement"] as? String {
                    guard ["home", "details", "hidden"].contains(placement) else { throw Failure.invalid }
                    layout.setMetricEnabled(metricID, placement != "hidden")
                    if placement == "details" { layout.expandedMetricIDs.insert(metricID) }
                    else { layout.expandedMetricIDs.remove(metricID) }
                    layout.persistExpanded()
                }
                if let pinned = options["pinned"] as? Bool {
                    guard !pinned || layout.canPin(metricID) || layout.isPinned(metricID) else { throw Failure.pinLimit }
                    layout.setPinned(pinned, for: metricID)
                }
            case "key":
                guard let provider = runtimes.first(where: { $0.provider.id == id }) as? any APIKeyManaging,
                      let key = value as? String, key.utf8.count <= 8192 else { throw Failure.invalid }
                if key.isEmpty { try provider.deleteAPIKey() } else { try provider.saveAPIKey(key) }
            case "settings":
                guard let settings = value as? [String: Any] else { throw Failure.invalid }
                if let flags = settings["notifications"] as? [Bool], flags.count == 3 {
                    for (key, flag) in zip(["underTenPercent", "healthyToClose", "closeToRunningOut"], flags) { defaults.set(flag, forKey: "tokenplan.notifications.\(key)") }
                }
                if let shortcut = settings["shortcut"] as? String, shortcut.count <= 100 { defaults.set(shortcut, forKey: "tokenplan.desktop.shortcut") }
                if let remaining = settings["showRemaining"] as? Bool { store.meterStyle = remaining ? .remaining : .used }
                if let style = settings["trayStyle"] as? String {
                    guard let parsed = MenuBarStyle(rawValue: style) else { throw Failure.invalid }
                    layout.menuBarStyle = parsed
                }
                if let language = settings["language"] as? String {
                    guard LanguageSetting(rawValue: language) != nil else { throw Failure.invalid }
                    defaults.set(language, forKey: LanguageSetting.key)
                }
                if let appearance = settings["appearance"] as? String {
                    guard AppearanceSetting(rawValue: appearance) != nil else { throw Failure.invalid }
                    defaults.set(appearance, forKey: AppearanceSetting.key)
                }
                if let minutes = settings["refreshMinutes"] as? Int {
                    guard RefreshSetting.options.contains(minutes) else { throw Failure.invalid }
                    RefreshSetting.setMinutes(minutes, defaults: defaults)
                }
                if let automatic = settings["autoUpdates"] as? Bool { defaults.set(automatic, forKey: "SUAutomaticallyCheckForUpdates") }
                if let automatic = settings["autoRefresh"] as? Bool { defaults.set(automatic, forKey: "tokenplan.desktop.autoRefresh") }
            default: throw Failure.invalid
            }
            return try JSONSerialization.data(withJSONObject: ["ok": true, "state": snapshot()])
        } catch {
            AppLog.warn(.config, "Desktop bridge request failed: \(type(of: error))")
            let code = (error as? Failure) == .pinLimit ? "pin_limit" : (error as? Failure) == .notification ? "notification_failed" : "request_failed"
            return (try? JSONSerialization.data(withJSONObject: ["ok": false, "error": code])) ?? Data()
        }
    }

    private enum Failure: Error { case invalid, pinLimit, notification }

    private func snapshot() -> [String: Any] {
        let entries: [[String: Any]] = registry.orderedProviderIDs(savedOrder: layout.providerOrder).compactMap { id in
            guard let provider = registry.provider(id: id), !accounts.isRemoved(id) else { return nil }
            let snapshot = store.snapshots[id]
            let history = snapshot?.usageHistory?.series.daily.map { entry in
                ["date": entry.date, "tokens": entry.totalTokens, "cost": entry.costUSD as Any? ?? NSNull(),
                 "models": (snapshot?.usageHistory?.modelUsage?.daily.first { day in day.date == entry.date }?.models ?? []).map { model in
                     ["model": model.model, "tokens": model.totalTokens, "cost": model.costUSD as Any? ?? NSNull(),
                      "variants": (model.variants ?? []).map { ["model": $0.model, "tokens": $0.totalTokens, "cost": $0.costUSD as Any? ?? NSNull()] as [String: Any] }] as [String: Any]
                 }] as [String: Any]
            } ?? []
            let metrics = layout.orderedSupportedMetrics(for: id).map { descriptor -> [String: Any] in
                let data = store.data(for: descriptor)
                var metric: [String: Any] = [
                    "id": descriptor.id, "label": descriptor.metricLabel,
                    "placement": !layout.isMetricEnabled(descriptor.id) ? "hidden" : layout.expandedMetricIDs.contains(descriptor.id) ? "details" : "home",
                    "pinned": layout.isPinned(descriptor.id), "pinnable": descriptor.pinnable,
                    "hasData": data.hasData, "unit": data.kind.rawValue,
                    "percent": NSNull(), "amount": NSNull(), "resetsAt": NSNull(), "periodSeconds": NSNull(),
                    "notStarted": data.hasData && data.isFreshSessionWindow(),
                    "expiries": data.expiriesAt.map { OpenUsageISO8601.string(from: $0) },
                    "chart": data.chartPoints.map { ["label": $0.label, "value": $0.value] as [String: Any] },
                    "values": data.selectedValues.map { ["amount": $0.number, "unit": $0.kind.rawValue, "label": $0.label ?? ""] as [String: Any] }
                ]
                if data.hasData {
                    if let limit = data.limit, limit > 0 { metric["percent"] = data.displayedValue / limit * 100 }
                    else { metric["amount"] = data.used }
                    metric["resetsAt"] = data.resetsAt.map { OpenUsageISO8601.string(from: $0) } as Any? ?? NSNull()
                    metric["periodSeconds"] = data.periodDurationMs.map { Double($0) / 1000 } as Any? ?? NSNull()
                }
                return metric
            }
            return [
                "id": id, "family": ProviderAccountID.family(of: id),
                "name": ProviderAccountID.family(of: id) == "claude" ? "Claude" : ProviderAccountID.family(of: id) == "codex" ? "Codex" : provider.displayName,
                "email": snapshot?.accountEmail ?? store.accountLabel(for: provider) ?? "",
                "plan": snapshot?.plan ?? "", "enabled": enablement.isEnabled(id),
                "tray": layout.isMenuBarAccountVisible(id) && layout.isMenuBarServiceVisible(id),
                "removable": accounts.records.contains { $0.id == id }, "apiKey": runtimes.first { $0.provider.id == id } is any APIKeyManaging,
                "note": notes.note(for: id), "metrics": metrics, "history": history,
                "historyScope": "account", "historyPartial": !(snapshot?.usageHistory?.unknownModelsByDay.isEmpty ?? true),
                "error": store.errorMessage(for: id) ?? store.warningMessage(for: id) ?? "",
                "fetchedAt": snapshot.map { OpenUsageISO8601.string(from: $0.refreshedAt) } ?? ""
            ]
        }
        return ["schema": "tokenplan.desktop.v1", "accounts": entries, "settings": [
            "showRemaining": store.meterStyle == .remaining,
            "notifications": ["underTenPercent", "healthyToClose", "closeToRunningOut"].map { defaults.bool(forKey: "tokenplan.notifications.\($0)") },
            "shortcut": DesktopShortcutMigration.read(defaults: defaults),
            "locale": Locale.current.identifier,
            "appearance": defaults.string(forKey: AppearanceSetting.key) ?? "system",
            "language": defaults.string(forKey: LanguageSetting.key) ?? "system",
            "trayStyle": layout.menuBarStyle.rawValue,
            "refreshMinutes": RefreshSetting.minutes(defaults: defaults),
            "autoUpdates": defaults.object(forKey: "SUAutomaticallyCheckForUpdates") as? Bool ?? true,
            "autoRefresh": defaults.object(forKey: "tokenplan.desktop.autoRefresh") as? Bool ?? true
        ]]
    }
}

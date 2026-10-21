import Foundation

/// Account membership is durable; the current ability to read a login is not membership.
@MainActor
enum SavedAccountProjection {
    // Keep descriptor metadata while credentials are unavailable, so layout loading does not
    // prune saved pins/placements. These templates are never included in refresh runtimes.
    static func retainingRecords(in registry: WidgetRegistry, records: [ProviderAccountRecord]) -> WidgetRegistry {
        var providers = registry.providers
        var descriptors = registry.descriptors
        for record in records where !record.removedTombstone && registry.provider(id: record.id) == nil {
            let template: ProviderRuntime
            if record.family == "claude" {
                template = ClaudeProvider(provider: ClaudeProvider.makeProvider(id: record.id, displayName: "Claude", accountLabel: record.label))
            } else if record.family == "codex" {
                template = CodexProvider(provider: CodexProvider.makeProvider(id: record.id, displayName: "Codex"))
            } else { continue }
            providers.append(template.provider)
            descriptors.append(contentsOf: template.widgetDescriptors)
        }
        return WidgetRegistry(providers: providers, descriptors: descriptors)
    }

    static func orderedIDs(runtimeIDs: [String], records: [ProviderAccountRecord], order: [String]) -> [String] {
        var ids = runtimeIDs
        for record in records where !record.removedTombstone && !ids.contains(record.id) { ids.append(record.id) }
        ids.removeAll { id in records.contains { $0.id == id && $0.removedTombstone } }
        let ordered = order.filter { ids.contains($0) }
        return ordered + ids.filter { !ordered.contains($0) }
    }

    static func placeholder(record: ProviderAccountRecord, enabled: Bool, tray: Bool, note: String, differentAccount: Bool = false) -> [String: Any] {
        ["id": record.id, "family": record.family, "name": record.family == "claude" ? "Claude" : "Codex",
         "email": ProviderAccountAssembly.accountEmail(from: record.label) ?? record.label ?? "",
         "plan": "", "enabled": enabled, "tray": tray, "removable": true, "apiKey": false,
         "note": note, "metrics": [[String: Any]](), "history": [[String: Any]](),
         "historyScope": "account", "historyPartial": false,
         "connection": differentAccount ? "different_account" : "unverified",
         "error": differentAccount ? "Another account is currently connected. This saved account is kept; connect its configuration directory or sign in to it." : "Account kept. Its login could not be identified. Check the configuration directory and access permissions, then detect again.", "fetchedAt": ""]
    }
}

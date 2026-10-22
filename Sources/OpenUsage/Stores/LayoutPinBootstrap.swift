import Foundation

/// Seed once per account, not once per installation. An existing empty selection is intentional
/// unless we can establish that the account is new; never guess intent from the number of pins.
@MainActor
enum LayoutPinBootstrap {
    static func load(registry: WidgetRegistry, persistence: LayoutPersistence, defaultPins: [String]) -> Set<String> {
        let currentProviders = Set(registry.providers.map(\.id))
        let saved = persistence.loadPins()
        var known: Set<String>
        if let initialized = persistence.loadPinProviders() {
            known = Set(initialized)
        } else if saved != nil {
            let previousMetrics = (persistence.loadPlaced() ?? []).map(\.descriptorID)
                + (persistence.loadSeededDefaults() ?? []) + (saved ?? [])
            known = Set(persistence.loadProviderOrder() ?? [])
            known.formUnion(previousMetrics.compactMap { registry.descriptor(id: $0)?.providerID })
            // A legacy pins-only empty preference cannot reveal which accounts were customized.
            if known.isEmpty { known = currentProviders }
        } else {
            known = []
        }
        var pins = Set(saved ?? defaultPins)
        let newProviders = currentProviders.subtracting(known)
        for id in defaultPins {
            if let descriptor = registry.descriptor(id: id), descriptor.pinnable,
               newProviders.contains(descriptor.providerID) { pins.insert(id) }
        }
        if saved == nil || pins != Set(saved ?? []) { persistence.savePins(pins) }
        // Retain absent accounts in the marker so reconnecting does not undo an explicit unpin.
        persistence.savePinProviders(known.union(currentProviders))
        return pins.filter { registry.descriptor(id: $0) != nil }
    }
}

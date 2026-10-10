import Foundation
import Observation

/// App-only notes, separate from provider logins and aliases managed by external tools.
@MainActor
@Observable
final class SubscriptionNotesStore {
    private let defaults: UserDefaults
    private var notes: [String: String]
    private var visible: Set<String>
    private static let notesKey = "tokenplan.subscriptionNotes"
    private static let visibleKey = "tokenplan.visibleSubscriptionNotes"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        notes = defaults.dictionary(forKey: Self.notesKey) as? [String: String] ?? [:]
        visible = Set(defaults.stringArray(forKey: Self.visibleKey) ?? [])
    }

    func note(for id: String) -> String { notes[id] ?? "" }
    func showsNote(for id: String) -> Bool { visible.contains(id) }
    func overviewNote(for id: String) -> String? {
        let note = note(for: id).trimmingCharacters(in: .whitespacesAndNewlines)
        return showsNote(for: id) && !note.isEmpty ? note : nil
    }

    func setNote(_ note: String, for id: String) {
        notes[id] = note.isEmpty ? nil : note
        defaults.set(notes, forKey: Self.notesKey)
    }

    func setShowsNote(_ show: Bool, for id: String) {
        if show { visible.insert(id) } else { visible.remove(id) }
        defaults.set(Array(visible).sorted(), forKey: Self.visibleKey)
    }
}

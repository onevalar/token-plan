import Foundation

/// Retains attribution when reading history synced from older app versions.
enum LegacyPricingEstimateNote {
    static func title(for model: String) -> String {
        model.split(separator: "-").map { part in
            switch part {
            case "gpt": "GPT"
            case "o1", "o3", "o4": String(part)
            default: part.prefix(1).uppercased() + part.dropFirst()
            }
        }.joined(separator: " ")
    }

    static func sourceNote(_ note: String, modelsByDay: [String: Set<String>]?, days: Set<String>) -> String {
        let models = days.reduce(into: Set<String>()) { $0.formUnion(modelsByDay?[$1] ?? []) }
        guard !models.isEmpty else { return note }
        let names = models.sorted().map { title(for: $0) }.joined(separator: ", ")
        return "\(note) · Fallback estimates: \(names)"
    }
}

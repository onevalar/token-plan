import Foundation

enum AccountDirectoryRegistry {
    static func paths(family: String, files: TextFileAccessing, home: URL) -> [String] {
        do {
            guard let text = try files.readTextIfPresent(home.appendingPathComponent(".tokenplan-account-directories.json").path) else { return [] }
            guard text.utf8.count <= 1_048_576,
                  let values = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: [String]] else {
                AppLog.warn(.config, "Account directory registry is invalid")
                return []
            }
            return Array((values[family] ?? []).filter { $0.hasPrefix("/") }.prefix(64))
        } catch {
            AppLog.warn(.config, "Account directory registry could not be read")
            return []
        }
    }
}

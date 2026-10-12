import Foundation

/// Overrides only the selected Claude home; never executes terminal aliases.
struct ClaudeHomeEnvironment: EnvironmentReading {
    var directory: String?
    var base: EnvironmentReading = ProcessEnvironmentReader()

    func value(for name: String) -> String? {
        name == "CLAUDE_CONFIG_DIR" ? directory ?? base.value(for: name) : base.value(for: name)
    }
}

enum ClaudeHomeDiscovery {
    struct Home {
        let directory: String
        let identity: String
        let label: String?
    }

    static func listDirectories(_ home: URL) -> [String] {
        let urls = (try? FileManager.default.contentsOfDirectory(
            at: home, includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey]
        )) ?? []
        return urls.compactMap { url in
            guard url.lastPathComponent.hasPrefix(".claude-"),
                  let values = try? url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey]),
                  values.isDirectory == true, values.isSymbolicLink != true else { return nil }
            return url.path
        }.sorted()
    }

    static func discover(
        observer: DefaultAccountObserver,
        listDirectories: @Sendable (URL) -> [String]
    ) -> [Home] {
        listDirectories(observer.homeDirectory()).sorted().compactMap { directory in
            let scoped = DefaultAccountObserver(
                environment: ClaudeHomeEnvironment(directory: directory, base: observer.environment),
                files: observer.files, keychain: observer.keychain, homeDirectory: observer.homeDirectory
            )
            guard case let .resolved(identity, label, anchor) = scoped.observeClaude() else { return nil }
            return Home(directory: anchor, identity: identity, label: label)
        }
    }
}

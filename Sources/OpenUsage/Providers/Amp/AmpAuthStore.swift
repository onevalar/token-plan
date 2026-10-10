import Foundation

/// Uses Amp's existing login; never writes secrets, logs a key, or switches CLI accounts.
struct AmpAuthStore: Sendable {
    struct Connection: Sendable {
        let executable: String
        let environment: [String: String]
    }

    var files: any TextFileAccessing = LocalTextFileAccessor()
    var environment: any EnvironmentReading = ProcessEnvironmentReader()
    var homeDirectory: @Sendable () -> URL = { FileManager.default.homeDirectoryForCurrentUser }
    var isExecutable: @Sendable (String) -> Bool = { FileManager.default.isExecutableFile(atPath: $0) }

    /// The same local-only loader serves refresh and automatic provider detection. Finding the CLI
    /// alone is not a login. The documented secrets file is read only for the current server's key;
    /// Amp itself still owns authentication when the usage command runs.
    func loadConnection() throws -> Connection? {
        let home = homeDirectory().path
        let path = environment.value(for: "PATH") ?? ""
        let candidates = path.split(separator: ":").filter { $0.hasPrefix("/") }.map { "\($0)/amp" }
            + ["\(home)/.amp/bin/amp", "\(home)/.local/bin/amp", "/opt/homebrew/bin/amp", "/usr/local/bin/amp"]
        guard let executable = candidates.first(where: isExecutable) else { throw AmpUsageError.cliMissing }

        var childEnvironment = ["NO_COLOR": "1", "TERM": "dumb"]
        if !path.isEmpty { childEnvironment["PATH"] = path }
        if let value = environment.value(for: "XDG_DATA_HOME") { childEnvironment["XDG_DATA_HOME"] = value }
        if let value = environment.value(for: "XDG_CONFIG_HOME") { childEnvironment["XDG_CONFIG_HOME"] = value }
        let configHome = environment.value(for: "XDG_CONFIG_HOME")?.nilIfEmpty ?? "\(home)/.config"
        let configuredServer: String?
        do {
            if let text = try files.readTextIfPresent("\(configHome)/amp/settings.json") {
                guard let settings = ProviderParse.jsonObject(Data(text.utf8)) else {
                    throw AmpUsageError.credentialsUnreadable
                }
                configuredServer = settings["amp.url"] as? String
            } else {
                configuredServer = nil
            }
        } catch {
            throw AmpUsageError.credentialsUnreadable
        }
        let server = environment.value(for: "AMP_URL")?.trimmingCharacters(in: .whitespacesAndNewlines)
            .nilIfEmpty ?? configuredServer?.nilIfEmpty ?? "https://ampcode.com/"
        childEnvironment["AMP_URL"] = server
        if let key = environment.value(for: "AMP_API_KEY")?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty {
            childEnvironment["AMP_API_KEY"] = key
            return Connection(executable: executable, environment: childEnvironment)
        }

        let dataHome = environment.value(for: "XDG_DATA_HOME")?.nilIfEmpty ?? "\(home)/.local/share"
        let text: String?
        do {
            text = try files.readTextIfPresent("\(dataHome)/amp/secrets.json")
        } catch {
            throw AmpUsageError.credentialsUnreadable
        }
        guard let text else { return nil }
        guard let object = ProviderParse.jsonObject(Data(text.utf8)) else {
            throw AmpUsageError.credentialsUnreadable
        }
        // Amp versions have saved both spellings of the root URL. Only that slash is equivalent:
        // do not pick a key for another host, scheme, port, path or query.
        var servers = [server]
        if var components = URLComponents(string: server), components.host != nil,
           components.path.isEmpty || components.path == "/" {
            components.path = components.path.isEmpty ? "/" : ""
            if let alternate = components.string { servers.append(alternate) }
        }
        guard servers.contains(where: {
            guard let key = object["apiKey@\($0)"] as? String else { return false }
            return !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }) else { return nil }
        return Connection(executable: executable, environment: childEnvironment)
    }
}

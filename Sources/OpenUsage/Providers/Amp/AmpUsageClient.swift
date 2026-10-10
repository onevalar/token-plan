import Foundation

struct AmpUsageClient: Sendable {
    var runner: any ProcessRunning = SystemProcessRunner()

    func fetchUsage(connection: AmpAuthStore.Connection) throws -> String {
        let result: ProcessResult
        do {
            result = try runner.run(
                executable: connection.executable,
                arguments: ["usage"],
                environment: connection.environment,
                timeout: 20
            )
        } catch is ProcessRunnerError {
            throw AmpUsageError.timedOut
        } catch {
            throw AmpUsageError.commandFailed
        }
        guard result.succeeded else {
            // Never return raw CLI output: even a failed command can include login identities.
            let output = (result.stderr + result.stdout).lowercased()
            if output.contains("not logged in") || output.contains("amp login") || output.contains("unauthorized") {
                throw AmpUsageError.notLoggedIn
            }
            throw AmpUsageError.commandFailed
        }
        return result.stdout
    }
}

enum AmpUsageError: Error, LocalizedError {
    case cliMissing, notLoggedIn, credentialsUnreadable, commandFailed, timedOut, invalidResponse

    var errorDescription: String? {
        switch self {
        case .cliMissing: tr("Amp CLI not found. Install Amp and run amp login in Terminal.")
        case .notLoggedIn: tr("Amp is not logged in. Run amp login in Terminal, then refresh.")
        case .credentialsUnreadable: tr("Couldn't read Amp's saved login. Check its file permissions or log in to Amp again.")
        case .commandFailed: tr("Amp usage failed. Run amp usage in Terminal to check your connection.")
        case .timedOut: tr("Amp usage timed out. Check your connection and refresh.")
        case .invalidResponse: tr("Couldn't read Amp usage. Check amp usage in Terminal or update the Amp CLI.")
        }
    }
}

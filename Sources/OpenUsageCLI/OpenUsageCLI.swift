import Darwin
import Foundation
import OpenUsage

@main
struct OpenUsageCLI {
    static func main() async {
        do {
            if CommandLine.arguments.dropFirst().elementsEqual(["--desktop-bridge"]) {
                // UI translations belong to the shared frontend; this override is process-only.
                UserDefaults.standard.setVolatileDomain(["AppleLanguages": ["en"]], forName: UserDefaults.argumentDomain)
                let suite = ProcessInfo.processInfo.environment["TOKENPLAN_DEFAULTS_SUITE"] ?? "com.onevalar.tokenplan"
                guard let defaults = UserDefaults(suiteName: suite) else { throw CLIError.appDefaultsUnavailable }
                var bridge = await DesktopBridge(defaults: defaults)
                while let line = await Task.detached(priority: .utility, operation: { readLine() }).value {
                    // Discovery rebuilds the registry only on explicit user request.
                    if let data = line.data(using: .utf8),
                       let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       object["method"] as? String == "discover" {
                        bridge = await DesktopBridge(defaults: defaults)
                        FileHandle.standardOutput.write(await bridge.execute(Data(#"{"method":"state"}"#.utf8)))
                    } else {
                        FileHandle.standardOutput.write(await bridge.execute(Data(line.utf8)))
                    }
                    FileHandle.standardOutput.write(Data("\n".utf8))
                }
                return
            }
            let arguments = try CLIArguments.parse(Array(CommandLine.arguments.dropFirst()))
            if arguments.showHelp {
                print(help)
                return
            }

            let app = AppBundleLocator.locate()
            if arguments.showVersion {
                print(app.version.map { "tokenplan \($0)" } ?? "tokenplan (development build)")
                return
            }

            guard let defaults = UserDefaults(suiteName: app.bundleIdentifier) else {
                throw CLIError.appDefaultsUnavailable
            }
            let result = try await UsageReader(userDefaults: defaults).read(
                providerID: arguments.providerID,
                force: arguments.force
            )
            FileHandle.standardOutput.write(result.data)
            FileHandle.standardOutput.write(Data("\n".utf8))
            if !result.warnings.isEmpty {
                result.warnings.forEach { writeError("warning: \($0)") }
                exit(4)
            }
        } catch CLIError.usage(let message) {
            fail("\(message)\nRun 'tokenplan --help' for usage.", code: 2)
        } catch CLIError.appDefaultsUnavailable {
            fail("Could not open the TokenPlan settings domain.", code: 4)
        } catch UsageReaderError.unknownProvider(let providerID) {
            fail("Unknown provider: \(providerID)", code: 2)
        } catch {
            fail(error.localizedDescription, code: 4)
        }
    }

    private static func writeError(_ message: String) {
        FileHandle.standardError.write(Data("tokenplan: \(message)\n".utf8))
    }

    private static func fail(_ message: String, code: Int32) -> Never {
        writeError(message)
        exit(code)
    }

    private static let help = """
    Usage: tokenplan [provider] [--force]

    Read limits through OpenUsage's shared five-minute cache and exit. Output is always JSON.

    Options:
      --force      Refresh even when the shared cache is still fresh
      -v, --version
      -h, --help
    """
}

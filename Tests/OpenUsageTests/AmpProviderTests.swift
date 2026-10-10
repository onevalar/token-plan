import XCTest
@testable import OpenUsage

@MainActor
final class AmpProviderTests: XCTestCase {
    func testRemainingQuotasAreInvertedOnceAcrossCLIVersions() async throws {
        let samples: [(String, Double, Double)] = [
            ("Subscription Megawatt: 82.5% other usage and 97.25% orb usage remaining - resets upon renewal in 1 month", 17.5, 2.75),
            ("**Amp Gigawatt Subscription:** 12% agent usage and 34% orb usage remaining", 88, 66),
            ("\u{1B}[32m**Amp Megawatt Tier:** agent usage $19.08 of $20 remaining (95%), orb usage 728.3h of 750h a1.small orb hours remaining (97%) - period 2026-08-24 to 2026-09-24\u{1B}[0m", 5, 3),
            ("**Amp Megawatt Tier:** agent usage $0 of $20 remaining (0%), orb usage 591.4h of 750h a1.small orb hours remaining (79%) - period 2026-10-01 to 2026-11-01, resets upon renewal in 21 days", 100, 21)
        ]
        for (line, agentUsed, orbUsed) in samples {
            let provider = makeProvider(output: line + "\n**Individual credits:** $1,234.50 USD remaining")
            let detected = await provider.hasLocalCredentials()
            XCTAssertTrue(detected)
            let snapshot = await provider.refresh()
            XCTAssertNil(snapshot.errorCategory)
            XCTAssertNil(snapshot.warning)
            XCTAssertFalse(try XCTUnwrap(snapshot.plan).contains("Subscription"))
            for (label, expected) in [("Agent Usage", agentUsed), ("Orb Usage", orbUsed)] {
                guard case let .progress(_, used, limit, format, reset, duration, _) = snapshot.line(label: label) else {
                    return XCTFail("Missing \(label)")
                }
                XCTAssertEqual(used, expected, accuracy: 0.0001)
                XCTAssertEqual(limit, 100)
                XCTAssertEqual(format, .percent)
                XCTAssertNil(reset, "Date-only periods and renewal prose must not invent reset instants")
                XCTAssertNil(duration)
            }
            guard case let .values(_, values, _, _, _, _) = snapshot.line(label: "Balance") else {
                return XCTFail("Missing real balance")
            }
            XCTAssertEqual(values, [MetricValue(number: 1234.5, kind: .dollars)])
        }
    }

    func testOnlyExplicitResetTimestampCreatesCountdown() async {
        let snapshot = await makeProvider(output:
            "Amp Megawatt Tier: 31% agent usage and 9% orb usage remaining - resets at 2026-10-23T11:35:00+08:00"
        ).refresh()
        guard case let .progress(_, _, _, _, reset, _, _) = snapshot.line(label: "Agent Usage") else {
            return XCTFail("Missing quota")
        }
        XCTAssertEqual(reset, Date(timeIntervalSince1970: 1792726500))
    }

    func testInvalidReportedQuotaOrBalanceFailsWithoutFabricatingReadings() async {
        for output in [
            "Subscription Megawatt: 101% agent usage and 50% orb usage remaining",
            "Subscription Megawatt: 50% agent usage and -1% orb usage remaining",
            "Subscription Megawatt: NaN% agent usage and 50% orb usage remaining\nIndividual credits: $4 remaining",
            "Subscription Megawatt: 5% agent usage and 95% orb usage remaining\nIndividual credits: $bad remaining",
            "Signed in as synthetic@example.test", ""
        ] {
            let snapshot = await makeProvider(output: output).refresh()
            XCTAssertEqual(snapshot.errorCategory, .decoding)
            XCTAssertNil(snapshot.line(label: "Agent Usage"))
            XCTAssertNil(snapshot.line(label: "Balance"))
        }
    }

    func testBalanceOnlyAccountShowsBalanceAndExplainsMissingSubscription() async {
        let snapshot = await makeProvider(output: "Amp Free: 50% remaining today\nIndividual credits: $0 remaining").refresh()
        XCTAssertNil(snapshot.errorCategory)
        XCTAssertNotNil(snapshot.warning)
        XCTAssertNil(snapshot.line(label: "Agent Usage"))
        guard case let .values(_, values, _, _, _, _) = snapshot.line(label: "Balance") else {
            return XCTFail("Zero is a real balance, not missing data")
        }
        XCTAssertEqual(values.first?.number, 0)
    }

    func testCreditBalanceKeepsCentsAndMissingIsNotZeroInEitherDisplayMode() async throws {
        for (reported, expected) in [("", "—"), ("0", "$0.00"), ("5.79", "$5.79"), ("1,234.56", "$1,234.56")] {
            let provider = makeProvider(output: "Amp Megawatt Tier: 0% agent usage and 79% orb usage remaining"
                + (reported.isEmpty ? "" : "\nIndividual credits: $\(reported) remaining"))
            let descriptors = provider.widgetDescriptors
            let descriptor = try XCTUnwrap(descriptors.first { $0.id == "amp.balance" })
            let suite = "AmpProviderTests.Balance.\(UUID().uuidString)"
            let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
            defer { defaults.removePersistentDomain(forName: suite) }
            let store = WidgetDataStore(registry: WidgetRegistry(providers: [provider.provider], descriptors: descriptors),
                                       providers: [provider], cache: ProviderSnapshotCache(userDefaults: defaults), defaults: defaults)
            await store.refreshAll()
            for mode in WidgetDisplayMode.allCases {
                store.meterStyle = mode
                let balance = store.data(for: descriptor)
                XCTAssertEqual(balance.valueText, expected)
                XCTAssertEqual(balance.hasData, !reported.isEmpty)
                XCTAssertNil(balance.limit, "Individual credits are not a subscription allowance")
                XCTAssertNil(balance.resetsAt)
            }
        }
    }

    func testLocalDetectionRequiresCurrentServerLoginOrEnvironmentOverride() async {
        let home = URL(fileURLWithPath: "/synthetic-home")
        let files = FakeFiles(["\(home.path)/.local/share/amp/secrets.json": #"{"apiKey@https://another.example":"synthetic-token"}"#])
        let store = AmpAuthStore(files: files, environment: FakeEnvironment(), homeDirectory: { home },
                                 isExecutable: { $0 == "/synthetic-home/.amp/bin/amp" })
        let provider = AmpProvider(authStore: store)
        let otherServerDetected = await provider.hasLocalCredentials()
        XCTAssertFalse(otherServerDetected, "Another server's login must not enable this server")
        let absent = await provider.refresh()
        XCTAssertEqual(absent.errorCategory, .notLoggedIn)

        for (server, expected) in [
            ("https://ampcode.com", true), ("https://ampcode.com/", true),
            ("http://ampcode.com/", false), ("https://ampcode.com:8443/", false),
            ("https://ampcode.com/private", false), ("https://ampcode.com/?other=1", false)
        ] {
            files.files["\(home.path)/.local/share/amp/secrets.json"] =
                "{\"apiKey@\(server)\":\"synthetic-token\"}"
            let detected = await provider.hasLocalCredentials()
            XCTAssertEqual(detected, expected, "Only the public server's root slash is equivalent")
        }

        var override = store
        override.environment = FakeEnvironment(["AMP_API_KEY": "synthetic-override", "PATH": "/synthetic-bin"])
        override.isExecutable = { $0 == "/synthetic-bin/amp" }
        let connection = try? override.loadConnection()
        XCTAssertEqual(connection?.executable, "/synthetic-bin/amp")
        XCTAssertEqual(connection?.environment["AMP_API_KEY"], "synthetic-override")
        XCTAssertEqual(files.files.count, 1, "Detection never writes credentials")

        files.files["\(home.path)/.local/share/amp/secrets.json"] = "broken JSON"
        let damaged = await provider.refresh()
        XCTAssertEqual(damaged.errorCategory, .credentialAccess)
    }

    func testConfiguredServerAndXDGLoginUseTheSameNamespaceAsTheCLI() async {
        let files = FakeFiles([
            "/custom-config/amp/settings.json": #"{"amp.url":"https://private.example/"}"#,
            "/custom-data/amp/secrets.json": #"{"apiKey@https://private.example":"synthetic-token"}"#
        ])
        let auth = AmpAuthStore(files: files, environment: FakeEnvironment([
            "XDG_CONFIG_HOME": "/custom-config", "XDG_DATA_HOME": "/custom-data"
        ]), homeDirectory: { URL(fileURLWithPath: "/synthetic-home") }, isExecutable: { $0.hasSuffix("/.amp/bin/amp") })
        let provider = AmpProvider(authStore: auth, usageClient: AmpUsageClient(runner: UsageRunner(
            result: ProcessResult(exitCode: 0, stdout: "Subscription Megawatt: 31% agent usage and 9% orb usage remaining", stderr: "")
        )))
        let detected = await provider.hasLocalCredentials()
        XCTAssertTrue(detected)
        let snapshot = await provider.refresh()
        XCTAssertNil(snapshot.errorCategory)
        XCTAssertNil(snapshot.line(label: "Balance"), "Unreported balance is not zero")

        var publicServer = auth
        publicServer.environment = FakeEnvironment([
            "XDG_CONFIG_HOME": "/custom-config", "XDG_DATA_HOME": "/custom-data", "AMP_URL": "https://ampcode.com/"
        ])
        let other = AmpProvider(authStore: publicServer)
        let incorrectlyDetected = await other.hasLocalCredentials()
        XCTAssertFalse(incorrectlyDetected, "AMP_URL overrides settings; private-server credentials cannot enable public Amp")
    }

    func testCLIFailuresNeverExposeRawIdentityOrCredentialText() async {
        let identity = "private-person@example.test"
        let provider = makeProvider(output: "", result: ProcessResult(
            exitCode: 1, stdout: identity, stderr: "Unauthorized. Run amp login. synthetic-secret"
        ))
        let snapshot = await provider.refresh()
        XCTAssertEqual(snapshot.errorCategory, .notLoggedIn)
        guard case let .badge(_, text, _, _) = snapshot.lines.first else { return XCTFail("Missing friendly error") }
        XCTAssertFalse(text.contains(identity))
        XCTAssertFalse(text.contains("synthetic-secret"))
    }

    private func makeProvider(output: String, result: ProcessResult? = nil) -> AmpProvider {
        let auth = AmpAuthStore(files: FakeFiles(), environment: FakeEnvironment(["AMP_API_KEY": "synthetic-token"]),
                                homeDirectory: { URL(fileURLWithPath: "/synthetic-home") },
                                isExecutable: { $0 == "/synthetic-home/.amp/bin/amp" })
        return AmpProvider(authStore: auth, usageClient: AmpUsageClient(runner: UsageRunner(
            result: result ?? ProcessResult(exitCode: 0, stdout: output, stderr: "")
        )))
    }
}

private struct UsageRunner: ProcessRunning {
    let result: ProcessResult
    func run(executable: String, arguments: [String], environment: [String: String], timeout: TimeInterval) throws -> ProcessResult {
        result
    }
}

import XCTest
@testable import OpenUsage

final class KeyBalanceMapperTests: XCTestCase {
    private func values(_ lines: [MetricLine], _ label: String) -> [MetricValue]? {
        for case .values(let name, let values, _, _, _, _) in lines where name == label { return values }
        return nil
    }

    func testDeepSeekMapsCNYBalance() throws {
        let body = Data(#"{"is_available":true,"balance_infos":[{"currency":"CNY","total_balance":"110.00","granted_balance":"10.00","topped_up_balance":"100.00"}]}"#.utf8)
        let lines = try XCTUnwrap(DeepSeekUsageMapper.map(body))
        XCTAssertEqual(values(lines, "Balance"), [MetricValue(number: 110, kind: .yuan)])
        XCTAssertEqual(values(lines, "Topped Up"), [MetricValue(number: 100, kind: .yuan)])
        XCTAssertEqual(values(lines, "Granted"), [MetricValue(number: 10, kind: .yuan)])
    }

    func testDeepSeekMapsUSDAndRejectsUnknownCurrency() throws {
        let usd = Data(#"{"balance_infos":[{"currency":"USD","total_balance":"3.5","granted_balance":"0","topped_up_balance":"3.5"}]}"#.utf8)
        XCTAssertEqual(values(try XCTUnwrap(DeepSeekUsageMapper.map(usd)), "Balance"), [MetricValue(number: 3.5, kind: .dollars)])
        let eur = Data(#"{"balance_infos":[{"currency":"EUR","total_balance":"3.5"}]}"#.utf8)
        XCTAssertNil(DeepSeekUsageMapper.map(eur))
        XCTAssertNil(DeepSeekUsageMapper.map(Data("{}".utf8)))
    }

    func testMoonshotMapsBalanceBreakdown() throws {
        let body = Data(#"{"code":0,"data":{"available_balance":49.58894,"voucher_balance":46.58893,"cash_balance":3.00001},"status":true}"#.utf8)
        let lines = try XCTUnwrap(MoonshotUsageMapper.map(body, kind: .yuan))
        XCTAssertEqual(values(lines, "Balance")?.first?.number ?? 0, 49.58894, accuracy: 1e-9)
        XCTAssertEqual(values(lines, "Cash")?.first?.kind, .yuan)
        XCTAssertEqual(values(lines, "Vouchers")?.first?.number ?? 0, 46.58893, accuracy: 1e-9)
        XCTAssertNil(MoonshotUsageMapper.map(Data(#"{"data":{}}"#.utf8), kind: .yuan))
    }

    func testSiliconFlowMapsTotalChargedAndGift() throws {
        let body = Data(#"{"code":20000,"status":true,"data":{"name":"x","email":"a@b.c","balance":"0.88","chargeBalance":"88.00","totalBalance":"88.88"}}"#.utf8)
        let lines = try XCTUnwrap(SiliconFlowUsageMapper.map(body))
        XCTAssertEqual(values(lines, "Balance"), [MetricValue(number: 88.88, kind: .yuan)])
        XCTAssertEqual(values(lines, "Topped Up"), [MetricValue(number: 88, kind: .yuan)])
        XCTAssertEqual(values(lines, "Gift"), [MetricValue(number: 0.88, kind: .yuan)])
        // The profile's name and email never reach a metric line.
        XCTAssertFalse("\(lines)".contains("a@b.c"))
    }

    func testMiniMaxTreatsUsageCountAsRemaining() throws {
        let now = Date(timeIntervalSince1970: 1_773_550_000)
        let body = Data(#"{"model_remains":[{"model_name":"MiniMax-M2.5","start_time":1773558000000,"end_time":1773576000000,"current_interval_total_count":1500,"current_interval_usage_count":1263}]}"#.utf8)
        let lines = try XCTUnwrap(MiniMaxUsageMapper.map(body, now: now))
        guard case .progress(let label, let used, let limit, _, let resetsAt, let period, _) = lines[0] else {
            return XCTFail("expected a progress line")
        }
        XCTAssertEqual(label, "Session")
        XCTAssertEqual(used, 15.8, accuracy: 0.01)
        XCTAssertEqual(limit, 100)
        XCTAssertEqual(resetsAt, Date(timeIntervalSince1970: 1_773_576_000))
        XCTAssertEqual(period, 18_000_000)
        XCTAssertNil(MiniMaxUsageMapper.map(Data(#"{"model_remains":[]}"#.utf8), now: now))
    }
}

final class YuanFormattingTests: XCTestCase {
    func testYuanFormatsWithSignAndTwoDecimals() {
        XCTAssertEqual(MetricFormatter.number(110, kind: .yuan, style: .row), "¥110.00")
        XCTAssertEqual(MetricFormatter.number(49.58894, kind: .yuan, style: .full), "¥49.59")
        XCTAssertEqual(MetricFormatter.number(130.4, kind: .yuan, style: .tray), "¥130")
        XCTAssertEqual(MetricFormatter.number(12_300, kind: .yuan, style: .row), "¥12.3K")
    }
}

final class KeyBalanceAuthTests: XCTestCase {
    func testSaveLoadAndEnvironmentPrecedence() throws {
        let files = FakeFiles()
        let store = KeyBalanceAuthStore(spec: DeepSeekProvider.spec, files: files,
                                        environment: FakeEnvironment(["DEEPSEEK_API_KEY": "sk-env"]))
        XCTAssertEqual(store.loadAPIKey(), "sk-env")
        XCTAssertEqual(store.keyStatus(), .fromEnvironment)
        try store.saveAPIKey("  sk-saved ")
        XCTAssertEqual(files.files["~/.config/tokenplan/deepseek.json"], #"{"apiKey":"sk-saved"}"#)
        XCTAssertEqual(store.loadAPIKey(), "sk-saved")
        XCTAssertEqual(store.keyStatus(), .overrideActive)
        XCTAssertThrowsError(try store.saveAPIKey(" ")) { error in
            guard case KeyBalanceError.missingKey = error else { return XCTFail("\(error)") }
        }
    }

    func testMissingKeyMessageNamesProviderAndSettingsAction() {
        let error = KeyBalanceAuthStore(spec: MoonshotProvider.spec, files: FakeFiles(), environment: FakeEnvironment()).missingKeyError
        let text = error.localizedDescription
        XCTAssertTrue(text.contains("Kimi"))
        XCTAssertEqual(text, ProviderUsageErrorText.missingAPIKey("Kimi"))
        XCTAssertEqual(error.errorCategory, .notLoggedIn)
    }
}

final class RefreshIntervalSettingTests: XCTestCase {
    private func defaults() -> UserDefaults {
        UserDefaults(suiteName: "TokenPlanTests.RefreshInterval.\(UUID().uuidString)")!
    }

    func testDefaultsToFiveMinutesAndRejectsUnknownValues() {
        let d = defaults()
        XCTAssertEqual(RefreshSetting.minutes(defaults: d), 5)
        d.set(7, forKey: RefreshSetting.key)
        XCTAssertEqual(RefreshSetting.minutes(defaults: d), 5)
    }

    func testSetPersistsAndPostsOnlyOnChange() {
        let d = defaults()
        let center = NotificationCenter()
        var posts = 0
        let token = center.addObserver(forName: RefreshSetting.didChangeNotification, object: nil, queue: nil) { _ in posts += 1 }
        defer { center.removeObserver(token) }
        RefreshSetting.setMinutes(15, defaults: d, center: center)
        RefreshSetting.setMinutes(15, defaults: d, center: center)
        RefreshSetting.setMinutes(3, defaults: d, center: center) // not an offered option
        XCTAssertEqual(RefreshSetting.minutes(defaults: d), 15)
        XCTAssertEqual(posts, 1)
    }
}

@MainActor
final class DeepSeekRefreshTests: XCTestCase {
    func testSavedKeyRefreshAndFailures() async throws {
        let http = FakeHTTPClient(response: HTTPResponse(statusCode: 200, headers: [:], body: Data(#"{"balance_infos":[{"currency":"CNY","total_balance":"110","granted_balance":"10","topped_up_balance":"100"}]}"#.utf8)))
        let provider = DeepSeekProvider(authStore: KeyBalanceAuthStore(spec: DeepSeekProvider.spec, files: FakeFiles(), environment: FakeEnvironment()), http: http)
        let missing = await provider.refresh()
        XCTAssertEqual(missing.errorCategory, .notLoggedIn)
        XCTAssertTrue(http.requests.isEmpty)
        try provider.saveAPIKey("fixture-key")
        let success = await provider.refresh()
        XCTAssertNil(success.errorCategory)
        XCTAssertEqual(success.lines.count, 3)
        XCTAssertEqual(http.requests.first?.url, DeepSeekProvider.balanceURL)
        XCTAssertEqual(http.requests.first?.headers["Authorization"], "Bearer fixture-key")
        http.response = HTTPResponse(statusCode: 401, headers: [:], body: Data())
        let invalid = await provider.refresh()
        XCTAssertEqual(invalid.errorCategory, .authInvalid)
        http.response = HTTPResponse(statusCode: 200, headers: [:], body: Data("{}".utf8))
        let malformed = await provider.refresh()
        XCTAssertEqual(malformed.errorCategory, .decoding)
    }
}

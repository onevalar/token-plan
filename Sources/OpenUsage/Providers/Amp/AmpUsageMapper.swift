import Foundation

/// Subscription patterns adapted from Rashun's AmpSource (MIT, © 2026 Alexander Heffernan).
/// The permission notice ships in Resources/LICENSE.txt. Unlike Rashun, no renewal is inferred.
enum AmpUsageMapper {
    struct Mapped: Sendable {
        let plan: String?
        let lines: [MetricLine]
        let warning: String?
    }

    static func map(_ output: String) throws -> Mapped {
        let plain = output.replacingOccurrences(of: #"\x1B\[[0-?]*[ -/]*[@-~]"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: "**", with: "")
        let subscription = plain.components(separatedBy: .newlines).first {
            $0.trimmingCharacters(in: .whitespaces).range(
                of: #"^(?:Subscription\s+[^:]+|Amp\s+[^:]+\s+(?:Subscription|Tier)):"#,
                options: [.regularExpression, .caseInsensitive]
            ) != nil
        }
        var lines: [MetricLine] = []
        var plan: String?
        if let subscription {
            let patterns = [
                #":\s*([\d.]+)%\s+(?:other|agent)\s+usage\s+and\s+([\d.]+)%\s+orb\s+usage\s+remaining\b"#,
                #":\s*agent\s+usage\s+[^\r\n]*?remaining\s*\(([\d.]+)%\),\s*orb\s+usage\s+[^\r\n]*?remaining\s*\(([\d.]+)%\)"#
            ]
            let percentages = patterns.compactMap { captures($0, in: subscription) }.first
            guard let percentages, percentages.count == 2,
                  let agent = Double(percentages[0]), let orb = Double(percentages[1]),
                  agent.isFinite, orb.isFinite, (0...100).contains(agent), (0...100).contains(orb)
            else { throw AmpUsageError.invalidResponse }

            // Date-only billing periods and "in 2 days" are not precise reset instants. Only an
            // explicit ISO timestamp can create a countdown; no monthly cadence is made up.
            let reset = captures(#"resets\s+at\s+(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))"#, in: subscription)
                .flatMap { OpenUsageISO8601.date(from: $0[0]) }
            lines = [
                .progress(label: "Agent Usage", used: 100 - agent, limit: 100, format: .percent, resetsAt: reset),
                .progress(label: "Orb Usage", used: 100 - orb, limit: 100, format: .percent, resetsAt: reset)
            ]
            let heading = String(subscription.split(separator: ":", maxSplits: 1)[0])
                .trimmingCharacters(in: .whitespaces)
            plan = heading.replacingOccurrences(of: #"^(?:Subscription\s+|Amp\s+)|\s+(?:Subscription|Tier)$"#,
                                                with: "", options: [.regularExpression, .caseInsensitive])
        }

        if let balanceLine = plain.components(separatedBy: .newlines).first(where: {
            $0.trimmingCharacters(in: .whitespaces).lowercased().hasPrefix("individual credits:")
        }) {
            guard let amounts = captures(#"Individual\s+credits:\s*\$([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s+USD)?\s+remaining\b"#, in: balanceLine),
                  let balance = Double(amounts[0].replacingOccurrences(of: ",", with: "")), balance.isFinite
            else { throw AmpUsageError.invalidResponse }
            lines.append(.values(label: "Balance", values: [MetricValue(number: balance, kind: .dollars)]))
        }
        guard !lines.isEmpty else { throw AmpUsageError.invalidResponse }
        return Mapped(plan: plan, lines: lines,
                      warning: subscription == nil ? tr("Amp CLI did not report subscription quotas. Only the credit balance is available.") : nil)
    }

    private static func captures(_ pattern: String, in text: String) -> [String]? {
        let regex = try! NSRegularExpression(pattern: pattern, options: .caseInsensitive)
        guard let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) else { return nil }
        return (1..<match.numberOfRanges).map { String(text[Range(match.range(at: $0), in: text)!]) }
    }
}

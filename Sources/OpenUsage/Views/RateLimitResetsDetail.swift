import SwiftUI

/// A read-only list shared by every provider: one aligned expiry date per credit, soonest first.
struct RateLimitResetsDetail: View {
    let count: Int
    let expiries: [Date]
    @AppStorage(DensitySetting.key) private var density = DensitySetting.regular

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            switch Self.content(count: count, expiries: expiries) {
            case .timeline(let entries):
                ForEach(entries, id: \.key) { entry in
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entries.count == 1 && count <= 1 ? tr("Expiry Date") : trf("Reset Credit %lld", entry.number))
                                .foregroundStyle(.secondary)
                            Text("Expired").font(.caption).foregroundStyle(.secondary)
                                .opacity(entry.expired ? 1 : 0).accessibilityHidden(!entry.expired)
                        }
                        Spacer(minLength: 0)
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(String(entry.time.prefix(10))).monospacedDigit()
                            Text(String(entry.time.suffix(5)) + " · " + tr("Local Time"))
                                .font(.caption).monospacedDigit().foregroundStyle(.secondary)
                        }
                    }
                    .font(.system(size: density.supportingPointSize))
                    .padding(.vertical, 4)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(entry.accessibilityLabel)
                }
                if count > entries.count {
                    Text(trf("%lld expiry times unavailable", count - entries.count))
                        .font(.caption).foregroundStyle(.secondary)
                }
            case .unknownExpiries:
                Text("Expiry times unavailable").font(.caption).foregroundStyle(.secondary)
            case .empty:
                Text("You have no rate limit resets").font(.caption).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// What the body renders, resolved once from the count and expiry list so the "empty vs. count-only
    /// vs. timeline" choice is unit-testable and can't drift between the view and its tests.
    enum Content: Equatable {
        case timeline([Entry])
        case unknownExpiries(count: Int)
        case empty
    }

    /// Empty `expiries` is ambiguous: a genuinely empty balance (`count == 0`) shows the empty state,
    /// but a positive `count` with no expiries means the dedicated expiry fetch was unavailable and the
    /// row fell back to the usage-body count — show that count rather than "no resets".
    static func content(count: Int, expiries: [Date], now: Date = Date()) -> Content {
        let entries = entries(from: expiries, now: now)
        if !entries.isEmpty { return .timeline(entries) }
        if count > 0 { return .unknownExpiries(count: count) }
        return .empty
    }

    /// One timeline node's display strings, derived from a credit's expiry instant. Pure and static so
    /// the phrasing is unit-testable without a view.
    struct Entry: Identifiable, Equatable {
        let id: Int          // 0-based row index (soonest first)
        let number: Int      // 1-based reset number, shown at the start of the row
        let date: Date       // the reported expiry instant
        let key: Key         // view identity: the expiry plus its ordinal among equal expiries
        let time: String       // numeric local expiry, e.g. "2026-10-23 11:35"
        let expired: Bool

        struct Key: Hashable {
            let date: Date
            let ordinal: Int
        }

        var accessibilityLabel: String {
            let identity = String(localized: "Reset \(number), \(time)")
            if expired { return identity + " · " + tr("Expired") }
            return identity
        }
    }

    /// Keep each reported expiry, including elapsed snapshots, distinct from a quota recovering "soon".
    static func entries(from expiries: [Date], now: Date = Date()) -> [Entry] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        var seen: [Date: Int] = [:]
        return expiries.sorted().enumerated().map { index, date in
            let ordinal = seen[date, default: 0]
            seen[date] = ordinal + 1
            return Entry(
                id: index,
                number: index + 1,
                date: date,
                key: Entry.Key(date: date, ordinal: ordinal),
                time: formatter.string(from: date),
                expired: date <= now
            )
        }
    }
}

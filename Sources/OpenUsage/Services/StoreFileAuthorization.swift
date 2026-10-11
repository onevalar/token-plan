#if APP_STORE_BUILD
import AppKit
import SwiftUI

/// Security-scoped access is held for the app session; only user-selected folders are persisted.
@MainActor
final class StoreFileAuthorization {
    static let shared = StoreFileAuthorization()
    private let key = "store.authorizedFolders.v1"
    private var active: [URL] = []

    func restore() {
        for data in UserDefaults.standard.array(forKey: key) as? [Data] ?? [] {
            do {
                var stale = false
                let url = try URL(resolvingBookmarkData: data, options: [.withSecurityScope, .withoutUI],
                                  relativeTo: nil, bookmarkDataIsStale: &stale)
                guard url.startAccessingSecurityScopedResource() else {
                    AppLog.warn(.auth, "Store folder authorization could not be restored")
                    continue
                }
                active.append(url)
                if stale { AppLog.warn(.auth, "Store folder authorization is stale; reselect the folder") }
            } catch { AppLog.warn(.auth, "Store folder authorization could not be resolved") }
        }
    }

    func chooseFolder() throws -> Bool {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.showsHiddenFiles = true
        panel.directoryURL = ProviderHome.directory
        panel.message = tr("Choose the service's local folder, such as .claude or .codex, to read its login and usage history.")
        guard panel.runModal() == .OK, let url = panel.url else { return false }
        guard url.startAccessingSecurityScopedResource() else { throw CocoaError(.fileReadNoPermission) }
        do {
            let data = try url.bookmarkData(options: .withSecurityScope, includingResourceValuesForKeys: nil, relativeTo: nil)
            var bookmarks = UserDefaults.standard.array(forKey: key) as? [Data] ?? []
            bookmarks.append(data)
            UserDefaults.standard.set(bookmarks, forKey: key)
            active.append(url)
            return true
        } catch {
            url.stopAccessingSecurityScopedResource()
            throw error
        }
    }
}

struct StoreFileAuthorizationSection: View {
    @State private var message: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Local Service Files").font(.headline)
            Text("TestFlight requires folder authorization to read existing service logins and usage history. API keys can be entered directly in service settings.")
                .font(.caption).foregroundStyle(.secondary)
            Button("Authorize a Folder") {
                do {
                    if try StoreFileAuthorization.shared.chooseFolder() {
                        message = tr("Folder authorized. Enable the service and refresh its usage.")
                    }
                } catch {
                    message = tr("Folder authorization failed. Select the folder again.")
                    AppLog.error(.auth, "Store folder authorization failed")
                }
            }
            if let message { Text(message).font(.caption).foregroundStyle(.secondary) }
        }.padding(12)
    }
}
#endif

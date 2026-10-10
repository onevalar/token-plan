import Foundation

enum ProviderHome {
    /// Store apps have a container HOME. Companion apps still save their logins in the user's
    /// actual home. Resolving the path grants no access: App Sandbox and explicit bookmarks do.
    static var directory: URL {
        #if APP_STORE_BUILD
        URL(fileURLWithPath: NSHomeDirectoryForUser(NSUserName()) ?? NSHomeDirectory(), isDirectory: true)
        #else
        FileManager.default.homeDirectoryForCurrentUser
        #endif
    }
}

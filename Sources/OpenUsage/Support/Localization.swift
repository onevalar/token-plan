import SwiftUI

/// Looks up a runtime-built English string in the app's `Localizable.strings` (the key is the English
/// text). Missing keys come back unchanged, so an untranslated string simply stays English.
///
/// The app language is fixed for the life of the process (see `LanguageSetting`), so strings can be
/// translated once where they are created — descriptor titles, error messages, enum labels — as well as
/// where they are displayed. SwiftUI `Text("literal")` / `Button("literal")` already localize through the
/// same table; `tr` is for the strings that reach the screen as plain `String` values.
func tr(_ key: String) -> String {
    NSLocalizedString(key, comment: "")
}

/// `tr` for strings with placeholders: `trf("Next refresh in %lldm", minutes)`. The English key carries the
/// C-style specifiers (`%@` for text, `%lld` for integers), and each translation may reorder them with
/// positional forms (`%1$@`, `%2$lld`) when the language's word order differs.
func trf(_ key: String, _ arguments: CVarArg...) -> String {
    String(format: tr(key), locale: Locale.current, arguments: arguments)
}

extension Text {
    /// Dynamic `String` values (titles, notices, labels built at runtime) are looked up as localization
    /// keys instead of being shown verbatim. String *literals* are already localized by SwiftUI; this
    /// makes the variable case behave the same way, so a translated table covers both.
    init(_ string: String) {
        self.init(verbatim: tr(string))
    }
}

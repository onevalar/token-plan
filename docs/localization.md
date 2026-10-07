# Localization

TokenPlan ships in **English, 简体中文, 繁體中文, 日本語 and 한국어**. By default it follows the macOS language; **Settings → General → Language** pins one. macOS reads an app's language once at launch, so a change shows a **Restart Now** button.

## How strings are looked up

The English text is the key. Three mechanisms read the tables in `Localization/<lang>.lproj/Localizable.strings` (copied into the app's `Resources` by the build scripts):

- SwiftUI literals — `Text("Settings")`, `Button("Cancel")`, `Label`, `Toggle`, `Section`… localize themselves.
- `tr("English text")` — a runtime `String` (an enum label, a descriptor title, an error message). Unknown keys come back unchanged, so a missing translation shows English.
- `trf("%@ left", value)` / `String(localized: "…\(x)…")` — strings with placeholders. Use `%@` for text and `%lld` for integers; translations may reorder with `%1$@`, `%2$lld`.

`Text(someString)` also routes through `tr`, so titles and notices built at runtime are translated at display time when the whole string matches a key.

## Adding or changing a string

1. Write the English text in code using one of the forms above.
2. Add `"English text": (zh-Hans, zh-Hant, ja, ko)` to a `script/l10n/part*.py` file. Strings that are assembled at runtime and so invisible to the source scan (for example `"Resets in %@"`) also go in `Localization/extra_keys.txt`.
3. Run `script/generate_localizations.py` — it fails if a source string has no translation or a placeholder doesn't match, and rewrites the `.lproj` files. (Pass a `.stringsdata` directory from `swift build -Xswiftc -emit-localized-strings -Xswiftc -emit-localized-strings-path -Xswiftc <dir>` to include compiler-extracted `String(localized:)` keys.)
4. `swift test` checks that all four tables have identical keys and matching placeholders.

Brand and product names (Claude, Codex, DeepSeek…), command names and file paths are never translated. Compact durations (`3h 25m`) use localized unit patterns; dates and times follow the macOS region settings.

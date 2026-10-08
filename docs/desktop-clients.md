# Windows and Linux clients

The existing macOS app remains the SwiftUI/AppKit application. The new desktop client is a separate
Avalonia/.NET 10 application under `platforms/desktop`; it does not replace or reduce the macOS app.
Avalonia supplies OS windowing, input, accessible controls and platform themes without a browser engine.
This dependency is necessary to build the two additional desktop targets from one maintained codebase.
Microsoft.Data.Sqlite supplies a maintained, cross-platform, read-only connection to Cursor's existing
login database. It avoids invoking an external SQL command or copying the database.

## Current behavior

The client reads Claude Code's `.claude/.credentials.json` and Codex's `.codex/auth.json` from the user's
home directory. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` override these locations. Existing OAuth access
tokens are sent only to their corresponding fixed provider usage endpoints over HTTPS. Redirects are
refused. Login files, refresh tokens and account settings are never modified. Expired sessions require
signing in again with the corresponding CLI.

Cursor reads only `cursorAuth/accessToken` and `cursorAuth/stripeMembershipType` from the desktop
app's `User/globalStorage/state.vscdb`. The default is beneath `%APPDATA%/Cursor` on Windows and
the application-data config directory's `Cursor` folder on Linux. A portable installation can use
`TOKENPLAN_CURSOR_STATE_DB` to specify its existing database. Database connections are read-only,
unpooled, and released before networking; refresh tokens and conversations are never queried.
Its fixed usage endpoint receives only an empty query. Team/Enterprise accounts can fall back to
Cursor's own usage-summary and request-allowance endpoints. Model pools take precedence over stale
Teams dollar allowances, and missing usage never becomes a healthy zero. Expired Cursor sessions
require signing in again in Cursor. Access tokens are not refreshed or written by this client.

Session and weekly usage show percent used, percent remaining and the provider's reset time. Missing
values remain unavailable. A sole weekly Codex window is classified by its actual duration. Refresh
runs at launch, on request, or every five minutes when enabled. The full refresh, including reading
the response body, times out after 20 seconds. Login files and responses are limited to 2 MiB. Refreshes
can be cancelled, and respect provider rate-limit waits. Last successful usage remains visible after
a temporary failure only while the credential/account fingerprint still matches; errors and the
original fetch time remain visible.
The overview arranges quota cards in three columns at wide desktop sizes, two at medium sizes and one
in a narrow window. Claude/Codex session and weekly metrics are always visible. Cursor's first available
allowance is always visible; additional model pools and Claude Sonnet are on demand under More Metrics.
These are enabled metrics, unpinned, in their provider response order. Open disclosures survive refresh.
Unreadable or malformed login files clear the previous account's usage and show a sign-in error.
Refreshing preserves the page's scroll position and keyboard focus so updates do not interrupt reading.

The Providers page enables or disables each of the three supported providers and refreshes them
individually. Disabled providers make no automatic or manual usage requests and disappear from the
overview and history filters. Their existing login files remain untouched. These preferences survive
restart. Login and reauthentication still happen in Claude Code, Codex CLI or Cursor.

The History page filters local quota observations by provider and the last 7 or 30 calendar days.
Only successful responses are recorded; a failed update never creates a new reading from stale data.
The newest observation in each UTC hour is kept for each provider, with the original reset times.
Observations are retained for 31 rolling days so the visible 30-day calendar range remains covered.
This is a history of this app's observations, not total tokens, spending or a provider's complete
account history. A virtualized list keeps the month of observations from creating thousands of controls.

`quota-history.json` lives beside preferences, is saved atomically and is capped at 2 MiB and 2,400
observations. It contains only provider IDs, timestamps, quota metrics and an opaque SHA-256 credential
scope hash; raw credentials, plan names and conversations are excluded. New files use owner-only
permissions on Unix. Loaded history stays hidden until the current session reads a matching login.
A changed, missing or malformed login discards that provider's older observations. This conservative
scope also restarts history after an access token rotates, rather than risk mixing account histories.
Unreadable history produces a visible error; new successful readings can start a fresh file.

The overview's Token Usage chart switches between Claude Code and Codex CLI logs on this device
and the signed-in Cursor account's server usage export.
It supports 7/30 calendar days, separate input/output/cache-read buckets and expandable daily counts.
Claude and Cursor also show cache writes; Codex's explicitly reported extra tokens appear separately. The selected
source and range survive restart. Only enabled providers are loaded and offered in the source picker.
Claude/Codex totals are device logs across sign-ins, not the currently signed-in account's complete usage.
Cursor totals come only from its reported export rows. Allowance percentages are never converted into token counts.

Cursor reuses the macOS client's fixed HTTPS CSV-export endpoint with the existing desktop session
cookie and `strategy=tokens`, requesting the previous 29 local calendar days plus today. It validates
the export schema, quoted fields, date/time zones and nonnegative integer counters. Malformed rows
produce an incomplete-coverage message; invalid/truncated schemas produce a visible error. Responses
are limited to 2 MiB, and the entire download and parsing must finish within 20 seconds. Stop cancels
both stages. Export bytes and account tokens remain memory-only. HTTP redirects are refused, and
quota and export requests share the same rate-limit cooldown. The login fingerprint is checked again
after downloading. Changed accounts discard the result; refreshing clears old Cursor token history,
and only history matching the quota card's current login fingerprint can render.

Codex reads the configured `CODEX_HOME` (default `~/.codex`). Claude reads `projects/**/*.jsonl` in
comma-separated `CLAUDE_CONFIG_DIR` roots (a root may itself be `projects`), otherwise `~/.claude` and
`$XDG_CONFIG_HOME/claude` (default `~/.config/claude`). Overlapping roots and copied messages are deduplicated.
Repeated Claude streaming updates keep the larger reported count; original parent messages take
precedence over sidechain replays. Distinct live requests and advisor iterations remain separate.
Cache writes use the structured 5-minute/1-hour counters when present, otherwise the legacy total.

Scanning runs off the UI thread and supports Stop. Only daily counters, parse state and opaque message/
request hashes are retained in memory; prompts, responses and credentials are never persisted or sent.
Linked directories below a configured root are not traversed. Files modified in the last 31 days are
considered. Each provider scan processes at most 128 MiB / 20 seconds, up to 2,000 files selected from
20,000 discovered paths, and skips lines larger than 1 MiB. Claude retains at most 200,000 recent counter
records for global replay deduplication. Incomplete byte/time-limited work resumes at complete-line
boundaries on later refreshes. Missing data shows an empty state. Skipped/malformed/inaccessible logs
or the record cap show a coverage warning distinct from a scan that can resume. Daily-details expansion
and keyboard focus survive refresh.

The native system tray menu shows each enabled provider's latest primary quota, opens the main window,
refreshes usage, and quits the app. A failed refresh marks the retained quota as needing attention.
Closing the main window exits by default. Settings can opt into keeping the app and five-minute refresh
running in the background; closing then hides the window, and Show TokenPlan reopens the same window.
Quit and operating-system shutdown always exit normally. Background mode is disabled when the platform
cannot provide a tray menu. Linux desktops must display the system-tray/status-notifier icon before the
user enables background mode; shell support differs across desktop environments.

Preferences are stored in `TokenPlan/desktop/preferences.json` beneath the operating system's local
application-data directory. They contain appearance, language, refresh, provider-enablement and history-range
preferences, never credentials.
Errors are written to `TokenPlan.log` in the same directory, capped at 1 MiB plus one rotated file.
Logs contain known error keys only. .NET telemetry is disabled by the build script; Avalonia's optional
build-statistics package is excluded from the project entirely. There is no runtime analytics service.

English, simplified/traditional Chinese, Japanese and Korean reuse `Localization/` and the existing
`script/l10n/part*.py` source tables. Add translations there and run `script/generate_localizations.py`.

## Build and verify

Install a .NET 10 SDK. `global.json` selects 10.0.401 or a newer patch. An isolated SDK can be selected
with `TOKENPLAN_DOTNET=/absolute/path/to/dotnet`; the build never replaces the machine's default SDK.
Packages are pinned and restored from the HTTPS NuGet.org source, separately from any global feeds.

```sh
script/build_desktop.sh build
script/build_desktop.sh test
script/build_desktop.sh publish win-x64
script/build_desktop.sh publish linux-x64
```

Publish outputs go to `dist/desktop/<runtime>` and include their .NET runtime. Start
`TokenPlan.Desktop.exe` on Windows or `TokenPlan.Desktop` on Linux. Linux needs the desktop system's
X11/XWayland, fontconfig and graphics libraries supported by Avalonia. Packages are development
previews, unsigned and not installed or distributed automatically.

For local interface review, run the built app with `--fixture` (or `TOKENPLAN_INTERFACE_REVIEW=1` in a test launcher). This clearly labels example data,
makes no provider requests, and uses a separate temporary preferences directory. It is not evidence of
a successful account connection. Rebuild and restart after changes; there is no hot reload.

Check these interactions after changing the desktop UI:

- Check the tray menu in both themes: open, refresh, and quit. Enable background mode, close the
  window, reopen it from the tray, then disable background mode and verify that closing exits.
- Disable one provider, verify its overview card and history filter disappear, and restart to check
  the preference. Reenable it and confirm that a refresh is available again.
- Filter history by provider and 7/30 days. Use End and Home to force virtualized rows to be recycled;
  a cleared row must accept a null template value without terminating the app.
- Refresh while reading an older history row, then use an arrow key. The selected observation,
  scroll position and keyboard navigation must survive the update. Check both light and dark modes.
- Switch Token Usage between Claude, Codex and Cursor, then between 7/30 days and confirm that dates, total and daily details change together.
  Refresh with daily details or provider metrics open; expansion and keyboard focus must survive.
  Check the card grid and token panel at both wide and minimum window widths.

## Current verification

The core suite covers 231 checks, including Cursor CSV parsing, account changes during a download,
timeouts, cancellation and shared rate limiting. Desktop localization checks cover 190 keys in all five
languages. A read-only check using an existing Cursor desktop login returned account-matched token
history successfully; no credentials or downloaded CSV were saved. Interface review uses separately
labelled example data and covers both themes, date ranges, daily details, refresh state and disabling
the selected provider. Windows x64 and Linux x64 self-contained development packages build successfully.

## Remaining work

The remaining macOS providers, spending history, multi-account switching,
iCloud sync and automatic updates have not yet been ported. Windows/Linux OS testing is still required
for caption buttons, keyboard navigation, scaling, system theme changes and desktop integration.
Cross-compilation and a macOS smoke test do not prove those checks.

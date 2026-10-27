# Windows and Linux clients

> This document describes the legacy Avalonia client and its backend. Current 2.x
> releases use the shared [Tauri + React interface](tauri-migration.md). Running
> `TokenPlan.Desktop` directly opens the legacy UI; without an explicit build version
> its About screen reports 1.0.0. Use `platforms/tauri` for current UI development.

TokenPlan's macOS client uses SwiftUI/AppKit. Windows and Linux use the separate
Avalonia/.NET client in `platforms/desktop`. They share provider conventions,
translations and pricing resources; platform behavior still needs native testing.

## Tray and startup

The tray opens a compact panel containing overview, service details, service settings,
usage history and general settings. The overview has Refresh and Options beside the app name;
Options contains Service Configuration, General Settings, About and Quit.
Service Configuration starts with the usage overview and history filters, followed by service management.
General Settings includes appearance, language, usage display and system tray preferences.
About shows the build version and project/support links. There is no
separate overview heading, navigation strip or available-service counter. Management pages
return through Back. The native tray menu also provides direct access
to these pages, refresh and quit. The first two available metrics are shown in the
tray menu by default; an explicit empty selection hides that service's metrics.
Additional accounts have independent metric selections.

New installations keep running when closed. Existing explicit background preferences
are preserved. Clicking outside the tray panel or pressing Escape dismisses it; Escape
cancels an active refresh first. Confirmation dialogs keep the panel open. Quit and OS
shutdown terminate the app. Background refresh continues while the panel is hidden.

On Windows the panel stays out of the taskbar and uses the screen's working area.
On Linux, an available StatusNotifier host enables panel mode. The native menu works
on shells that do not deliver a left-click event. Without a usable tray host, TokenPlan
keeps a normal, accessible window with the system title bar. If a detected host goes
away, the window reappears. Where host detection is unavailable, a successful tray
interaction confirms the tray until restart. X11/XWayland pointer placement is used
when available; otherwise the primary screen is the placement fallback.

Launch-at-login uses `--background`, hiding only when a tray host is available.
Launching a second copy activates the existing process through a current-user pipe.
`tokenplan --toggle` can also be assigned in a Linux desktop's keyboard settings.
The optional Ctrl+Alt+U shortcut registers through Windows or GNOME's native keyboard
settings. Other Linux desktops can assign the command themselves; the built-in toggle
is disabled there. GNOME shortcut registration preserves other custom shortcuts.

## Providers and accounts

The catalog includes Claude, Codex, Cursor, Amp, Antigravity, Copilot, DeepSeek,
Devin, Grok, Kimi, MiniMax, Ollama, OpenCode, OpenRouter, SiliconFlow and Z.ai.
Claude, Codex and Cursor are initially enabled. A sign-in prompt on a machine without
those logins is expected, not a connection regression. Other services are enabled in
Providers. API keys are entered in the corresponding service's settings.

Claude and Codex read local CLI files; configured environment directories are honored.
Cursor reads its existing SQLite login database without modifying it. Additional
Claude/Codex account sources include configured homes and supported swap registries.
Additional account cards open their own metrics, notes and quota history. Providers
can hide each additional account independently; hiding does not delete its login.
Account histories are stored separately and checked against the current credential
fingerprint. Clearing an account history never removes credentials. Device token logs
remain device totals; they are not presented as an additional account's spending.

Linux Antigravity first discovers the current user's running Antigravity language
server or `agy`, and requests quota from its owned local ports. Discovery is bounded,
requests stay on loopback, redirects are disabled and CSRF headers stay local. The
local probe has a five-second budget; individual requests have a one-second deadline.
A usable local response does not depend on a working system keyring. Without an
identified account, local responses are not persisted as account history.
If that route fails, the existing system-credential/Cloud Code route is attempted.
A missing `secret-tool` is distinguished from a keyring read failure. Neither message
claims to diagnose the tester's machine without evidence. An empty authoritative
quota summary remains unavailable data rather than becoming zero usage.

## Usage, pricing and settings

Quota percentages, reset times, display order, visibility and pinned metrics can be
configured. Every metric may be moved to Details Only or Hidden; an enabled account keeps
its heading and details action without promoting a quota back onto the overview. Details Only
preserves the metric in details; Hidden removes it from both views. Labels and values occupy a separate line from progress bars. Cards retain
their natural height rather than stretching to a neighbor's content. Privacy mode
masks values, progress and expiry values in both panel and tray summaries.

Local token history supports Claude, Codex and Grok logs, plus Cursor's authenticated
export. Incomplete scans and unknown prices remain visible. Quota observations are
local samples, not a provider's complete billing history.

Pricing starts with bundled snapshots and refreshes from the same public models.dev,
LiteLLM and TokenPlan supplement feeds as the Mac client. Downloads are bounded and
cached; failed background updates retain known prices and are recorded in diagnostic logs
without adding an overview banner. Missing model prices still appear as incomplete estimates
in the relevant usage history. Successful refreshes
are throttled to hourly, failures to thirty minutes. Changed prices invalidate local
scan caches. Codex settings offer reviewed fallback model prices for unknown models;
other services are unaffected, and the history page discloses when fallback pricing
is selected. Costs are estimates, not subscription invoices.

Preferences also include language, theme, refresh interval, notifications, launch at
login and diagnostic logging. English, simplified/traditional Chinese, Japanese and
Korean use the repository's translation tables.

## Layout and navigation

The window follows the macOS popover rather than a separate desktop design. It is a
340-point-wide panel that grows and shrinks to its content (up to the screen height) and
anchors to the tray pointer when a tray host is available; without one it stays a normal,
resizable window with the same width and typography. Colours, accent, severity tints and the
two density levels come from the macOS client's tokens.

The dashboard has a header with the app name, a **Refresh** button and the **…** menu, then
one flat section per service: service mark, name, plan and a chevron into details, followed by
single-line readings (label, track, value, countdown). A hairline separates services; there are
no per-service cards. Sub-screens use a 44-point bar with a back chevron and a centred title.
**…** lists **Service Configuration**, **Display & Appearance**, **Usage History**,
**General Settings**, **About** and **Quit**. Settings pages pair a caption with a rounded card
of rows; Usage/Settings tabs and the history period are capsule segmented controls.

Return opens Service Configuration from the dashboard and goes back elsewhere. Esc goes back one
level and closes the panel from the dashboard. Ctrl+R (⌘R on macOS) refreshes; Ctrl+, (⌘,) opens
General Settings.

## Build, test and installers

Use the isolated .NET SDK specified by `platforms/desktop/global.json` (an Amp orb's
`.agents/setup` installs it at `~/.dotnet` and links `dotnet` onto `PATH`):

```sh
TOKENPLAN_DOTNET=/path/to/dotnet script/build_desktop.sh build
TOKENPLAN_DOTNET=/path/to/dotnet script/build_desktop.sh test
/path/to/dotnet run --project platforms/desktop/TokenPlan.Desktop.Tests
TOKENPLAN_TEST_LINUX_THEME=1 /path/to/dotnet run --project platforms/desktop/TokenPlan.Desktop.Tests
TOKENPLAN_DOTNET=/path/to/dotnet script/build_desktop_installers.sh <existing-version>
```

Windows x64 uses a per-user NSIS installer. Linux x64 uses a Debian/Ubuntu `.deb`.
Both include the runtime. The installer script writes to `dist/installers` and emits
checksums. These packages are unsigned. No tag or release is created by this script.
Preferences and history survive uninstall; deleting the app's local data directory
is a separate user action.

`--fixture` uses labeled example data without provider access. Headless tests exercise
both Fluent and Simple themes, light/dark variants, compact pages, account isolation,
privacy and navigation. A local RPC fixture verifies Antigravity without real logins.
These checks do not prove system-tray behavior on the target operating system.

## Native acceptance still required

Test the installers on Windows and Linux: tray activation, outside-click dismissal,
confirmation dialogs, close/reopen, OS shutdown, monitor scaling, login startup,
shortcut conflicts, Linux tray-host loss/recovery, notifications and real Antigravity
quota. The user performs these checks with the new packages.

History is local on every platform. Silent unattended update installation, all Mac account-source
variants, arbitrary shortcut recording and Antigravity's legacy per-model RPCs are
not implemented here. Do not describe the clients as fully equivalent on every OS.

## Tray interaction and icon assets

A primary tray activation opens the panel; repeated activation leaves it open. Right-click
uses the native tray menu where the desktop exports it. For hosts that call the SNI
ContextMenu method instead, a compact menu provides Show, Service Configuration,
Display & Appearance, Usage History, General Settings, About, Refresh and Quit. Both
exit paths terminate the process.

The pinned Avalonia 12.1.3 backend leaves SNI ContextMenu and SecondaryActivate empty.
LinuxTrayInteraction isolates a compatibility adapter around its exported handler,
forwarding other calls unchanged. It restores the adapter after host re-registration;
its private integration points are checked by the desktop test suite and must be
reviewed on an Avalonia upgrade. Failures are recorded in the diagnostic log.

Windows/Linux use assets/AppIcon-capsule.png, a transparent capsule without the
macOS rounded tile. script/make_icon.py packages its PNG sizes and Windows ICO;
the macOS ICNS is packaged from the same transparent capsule source.

## Application updates

Published Windows/Linux builds check the public TokenPlan version feed at startup and every 12 hours.
General Settings and About also offer Check for Updates. New versions can be downloaded, verified by
size and SHA-256, and opened in the platform installer. Installation remains a user-confirmed system
step. The updater supports Windows x64 and Debian/Ubuntu x64; see [updates](updates.md).

## Claude / Codex renewal and connection diagnostics

Windows and Linux now share the same OAuth renewal flow. For writable, independent CLI
logins, TokenPlan renews a token near its known expiry, or renews once after a usage
request returns 401, then retries usage. It saves rotated credentials privately and
preserves unrelated fields. It reloads a login changed by the CLI, instead of knowingly
overwriting it or showing one account's quota with another account's identity.
TokenPlan refreshes sharing a file are serialized; CLI programs do not participate in
that lock, so generation checks are made before and after networking and before saving.

Claude Swap exports and Codex Swap registry accounts remain read-only: rotating their
shared refresh tokens could break the active CLI login. An expired saved account asks
the user to activate and renew it through their switcher. Independent configured homes
can renew normally. Missing refresh credentials and provider-revoked credentials have
separate recovery messages. A failed save retains the new credential in memory until a
retry can save it, without rotating again; fix permissions before closing the app.

403 is a permission/network restriction, not proof of an expired login. DNS failures,
TLS/certificate failures, proxy authentication and timeouts have separate messages.
Each network request, including its response body, is bounded; OAuth workflows allow
additional time for renewal and retry. Codex's optional reset-credit request has a
shorter deadline and its failure retains the primary quota result.

Windows uses .NET's default environment/system proxy selection. Linux honors inherited
proxy variables first, then reads the desktop system proxy via GIO in the shared backend,
so application-list and terminal launchers follow the same policy. It does not import shell
configuration or change a proxy/VPN. See [proxy behavior](proxy.md). In General Settings →
Advanced, open the log folder: network entries include destination host, HTTP status,
stage, elapsed time, and whether a proxy is selected. They exclude credentials, account
identities, headers, response bodies, proxy addresses and raw exception messages.

Mocked regression tests cover renewal, rotation, concurrent CLI changes, repeated 401,
403/407, rate limits, failed saves, body timeouts and redacted DNS/TLS/proxy diagnostics.
Actual Ubuntu and Windows account connectivity still requires testing on the user's
machine; these changes cannot by themselves establish why a particular network blocks
an upstream service.

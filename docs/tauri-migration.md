# Shared desktop interface migration

The October 21 navigation redesign is enabled in normal builds on all three platforms
following the owner’s approval. See [mac-navigation-preview.md](mac-navigation-preview.md)
for behavior, platform tray differences and the isolated design-review bundle.

TokenPlan's new desktop interface lives in `platforms/tauri`. React and Arc
components provide one interface for macOS, Windows and Linux. A fixed bundled helper
continues to use the existing Swift providers on Mac and .NET providers on Windows/Linux.
The installed native app and stable update feeds are not replaced by development builds.

## Dashboard, service configuration and history

The default desktop panel is 390 logical pixels wide, without a native title bar.
It closes on focus loss or Escape; macOS also toggles it with another tray click.
Windows/Linux left-click explicitly shows Home, so repeated clicks do not hide it. Focus-loss dismissal
is deferred briefly so a tray activation does not hide and immediately reopen it.
The panel opens centered under (or, for a bottom taskbar, above) the clicked tray icon,
inside that monitor's work area. On macOS it starts closed, so the first click opens it.
macOS chooses the screen from the menu-bar click's current pointer location and uses
AppKit logical screen coordinates for both placement and resizing. It does not mix
Retina pixels with another display's scale or fall back to the laptop when an external
menu bar is clicked. Resizing keeps the same menu edge and clicked screen.
Like the native panel, it is a non-activating panel on macOS: it opens over another app's
full-screen Space, leaves that app in front, and still takes keyboard input.
Its corners are rounded on macOS and on Linux desktops with a compositor; without one,
Linux keeps square corners instead of black ones. The scrollbar
stays hidden until the pointer is over the panel. On Linux without a compatible tray host,
a decorated taskbar-accessible window remains available instead.
Production packaging inherits the preview's window configuration.

The dashboard groups adjacent accounts of the same service without changing the saved
account order. Only metrics explicitly assigned to Home appear there. Service configuration
shows a usage summary and enabled accounts; Add Service opens a searchable list of saved
inactive services. Moving an enabled account skips inactive entries in the saved order.

View History opens a separate history page. Today, Yesterday and Last 30 Days use local
calendar dates. Daily totals are shown seven days per page; expanding a day shows accounts,
then model totals and variants. Quota observations are separately expanded and paginated.
Device-scoped histories are still counted once per provider, and missing prices stay unknown.
These views use the same existing data sources and do not change saved metric placements.

On macOS, every tray refresh must set the image and its template flag together. Calling
`set_icon` alone resets that flag in the current tray library and makes black icons disappear
on dark menu bars. Debug builds check the native NSImage flag after creation and refresh.
An account without pinned metrics keeps a legible provider mark in both styles, without
an automatic change to its saved pins.

## Implemented

- Account discovery, individual visibility, removal with confirmation, saved notes and API
  keys, ordering, metric placement and up to three tray metrics per account. Removing a card
  preserves the external CLI login and historical files. All metrics may be off the homepage.
- Existing preference files, native account identities and removal records are reused.
  Windows/Linux retain discovered account headings across restart without treating them as
  authenticated cached quota data. Refreshes are serialized at the bridge boundary; account
  identity guards, token renewal and rate-limit cooldowns remain in the native providers.
- History uses the native history sources. Mac account-scoped histories remain separate;
  device-scoped CLI logs on Windows/Linux are counted once per provider. Existing desktop
  quota-history files are read and extended. Missing/partial data is not rendered as zero.
- macOS uses one wide template-image strip containing every selected account.
  Windows/Linux use one transparent product icon, without a drawn background or
  border. Account quota indicators, their settings and the duplicate indicator
  strip inside Home are removed on Windows/Linux. Existing selections remain stored.
- Token Trend + Values is an optional macOS menu-bar style rendered by Rust, not by
  the webview. It uses daily token records over 14 calendar days, including today, with gaps
  for missing days and current selected readings alongside. It does not reuse quota
  percentages as history. Empty recent history falls back to values; no pins keeps
  the icon alone. The bridges save `settings.trayStyle = "sparkline"`; the Mac helper's
  private `tokenplan.desktop.trayStyle` override leaves classic preferences unchanged.
- Windows left-click shows Home near the tray icon; right-click opens Show Home / Quit.
  Linux uses SNI Activate for Home and the host's standard context menu for right-click.
  Hosts that force a menu on left-click retain Show Home as a fallback. There is no distinct
  double-click action. Showing Home resets navigation and restores, raises and focuses it.
  Without valid coordinates it centers on its current monitor (or primary), including after
  content-height changes. Linux/Wayland placement is subject to compositor support.
  Linux still keeps an accessible window if no SNI host exists.
- Antigravity's Windows/Linux parser now carries 5-hour and weekly periods from
  exact bucket IDs, matching the Mac mapper; unknown pools remain excluded and
  reset times are never inferred. This also makes the independent Home rings pair
  correctly when the provider has both session and weekly quotas.
- General settings share language, appearance, Home style and density, used/remaining display,
  menu bar configuration (including each account's menu bar metrics) and refresh interval.
  Account details switch between viewing usage and editing Home metrics. Current Quota uses the
  account's effective Home usage style, so a per-subscription change appears immediately on
  returning from the editor. Placement, order and per-account style changes save immediately; a rejected layout restores the last accepted one, and Done or Escape leaves the editor without another write. General Settings selects uniform or per-account Home styles; custom style editing joins each account’s immediately saved editor. Menu bar settings remain in General Settings. Provider text reuses the repository's five-language translation tables.
- Tauri's updater checks in the background or on request, verifies signatures, shows install
  progress and restarts after installation. A background check failure does not interrupt work.
  The update preference is persisted. A failed installation is shown explicitly. An available
  update appears as a compact version button left of Refresh on Home; Skip This Version records
  that version locally and stops the reminder, while the Updates page can still install it.
  A new version can remind again.

## Building and checking

Use the project-specific Rust 1.90 toolchain, Node 22 and .NET 10 outside Mac. On Mac use
`/Applications/Xcode.app`. The release profile avoids Rust's Mach-O stripping problem with
Xcode 27 (`rust-lang/rust#157750`); release optimization remains enabled.

From `platforms/tauri`:

```
npm ci
npm run prepare:bridge
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:ui
```

`TOKENPLAN_DOTNET` can select an existing .NET 10 executable. `TOKENPLAN_UNIVERSAL=true`
builds the Mac helper for both architectures. The CI workflow `Tauri migration checks`
builds universal Mac, Windows x64 and Linux x64 packages, signs updater artifacts and
notarizes Mac builds. It uploads verification artifacts without publishing a stable release.
Native backend tests and synthetic-account UI tests are included. See the
[verification record](tauri-verification.md) for results and installed acceptance boundaries.

Do not test edits against the installed app's preferences. The bridge tests use temporary
files; the helper smoke test uses an isolated Mac defaults domain and makes no refresh call.
The UI tests never load real credentials or account data.

## Update transition

### Ubuntu DEB package identity

The published 2.0.4 DEB is named `token-plan`, while the legacy Avalonia package is
`tokenplan`. Without replacement metadata both packages can coexist, with two entries
named TokenPlan; the legacy build can report its default version 1.0.0. This is an
installer migration issue, not a reason to delete user data.

For affected 2.0.4 installations, check `dpkg-query -W tokenplan token-plan`. Once
`token-plan` 2.x is installed, `sudo apt remove tokenplan` removes the legacy program
without purging user settings/history; `tokenplan-shell` starts the shared interface.

The next production DEB declares Conflicts/Replaces/Provides for the legacy package.
It retains the current `token-plan` identity for upgrades from 2.0.4. Compatibility
launchers at `/usr/bin/tokenplan` and `/opt/tokenplan/TokenPlan.Desktop` forward old
shortcuts/autostart commands to the Tauri executable. The old `tokenplan.desktop` ID
remains launchable but hidden from application menus, leaving one visible entry.
Package migration never scans or rewrites users' home directories.

Linux packaging also includes standard 32/48/128/256/512-pixel PNG icons. The 2.0.4
DEB only installed the source image in a 1254x1254 theme directory, which may not be
searched by desktop icon themes. The installer check verifies that the launcher's icon
name resolves to the expected standard-size files.
Install/remove hooks refresh desktop and icon caches when the system provides those
helpers. On an affected existing installation, `update-desktop-database` can refresh
the application database and `gtk-launch TokenPlan` checks the new desktop entry.

Linux production CI installs the actual DEB over coexisting legacy and 2.0.4 fixtures,
then checks package removal, the installed version, executable compatibility launchers
and the single visible desktop entry. These checks complement frontend tests; they do
not assert that every desktop environment or existing user shortcut was exercised.

`updates/tauri.json` is a bootstrap manifest with no published migration release. Its key is
separate from Sparkle's key. The private key is stored outside the repository and in the
`TAURI_SIGNING_PRIVATE_KEY` Actions secret. `scripts/update-feed.mjs` requires signed artifacts
for Mac, Windows and Linux and maps both Mac architectures to the universal package.

A shipping version still requires the owner's version and release-note approval. The package
config script uses the existing production identifier only when explicitly building a
production release. Do not switch `appcast.xml` or the old desktop feed to preview builds.
The first production migration must also validate the transition from the native installers;
a signed Tauri update alone is not evidence that an existing native installation upgrades.
Linux automatic replacement uses AppImage; `.deb` installations remain package-managed.

The reusable `tauri-release.yml` workflow builds all three platforms from the approved tag.
Stable routing remains native until `release/tauri-accepted` is committed after acceptance.
The production Mac job signs a transition DMG with the existing Sparkle key and checks its
notarization; its monotonic bundle version lets the native Mac updater offer the migration.
The publisher uploads all signed assets before advancing either manifest. Windows/Linux
native installations require one manual migration install; subsequent Tauri installations
use the new signed feed. The native desktop feed is deliberately not given installers with
incompatible unattended-install arguments. No production transition has been published yet.

CI also verifies the actual updater archive against the public key embedded in the app,
in addition to the regression that rejects a modified archive.

## Boundaries and acceptance

The frontend never receives credentials. It cannot select helper paths or execute shell
commands. Rust accepts a fixed command list and typed display data, caps response size, and
terminates a stalled helper. API keys are only submitted for storage, never read back.
The free Arc components retain their bundled MIT license. The optional Tick Ring adapts
authorized Arc Pro Activity Rings source, embedded in this application under Arc's
October 24, 2026 license. Its source notices, Pro terms and MIT exception are retained
and bundled separately. It must not be distributed as a standalone component or library.

A passing browser test does not prove platform tray behavior, notarization or installed
updates. Keep native views until packaged acceptance and the first production upgrade have
been validated. The shared settings expose all three quota notification triggers and a recorded global
shortcut. Mac imports the original notification preferences and Carbon shortcut; clearing
a shortcut explicitly prevents re-import. At the owner’s request (2026-10-21), synchronization has been removed from the
Swift client, Tauri protocol, settings and packaging. Local history is preserved.
Developer ID packages no longer require a cloud provisioning profile or entitlements.
The existing background helper bundle and signing identity remain in use.
The helper shares the production bundle identifier. It must open that settings domain with
`UserDefaults.standard`; using its own identifier as a named suite is rejected by Foundation.
Explicit test-suite overrides still use named suites. Packaged acceptance runs both the
isolated test suite and the real production-domain startup path before publishing.
The nested helper is named `TokenPlan Bridge` and marked background-only so it is not
presented as a second user-facing TokenPlan application.

Notification evaluation lives in Rust and runs while the window is hidden. It uses remaining
quota regardless of display mode, primes without alerts at launch, tracks worsening edges,
re-arms after recovery/reset and commits milestones only after successful scheduling. Mac
uses the existing UserNotifications implementation in the helper; Windows/Linux call the
native notification backend directly because the Tauri plugin discards delivery errors.
Notifications may still be suppressed by OS focus/quiet modes after successful scheduling.

The official global-shortcut plugin provides background registration. An unavailable binding
leaves the prior one registered. Linux global shortcuts use X11; Wayland sessions explicitly disable this control rather than
misreporting an XWayland-only registration as system-wide support.
The new dependencies are needed for native shortcuts, quota reset timestamp parsing, and
observable notification delivery, not frontend styling.

Daily history expands model totals and raw variants where available. Windows/Linux scanners
retain bounded per-model aggregates without storing prompt content, with the same stream
replay deduplication as the daily totals. Unknown model prices remain unavailable.
These additions still require fresh packaged acceptance before the stable migration marker.

## 2.0.2 production startup verification

Release run `39440203614` passed the three platform builds, interface tests and updater
signature checks. The Mac job also passed both isolated-suite and production-domain
startup checks against the final signed helper.

The published Mac DMG was downloaded separately and matched its published SHA-256.
Its signature verified against the saved native 1.0.12 update key; application signing,
notarization and background-helper metadata passed. Running that downloaded helper
against the existing local production configuration returned usage for all seven enabled
accounts with no account errors. The verification image was ejected afterward; the
installed 2.0.1 application was not replaced. This verifies the downloaded helper and
upgrade signatures, not an unattended installation on the user's Mac.

### Account reconnection and panel sizing

The tray panel sizes itself to the active page, up to 680 logical pixels and the available
screen height. Short dashboards shrink; longer pages scroll. Linux's ordinary window
fallback (when no tray host is available) remains user-resizable.

Saved Claude/Codex accounts remain listed when their login disappears or expires. A
missing login shows a reconnect message instead of another account's quota. Disabling
an account and explicitly removing it remain separate actions. Account identity, rather
than the current default login directory, determines which saved account is refreshed.

In **Subscription Management → Add Account**, choose Claude or Codex and optionally enter a note.
Creating a record reserves a separate `.claude-accountN` or `.codex-accountN` directory and opens
the official CLI there. Existing folders are skipped and the default CLI login is untouched.
The CLI must already be installed; when a terminal cannot be opened, copy the command instead.
After signing in, check again. The account is enabled only after its directory is matched to a
resolved identity; another detected login cannot complete the pending record. Notes are applied
without overwriting an existing note. An interrupted setup stays under Pending Connections and
can resume after restarting, reusing the same directory. Removing a pending record keeps its files.

Paths are registered in `~/.tokenplan-account-directories.json`. Pending record IDs, labels and
paths are kept in `~/.tokenplan-account-setups.json`. Neither file contains credentials. Existing
folders can still be connected explicitly. A verified, explicitly registered independent Claude
login takes precedence when the same identity is also in the default directory, so a later CLI
account switch does not disconnect that saved account. macOS and the .NET engines expose only
matched directory paths to the UI, never credential contents.

Home offers twelve style families: Bars, Quota Ruler, Cells, Rings, Gauges, Numbers, Containers
(battery, tank, thermometer, hourglass), Border Progress, Source Split, Side-by-Side Columns,
Status Lights and Row Fill. Choosing one reveals its options: Bars and Quota Ruler can show a
striped forecast of where use will land by reset; Rings are single, double or tick; Cells are a
grid or a single row of squares, capsules or rising bars with 5, 10 or 20 cells. Earlier saved
choices keep their look. Source Split spreads the used part over each model's share of the last
seven days (an estimate) and falls back to a plain bar for accounts without a model split; Side-by-Side
Columns need two or more limits and fall back to rows otherwise. Status Lights are calm under 50%
used, watch under 80%, critical from 80%. Row Fill puts the percentage on the left and stacks the
period over the countdown on the right. No style shows a visible near-limit, exhausted or exceeded
sentence; color alone carries that state.

Home usage styles are local UI preferences. Unified mode retains the existing global style;
Per Subscription exposes a style picker inside each subscription's Edit Home Display. Switching
modes preserves per-account choices, including different styles for two accounts of one service.
Each account's Current Quota on its detail page mirrors its effective style, so leaving the
editor shows the chosen look without a reload.
The nine choices include Tick Ring, with one independent dial per quota. It uses the same
saved `tokenplan.homeUsagePreferences` record, displayed percentages, reset times and warning
threshold as the other styles. No provider, history source or stored reading is changed.

### Connection diagnosis

Connection identity and the result of loading usage are separate. A saved account that
cannot be attributed stays visible as unverified; a different active identity is reported
separately. Neither case alone proves an expired credential. Network/rate-limit failures
suggest retry, while file/database access failures suggest checking paths and permissions.
Only authorization failures suggest signing in again. The Add Service detector lists each
account's result and original error, rather than reporting generic success. Mac discovery
also refreshes enabled accounts using the existing cache and provider cooldowns.

### Service identity and manual refresh feedback

The shared desktop UI gives each service a stable light/dark accent for its logo,
normal quota bars and compact trend. Account ordering does not change its color.
High quota usage still uses the shared warning and danger colors. Native menu bar
icons and their previews retain the system's monochrome contrast behavior.

Manual refresh immediately shows a rotating refresh icon and a text status, prevents
repeat requests, and reports updated data, a "Not refreshed" result when nothing was
fetched, partial account errors or a failed request. Success is claimed only when an
account's fetch time actually advanced. Pressing Refresh (the button, ⌘R, or a card's
Try Again) always asks the helper to fetch from the provider, bypassing the helper's
short reuse window; the launch refresh and the background timer do not, so a tick and a
press that land together do not fetch twice. Results belong to the page that initiated the refresh.
The status has a short minimum visibility period so fast cached requests are still
perceptible; reduced-motion mode retains the text without rotation. Saving settings
does not start the refresh animation. The panel height includes this temporary status.

### Per-account tray defaults (2.0.7)

macOS now tracks accounts whose menu bar defaults have been initialized. Adding an
account seeds its default pins independently of any sibling's saved selection. Empty
saved selections remain empty, including after a temporary absence or reconnect. On
migration, existing layout/order records establish which accounts were already known;
ambiguous existing empty configurations are preserved. Windows/Linux persist per-account
default pins when the first usable snapshot arrives and never replace an explicit empty
array. No metrics are seeded from an unauthenticated heading.

The menu bar settings show an icon-only account as switched on with no metric chip selected;
the native tray summaries distinguish no selected metric from missing quota data.
This also lets legacy accounts recover without overwriting deliberate preferences.

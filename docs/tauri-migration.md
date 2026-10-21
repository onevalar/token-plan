# Shared desktop interface migration

TokenPlan's new desktop interface lives in `platforms/tauri`. React and the free Arc
components provide one interface for macOS, Windows and Linux. A fixed bundled helper
continues to use the existing Swift providers on Mac and .NET providers on Windows/Linux.
The installed native app and stable update feeds are not replaced by development builds.

## Dashboard, service configuration and history

The default desktop panel is 390 logical pixels wide, without a native title bar.
It closes on focus loss, Escape, or another click on its tray icon. Focus-loss dismissal
is deferred briefly so a tray activation does not hide and immediately reopen it.
The panel opens centered under (or, for a bottom taskbar, above) the clicked tray icon,
inside that monitor's work area. On macOS it starts closed, so the first click opens it.
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
  keys, ordering, metric placement and up to two tray metrics per account. Removing a card
  preserves the external CLI login and historical files. All metrics may be off the homepage.
- Existing preference files, native account identities and removal records are reused.
  Windows/Linux retain discovered account headings across restart without treating them as
  authenticated cached quota data. Refreshes are serialized at the bridge boundary; account
  identity guards, token renewal and rate-limit cooldowns remain in the native providers.
- History uses the native history sources. Mac account-scoped histories remain separate;
  device-scoped CLI logs on Windows/Linux are counted once per provider. Existing desktop
  quota-history files are read and extended. Missing/partial data is not rendered as zero.
- Every platform shows exactly one tray item, so the system cannot reorder separate account
  icons. On macOS it is one strip of every selected account, in saved order, as rings or
  percentages drawn with the system font. Windows and Linux trays only fit a small square, so
  they show the TokenPlan icon and list each selected account's readings in the tooltip and
  menu; the tray style setting appears only on macOS. Account numbering is contiguous per
  service; a single visible account of a service has no number.
- Left-click opens the panel, and the native context menu includes open/quit. Linux uses
  StatusNotifierItem through `ksni` because Tauri's AppIndicator adapter does not deliver
  left-click activation. The window remains accessible when a desktop has no SNI host.
- General settings share language, appearance, refresh interval, used/remaining display and
  tray configuration. Provider text reuses the repository's five-language translation tables.
- Tauri's updater checks in the background or on request, verifies signatures, shows install
  progress and restarts after installation. A background check failure does not interrupt work.
  The update preference is persisted. A failed installation is shown explicitly.

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
Arc's upstream MIT license is bundled; no Arc Pro source is redistributed.

A passing browser test does not prove platform tray behavior, notarization or installed
updates. Keep native views until packaged acceptance and the first production upgrade have
been validated. The shared settings now expose the original Mac iCloud history store, all three quota
notification triggers and a recorded global shortcut. Mac imports the original notification
preferences and Carbon shortcut; clearing a shortcut explicitly prevents re-import. iCloud
remains Mac-only, preserves the existing device identity and shares only normalized history.
Production packaging embeds the original provisioning profile and derived entitlements in
both the shell and bundled helper; preview identities do not have production cloud access.
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

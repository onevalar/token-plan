# Tauri migration verification

The migration keeps the native provider engines and uses a shared React/Arc interface.
Tests use synthetic accounts, isolated preferences and disposable signing fixtures; they do
not change the installed application or refresh real credentials.

## Windows/Linux native tray and Ubuntu installer repair (2026-10-21)

The source repair replaces the static Windows/Linux application icon with native account
indicators. Regression coverage includes all pinned values in percentage mode, three rings,
zero-use tracks, missing values, account removal/reordering, continuous numbering, and
contrast on light/dark panels. Percentage text is fitted to the measured glyph width;
Linux's fallback font exposed clipping that did not occur with the Mac/Windows fonts.

Local checks passed: 27 Rust tests (one existing ignored test), the frontend build and unit
tests, 28 Chromium interaction scenarios, and 63 navigation scenarios across the Mac,
Windows and Linux browser projects. These browser projects exercise shared interactions;
they do not constitute installed native Windows/Linux desktop acceptance.

The cloud packaging check installs its actual production DEB over coexisting legacy
`tokenplan` 1.0.0 and `token-plan` 2.0.4 fixtures on a disposable runner. It checks that only
the current package remains installed, old commands forward to the new executable, one
application entry is visible, and standard-size icons are installed. No user home directory
is rewritten or purged.

At source commit `1fd15db`, the Ubuntu 24.04 job in
[run 39591089636](https://github.com/onevalar/token-plan/actions/runs/39591089636)
passed the actual DEB installation/replacement check, AppImage update-signature
verification, 27 Rust tests, Chromium/WebKit interactions (28 each), and the 21 Linux
navigation scenarios. The same source passed the
[macOS CI suite](https://github.com/onevalar/token-plan/actions/runs/39591063549).
The Windows job in the same packaging run also passed: 27 Rust tests, 28 Chromium
interaction scenarios, 21 navigation scenarios, installer generation, and verification
of the actual updater signature against the application's public key.
The subsequent artifact-path correction collects the render review PNG from Cargo's
package working directory; it changes artifact collection only, not application code.

Physical GNOME/KDE/Windows notification-area acceptance, including desktop-controlled
spacing/order/overflow and pointer activation, remains separate from these automated
checks. The installed Mac app and published 2.0.4 binaries are unchanged; this repair
requires a newly approved release before it reaches normal downloads or auto-update.

## Desktop layout and tray repair after 2.0.2

The 2.0.2 helper startup checks did not validate the complete interface. The reported
regressions included unbounded history tables, repeated provider headings, oversized
charts and invisible menu-bar icons after refresh on dark backgrounds.

The repair was checked with seven enabled accounts, eight inactive services and thirty
days of synthetic history. Chromium and WebKit each passed 26 interaction scenarios.
The final narrow-window capture scenarios additionally cover one-day trends, active-account
ordering across hidden entries, seven-day pagination and the searchable service picker.
Frontend build, 12 shared unit tests, update-feed and production-window tests, three
release README tests and eleven Rust tests passed.
The packaged-update signature test remains a CI packaging check and was not run here.

A disposable macOS app bundle ran the compiled shell against a synthetic helper.
The actual WebView dashboard and service configuration were inspected. Manual refresh,
automatic state polling and ring-to-percentage switching exercised the native template-image
assertion. This checks NSImage state; the desktop capture tool did not provide a usable
full-menu-bar screenshot, so pixel-level system menu-bar acceptance is not claimed.
The panel is 390 logical pixels wide and has no title bar or traffic-light controls.
The native app was hidden with Escape from its detail page and reopened with that page
intact. Switching to another application with Cmd-Tab also hid the panel, exercising the
native focus-loss path. Browser tests verify that Escape closes an open menu before dismissing the panel.
Unit tests cover focus-loss dismissal and reject delayed events after a reopen. The
desktop capture tool could not reliably activate an outside application window, so
outside-click and physical tray-toggle acceptance remain manual checks.
On Linux without a tray host, dismissal minimizes the ordinary fallback window instead
of making it inaccessible.
Windows and Linux installed desktop shells were not exercised locally in this repair.

The preview was closed, unregistered and removed. During this isolated test, the installed
application, real account settings and public feeds were not changed.

The original macOS 1.0.12 DMG was downloaded and its SHA-256 matched the published
digest (`63476f25708834bbca53a5a50f1b921b900053ac9d425df7885a213bafe288c6`).
The README updater regression verifies that later releases preserve its fixed Classic
download section. This does not freeze the old application's update feed.

Release 2.0.3 subsequently passed all three platform jobs in
[run 39457286122](https://github.com/onevalar/token-plan/actions/runs/39457286122).
The public DMG, EXE, AppImage and DEB URLs returned anonymous HTTP 200; both update
feeds point to 2.0.3 and the README retains Classic. The downloaded universal Mac update
archive matched its published SHA-256 and the embedded updater public key. Its app
reported version 2.0.3 and the production bundle ID, contained arm64 and x86_64 code,
and passed strict code-signature and stapled notarization-ticket validation. The extracted
verification app was removed; the installed app was not replaced.

Synthetic-account screenshots:
[light dashboard](screenshots/desktop-repair/dashboard-light.png),
[dark dashboard](screenshots/desktop-repair/dashboard-dark.png),
[light configuration](screenshots/desktop-repair/configuration-light.png),
[dark configuration](screenshots/desktop-repair/configuration-dark.png),
[expanded history](screenshots/desktop-repair/history-dark.png),
[native macOS panel](screenshots/desktop-repair/panel-macos.png).

## Verified locally

- Native Swift regression suite: 1,603 XCTest checks, five skips, no failures; CLI and
  Swift Testing checks also passed. The final legacy tray-selection change passed the
  62 LayoutStore checks and rebuilt the Swift bridge.
- Native .NET core: 521 checks passed. Bridge integration checks cover persisted settings,
  independent account visibility, removal tombstones, and migration from hidden families.
- Shared interface: 17 scenarios passed using Chromium and WebKit, including light/dark
  layouts, narrow windows, all five languages, account removal/order, ring/percentage
  account parity and failed-update feedback. Arc's confirmation anti-double-click delay is
  respected by the interaction test.
- Typed display contract and update manifest tests passed. Rust tray tests verify account
  selection/numbering and transparent output; signature regression rejects altered data.

## Cloud result

[Run 39389571019](https://github.com/onevalar/token-plan/actions/runs/39389571019)
passed on all three platforms at `f118b8c`. The universal Mac package was accepted by Apple;
Mac, Windows and Linux updater artifacts passed verification with the embedded public key.
The subsequent unpinned-icon fallback and history-localization refinements passed all 17
Chromium and all 17 WebKit scenarios, the frontend production build, and all four Rust
regressions. Those small refinements are source changes after the verification artifacts;
ship only freshly built packages from the eventual approved release commit.

## Installed acceptance

The `Tauri migration checks` workflow builds universal Mac, Windows x64 and Linux x64
installers, runs the native helper protocol, repeats UI tests, and verifies the signature
on the actual update archive. Mac artifacts must also pass Developer ID signing and Apple
notarization. Nested Sparkle helpers are signed before Tauri seals the containing framework.

Browser tests are not installed desktop acceptance. Tray hosts may reorder icons, and
Wayland may ignore requested popup positions. Check left-click/open, right-click/quit and
multiple monitors on the supported desktop environments before enabling stable migration.
The first native-to-Tauri installed upgrade has not been published or tested end-to-end;
that requires an approved production version. The current native feeds remain active.

The Linux CI target is Ubuntu 24.04 x64. Compatibility with older distributions is not
established by that build. AppImage supports in-app replacement; DEB remains managed by
the package manager. Windows/Linux native users need one manual migration installation,
after quitting the old client. The restored iCloud, notification, shortcut and model-history capabilities are now documented
in the migration boundaries; their production bundle verification is pending.

## Restored native features (2026-10-20)

Local verification: 1,605 Swift tests (five existing skips), 523 .NET core checks and isolated
bridge integration passed. Chromium and WebKit passed all 20 scenarios, including model expansion and
notification/shortcut settings. Rust tests cover baseline suppression, reset jitter, recovery,
disabled-trigger reactivation required shortcut modifiers, and used/remaining parity. A final package check launches the
signed production helper to catch entitlement/provisioning launch failures. Production iCloud signing and
OS-level behavior still need verification; these results alone do not approve stable routing.

The independent Mac preview was launched with an isolated defaults suite and automatic refresh
and updates disabled. Settings opened, shortcut recording/replacement/persistence/clearing
worked, and Quit closed the preview. App-targeted injected key events do not establish physical
OS-global hotkey dispatch. The preview was closed, its defaults removed and the generated app
moved into a `.noindex` build directory; the installed native app was not replaced.

A follow-up regression explicitly resumes shortcut registration after saving (WebKit can drop
the blur event when disabling a focused recorder). Headless iCloud checks poll asynchronously,
with a 30-second throttle, in addition to metadata events; the dedicated nine-test suite passes.
Real iCloud exchange between two signed-in Macs has not been exercised in this environment.

### Production helper launch gate

The production check now launches the signed Mac data helper, not just the unsigned build. This caught macOS rejecting iCloud entitlements on a bare sidecar even after notarization. The helper is now staged as an internal application bundle with its own matching provisioning profile; the shell launches that bundle’s executable. Release verification checks both bundle identities and entitlements, then requires an actual bridge response.

## Final production verification

[Run 39401415744](https://github.com/onevalar/token-plan/actions/runs/39401415744)
passed on macOS, Windows and Ubuntu 24.04 at `055e5ff`. It includes the restored features,
all platform tests, signed updater artifact verification, Apple notarization, Sparkle
migration feed signing, and actual startup of the signed Mac helper with its own profile.
This resolves the production-only helper termination found in run 39397477568.
The following release-only name cleanup uses TokenPlan instead of a preview/helper label;
the eight Rust regressions pass. The stable release rebuild repeats all checks from the tag.

The owner requested restoring the missing features before publishing 2.0.0. The restored
scope is documented in release/2.0.0.md. Physical global hotkey dispatch, real two-Mac iCloud
exchange and an installed native-to-Tauri upgrade are not claimed by these CI results.
The user's installed application remains unchanged.

## Published 2.0.0

[Release workflow 39404031790](https://github.com/onevalar/token-plan/actions/runs/39404031790)
passed from tag `v2.0.0` (`5be4b6e`) and published the stable release, download links and update
feeds. Public HTTP checks returned 200 for DMG, EXE, AppImage and DEB. Both the Tauri feed
(all four architecture keys) and native Sparkle transition feed announce 2.0.0 and reference
uploaded assets. Public SHA-256 entries match GitHub's recorded digests for every asset.
No installed local app was replaced; real two-Mac sync and installed migration remain the
explicit untested scopes above.

## Native migration regression found after publication

The installed 1.0.12 Sparkle log rejected 2.0.0 because the destination bundle omitted
`SUPublicEDKey`. Archive EdDSA validation and Apple notarization had passed, but they do
not cover Sparkle's prohibition on removing the existing application's signing key.
The 2.0.0 native feed entry has been withdrawn; published binaries remain immutable.
Production metadata now retains the original public key and the migration signer checks
the actual bundled Info.plist against release/update-config.json before advertising it.
Regression tests reject both a missing key and an unintended key change.

## 2.0.1 native trust regression fixed

Release workflow 39409802758 published v2.0.1 from `fc41d71`. Windows initially timed out
while navigating to the local test page before assertions; rerunning the failed job with
the same source and unchanged tests passed. Mac and Linux passed on the original attempt.
The actual bundled Info.plist passed the new native-key guard before publication.

The public 2.0.1 DMG was downloaded and its SHA-256 matched GitHub's asset digest. A
read-only mount then verified its Sparkle Ed25519 signature with the key captured from
the user's installed 1.0.12, checked the destination key is identical, validated its code
signature against that installed app's designated requirement, validated the stapled
notarization ticket, and successfully launched the bundled data helper. Both public
update feeds announce 2.0.1 and their assets/checksums were checked. The mounted image
was ejected; the installed app was not replaced, and the full installer flow was not run.

## Local-only history (2026-10-21)

The earlier cloud-sync verification notes above describe historical builds. Synchronization
and its signing/profile requirements have now been removed. Only local history is used;
old local data and remote documents are not deleted. Provider authentication, notifications
and updater signature verification retain their existing behavior.

## Adaptive panel and durable accounts (2026-10-21)

Regression fixtures cover a short dashboard, growing/shrinking when navigating, saved
accounts surviving absent credentials and restart, account switching without replacing
another identity, preserving notes/visibility, explicit removal, directory registration,
login guidance, failed detection and retry. Authentication uses synthetic data in these
tests; no real CLI login is switched or renewed.

Local Swift tests passed (1,579 XCTest cases, five skipped; six CLI cases; three Swift
Testing cases), along with 523 .NET core checks, bridge integration checks, 29 Rust checks
(one ignored), and frontend unit/build checks. All 72 shared navigation scenarios passed across
WebKit and the Windows/Linux Chromium configurations (including a targeted rerun after
correcting ambiguous test selectors). Native terminal login completion on actual
Windows/Linux desktops remains a separate acceptance check; browser platform variants
verify the shared UI rather than installed operating systems.

### Codex reconnect correction after 2.0.5

A saved single Codex account could be shown as disconnected when a Keychain item existed
(or its presence could not be verified), even though `auth.json` identified the same
account. The legacy plain observer intentionally leaves this case unresolved to avoid
misattribution. Account assembly now binds the discovered identity to a scoped runtime
in this case, including a Keychain-only login; it preserves the existing card ID and
continues rejecting credentials for another account. Regression fixtures cover a valid
file with an unusable Keychain entry and a Keychain-only login. This correction is not
included in the already published 2.0.5 installers.

The 2.0.6 correction adds explicit connection attribution in both bridges and the shared
protocol. UI regression checks distinguish network failure, access problems, expired login,
usage loaded and another active account. Keychain probing runs off the main thread, with
existing cross-account rejection tests retained. Windows/Linux database/file exceptions
no longer automatically tell users to sign in again. Local checks include the full Swift
suite, .NET core/bridge checks, Rust, and three-platform browser interaction tests.

Final local verification for 2.0.6: 1,581 Swift XCTest cases (five skipped), six CLI tests,
three Swift Testing cases, 523 .NET core checks, bridge integration checks, 29 Rust tests
(one ignored), 14 frontend unit tests, eight packaging-script tests, and 78 browser
navigation scenarios including targeted reruns. An isolated preferences suite was also
used against the user's existing Codex login: the saved card was attributed correctly
and three usage metrics were returned. No installed application was replaced. A separate
nonfatal local-history notice is now carried as `warning`, rather than reported as a
connection error. Synthetic fixtures cover incorrect-account rejection and reconnect UI;
real Windows/Linux terminal OAuth completion is not claimed by browser tests.

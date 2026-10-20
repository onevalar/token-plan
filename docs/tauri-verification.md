# Tauri migration verification

The migration keeps the native provider engines and uses a shared React/Arc interface.
Tests use synthetic accounts, isolated preferences and disposable signing fixtures; they do
not change the installed application or refresh real credentials.

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

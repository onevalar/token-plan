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
after quitting the old client. Existing native-only iCloud and advanced history features
remain documented in the migration boundaries.

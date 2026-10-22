# Releasing

Releases are cut from `main` by pushing an approved stable tag (`vX.Y.Z`); `.github/workflows/release.yml` does the building, signing,
notarizing and publishing, and the Tauri update feed in `updates/` follows. The version number and the go-ahead are always the owner's.

## Checklist

1. Write the notes: `script/preflight_release.py X.Y.Z --draft` prints the commit subjects since the last release as a starting point.
   Save the plain-language version as `release/X.Y.Z.md` (the workflow refuses empty notes) and commit it to `main`.
2. Run `script/preflight_release.py X.Y.Z` (add `--tests` to also run the unit, desktop and translation suites). It checks, without changing
   anything: the version is newer than the last release and its tag is unused; the notes are present and substantial; the tree is clean,
   on `main` and level with `origin/main`; the Tauri line is accepted and publication is enabled; the translation tables are generated.
3. When it says "Ready", push the tag yourself (the script prints the command, it never pushes):
   `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Watch the workflow. Real-machine checks (install, tray, sign-in, refresh on Windows and Linux) are not automated and stay yours.

## What is not released any more

The native macOS app (1.0.12 "classic") is frozen: its installer stays downloadable and nothing new is built from it. Updates, fixes and
features ship only in the 2.x Tauri line. Windows and Linux in-app updates use Tauri's updater (AppImage on Linux); the DEB package and the
NSIS installer are for first installs, see `docs/desktop-clients.md#installers`.

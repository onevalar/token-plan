# Releasing

Releases are cut from `main` by pushing an approved stable tag (`vX.Y.Z`); `.github/workflows/release.yml` does the building, signing,
notarizing and publishing, and the Tauri update feed in `updates/` follows. The version number and the go-ahead are always the owner's.

## Checklist

1. Write the notes: `script/preflight_release.py X.Y.Z --draft` prints the commit subjects since the last release as a starting point.
   Save the plain-language version as `release/X.Y.Z.md` (the workflow refuses empty notes) and commit it to `main`.
2. Run `script/preflight_release.py X.Y.Z --tests` before tagging. This includes unit, desktop, translation and three-platform UI regression.
   Install the Playwright Chromium and WebKit engines first (`npx playwright install chromium webkit` from `platforms/tauri`).
   The command also checks: the version is newer than the last release and its tag is unused; the notes are present and substantial; the tree is clean,
   on `main` and level with `origin/main`; the Tauri line is accepted and publication is enabled; the translation tables are generated.
   Without `--tests`, it only checks metadata and does not report the release as ready. Failed metadata or an earlier test stops the
   preflight before expensive UI regression; each executed stage prints its elapsed time.
3. When it says "Ready", push the tag yourself (the script prints the command, it never pushes):
   `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Watch the workflow. Real-machine checks (install, tray, sign-in, refresh on Windows and Linux) are not automated and stay yours.

## What is not released any more

The native macOS app (1.0.12 "classic") is frozen: its installer stays downloadable and nothing new is built from it. Updates, fixes and
features ship only in the 2.x Tauri line. Windows and Linux in-app updates use Tauri's updater (AppImage on Linux); the DEB package and the
NSIS installer are for first installs, see `docs/desktop-clients.md#installers`.

## Build time and cache reuse

- Main CI runs the same native regression checks as releases, without signing or packaging. It prepares the Rust Debug dependency,
  Swift build and NuGet caches on `main`, where future release tags can restore them. Tag-only caches cannot be reused by another tag
  ([GitHub cache scope](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache)).
  Keys include runner image, architecture, compiler versions, dependency locks and source commit. Restoring a cache never skips tests.
  Release-profile Rust binaries are still rebuilt; installers, signing credentials and update manifests are not cached.
- UI regression and native building/packaging run in separate jobs. Publishing still waits for both jobs on all three systems.
  UI tests remain serial within each job. Failed UI checks block publication even if an installer has already been built.
- `playwright.release.config.ts` collects every existing test once per platform: WebKit on macOS/Linux, Chromium on Windows.
  Shared regression and compact layout suites are disjoint and retain their respective viewport/motion settings. The original standalone
  Chromium/WebKit and preview commands remain available for targeted diagnosis; releases no longer run all three overlapping suites.
  `script/ci/check_ui_coverage.py` compares their inventories and fails if any case is missing or duplicated.
- Local preflight checks validate simulated platform behavior; Windows/Linux native webviews, helpers and packaging are checked on their
  cloud runners. Signatures, macOS notarization, signed helper startup and Ubuntu package migration checks remain required.
- The first run is a cold cache baseline. Compare later warm-cache runs of the same workflow before claiming a speedup. Browser system
  dependencies remain installed until a native Windows run proves they can safely be omitted.

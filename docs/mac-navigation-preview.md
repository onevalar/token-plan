# Shared desktop navigation

The owner approved the Windows/Linux rollout on 2026-10-21. Normal Tauri builds
now use the same React/Arc pages on all three systems. Native window, focus and
tray integration remain platform-specific. This change does not publish a release.

## Behavior

- Home offers Compact (default) and Comfortable spacing. The preference stays on
  this device; the previous macOS preview preference is preserved on upgrade.
- Home has matching icon-only Refresh/More actions. Inner pages have Back, a page
  title and only relevant actions. Back restores the prior screen, scroll, tab and
  history range. Escape closes a dropdown before dismissing the panel.
- Account details group quotas, benefits and history. All home metrics can be
  hidden. Notes save inline; removing an account requires confirmation and keeps
  the existing terminal login and history behavior.
- Settings group appearance, refresh, tray, notifications and shortcuts. Service
  configuration separates enabled accounts, adding accounts and reordering.
  History provides filtering, seven-day pagination and expandable model records.
- The production updater and About page remain available from More. Automatic
  updates keep the existing signed updater flow. iCloud sync remains removed.

## Tray indicators

- Each account can select up to three metrics. Both Swift and .NET bridges persist
  selections and icon position, reject a fourth metric, and preserve selections
  when switching between rings and percentages. The classic clients retain their
  existing two-metric editing limit.
- One/two rings support a centered or left-hand provider icon. Three rings place
  the icon on the left and the account number in the center of the rings. Their
  footprint is fixed whether numbered or not; changing the count does not move the
  provider icon. A single visible account has no number; 1–9 use digits, then +.
- Ring order follows the metric list, with outer/middle/inner labels in account
  settings. Permanent faint tracks remain visible for empty/missing usage. Progress
  follows the used/remaining preference. Non-percentage metrics use numeric values.
- macOS draws the indicators in one native template image, adapting to the menu-bar
  background. Windows/Linux reserve a square system-tray slot: it retains TokenPlan's
  app icon, while the popup shows the same clickable account indicators. The native
  tooltip/menu lists all three selected readings in saved account order.
- Windows/Linux persist the automatic-refresh switch without the classic client's
  old forced-enable migration. Existing preferences and local history remain intact.

## Verification and review

`npm run test:mac-preview` tests shared navigation with macOS/WebKit and
Windows/Linux/Chromium shell contracts in light/dark themes and all five languages.
These browser contracts do not substitute for native Windows/Linux desktop testing.
The packaging workflow runs the relevant navigation project on each actual OS.
`npm run test:ui` retains existing regression coverage with the new navigation.

Rust raster checks cover provider clearance, tracks, arcs, badge sizes, center
placement and all selected values. Swift pin tests and .NET bridge checks cover
selection limits and persistence without modifying installed preferences.

`RUSTUP_TOOLCHAIN=1.90.0 npm run preview:mac` builds the isolated review app at
`~/Library/Caches/TokenPlan/NavigationPreview.noindex/TokenPlan Design Preview.app`.
Close it before rebuilding. Its helper uses synthetic accounts in memory and never
reads credentials or installed preferences. Refresh, notifications and credentials
are simulated; real updater actions are disabled. The intermediate app is removed
to avoid duplicate search results. No production installation or update feed changes.

Screenshots in `screenshots/navigation-preview/` use synthetic data. The tray raster
sheet is exported by setting `TOKENPLAN_TRAY_REVIEW` while running `cargo test
tray_image`; it is the actual renderer composited onto light/dark backgrounds,
not a screenshot of a live system menu bar. Native outside-click and positioning
remain platform acceptance checks.

The 2026-10-21 rollout passed 54 shared navigation checks (18 per shell contract),
26 existing Chromium UI checks, 12 frontend unit checks, four packaging scripts,
24 Swift pin tests, 19 Rust checks and 523 .NET core checks plus bridge persistence
integration checks. One external-artifact Rust check is intentionally ignored.
The final update-page change also passed all three browser contracts. The isolated
macOS app was rebuilt, its signature verified, and its process relaunched. Native UI
automation timed out on the transient panel; visual acceptance here uses the WebKit
screenshots and exported native icon renderer. Windows/Linux native runtime behavior
has not been exercised on this Mac; the three-OS packaging workflow includes the new
navigation suite for subsequent native build validation.

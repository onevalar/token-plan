# Shared desktop navigation

The owner approved the Windows/Linux rollout on 2026-10-21. Normal Tauri builds
now use the same React/Arc pages on all three systems. Native window, focus and
tray integration remain platform-specific. This change does not publish a release.

## Behavior

- Home offers Compact (default) and Comfortable spacing. The preference stays on
  this device; the previous macOS preview preference is preserved on upgrade.
- Home has matching icon-only Refresh/More actions. Inner pages have Back, a page
  title and only relevant actions. Back restores the prior screen, scroll, tab and
  history range, and returns keyboard focus to the entry that opened it when still
  available. Escape closes a dropdown before dismissing the panel.
- Account details group quotas, benefits and history. All home metrics can be
  hidden. Percentages follow the used/remaining preference, including their screen
  reader names. Home and quota details keep the values and reset countdowns without
  a separate explanatory legend.
- Quota rows show the provider's actual period (such as 5h, 1w or 30d) separately
  from the model or allowance name. Names do not add extra rows. Long names are
  shortened with an ellipsis; their full text remains in account settings and
  screen-reader labels. No model information is discarded from the stored reading;
  an unknown period stays unknown rather than being guessed from the name.
  Countdown text precedes the hourglass. Missing readings and windows that have
  not started retain their status; balances and cumulative amounts remain text.
  Amp's non-periodic Orb allowance uses the short label Orb rather than a missing
  period and separate caption.
- Quota bars retain the service color until at least 80% is used (20% or less
  remaining), then both the bar and percentage turn red. The threshold is the same
  in Used and Remaining modes. Missing readings never signal a low quota.
  This display rule does not change the user's notification thresholds.
- Note and API-key drafts survive page navigation separately for each account, only
  in the running app's memory. They are not saved until Save is pressed and are lost
  when the app quits. Successful saves clear the draft; removing an account clears
  its drafts. Saving, success and retryable errors appear beside the field.
- Removing an account requires confirmation and keeps the existing terminal login
  and history behavior. Confirmation timers pause while keyboard focus is inside,
  just as they do on hover. Reduced motion keeps loading feedback without rotation.
- Manual refresh is shown on the refresh button itself: it spins while working, then
  shows a check or warning mark for a few seconds with a one-or-two-word label beside it
  (Refreshed, Not refreshed, Needs attention, Some failed, Refresh failed). "Refreshed" appears only when
  at least one account actually fetched new data; if nothing was fetched it says Not refreshed. There is no banner
  and nothing moves; the full sentence is only announced to screen readers.
- Account Management lists added accounts, including those hidden from Home. Turning a
  switch off keeps the row here, including after restarting; it does not send the account
  back to Add Account. Never-added service placeholders stay out of this list. Older
  versions did not record this distinction: previously hidden accounts can be added once
  from Add Account, after which hiding them preserves their membership.
- Add Account is an action inside Account Management, with a shortcut at the end of Home.
  Choose a service first, then use its available account or connection options. Claude
  and Codex offer an isolated terminal login and an existing-folder option. Adding returns
  to Account Management with confirmation; API-key services open settings first, with Back
  returning to Account Management. When all added accounts are hidden, Home offers Account
  Management rather than claiming there are no accounts.
- More groups Account Management, Usage History and General Settings together; Check for
  Updates and About form the second group, and Quit remains separate.
- An account's note is hidden behind Add Note (or shown as text with Edit) until wanted;
  an unsaved draft keeps the editor open. Removing an account sits in its own section at
  the bottom of the account settings, apart from notes and the API key.
- Problem cards carry one button for the next step: Try Again (temporary failures, refreshes just that account), Sign In Again
  (a CLI login that needs authorizing), Check Connection, Set API Key (opens the key field) or View Details. Each Home account has
  one heading/arrow entry into Usage; settings live in the detail page's Settings tab, not a neighboring hover shortcut. Window labels (5h, 1w) and reset countdowns have plain-language
  tooltips ("5-hour window", "Resets in 3h").
- First use shows a short welcome once (what appears automatically, what 5h/1w and the hourglass mean, where to add another login).
  Later, when an account is at 70% or more and every alert is off, one card offers to turn alerts on (asking for notification
  permission first). Both can be dismissed; the choice is kept per device in the webview's own storage and never in preferences.
- About shows the version, a one-line description, links to the project, release notes, issue reporting and license (opened by a native
  command that only accepts https links inside this project's repository), the OpenUsage credit and the no-analytics statement.
- Settings group appearance, refresh, tray, notifications and shortcuts. The menu-bar account list is collapsed behind a row that shows
  how many are selected. The three alerts
  share one card, and the tray account list is labelled as such.
  History provides filtering, seven-day pagination and expandable model records.
- The production updater and About page remain available from More. Choosing Check
  for Updates immediately starts a check and opens its status page. The page's check
  button remains available for retrying; reopening during a check does not start a
  second request. Opening an already-found update preserves that result. Automatic
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

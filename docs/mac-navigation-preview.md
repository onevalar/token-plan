# Shared desktop navigation

The owner approved the Windows/Linux rollout on 2026-10-21. Normal Tauri builds
now use the same React/Arc pages on all three systems. Native window, focus and
tray integration remain platform-specific. This change does not publish a release.

## Behavior

- Home offers Compact (default) and Comfortable spacing. The preference stays on
  this device; the previous macOS preview preference is preserved on upgrade.
- In Unified mode, General Settings › Usage Style offers eight Home Usage Styles, shown as one collapsed row with the
  current style; opening it shows a small drawing of every style at once: Bars (default), Gauges,
  Percentage Grid, Compact Rings, Quota Ruler, Concentric Rings, Numbers and
  Segmented Bar. The choice stays on this device, independently of spacing,
  used/remaining mode and tray style. It changes Home only, not account details
  or history. Each account and quota keeps its own reading; nothing is averaged
  or combined. Balances and existing history charts keep their original form and order.
- All styles show the same percentages and reset times as bars, including
  missing readings and windows that have not started. A grid has 100 whole cells,
  each representing one percentage point; fractions round to the nearest cell.
  Over-limit numbers are never clipped: a gauge stops at its endpoint but keeps
  the real percentage; a grid outside 0–100% shows the number without a grid.
  A segmented bar has 20 pieces with a partially filled last piece, so small
  changes are not rounded to a whole piece. Concentric rings pair adjacent quotas with different known periods in one
  account. Extra quotas remain as independent compact rings; a third model pool
  no longer disables the first pair. Each ring has its own name, number and reset time.
  Reopening Home and refreshing do not replay fill animations or celebrate exhaustion.
- These are independent quota displays, not combined goal rings, quota composition
  charts or forecasts without real data.
- Home has matching icon-only Refresh/More actions. Inner pages have Back, a page
  title and only relevant actions. Back restores the prior screen, scroll and
  history range, and returns keyboard focus to the entry that opened it when still
  available. Escape closes a dropdown before dismissing the panel.
- Account details group quotas, benefits and history. All home metrics can be
  hidden. Percentages follow the used/remaining preference, including their screen
  reader names. Home and quota details keep the values and reset countdowns without
  a separate explanatory legend.
  Benefits with expiry details expand on demand; their title and value remain visible
  when closed. Benefits without expiry details remain plain rows. Currency, credits
  and counts remain separate values, and unavailable amounts never become zero.
  Model details within a daily source record use a composition ring for recorded
  tokens, not quota or spending. The denominator is that source's total for that day;
  missing model assignments remain an unclassified portion, rather than enlarging
  known shares. Exact token counts and nested variants remain available. Model and variant costs
  use two decimal places, including the detailed readings; calculations retain their
  original precision.
  Zero, invalid or contradictory totals, or more than six nonzero portions, keep a
  list with an explanation instead. Unknown cost remains unknown. History summaries,
  daily totals and current quota details stay unchanged. Account removal uses a full-row
  action with an inline confirmation; terminal login and history remain available.
- Quota bar rows show the provider's actual period (such as 5h, 1w or 30d) separately
  from the model or allowance name. Names do not add extra rows. Long names are
  shortened with an ellipsis; their full text remains in account settings and
  screen-reader labels. No model information is discarded from the stored reading;
  an unknown period stays unknown rather than being guessed from the name.
  Countdown text precedes the hourglass. Missing readings and windows that have
  not started retain their status; balances and cumulative amounts remain text.
  Amp's non-periodic Orb allowance uses the short label Orb rather than a missing
  period and separate caption.
- Quota displays retain the service color until at least 80% is used (20% or less
  remaining), then both the graphic and percentage turn red. Alternative styles also
  name the near-limit, exhausted or exceeded state. The threshold uses the unrounded
  reading, not the displayed number or the filled cell count, and is the same
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
- Subscription Management lists added accounts, including those hidden from Home. Turning a
  switch off keeps the row here, including after restarting; it does not send the account
  back to Add Account. Never-added service placeholders stay out of this list. Older
  versions did not record this distinction: previously hidden accounts can be added once
  from Add Account, after which hiding them preserves their membership.
- Add Account is an action inside Subscription Management, with a shortcut at the end of Home.
  Choose a service first, then use its available account or connection options. Claude
  and Codex create a local pending record with an optional note and a private `.claude-accountN` or
  `.codex-accountN` directory, skipping existing folders. Login opens the official CLI in that folder;
  the default login is unchanged. Pending records survive navigation/restart and can resume in the same
  directory or be removed without deleting login files. Detection only completes that record when the
  engine identifies an account in its directory. An existing-folder option remains available. Adding returns
  to Subscription Management with confirmation; API-key services open settings first, with Back
  returning to Subscription Management. When all added accounts are hidden, Home offers Subscription
  Management rather than claiming there are no accounts.
- More groups General Settings, Subscription Management and Usage Statistics in that order; Check for
  Updates and About form the second group, and Quit remains separate.
- An account's note is hidden behind Add Note (or shown as text with Edit) until wanted;
  an unsaved draft keeps the editor open. Edit Home Display, Add Note and Remove Account
  form three full-width actions below the account details; removal asks for confirmation.
- Problem cards carry one button for the next step: Try Again (temporary failures, refreshes just that account), Sign In Again
  (a CLI login that needs authorizing), Check Connection, Set API Key (opens the key field) or View Details. Each Home account has
  one heading/arrow entry into Usage; account management is below the usage details; Home display changes use an explicit editor.
  The detail page offers the same Try Again and Set API Key buttons beside an error (sign-in help is already on the page). Window labels (5h, 1w) and reset countdowns have plain-language
  tooltips ("5-hour window", "Resets in 3h").
- First use shows a short welcome once (what appears automatically, what 5h/1w and the hourglass mean, where to add another login).
  Later, when an account is at 70% or more and every alert is off, one card offers to turn alerts on (asking for notification
  permission first). Both can be dismissed; the choice is kept per device in the webview's own storage and never in preferences.
- About shows the version, a one-line description, links to the project, release notes, issue reporting and license (opened by a native
  command that only accepts https links inside this project's repository), the OpenUsage credit and the no-analytics statement.
- Each setting has one home. General Settings groups, in order: Appearance and Language, Usage Style, Home (density, used/remaining), Menu Bar (macOS), Data Refresh, then notifications and shortcuts. The Menu Bar group holds everything
  about the menu bar: a live preview at the top, style and icon position, and every shown account with its switch; a switched-on
  account lists its metrics with plus/minus controls to add or remove up to three for the menu bar. Hints about three rings or value-only metrics appear
  only when they apply. Order comes from Subscription Management, linked with Adjust Order.
- Subscription Management shows or hides accounts on Home and sets their order (which the macOS menu bar also uses).
  Rows are not detail links: each has a display switch and an actions menu for removing the account, with inline confirmation.
  Sorting exposes drag handles, also operable with the keyboard arrow keys. During a drag the full row follows the pointer and neighbouring rows make space; releasing commits the order, while Escape or pointer cancellation restores it. Auto-scrolling keeps longer lists reachable. Reduced Motion removes the settling animation. Removing a service also works when it has no separate saved identity, without deleting its login or history.
- Account details have no tabs or duplicate global-setting links. View mode shows quota, history,
  three equal-width actions for Edit Home Display, note and confirmed removal, plus API-key fields where needed.
  Edit mode replaces the view with metric placement and ordering controls. Changes stay in a local
  draft until Confirm submits the whole layout; Cancel, the header back action and Escape discard
  the draft. Saving failures keep the editor open for retry. Windows and Linux share this account interaction.
- General Settings › Usage Style first selects Unified Style (default) or Customize by Account.
  Unified mode shows the shared style picker. Custom mode shows only guidance to open an account's
  Edit Home Display, where style joins metric placement and order in the confirmed draft. Accounts of
  the same provider are independent. The first switch to custom starts from the current shared style;
  switching back to uniform keeps custom choices for later restoration. Style never affects the menu bar.
- Notifications start with a master switch; enabling it reveals three alert options. Turning it off disables all alerts. The shortcut uses a compact recorder with an inline clear button. History provides filtering, seven-day pagination and expandable model records.
- The production updater and About page remain available from More. Choosing Check
  for Updates immediately starts a check and opens its status page. The page's check
  button remains available for retrying; reopening during a check does not start a
  second request. Opening an already-found update preserves that result. Automatic
  updates keep the existing signed updater flow. iCloud sync remains removed.

## Tray indicators

- On macOS, each account can select up to three metrics. Both Swift and .NET bridges persist
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
  background. Windows/Linux keep one transparent TokenPlan application icon, with
  no usage plate, border, duplicated Home strip or quota tray settings. Stored Mac
  menu-bar selections are retained but not exposed by these two platforms.
- Windows left-click directly shows Home beside the tray icon; right-click opens the native
  Show Home / Quit TokenPlan menu. Double-click has no separate action or single-click delay.
  Linux requests the same split through SNI Activate and its standard context menu. Some
  GNOME extensions always show a menu on left-click; Show Home remains available there.
  SNI has no distinct double-click callback. Show Home resets navigation, restores the window,
  raises it and requests keyboard focus. Valid activation coordinates anchor the panel near
  the icon; otherwise it centers on the current monitor (or primary monitor). Content resizing
  keeps that placement inside the work area. Linux coordinate reporting and window placement
  still depend on the desktop host/compositor, especially under Wayland.
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
are simulated; Check for Updates remains visible but explains that preview updates are disabled. The intermediate app is removed
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

Design builds also isolate pending-account records and new folders inside their own cache, refuse registration of real folders, and do not launch official CLI login commands, register system shortcuts, or send notifications. Account creation is for interaction review only; live authorization and usage require the production helper.

The owner accepted the revised account/settings pages and drag interaction on 2026-10-23.
The independent preview and its dedicated cache, preferences and WebKit data were removed;
the installed production app was left running. Shared browser checks passed on all three
shell contracts (277 checks plus the later focused drag checks). Rust checks passed with
one external-artifact check intentionally ignored. Windows/Linux native tray and window
behavior still needs target-system acceptance; browser checks do not verify those integrations.

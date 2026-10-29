# Shared desktop navigation

The owner approved the Windows/Linux rollout on 2026-10-21. Normal Tauri builds
now use the same React/Arc pages on all three systems. Native window, focus and
tray integration remain platform-specific. This change does not publish a release.

## Behavior

- Home offers Compact (default) and Comfortable spacing. The preference stays on
  this device; the previous macOS preview preference is preserved on upgrade.
- In Unified mode, General Settings › Usage Style groups related Home styles into ten
  categories. The collapsed row names the current variant; opening it shows the categories
  and their variant choices. Bars remains the default. The choice stays on this device, independently of spacing,
  used/remaining mode and tray style. It changes Home and the account detail's Current Quota,
  but not history or the menu bar. Each account and quota keeps its own reading; nothing is averaged
  or combined. Balances and existing history charts keep their original form and order.
- All styles show the same percentages and reset times as bars, including
  missing readings and windows that have not started. The original grid has 100 whole cells,
  each representing one percentage point; fractions round to the nearest cell.
  Over-limit numbers are never clipped: a gauge stops at its endpoint but keeps
  the real percentage; a grid outside 0–100% shows the number without a grid.
  A segmented bar has 20 pieces with a partially filled last piece, so small
  changes are not rounded to a whole piece. Concentric rings pair adjacent quotas with different known periods in one
  account. Extra quotas remain as independent compact rings; a third model pool
  no longer disables the first pair. Each ring has its own name, number and reset time.
  Reopening Home and refreshing do not replay fill animations or celebrate exhaustion.
  Tick Ring uses a separate marked dial for each quota. Its illuminated extent follows
  the same percentage; the number keeps the actual reading, including overflow.
  It is available in both Unified Style and each account's custom style.
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
  remaining), then both the graphic and percentage turn red. The fifteen new designs also
  visibly name the near-limit, exhausted or exceeded state; existing designs keep their prior presentation.
  The threshold uses the unrounded
  reading, not the displayed number or the filled cell count, and is the same
  in Used and Remaining modes. Missing readings never signal a low quota.
  This display rule does not change the user's notification thresholds.
- Note and API-key drafts survive page navigation separately for each account, only
  in the running app's memory. They are not saved until Save is pressed and are lost
  when the app quits. Successful saves clear the draft; removing an account clears
  its drafts. Saving, success and retryable errors appear beside the field. A key
  field states whether a key comes from the environment, is saved, overrides one, or
  is not set, and opens only when someone chooses Set API Key or Replace Key.
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
  an unsaved draft keeps the editor open. Edit Home Display, Add Note (or Edit) and
  Remove Saved Key (when a key is saved) use a wrapping action area
  below the account details. Removing a key asks for confirmation; removing an account
  remains a separate confirmed action.
- Problem cards carry one button for the next step: Try Again (temporary failures, refreshes just that account), Sign In Again
  (a CLI login that needs authorizing), Check Connection, Set API Key (opens the key field) or View Details. Each Home account has
  one heading/arrow entry into Usage; account management is below the usage details; Home display changes use an explicit editor.
  The detail page offers the same Try Again and Set API Key buttons beside an error (sign-in help is already on the page). Window labels (5h, 1w) and reset countdowns have plain-language
  tooltips ("5-hour window", "Resets in 3h").
- First use shows a short welcome once (what appears automatically, what 5h/1w and the hourglass mean, where to add another login).
  Later, when an account is at 70% or more and every alert is off, one card offers to turn alerts on (asking for notification
  permission first). Both can be dismissed; the choice is kept per device in the webview's own storage and never in preferences.
- About shows only the product icon, name, version and the no-analytics/no-crash-report statement.
  Project links and attribution text are removed from this page; packaged license files remain unchanged.
- Each setting has one home. General Settings groups, in order: Appearance and Language, Usage Style, Home (density, used/remaining), Menu Bar (macOS), Data Refresh, then notifications and shortcuts. The Menu Bar group holds everything
  about the menu bar: a live preview at the top, style and icon position, and every shown account with its switch; a switched-on
  account lists its metrics with plus/minus controls to add or remove up to three for the menu bar. Hints about three rings or value-only metrics appear
  only when they apply. Order comes from Subscription Management, linked with Adjust Order.
- Subscription Management shows or hides accounts on Home and sets their order (which the macOS menu bar also uses).
  Rows are not detail links: each has a display switch and an actions menu for removing the account, with inline confirmation.
  Sorting exposes drag handles, also operable with the keyboard arrow keys. During a drag the full row follows the pointer and neighbouring rows make space; releasing commits the order, while Escape or pointer cancellation restores it. Auto-scrolling keeps longer lists reachable. Reduced Motion removes the settling animation. Removing a service also works when it has no separate saved identity, without deleting its login or history.
- Account details have no tabs or duplicate global-setting links. View mode shows quota, history,
  an action area for Edit Home Display and note, with Remove Saved Key on a full-width row when a key is saved,
  plus API key status where a key is supported. Current Quota uses the account's effective
  Home usage style, so a per-subscription style change is reflected as soon as the editor closes.
  Edit mode replaces the view with metric placement,
  ordering and per-subscription style controls. Every placement, order and style change saves
  immediately; a rejected layout restores the last accepted one with a retryable error, while the
  header Done or Escape leaves the editor without another write. Windows and Linux share this account interaction.
- General Settings › Usage Style first selects Unified Style (default) or Per Subscription.
  Unified mode shows the shared style picker. Custom mode shows only guidance to open a subscription's
  Edit Home Display, where style joins metric placement and order in the same immediately saved editor. Accounts of
  the same provider are independent. The first switch to custom starts from the current shared style;
  switching back to uniform keeps custom choices for later restoration. Style never affects the menu bar.
- Notifications start with a master switch; enabling it reveals three alert options. Turning it off disables all alerts. The shortcut uses a compact recorder with an inline clear button. History provides filtering, seven-day pagination and expandable model records.
- The production updater and About page remain available from More. Choosing Check
  for Updates immediately starts a check and opens its status page. The page's check
  button remains available for retrying; reopening during a check does not start a
  second request. Opening an already-found update preserves that result. Automatic
  updates keep the existing signed updater flow. iCloud sync remains removed.
- An available update is a reminder, not a permanent banner: on Home, a compact Update button
  with the version sits immediately left of Refresh. Detail, Settings and other pages do not
  carry it.
  It opens the Updates page. Skip This Version remembers the dismissal per version
  on the device and removes the header button; installation stays available from
  the Updates page, and the next new version can remind again.
- Home's cell grid is drawn without a caption describing percentages; the grid
  itself carries the meaning, and its accessible label names the metric.

## Tray indicators

- On macOS, each account can select up to three metrics. Both Swift and .NET bridges persist
  selections and icon position, reject a fourth metric, and preserve selections
  when switching between rings, percentages and Token Trend + Values. The classic clients retain their
  existing two-metric editing limit.
- Token Trend + Values draws recorded daily tokens for the last 14 local calendar days,
  including today, next to the provider icon. Today's token count is above the selected
  current readings. The line is not quota history or a prediction, and switching between
  Used and Remaining never inverts it or joins different quota windows.
  Only dated daily history is used, not the older undated/zero-filled metric charts.
  Missing days break the line, an explicit zero stays zero, and one record stays a dot.
  With no recent history it shows selected values only; no selected metrics means icon only.
  Device-scoped history appears once per provider among visible pinned accounts with data;
  account-scoped records remain separate. An asterisk marks partial or invalid history.
  Invalid dates/counts and duplicate dates are omitted and diagnosed rather than summed.
- The native menu-bar style is saved separately from the Home style. The Mac helper uses
  `tokenplan.desktop.trayStyle`, initially inheriting the existing classic selection without
  changing it. Windows/Linux retain this setting in `tauri-session.json` but still show only
  the application icon. No classic SwiftUI view, store or menu style is extended.
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
placement, dated-token gaps, zero records and all selected values. Swift pin/style tests
and .NET bridge checks cover selection limits and persistence without modifying installed
preferences. `TOKENPLAN_TREND_REVIEW=/absolute/path.png cargo test --manifest-path
src-tauri/Cargo.toml export_native_trend_review` exports the actual native trend renderer
on light/dark backgrounds. This is raster output, not a live macOS menu-bar screenshot;
native behavior needs separate macOS acceptance, with the scope recorded below.

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

### Tick Ring and Token Trend Acceptance, 2026-10-24

An independent macOS copy matched the implementation handoff. It passed four Swift
style tests, 37 Rust checks (one signed-artifact check ignored), 47 frontend tests,
eight packaging-script tests and 36 macOS WebKit checks.

The native Tauri preview used its Python fixture, not real accounts. The app's light
and dark appearances showed independent tick readings, the actual system menu bar kept
the token trend visible with the panel closed, and the Home style survived app restart.
Refresh was exercised against fixture state, not a live provider. This does not prove
that every refresh replaces the native image; unchanged images can be reused.

The real Swift helper compiled but was not run. `TOKENPLAN_DEFAULTS_SUITE` isolates
preferences, not account discovery, credential files or Keychain access, including
initialization before a state/settings request. Do not use a fresh defaults domain as
a guarantee that a real helper cannot read installed accounts. Fixture restarts and
standalone preference tests do not verify the real helper's cross-process persistence.

Real Swift-helper/Tauri save-and-restart, live-account refresh, macOS system-wide
light/dark switching, VoiceOver and constrained multi-account menu-bar width remain
unverified. App-theme screenshots and composited raster images do not replace these checks.

Home style selection has ten categories: Bars, Cells, Rings, Instruments, Cycles,
Containers, Editorial & Numbers, Side-by-Side Columns, Status Lights and Border Progress.
Instruments and Cycles each add three variants. The other nine new variants join related
existing categories: cursor rulers under Bars, dot matrix and slanted grille under Cells,
segmented battery under Containers, and quota ticket, used/remaining and number spine under
Editorial & Numbers. Existing choices and their saved identifiers remain valid; nothing
is replaced just because it shares a category. Both global and per-account selectors
preview the selected variant with labelled sample data using the same Home renderer.

The new designs retain fractional and over-limit readings. Only the graphical extent
is bounded to 0–100%; a missing reading is not zero. Each quota opens its exact reading
and reset details; closing returns focus to its entry. Cycle views show elapsed time only
when the provider supplies a usable period and reset. Elapsed time is independent of
Used/Remaining mode, and no cycle is invented for missing or invalid windows. Money and
credits keep their original order among quotas. The two exploration pages remain separate
and are not imported by the application.

Style variants and forecast, shape and cell-count options use aligned dropdowns.
The sample preview is inset inside its settings group with the shared control radius.

- Single-ring readings keep the percentage inside its own arc, with the period and reset time together beside it. Adjacent quota groups have a wider gutter in Home, account details and style previews.

- Border Progress aligns its period and reset time against the right edge, matching the Full-Width Card. Key removal has its own full-width control so localized labels and confirmation actions fit.

### Statistics display settings

Usage Statistics has its own Display Settings, shared by the macOS, Windows and Linux interface.
Seven modules can be enabled and reordered by dragging or the handle's arrow keys. Style choices,
visibility and order persist locally. Enabling a module or choosing a variant opens an inline
preview using the selected accounts' actual recorded history, not demonstration data.

- Usage Overview: Simple Totals, Arc Summary, Editorial Summary or Mini Instruments.
- Usage Activity: Activity Calendar, Folded Bands, Daily Bars, Pulse Calendar, Pixel Equalizer or Cumulative Paths.
- Source Composition: Source Treemap, Source List, Concentric Tracks, Waffle Share or Additive Steps.
- Period Comparison: Paired Dots, Parallel Trends or Change Waterfall.
- Personal Cost Reference: Reference Dial, Reference Cells or Reference Ruler.
- Quota Changes: remaining-quota samples or original observations.
- Daily Records: the existing date, account and model drill-down.

Home styles remain independent. The chart measure switches between recorded tokens and known
costs; Personal Cost Reference always uses costs. Source entries in the new charts open recorded
model details. Closing details returns focus to the exact control that opened them.

All history charts use the same filtered, deduplicated local records as their totals. Missing
dates and unknown costs remain unknown, not zero or free usage. Source shares divide recorded
tokens or known costs, never a subscription allowance. Fractional costs below one cent stay
visible. Period comparisons use the preceding, nonoverlapping period of equal length. A missing
account/day, a partial-history flag or an unknown cost suppresses the affected change calculation;
a zero prior total never produces an invented growth percentage. Missing days break cumulative
paths, and later incomplete totals are labelled as known lower bounds.

Personal Cost Reference is optional and starts off. The user supplies a whole-dollar USD amount
from 0 to 1,000,000; zero disables comparison. It is saved only on this device, separately by
account selection and 7-/30-day range. It is not a provider balance, spending limit, bill or
forecast. Incomplete history cannot claim a remaining amount; known overages are lower bounds.

Quota charts select one account/metric/unit series at a time: percentage observations become
remaining quota (100 minus recorded usage), while balance observations retain their native value.
Lines stop at missing samples, resets and gaps over 90 minutes; they do not predict future usage
or reconstruct missing history. No quota series is derived from token logs.

The shared interface also saves actual successful percentage samples locally while TokenPlan is running, retaining at most 30 days / 2,400 points per account (one latest reading per hour and metric). Samples keep the provider's fetch timestamp. They are cleared when an account is removed or its identity changes. This supplies future observations on macOS, whose helper does not expose older quota samples; it cannot recover time before collection began. Backend-provided observations remain available on Windows/Linux. Storage failures are reported on the statistics page.

Display Settings and detailed modules apply to Last 7 Days and Last 30 Days. Today and Yesterday
show the selected overview and daily records independently of those module switches. Fresh
settings retain the simple overview, activity bars, source list, quota line and daily records;
comparison and personal reference start disabled. Existing four-module preferences retain their
order, styles and visibility when the new modules are added. The toolbar is labelled Detailed
Statistics. Daily charts expose exact readings through pointer or keyboard selection, including
an explicit missing-data state. All new controls and explanations ship in the five app languages.

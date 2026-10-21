# macOS navigation review

This review is opt-in. `VITE_MAC_NAVIGATION_PREVIEW=1` enables the new screens only
when the native shell identifies itself as macOS. Normal builds retain the existing
interface. Windows/Linux rollout and release packaging wait for the owner's design review.

## Behavior

- Home defaults to Compact spacing with a Comfortable option in General Settings.
  Density persists on this Mac; fonts and selected metrics are unchanged.
- Home keeps the brand and matching icon-only Refresh/More actions. Inner screens have a back button, their
  own title and only relevant actions. Settings never refresh provider usage.
- Back returns to the actual entry screen, preserving its scroll, account tab,
  history range and service reorder mode. Escape dismisses a dropdown first, then
  the panel. Closing the panel does not clear its navigation state.
- Account usage separates current quota, balances/benefits and a single history
  summary. Expiration dates expand on demand. History metrics remain visible when
  daily log rows are unavailable; unknown prices are not converted to zero.
- Account settings separate visibility, metric placement and account management.
  Every homepage metric can be hidden. Removal still requires confirmation and
  preserves the existing CLI login/history semantics. Note and Save share one row;
  Save, Clear Key and Remove actions align on the right.
- General preferences group appearance, refresh, menu bar, notifications
  and shortcut controls. Refresh interval appears only when enabled. Synchronization has been removed from both Mac clients, the protocol and packaging;
  local history remains intact.
- Service configuration starts with enabled accounts. Add Service is a separate
  searchable screen. Reorder mode replaces visibility switches with movement controls.
  Movement skips saved inactive accounts.
- Usage history is a separate home-menu entry, with account filtering, date ranges,
  seven-day pagination and expandable account/model records. Its refresh targets only
  the account when entered from an account detail.

## Local review

From `platforms/tauri`:

```sh
npm run test:mac-preview
npm run preview:mac
```

The second command builds a real Tauri macOS application with the existing preview
bundle identifier. It replaces the data helper **inside that disposable bundle** with
`scripts/preview-fixture.py`. The helper uses generated example accounts in memory,
does not read credentials or installed preferences, and does not contact providers.
Account edits reset when the preview exits; the density preference persists locally.
Notifications, credential saving
and subscription refresh are simulations in this bundle; they are not end-to-end
provider integration tests. Update installation is deliberately absent from this
design preview; the default application keeps its updater.

The review app is in
`~/Library/Caches/TokenPlan/NavigationPreview.noindex/TokenPlan Design Preview.app`.
Close it before rebuilding. The intermediate `.app` is removed after the review
bundle is prepared. No installed application, release tag or update feed is replaced.

## Verification (2026-10-21)

- Xcode 27.1 (27A9275), selected from `/Applications/Xcode.app`.
- TypeScript/Vite build and macOS Tauri debug bundle succeed.
- Fourteen preview WebKit tests pass: navigation return state, account-only refresh,
  automatic refresh visibility, setting failure feedback, service reordering and
  removal, history scope and pagination, missing prices, metric-only history,
  dropdown Escape handling, density persistence, aligned account actions, and 390px
  light/dark layout in all five languages.
- Twenty-six existing interface tests pass on macOS WebKit with the preview disabled.
- Twelve existing unit tests and four packaging/feed script tests pass.
- Swift local-history regression tests pass (1,575 tests, five intentionally skipped);
  thirteen Rust tests pass (one ignored), including four native tray image tests, including all-provider ring clearance and template transparency.
- Native panel checks cover account navigation, account configuration, dropdowns,
  appearance changes and Escape/reopen state. This revision also verifies the
  Compact/Comfortable switch and saving a note through the native webview. The final bundle was rebuilt and
  reopened after fixing a native WebKit scroll that displaced the header; both
  account tabs now keep their header visible. The opaque content background also
  preserves quota-track contrast over the native translucent window.
- Physical outside-click dismissal and tray positioning remain manual acceptance;
  injected app switching did not give a conclusive controlled focus-loss result.
  The Mac tray now sizes each provider mark according to its SVG padding, using a
  shared size table for native rings and the settings preview. Geometry checks cover
  one/two rings for all providers and keep clear space between the mark and the ring.
  Template alpha rendering is retained for light/dark menu bars.

Screenshots use synthetic data in `screenshots/navigation-preview/`.

# Svelte Migration Regression Ledger

The first complete Chromium run had 155 passes, 28 failures and 3 skips.
This ledger retains every failed case; no case was deleted to obtain a pass.
Source and target comparison runs use Chromium 147.0.7727.15 with matched
viewports, locale, timezone, reduced-motion setting and fixture clock.

## Classification of the Original 28 Failures

Totals: **5 old-structure assertions, 23 real regressions, 0 environment failures**.
Where a structure assertion masked a later behavioral failure, the case is
classified as a real regression, not excused as an obsolete selector.

| # | Existing Case / File | Class | Coverage / Resolution |
| --- | --- | --- | --- |
| 1 | `history-layout`: daily records, light | Real | Retain currency/variant values and all five minimum-8px inset/gap assertions; correct migrated button layout. |
| 2 | `history-layout`: account removal, light | Real | Retain width difference below 2px, height at least 44px, cancel and one explicit confirmed remove request. Latest installed package passes all three platform configurations; actual button/zone both 340×44px. |
| 3 | `history-layout`: daily records, dark | Real | Same unchanged record spacing and amount contract as #1. |
| 4 | `history-layout`: account removal, dark | Real | Same unchanged destructive-action contract and measured 340×44px button/zone as #2. |
| 5 | `home-usage-style`: ticks, used | Old structure | Replace Pro-only `strong`/SVG-mask assertions with exact visible reading, named bounded meter, missing-value absence, no focusable decoration, refresh without entrance animation; same case retained. |
| 6 | `home-usage-style`: ticks, remaining | Old structure | Same coverage as #5, including negative remaining and overflow; independent TickMeter unit cases retain graphic-boundary coverage. |
| 7 | `home-usage-style`: compact Numbers | Real | Restore the original 36px reading; retain 1/2/3-column, mixed-row order and narrow-width assertions. |
| 8 | `home-usage-style`: localized labels, English | Real | Fix actual tile overflow and single-column specificity; retain measured widths and row alignment. |
| 9 | `home-usage-style`: localized labels, Simplified Chinese | Real | Same original observable layout assertions as #8. |
| 10 | `home-usage-style`: localized labels, Traditional Chinese | Real | Same original observable layout assertions as #8. |
| 11 | `home-usage-style`: localized labels, Japanese | Real | Same original observable layout assertions as #8. |
| 12 | `home-usage-style`: localized labels, Korean | Real | Same original observable layout assertions as #8. |
| 13 | `home-usage-style`: Primary Dial, used | Real | Allow long quota-label buttons to shrink/wrap without pushing readings outside the tile; retain geometry and precision assertions. |
| 14 | `home-usage-style`: Primary Dial, remaining | Real | Same original geometry and negative/overflow readings as #13. |
| 15 | `home-usage-style`: Folded Ruler, used | Real | Same shrinking label fix; retain original fold geometry, values and theme/width cases. |
| 16 | `home-usage-style`: Folded Ruler, remaining | Real | Same unchanged contract as #15 with remaining readings. |
| 17 | `interface`: quota emphasis, used | Real | Correct rendered critical text contrast using Valar colors; retain independent canvas color measurements and the original contrast floors. |
| 18 | `interface`: quota emphasis, remaining | Real | Same contrast and real-used threshold contract as #17; no double inversion. |
| 19 | `interface`: confirmation timeout and internal focus | Old structure | Replace Arc `data-mode`/face selectors with named group, Confirm/Cancel buttons and actual focus; keep both 6200ms focus waits and timeout after leaving. |
| 20 | `interface`: reduced-motion pending spinner | Real | Old selectors also changed, but missing pending graphic was real: use Valar Spinner, localized live status and no pending action buttons; retain animation stops/resumes across media changes. |
| 21 | `interface`: transparency slider keyboard/shortcuts | Real | Restore four arrows, Shift and Page double-step, Home/End; modified application shortcuts remain unconsumed. Original key/value table retained. |
| 22 | `statistics-display`: fractional comparison and return focus | Old structure | Select named Estimated Cost radio instead of Arc button, assert checked state; retain independently calculated fractional totals, deltas, ArrowDown/Enter/Escape and range navigation. |
| 23 | `statistics-display`: incomplete source days | Old structure | Same radio adaptation; retain Difference Unavailable, absent waterfall and keyboard calendar assertions. |
| 24 | `tray-trend`: English | Real | Adapt active-option assertion to focused combobox plus `aria-activedescendant`; then fix rejected-save selection rollback and restore sparkline styling. Same End/Enter, requests, readings, gaps and platform restrictions remain. |
| 25 | `tray-trend`: Simplified Chinese | Real | Same complete operations/results as #24. |
| 26 | `tray-trend`: Traditional Chinese | Real | Same complete operations/results as #24. |
| 27 | `tray-trend`: Japanese | Real | Same complete operations/results as #24. |
| 28 | `tray-trend`: Korean | Real | Same complete operations/results as #24. |

All 28 retained cases pass in the final post-morph static-production platform
run: **719 passed, 22 Mac-only skips, 0 failed and 0 flaky** across all 741
entries, in 11.6 minutes. macOS passes 247; Windows/Linux configurations each
pass 236 and skip 11 Mac-only cases. Removal-width cases #2/#4 were fixed, not
waived. Evidence: `.amp/in/svelte-release-final.{json,log}`, started
2026-11-08T00:34:33.809Z; the main record separates earlier passing/failed runs.

## Additional Acceptance Findings

These were found by broader acceptance and are separate from the original 28.

- WebKit quota disclosure Tab order and shortcut recorder pointer focus:
  original passes on WebKit 27.2 but target did not. The library now retains
  explicit button tabindex, including caller overrides and disabled exclusion.
  All three platform configurations pass the original disclosure/shortcut cases.
- Route focus: do not refocus a heading when only an editing flag changes, and
  do not defer heading focus past a child field's own focus. Existing WebKit
  390px light/dark navigation and direct API-key recovery cases now pass.
- Five-language benefit disclosure: replace Arc-specific inert-panel checks
  with invisible/no-accessible-dates checks, but retain all amounts, exact
  dates, Enter/Space, Escape, focus restoration and unchanged surrounding
  quota/history. Missing Escape behavior was fixed, not accepted. All five
  WebKit language cases now pass.
- The first static RulerSlider composition lost moving-tape/wheel/inertia
  behavior. It was rejected, not accepted as equivalent. Native tape physics
  restores drag, tap spring, inertia, wheel, catch and boundary cancellation.
  The matched ruler run passes 21 equivalence checks and the reset correction
  below; the actual App's wheel/save/reload/range-isolation case also passes.
- The long-running comparison server retained an old optimized Valar package
  after its same-version tarball was refreshed. A fresh test server already
  passed; restarting comparison with forced optimization restored the same
  340×44px full-width button. The launcher now forces optimization on startup.
  Repeated home/settings/focus comparison passes against the refreshed pane.

## Later Environment Interference: Development Hot Update

The first post-morph full run had 718 passes, 22 Mac-only skips and one timeout
in the macOS pending-spinner case. This is an **additional environment failure**,
not one of the original 28 (whose 5/23/0 classification remains unchanged).

The retained trace proves the failure: after opening removal, during the 300ms
double-click guard, Vite hot-updated App/AccountDetail and their children. The
route remounted as Home before the second click. At exactly 08:19:04, a concurrent
Tauri before-build command rewrote the unchanged provider translation JSON.
The spinner assertions were never reached. No product assertion was removed or
weakened, and this failed run is preserved rather than reported as a pass:
`.amp/in/svelte-release-morph-first.{json,log}` and
`.amp/in/artifacts/morph-first-failure-trace.zip`.

Release acceptance now builds first and serves the **static production bundle**,
not a development/HMR session. That also prevents trace-output HTML from
triggering reloads. The actual served entry is `/assets/index-DOx7znmR.js`, with
no Vite HMR client. All nine repeats of the unchanged spinner case (three per
platform configuration) pass. The fresh complete static-bundle run also passes:
719 passed, 22 platform skips, no failures/flakiness/global errors. Its result
is recorded separately from the interrupted run in the main migration record.

## Intentional Visual Adaptation: Native Confirmation Morph

The supervisor rejected replacing Arc's visible shape feedback with an instant
state swap. Valar now provides independent native Svelte size, radius and content
transitions; the fresh package is installed in TokenPlan. This is **not an
equivalence pass**, copied spring parameters, or a waiver of missing interaction.

- Independently chosen duration: envelope 120ms, incoming content 80ms, outgoing
  visual 60ms. Real actions and focus never await the animation. Outgoing visuals
  are inert, accessibility-hidden and stripped of duplicate live/focus identities.
- Chromium 147 matched timing observations: compact source 242–449ms / target
  121–142ms; full-width source 162–240ms / target 121–149ms. All 44 paired
  normal-motion timing budgets pass across both themes and 11 state transitions.
- 176 timelines retain 9,628 post-command target focus assertions. Exactly one
  live status remains; the expected real control/root has focus throughout.
  Reduced motion switches directly, without morph/ghost or faded final content;
  live preference changes and mid-flight cancellation also pass.
- App integration: all 8 Chromium 147/WebKit 27.2 × light/dark × motion cases
  pass. Every sampled opening frame preserves Confirm focus and a single live
  status. Cancellation responds within 18ms during morph; failed removal can
  retry successfully, without duplicate requests. Full-width idle is 340×44px.
- Evidence: `.amp/in/artifacts/valar-confirm-morph/timings.json` and inspected
  start/intermediate/end captures, plus App `artifacts/app-morph/results.json`
  under `.amp/in/`. The retained Valar `check-confirm-morph.mjs` reproduces
  timing, focus, reduced-motion and interruption checks. No Arc motion source,
  CSS or curve parameters were copied. No actual screen-reader claim is made.

The 741-case post-morph static-production run passes 719 with 22 Mac-only skips,
separately from the earlier pre-morph passing run. This confirms the executed
integration contract; it does not turn the visual adaptation into equivalence.

## Intentional Deviation: External Reset Wins Over Inertia

This is **not an equivalence pass** and is separate from the 28 failures above.
The supervisor approved retaining the correction instead of reproducing the
original race.

- Reproduction: with normal motion, flick the ruler from 400 at spacing 2,
  release, then request an external reset to 600 before inertia finishes.
  Two pre-reset samples must prove the tape is still moving and has not yet
  emitted its final commit.
- Original: the queued Motion update writes an old value after the reset.
  In the latest matched run, the final readout was 428 while the tape was at
  the 600 position. Its event trace ends `reset: 600`, `value: 428`.
- Svelte: stops old inertia and honors the external value. The readout is 600,
  the offset is -1200px, the trace ends `reset: 600`, and **no change or commit
  follows the reset**, including after a 2600ms settle window.
- Why this is a source defect: stale state overwrites a newer explicit value,
  making the displayed/saved state incorrect. Reproducing it would compromise
  data correctness, not preserve a useful interaction.
- Retained assertion: Valar's
  `standards/comparisons/tokenplan/check-ruler.mjs` checks active motion,
  final value, offset and the complete post-reset event slice. The normal-motion
  case has `kind: intentional-deviation`; reduced motion is a separate matching
  control. Both passed on Chromium 147.0.7727.15 at the same 480×1800 viewport.
  Evidence: Valar `.amp/in/artifacts/ruler-browser.json` and
  `.amp/in/ruler-reset-final.log` (22 cases: 21 equivalence checks plus this
  target-correctness check; runtime/resource errors empty).

## Skips and Limits

The first generic Chromium configuration does not provide platform metadata.
Its three skipped cases are `desktop-platform` selected menu-bar inverse labels
(light/dark) and native-transparency changes: their existing guards require
`platform=macos`. They are executed by the macOS platform suite, not removed.

Windows and Linux configurations each skip the following 11 cases (22 total).
macOS executes them. These are platform applicability checks, not hidden failures.

| Retained Case | Count Per Non-Mac Platform | Exact Reason |
| --- | --- | --- |
| `desktop-platform`: selected menu-bar inverse labels, light/dark | 2 | Menu-bar metrics are macOS-only. |
| `desktop-platform`: native transparency changes | 1 | NSWorkspace is macOS-only. |
| `desktop-platform`: native appearance failure/retry | 1 | Native panel appearance is macOS-only. |
| `desktop-platform`: older appearance success/failure cannot replace latest | 2 | Native panel appearance is macOS-only. |
| `navigation-preview`: ring layout and three metrics, light/dark | 2 | Live menu-bar metrics are macOS-only. |
| `navigation-preview`: three-ring badges | 1 | Live menu-bar metrics are macOS-only. |
| `navigation-preview`: menu-bar account switches/metric choices | 1 | Live menu-bar metrics are macOS-only. |
| `tray-trend`: reopened settings and missing history | 1 | Menu-bar metrics are macOS-only. |

The separate Rust `update_tests::verify_packaged_update` test is ignored locally:
it requires the signed update artifact produced by CI packaging. The remaining
42 Rust tests pass; no production release was triggered to obtain that artifact.

All browser service responses are synthetic. Real account refresh, OS permission
dialogs, terminal launch, native notification delivery, screen readers and real
touch hardware are not proved by browser tests. No claim of pixel identity or
universal browser/device equivalence follows from this ledger.

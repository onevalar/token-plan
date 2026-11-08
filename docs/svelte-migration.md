# Svelte / Valar Migration

## Acceptance Boundaries — Read First

Acceptance covers the executed browser fixtures, matched original/target checks,
builds and tests below. It does **not** establish the following release readiness:

- Real-account authentication, refresh and provider responses are unverified.
- Real OS permissions, notification delivery and terminal launch are unverified.
- Windows/Linux physical desktops are unverified; platform configurations ran
  with their corresponding browser engines on this Mac, not those operating systems.
- Physical touch input and actual screen-reader behavior are unverified.

These limits remain open despite the 719-pass/22-skip static-production result.

## Scope and baseline

This branch replaces the maintained Tauri interface, not the Swift and .NET data
helpers. The owner explicitly selected Svelte and Valar instead of React and Arc.
Account data, provider requests, native commands, translations, storage keys and
update verification must retain their existing contracts.

- Source: `c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4`, React 19.3.1,
  Vite 6.4.4, TypeScript 5.9.3.
- Target: Svelte 5.57.3 runes, Vite 7.3.7, TypeScript 5.9.3 and local Valar UI
  0.1.0. Library commands use Node 24.22.2 and pinned `npx pnpm@12.14.0`;
  no global Node/Corepack configuration was changed.
- Original runnable source is preserved locally in `.amp/in/react-baseline/`.
  This is comparison-only and must never be bundled into the application.
- Reusable UI comes from `onevalar/valar-svelte`, maintained locally beside this
  repository. Components missing there are added there first, then consumed here.
- No package publication, main-branch merge or release is part of this migration.

## Component inventory

Valar already provides Button, Input, Switch, Select, Dropdown Menu, Slider,
Collapsible, Dialog, Toggle Group, and other foundation components. These are
reused rather than copying the corresponding Arc implementations into the app.

| Capability missing from Valar | Target library component | Provenance / decision | Status |
| --- | --- | --- | --- |
| Bounded quota arc with exact overflow readout | Gauge / GaugeArc | Free MIT adaptation; retained notice | Built and checked |
| Whole-cell chart allocation | WaffleChart | Free MIT adaptation; allocation and accessible label retained | Built and checked |
| Fixed-denominator model composition | StaticDonut | Free MIT adaptation; missing records not renormalized | Built and checked |
| Calendar-slot line with missing-day breaks | StaticSparkline | Free MIT adaptation; zero is not missing | Built and checked |
| Tick-marked numeric adjustment | RulerSlider | Native Svelte moving tape; static-slider capability loss rejected | Tape, inertia, wheel, cancellation and App persistence pass |
| Overflowing segmented choices and keyboard selection | SegmentedControl | Native Svelte composition; radio semantics | Built and checked |
| Inline asynchronous confirmation | ConfirmAction | Pending, retry, cancel, timeout and independent native morph; MIT notice | Fresh package integrated; library comparison and 8 App theme/motion/engine combinations pass |
| Read-only radial tick quota | TickMeter | Independently authored SVG; no Arc Pro source/CSS | Built and checked |
| Canvas quota textures | TextureFill | Reusable native Svelte rendering; app-local duplicate removed | Built and checked |

Arc Pro Tick Ring cannot be redistributed in a component library. The replacement
is built from the product contract (percentage, exact reading and warning state),
not from that implementation. Visual differences here are intentional; quota
meaning must not change.

## Acceptance contract

| Area | Required observable result | Status |
| --- | --- | --- |
| Navigation | Back restores origin, scroll, range and keyboard trigger; Escape closes overlays first | Final static-production three-platform fixture suite passes |
| Home | All quota styles, account grouping, missing/overflow, countdowns and used/remaining | Final static-production three-platform fixture suite passes |
| Accounts | Add, detect, resume, hide, sort, edit, drafts, confirmations and failures | Final suite and 8 App morph combinations pass; full-width button/zone both 340×44px |
| Settings | Immediate saves, failed-save recovery, themes, density, panel preferences and menu bar | Fixture checks pass; real OS operations unverified |
| Statistics | All 23 designs, filters, ranges, comparisons, records and personal references | Matched verifier and full App tests pass, including real wheel/save/reload/range isolation |
| Updates | Manual/automatic check, signed installation, per-version skip and errors | Existing fixture/unit tests pass; signed-artifact CI check not run locally |
| Localization | Existing five-language tables and provider text retained | Five-language browser cases pass; tables unchanged |
| Packaging | Production imports contain no React/Arc interface implementation | Pass: fresh 5,422-module audit, no forbidden imports; post-morph Tauri debug app builds |
| Comparison | Real React and Svelte run separately with identical synthetic fixtures | Executed home/settings/statistics scenarios pass; launcher refreshes same-version local packages |
| Accessibility / layout | Keyboard, focus, reduced motion, themes and narrow layouts | Final fixture suite and App morph checks pass; no real screen-reader/touch claim |

Unknown values must never become zero. Interface migration does not authorize
changes to provider parsing, history arithmetic, storage identity, minimum OS
versions, release configuration or publication.

## Evidence and delivery

The retained [regression ledger](svelte-regressions.md) classifies all 28 initial
failures: 5 obsolete structure assertions, 23 real regressions and 0 environment
failures. Obsolete assertions become same-operation/result checks; real failures
are fixed, never marked accepted. The three initial skips are explicit Mac-only
guards in a generic Chromium configuration and are covered by platform runs.

The final **post-morph static-production** run completed all 741 cases:
**719 passed, 22 skipped, 0 failed, 0 flaky**, with no global errors, in 694.3s
(11.6 minutes). macOS passed all 247; Windows/Linux each passed 236 and skipped
11 explicitly Mac-only cases. The ledger lists every skipped case and reason.
These are platform configurations on this Mac, not Windows/Linux physical-device
tests: macOS/Linux use WebKit 27.2, Windows uses Chromium 147.0.7727.15.
Evidence: `.amp/in/svelte-release-final.{json,log}`, started
2026-11-08T00:34:33.809Z and completed at 00:46:08Z. The fresh JSON's start time,
741 entries, per-project counts and empty errors were checked after completion.

The earlier **pre-morph** 719-pass/22-skip run remains preserved separately as
`.amp/in/svelte-release-before-morph.{json,log}`; it is not the final result.
Targeted App checks, build/unit checks and both matched verifiers also pass.

The first post-morph development-server run had 718 passes, 22 skips and one
environment timeout: concurrent packaging rewrote unchanged translations,
triggering an observed HMR remount during confirmation. The trace and failed
run are retained. Release acceptance now builds and serves the static product,
with no HMR client; nine repeated unchanged spinner cases pass. The final full
static run above, not that interrupted run, supplies acceptance evidence.
The latest production bundle's light/dark Home, removal idle, confirming,
pending and failed-retry states were captured and inspected (10 states), under
`.amp/in/artifacts/svelte-production/`; the served entry has no HMR client.

Other completed checks: 214 application unit tests, 9 packaging-script tests,
Svelte check 0 errors/0 warnings, production build and macOS Tauri debug bundle.
Rust passed 42 with one existing ignored signed-artifact check requiring CI
packaging. Xcode is the installed stable 27.2 under `/Applications/Xcode.app`.

Existing component records provide scoped evidence, not competing final reports:
[home](svelte-dashboard.md), [settings/accounts](svelte-settings.md) and
[statistics](svelte-statistics.md). This page owns the combined final status.

The original 142-test baseline was a unit-test run, not browser equivalence
evidence. Matched browser comparisons use Chromium 147.0.7727.15 on both sides,
390×680 for the full app and 390/760px for statistics, with fixed fixture time,
locale and timezone. WebKit 27.2 is also available locally; no browser runtime
was installed for the migration.

### Reproduce the Real Comparison

From `platforms/tauri`, with the existing supported Node on PATH:

```sh
npm ci
npm run compare:svelte
```

This reconstructs the original from the pinned commit if needed, installs its
comparison-only dependencies outside production, and runs original/target/shell
on runner ports 1451/1452/1453. Both panes mount actual app entry points. Reset
controls select shared fixtures, width, language and theme, not screenshots.
Stop the launcher with Ctrl-C; the review launcher is left running at handoff.

```sh
TOKENPLAN_TEST_BROWSER=/path/to/the/same/chromium node comparison/verify.mjs
TOKENPLAN_TEST_BROWSER=/path/to/the/same/chromium node comparison/statistics/verify.mjs
```

The statistics verifier manages and closes its own ports 1442/1443. Both
verifiers preserve runtime failures rather than replacing failed panes.
Both also assert matching `Date.now()`, `new Date()`, content viewport, browser
locale and timezone. The live comparison launcher forces fresh target dependency
optimization because unpublished Valar tarballs reuse a version and local path.

### Native Confirmation Morph Evidence

This is an **intentional visual adaptation, not an equivalence pass**. Valar's
independent Svelte implementation animates measured size/radius and content;
it does not copy Arc code, CSS, spring parameters or a motion runtime.

- Declared envelope/content-in/content-out durations: 120/80/60ms. State and
  actions update immediately; interrupted transitions continue from painted size.
- Matched Chromium 147 fixture timings: compact original 242–449ms versus
  target 121–142ms; full-width original 162–240ms versus target 121–149ms.
  All 44 paired timing budgets pass, across both themes and 11 state transitions.
  These are sampled observations, not a device-wide performance guarantee.
- Visible compact width samples: 80.547 → 142.875 → 208.141px, with changing
  radius and opacity. Inspected start/intermediate/end captures are under
  `.amp/in/artifacts/valar-confirm-morph/`; `timings.json` retains 176 timelines,
  9,628 post-command focus assertions and empty runtime/resource error arrays.
- Reduced motion switches directly, with 1–10ms first-paint observations in
  the library harness; no owned morph animations or outgoing visual remain.
  Live preference changes and interruption are checked separately.
- Actual TokenPlan App: all 8 Chromium 147/WebKit 27.2 × light/dark × normal/
  reduced combinations pass. Every sampled opening frame retains focused
  Confirm, one live status and connected, non-hidden focus. Shift+Tab reaches
  Cancel; cancellation during the morph updates within 8–18ms, without waiting.
  Full-width idle area remains 340×44px; pending, failed-operation retry,
  single-flight and successful account removal pass against simulated services.
  Evidence: `.amp/in/artifacts/app-morph/results.json` and inspected error states.

The retained library reproduction is
`standards/comparisons/tokenplan/check-confirm-morph.mjs` in Valar. Library WebKit
26.5 evidence is not mislabeled as App WebKit 27.2 evidence. No real screen-reader
or touch-hardware claim follows from DOM/focus tests.

### Separately Recorded Differences

- The supervisor-approved ruler reset correction is an **intentional deviation**,
  not an equivalence pass: external reset600 wins over unfinished inertia,
  without stale values or commits. The retained matched test proves active
  movement before reset, final600/-1200px and no events afterward for2600ms.
- Confirmation morph is independently implemented in Svelte, measured no slower
  than the source in the matched fixtures, with immediately responsive actions,
  direct reduced-motion states and retained focus/live status. This is an
  **intentional visual adaptation**, not copied Arc parameters or equal animation.
- Valar controls/tokens and single-choice radio semantics replace Arc's controls.
  Rewritten tests retain operations/results; no pixel-identity claim is made.
  Synchronous ruler digits match TokenPlan's original `animateReadout=false`.

### Refresh Valar Without Publishing

Missing components are maintained in sibling `valar-svelte`, not copied into
application pages. `npm run sync:valar` builds and type-checks the library,
packs actual public packages and copies their notices. Refresh same-path
tarballs explicitly (a plain `npm install` can retain the previous contents):

```sh
npm run sync:valar
npm install --force @valar/svelte-ui@file:vendor/valar-svelte-ui.tgz @valar/svelte-primitives@file:vendor/valar-svelte-primitives.tgz
```

No package is published. Source-runtime dependencies exist only in the ignored
comparison baseline. Build/type checks alone do not prove interaction parity.

### Current Delivery State and Limits

The authorized handoff is a commit and push to the `valar-svelte` work branch in
each repository, not a main merge, tag, package publication or release. Exact
remote heads and push verification are recorded in the shared acceptance report.
Valar's four pre-existing code-block example edits remain local and outside this
migration commit; required generated whitespace fixes are recorded separately
in its porting record. Native helpers, provider arithmetic, request schemas,
saved-data identities, minimum OS versions and release workflows are unchanged.

Browser tests simulate native-service responses. Real-account refresh, OS
permissions/notification delivery, terminal launch, Windows/Linux physical
desktops and real screen-reader/touch behavior remain unverified. SSR is not
applicable to this client-only Tauri interface. The ordinary Vite large-chunk
warning remains; bundle inspection is not an overall performance benchmark.
The original and migrated Chinese cancellation live status both say "Cancelled";
this existing source-localization gap was observed, not silently changed here.
`npm audit --omit=dev` reports six low-severity entries along the same transitive
deepmerge chain (including parent packages), with no moderate/high/critical
entry. No automatic dependency/global-toolchain changes were made to suppress it.

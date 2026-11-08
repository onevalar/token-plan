# Native Svelte History and Statistics

## Scope and Provenance

The source is `platforms/tauri/src/preview/HistoryPage.tsx`,
`HistoryModelBreakdown.tsx`, `Statistics*.tsx` and `useCostReference.ts` at
`c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4` (React 19.3.1, repository MIT license).
The target is `platforms/tauri/src/svelte/HistoryPage.svelte` and `history/`,
using Svelte 5.57.2 runes and direct Valar Svelte UI 0.1.0 imports. Shared history,
statistics, translation and provider models are unchanged.

The application is client-only. SSR/hydration is not an application contract.
Server rendering is used for focused output tests, not a claim of application
SSR support. No provider/network changes or new localization keys are part of
this port. Checks used Node 22.23.1, npm 10.9.8 and desktop Chromium on macOS.

## Capability Map

| Source capability | Native target | Acceptance scenario | Status |
| --- | --- | --- | --- |
| Accounts, ranges, tokens/cost | Reactive props and derived statistics view | Switch account/range/measure without changing deduplication | Pass; intentional radio semantics below |
| Module visibility, order, style and actual-record previews | Local preferences, Valar controls, keyed previews | Save, reorder by pointer/keyboard, reload | Pass in existing app tests and live comparison |
| All 23 overview, activity, composition, comparison, reference and quota styles | Native Svelte charts and Valar visualization primitives | Preview every style against identical records in both real implementations | Pass for rendering and controls; exhaustive visual matching pending |
| Daily records, seven-day pages, model/variant disclosure | Native buttons/details; state owned by HistoryPage | Expand, paginate, retain disclosure through display editing, inspect exact costs | Pass, including light/dark app regression |
| Missing, unknown, recorded zero, partial records | Unchanged model semantics and explicit readings | Empty/partial/zero fixtures never invent values or a waterfall | Pass in unit and live boundary checks |
| Source selection and focus restoration | Native capture events, focused detail region, Escape restoration | Browse rows without activation; Enter opens details; Escape restores the row | Pass for rows; exhaustive SVG/assistive-technology checks pending |
| Date selection | Roving calendar focus and dense-plot slider semantics | Calendar Home/ArrowRight, selected date/readout and all six time/comparison layouts | Pass for executed keyboard cases; touch and exhaustive keys pending |
| Per-account/range whole-dollar cost references | Local rune factory; same storage schema | Invalid input, slider commit, account/range isolation, storage failure and repair | Pass in app, unit and live checks |
| Quota observations | Native SVG and account/metric selection | Keep gaps, resets and accounts separate | Pass in unchanged app test |

`HistoryPage` keeps the source props `accounts`, `t`, `language` and optional
`initialRange='30'`. `HistorySummary.svelte` preserves the account-detail
consumer's `range`, `onRange` and `showTrend=true` contract. Svelte components
use default exports, snippets and native `onclick`/`oninput` handlers. Records
state remains above module mounting so editing display preferences does not
silently reset the selected page/disclosure. Account/range changes do reset it.

The same `tokenplan.statistics.v1` and `tokenplan.costReferences.v1` schemas
remain in use. Saving a reference merges the latest device settings, avoiding
simultaneous previews overwriting another scope's newly saved reference.

## Integration and Verification

Shared `SelectField.svelte`, `ProviderLogo.svelte`, theme aliases, application
entry and build setup are owned by the shell migration. This migration does
not change them. Source business CSS is reused without importing Arc controls
or its foundation. Valar owns library widgets; application SVGs remain
application-specific visualizations.

Executed checks:

- `npm run check`: **0 errors, 0 warnings**. Direct Svelte compiler checks also
  compiled all **23 owned components** with no errors or warnings.
- `npx vitest run src/svelte/history/statistics.test.ts src/preview/statistics-time-compare.test.ts`:
  **40 passing tests**. These check 1/7/30-day layouts, fractional costs,
  reconciliation tolerances, gaps/lower bounds, zero/unknown/partial data,
  five-language calendar headings, exact model/variant readings, storage
  isolation, failure reporting and repair.
- Existing statistics/history browser tests, without changing their assertions:
  **8 passed, 2 failed** in the handoff run. Both failures stop at the old
  cost-toggle `role=button` selector, not a numerical assertion. Daily currency
  precision/insets in light/dark, pointer/keyboard ordering, persistence, all
  design previews, quota gaps and personal-reference isolation passed.
- `comparison/statistics/verify.mjs`: **passed against both real implementations**.
  It exercises 23 previews on each side, keyboard ordering, row/detail focus
  restoration, calendar navigation, validation, ruler commits, range isolation,
  record pagination/disclosure, retaining records state through display editing,
  partial/unknown/zero/empty fixtures and four matched theme/width captures.
  It explicitly asserts the target's radio selection state, not old button
  semantics. No uncaught page errors were observed.

Evidence is under `.amp/in/`: `statistics-browser.log`,
`statistics-regression.log` and `artifacts/statistics-{light,dark}-{390,760}.png`.
The light/dark narrow captures and wide light capture were inspected. They
show the expected Valar control geometry/token changes, with the same displayed
usage values. These are sample visual inspections, not a pixel-diff acceptance
of every design. No horizontal page overflow was found at either tested width.

### Intentional Semantic and Styling Adaptations

The installed Valar `SegmentedControl` actually takes `options`, not `items`.
Its root is currently **`role="group"`**, with the provided accessible label.
Each underlying native button exposes **`role="radio"`** and
**`aria-checked="true|false"`**, not `aria-pressed`. The active item is the tab
stop; native/library keyboard behavior and `onValueChange` own selection.
For example, the target's real cost selector is:

```ts
page.getByRole('group', {name:'Chart Measure', exact:true})
  .getByRole('radio', {name:'Estimated cost', exact:true})
```

Assert `aria-checked` after activation. The same semantics apply to the
`Trend Vertical Scale` group. The parent migration owns adapting the two
existing browser-test selectors to this accepted native semantic interface;
this migration did not weaken or rewrite their data expectations.

Valar replaces Arc's controls, fonts/tokens, focus and popup styling. Sparkline
geometry and the gauge's exact stroke styling come from Valar, while underlying
readings and all application chart designs remain intact. No Arc foundation
or React runtime is imported by this production subtree. `SortHandle` reuses
the framework-independent `src/preview/sortGesture.ts`; retain that pure module
when removing archived React sources.

## Runnable Statistics Comparison

The specialized harness is entirely outside production sources, under
`platforms/tauri/comparison/statistics/`. It imports the unchanged original
HistoryPage from the archived revision and the actual native target. The
original runtime/dependencies remain in the excluded archive, never in the
production entry. Both panes consume the same serializable fixture source.
Messages validate exact origin, frame identity, run, sequence and schema.
Controls remount both panes; interactions remain independent. Caches are
isolated in `.amp/in/statistics-vite-{source,target}` from the whole-app harness.

The parent whole-app comparison normally prepares
`.amp/in/react-baseline/platforms/tauri`. If absent, prepare that snapshot once
from the repository root, after ensuring `/.amp/in/` is locally excluded:

```sh
mkdir -p .amp/in/react-baseline
git archive c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4 platforms/tauri | tar -x -C .amp/in/react-baseline
npm ci --prefix .amp/in/react-baseline/platforms/tauri
```

With the parent's Valar installation complete, run from `platforms/tauri`:

```sh
node comparison/statistics/run.mjs
# Open http://127.0.0.1:1442/statistics-comparison
# Original pane: 1443. Ctrl-C closes both servers.

TOKENPLAN_TEST_BROWSER='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node comparison/statistics/verify.mjs
```

`TOKENPLAN_TEST_BROWSER` is optional if Playwright Chromium is installed.
`TOKENPLAN_STATISTICS_SOURCE` may point to another copy of the same pinned
original `platforms/tauri` directory with `npm ci` completed. Readiness means
the real component mounted, not merely that an iframe loaded. Missing source
dependencies fail explicitly. The verifier starts and closes its own servers.

## Remaining Acceptance Limits

Whole-app production bundle/runtime exclusion, platform chrome and broader
shell regressions belong to the parent migration. Native macOS app launching,
screen-reader testing, touch hardware, WebKit, zoom, exhaustive animation/cancel
cases and performance measurements have not been performed for this subtree.
Full application SSR/hydration is not applicable to this client-only UI.
Neither compilation nor the executed browser subset establishes universal
visual, accessibility or performance equivalence.

## Delivery

Local files only; no commit, push, publish or release. Dependencies and shared
configuration are handled by the parent migration. Preserve the repository
MIT attribution and the Valar package license.

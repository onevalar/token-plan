# Dashboard Migration: React → Svelte 5

## Scope and Provenance

- Baseline: `c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4`, `platforms/tauri/src/{Dashboard,Metrics,HomeMetrics,HomeQuota*,Home*Styles,DitherFill}.tsx` and their business CSS.
- Target: `platforms/tauri/src/svelte/Dashboard.svelte`, `ProviderLogo.svelte`, and `usage/`, using Svelte 5 runes, native events and snippets.
- Existing TokenPlan/OpenUsage MIT attribution remains in the repository LICENSE. Business CSS is retained with native-component layout and token mappings; no Arc component CSS is imported. Valar owns generic components and their licensing notices.
- The tick presentation uses independently implemented Valar `TickMeter`, not Arc Pro Tick Ring source, markup or CSS. This intentionally changes the internal SVG structure, not its quota reading contract.
- Baseline lockfile: React/React DOM 19.3.1, Vite 6.4.4. Final installed verification: Svelte 5.57.3 (runes), Valar UI 0.1.0 from the real local tarball, Vite 7.3.7, TypeScript 5.9.3, svelte-check 4.7.8, Tailwind 4.3.5, Lucide Svelte 1.70.0, Vitest 5.0.5, Playwright 1.64.1, Node 22.23.1.

## Capability Map

| Source capability | Native target | Acceptance scenario |
| --- | --- | --- |
| Enabled account order, adjacent family grouping, consolidated OpenAI | Dashboard derived grouping | Codex/API occupy first OpenAI account's position; disabled accounts omitted |
| Identity and recovery callbacks | Valar Button native `onclick` | Identity opens account; error action selects settings/retry/details; busy disables recovery |
| Home-only metric placement and seven-day model shares | Dashboard → HomeMetrics | Hidden/details metrics absent; model split supplied only from recent history |
| Labels, scope, localized amounts, countdowns and expiries | Pure `metric.ts`, MetricRow/Reset/Expiries | Period labels, Orb, credits/currency, missing and not-started preserved |
| Bars and forecasts | MetricRow / HomeExtraStyles | Used/remaining direction, minimum 5% elapsed forecast, ARIA and critical ≥80% used |
| Gauges, cells, ticks | Valar GaugeArc/WaffleChart/TickMeter | Independent quota, missing/null without meter; gauge label moves outside when it cannot fit |
| Rings/concentric, ruler, numbers, segments | HomeQuotaStyles | Adjacent distinct known windows only pair; fractional final segment; threshold and overflow text |
| Containers, frame, signal, sources, columns | HomeExtraStyles | Four container shapes; source fallback; single-column fallback; independent time/reset data |
| Textured row/card/half, four patterns, solid/mixed, five tints | Valar TextureFill + pure `texture.ts` | Animated intro/update, 100% solid end, resize/recolor, reduced-motion and teardown |
| Instrument variants 0/1/2 | HomeInstrumentStyles | Needle, side and compact primary rows, independent precise values |
| Cell variants 0/1/2 | HomeCellStyles | Dot matrix, slanted grille and segmented battery; fractional fills and boundary inversion |
| Cycle variants 0/1/2 | HomeCycleStyles | Racetrack, lanes, sundial; observed time independent from quota; missing/renewed time unavailable |
| Rail variants 0/1/2 | HomeRailStyles | Cursor, edge and measured folded ruler; 50% at bend at each account width |
| Editorial variants 0/1/2 | HomeEditorialStyles | Ticket, used/remaining spread (meter always used), spine |
| Inline quota disclosure | HomeQuotaDesigns | Enter/Space opens and focuses region; Escape/close restores trigger without propagating panel-hide |
| Per-account style/preview and external updates | Same props, derived state | Parent may render same HomeMetrics in dashboard, details and style preview |

## Integration API

- Default `Dashboard` keeps the original props: `accounts`, `open(id)`, `openSettings(id)`, `retry(id)`, `busy=false`, `now`, `language`, `missing`, `remaining`, `usageStyle='bars'`, optional `accountStyle(id)`.
- Default `ProviderLogo` takes `{family}` and uses existing `/providers/<family>.svg` masks and provider accent tokens.
- Default `usage/HomeMetrics.svelte` takes `{metrics, style, sources=[], now, missing, language, remaining?}`. `SourceShare` is exported from `usage/types.ts` and `HomeExtraStyles.svelte`; `HomeUsageStyle` is re-exported from `HomeMetrics.svelte`.
- `metric.ts` exports `MetricRowProps`, `windowDescription`, `metricScope`, `metricName`, `usageTone`, `isQuotaMetric`, `metricAmount`. `texture.ts` exports saved texture/tint types, choices, `textureAt`, `tintStyle`; neither helper imports a framework.
- Valar imports are `button` → `Button`, `gauge` → `GaugeArc`, `waffle-chart` → `WaffleChart`, `tick-meter` → `TickMeter`, `texture-fill` → `TextureFill`. Icons use `@lucide/svelte`.
- GaugeArc receives `value`, optional `radius`, `tone` and native SVG attributes. TickMeter receives `value`, `label`, `valueText`, `tone` and native ARIA overrides; one accessible meter preserves bounded geometry and unbounded value text. TextureFill receives `value`, `texture`, `intro` and the business layout class; the duplicate app-local DitherFill component was removed.
- Quota-specific needles, vessel shapes, time-cycle paths and fractional cell layouts remain business compositions, not copied generic Arc widgets. Buttons use native `onclick`, no React compatibility adapter.

## Verification Plan and Limits

The parent integration owns build configuration, package installation, replacement of shared helper imports, runtime switching and the real React-left/Svelte-right comparison harness. This task does not modify those files. Runtime parity must be checked against the real baseline with equal fixtures, clock, language, theme, width and motion preferences; syntax/type checks alone are not visual acceptance.

| Area | Status | Evidence / remaining procedure |
| --- | --- | --- |
| Source contract and existing test inventory | Pass (static) | Read actual renderers, `homeUsage.ts` and `tests/home-usage-style.spec.ts` |
| Native Svelte syntax/types | Pass | All 21 owned Svelte components compile in runes mode with zero warnings; bounded svelte-check and the full repository `npm run check -- --output machine` each report zero errors/warnings |
| Pure helper and renderer regression | Pass | 112 tests across `src/usage.test.ts`, `src/preview/homeStyles.test.ts`, `src/svelte/usage/HomeMetrics.test.ts`; 48 tests in the new renderer suite |
| Live comparison | Pending | Parent harness; inspect both mounted implementations and independent interactions |
| Full-App quota integration | Pass (bounded) | Chromium 147: 10 reported regressions, 38 adjacent controls and 14 saved-renderer contract cases pass; full App/bridge/theme with the existing mocked desktop boundary, not an isolated component smoke |
| Target browser rendering/resizing | Pass (bounded) | Production-built actual Dashboard, installed Valar components, 40 style choices × 390/560px × light/dark = 160 cases; correct quota text, no horizontal page scrolling, no browser runtime errors |
| Keyboard disclosure | Pass (bounded) | Ticket style: Enter opens and focuses labelled region, Tab reaches close, Escape closes and restores trigger focus; other styles share the same disclosure component |
| Folded ruler and gauge measurement | Pass (bounded) | 0/50/100 ruler markers checked at both widths (SVG width within 0.1px); long gauge label moves outside the arc after ResizeObserver measurement |
| Texture and reduced motion | Pass (bounded) | Installed Valar TextureFill paints the entire 100% hatch row opaque under reduced motion; intro/update timing and every pattern still need source/target animation comparison |
| All five locale quota layouts | Pass (bounded) | Existing full-App localized-label test runs eight saved styles in light/dark, including the 360px English narrow-panel case; individual tiles and page fit |
| Touch/zoom, screen readers, other browser engines | Pending | Not covered by this bounded Chromium quota-layout rerun |
| Cleanup | Pending (runtime) | Canvas cleanup belongs to Valar; own ResizeObservers disconnect and unique SVG IDs use `$props.id`; no heap/leak certification or repeated-unmount instrumentation run |
| Source runtime absent from production | Pass (owned imports); Pending (full app bundle) | No React/Arc runtime or CSS imports in owned target files; parent owns final production import/bundle audit |
| SSR/hydration | Not Applicable (product) | Native renderer regression tests use real Svelte server rendering, but TokenPlan is client-rendered; no hydration guarantee is claimed |

Re-run retained unit/type checks from `platforms/tauri`:

```sh
npm run check -- --output machine
npx vitest run src/usage.test.ts src/preview/homeStyles.test.ts src/svelte/usage/HomeMetrics.test.ts
```

The renderer suite covers all fifteen approved looks in used/remaining mode at 0, 0.4, 79.6, 80, 100, 112 and -12, missing/null/non-quota ordering, fractional cells, adjacency-only pairing, resets/expiries, independent OpenAI grouping, seven-day shares, API-key recovery, TickMeter ARIA and all TextureFill layouts. It executes real Svelte and installed Valar components, with no aliases or fake widget implementations in the final run.

The initial browser smoke used a temporary production build importing actual Dashboard, the existing `largeDesktop` fixture at `2026-10-28T08:00:00Z`, business CSS, parent Valar theme and bundled fonts. It was not the requested two-framework comparison or a full Tauri-shell test. Build succeeded; Rollup emitted existing Zod annotation and >500kB chunk warnings. An earlier development-only harness encountered Bits UI Select/ScrollArea virtual-style errors. The later full-App checks below exercise the integrated dev server and real Svelte renderers; they exposed overflow missed by that initial isolated smoke.

Inspected target captures are stored in `.amp/in/artifacts/svelte-dashboard/`: `gauges-dark-560.png`, `ticket-dark-560.png`, `instrument-light-390-zh.png`. These are target evidence, not a pixel-diff approval. Browser verification caught and fixed old animated-label CSS incorrectly stretching a directly nested logo; the native account button now owns a compact content layout instead of depending on framework-generated wrappers.

## Full-App Quota Layout Follow-up

These checks use the real App and its dashboard/styles, with only the desktop bridge mocked by the existing `mockDesktop` fixture. Chromium is explicitly the installed 147.0.7727.15 executable, not the newer system Chrome. No shared preview CSS, global Valar tokens, or overflow/number assertions were changed by this task.

- **Concentric grid:** all five localized-label tests failed before the fix. Equal-specificity `.home-variants` and later `.home-metrics` rules made the single-column presentation two columns; its readouts were only 29px wide, with measured scroll widths up to 63px. The explicit single-column selector now wins independent of import order, excluding single-ring and quota-count grids so their intended two/one-to-three columns remain intact.
- **Primary/folded headings:** Valar Button's default `shrink-0` pushed precise values outside long-label quota tiles. Measured before widths were 340px client / 409px scroll for Primary Dial and 340px / 429px for Folded Ruler. The business label now requests native `shrink`; names wrap and values retain their full width. No clipping or smaller type hides the problem.
- **Numbers:** the unchanged compact-numbers test reproduced the incorrect 30px value. `.home-number-value strong` now maps to Valar `--text-4xl`, restoring 36px without changing any global token. Existing text-bound, single-line, responsive column-threshold and density assertions pass.
- **After:** the same 10 reported regression tests pass (five locales, four precise used/remaining cases, one numbers grid contract). Another 38 tests pass for all 15 approved designs in both modes, cells grid, concentric pairing, single rings, keyboard disclosure/focus restoration, gauge long-label measurement, primary-row independence and folded-ruler geometry. Another 14 used/remaining saved-renderer contract tests pass. Four approved cases overlap between the 10-case and 38-case runs: 58 distinct existing browser cases, 62 executions.
- **Independent measurements/captures:** 10 full-App diagnostic styles report no overflowing quota tiles after the fix. Inspected before/after captures include concentric, primary and folded; the numbers test's compact screenshot confirms three readable 36px values. Temporary diagnostic test/config files were removed after recording evidence.
- **Supporting checks:** `npm run check -- --output machine`: 0 errors, 0 warnings. The three retained Vitest suites: 112 tests pass. These support but do not replace browser evidence.

Logs: `.amp/in/quota-before.log`, `quota-numbers-before.log`, `quota-after.log`, `quota-controls.log`, `quota-contracts.log`, `quota-boxes-before.log`, `quota-boxes-after.log`. Captures and DOM measurements: `.amp/in/artifacts/quota-layout-{before,after}/`; numbers screenshots: `.amp/in/artifacts/svelte-quota-layout-after/home-usage-style-numbers-f-8c298-out-reserving-empty-columns/`.

Re-run the reported cases from `platforms/tauri` (Playwright manages port 1420):

```sh
export TOKENPLAN_TEST_BROWSER='/Users/anvalar/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
npx playwright test tests/home-usage-style.spec.ts \
  -g 'Home styles fit with localized labels|approved Home (instrument:primary|ruler:folded):|numbers fits up to three compact quotas' \
  --reporter line
npx playwright test tests/home-usage-style.spec.ts \
  -g 'cells fits up to three compact quotas|concentric rings keep independent|single rings bind|quota disclosure shows|Primary Dial shows|Folded Ruler keeps|Dashboard Ring moves|approved Home' \
  --reporter line
npx playwright test tests/home-usage-style.spec.ts \
  -g '(gauges|cells|rings|ruler|concentric|numbers|segments) preserves (used|remaining)' \
  --reporter line
```

This is bounded full-App browser evidence, not proof of packaged Tauri/WebKit behavior or baseline pixel equality. Independent TickMeter source-mask geometry assertions are outside this rerun; no Pro source or CSS was inspected or reproduced. No full suite, deployment or publication was performed.

## Baseline Details and Assumptions

- Saved renderers retain rounded text; approved new designs retain precise values and clamp only graphics/ARIA. Critical tone is based on actual used quota, including remaining mode.
- Source Split preserves the original `remaining:false` reading request. When a caller has already converted values to remaining, its pre-existing source behavior can therefore read the converted number as used; this migration does not silently fix that baseline quirk.
- The parent owns live comparison, App/bridge/theme integration, original React removal and full-shell regression. Original sources are no longer required by this task after final verification.

No pixel-perfect, browser-parity or accessibility certification is claimed before those runtime checks execute. No commits, pushes or releases are part of this task.

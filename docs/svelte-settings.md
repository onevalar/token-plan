# Settings and Account Flow Migration

## Scope and Provenance

The settings/account source is `platforms/tauri/src/preview/*.tsx` and `src/SystemSettings.tsx` at `c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4` (React/React DOM 19.3.1, Vite 6.4.4 in the archived lockfile). The native target is `platforms/tauri/src/svelte`, using Svelte 5.57.3 runes, Vite 7.3.7, the Svelte Vite plugin 6.2.4 and direct public Valar 0.1.0 component exports. Existing project MIT attribution remains unchanged. No Arc Pro tick-ring source or styles are used; meters use the independently implemented Valar `TickMeter`.

This work owns only the four settings/account route components, their `settings/` and `accounts/` children, `HomeTips.svelte`, and `preferences.svelte.ts`. The app shell, comparison harness, dependencies, shared UI wrappers and quota renderers are integrated by the parent migration.

## Migration Contract

| Capability | Native Target | Acceptance Scenario |
| --- | --- | --- |
| General preferences | Controlled `SelectField`/`ToggleRow`, Valar slider | Save language, appearance, refresh, density and remaining values; show rejected local and helper saves |
| Device preferences | Rune factories with reactive getters | Preserve legacy storage keys, per-account style defaults and failed-write feedback |
| Native panel | Reactive effects with stale-response guards | Apply appearance, retry failure, follow system reduced transparency, clear Windows acrylic for solid mode |
| Usage style | Native category/variant/options and actual quota preview | Change every category and its supported options, uniform/custom mode and account overrides |
| Accounts | Controlled helper requests and retained account drafts | Enable/hide, reorder, remove, edit notes, replace/clear keys with confirmation, pending and retry feedback |
| Sorting | Native pointer capture and keyboard events | Arrow keys, five-pixel threshold, Escape/blur/resize/pointer cancel, outside release, auto-scroll, reduced motion and cleanup |
| Metric layout | Serial coalescing queue and accepted-layout rollback | Rapid placement/reorder requests, rejection, newer changes during an in-flight failure |
| Setup | Tauri commands and native forms | Reserve one directory, reopen/copy terminal command, detect matching account, enable, label, resume/forget setup, advanced existing directory |
| Menu bar | Native preview and controlled settings | All styles, inside/left layouts, triple rings, badges, token trends, max three pinned metrics, hidden accounts and linked ordering |
| System settings | Native shortcut capture and notification options | Permission before enabling; previous notification choices; capture/cancel/clear/blur/unmount shortcut |
| Tips | Per-device dismissal and permission flow | Welcome, add-account action, near-limit alert nudge, failed permission feedback |

The public route props retain source names. Callback names remain explicit function props; DOM events use `onclick`, `oninput`, `onkeydown` and `onsubmit`. Source `primary` button styling becomes Valar `default`. Loading is represented by disabled/pending text rather than the unsupported Arc `loading` prop. Shared business models remain unchanged.

`createDensity`, `createHomeUsageStyle`, `createAccountSetups`, `createPanelSurface` and `createPanelAppearance` expose live getters with the original member names. Consumers must retain the returned objects, not spread their getter values into snapshots. `AccountDraft` remains exported from `accounts/AccountConfiguration.svelte` and is owned per account by the app shell.

The storage keys remain `tokenplan.homeDensity`, legacy `tokenplan.mac.homeDensity`, `tokenplan.homeUsagePreferences`, legacy `tokenplan.homeUsageStyle`, `tokenplan.panelSurface`, `tokenplan.tip.welcome` and `tokenplan.tip.alerts`. The pure sorting helper `preview/sortGesture.ts` remains a production dependency; no React hook module is imported by these target files.

### Valar Panel Palette

Glass calculations use actual Valar foundation channels: light foreground `.145`, dark background `.145`, dark foreground `.985`, and neutral primary `.205`/`.922`. Destructive colors use Valar `.577 .245 27.325`/`.704 .191 22.216`; success and warning match the app's Valar semantic aliases. The existing worst-backdrop AA text and 3:1 graphic floors remain, including the dark component lift. Independent contrast tests must use these target inputs, not the previous Arc palette. The shared theme must map `--usage-normal` to Valar primary when not overridden by glass colors.

## Verification Status

Scoped verification ran on macOS with Node 22.23.1 and installed Google Chrome, using actual target components and the installed public Valar package. Browser fixtures simulated helper responses and native command acknowledgement, with real Svelte reactive inputs. They did not replace component logic. Ten target-only interaction groups passed:

- Note drafts, rejected saves, retry, saved feedback, replacement-key focus and cancel/reset.
- Saved-key confirmation, cancel, failure, retry and removal.
- Keyboard metric reorder; placement save and rollback after rejection.
- A newer placement choice surviving an in-flight failed request and being submitted next.
- Pointer drag preview, Escape cancellation and committed pointer drop under reduced motion.
- Reactive native appearance request and reduced-transparency solid/glass selection.
- Welcome dismissal persistence, and notification permission preceding settings save and dismissal.

The temporary fixture server used injected Svelte CSS to avoid virtual-CSS lookup errors for Bits UI in that custom no-discovery harness. No production configuration was changed. This is target behavior evidence, not a source/target comparison or proof of the production CSS pipeline.

Commands from `platforms/tauri`:

```sh
npm run check
npx vitest run src/svelte/settings/preferences.test.ts src/preview/panelSurface.test.ts src/preview/homeStyles.test.ts
npm run compare:svelte
```

The first command completed with zero errors and warnings; the test command passed all 74 tests in three files, including nine new native preference/contrast regression tests. A direct Svelte client/runes compile also completed for all 17 owned components with zero warnings. The comparison command is provided by the parent integration: source port 1451, target 1452, shell 1453; stop it with Ctrl-C. Its matched source/target acceptance remains the parent's responsibility.

Local review artifacts are `.amp/in/artifacts/svelte-settings-interactions.txt`, `settings-account-light.png` and `settings-account-dark.png`. The two 390×680 captures were inspected: note, saved-key status and actions render in both themes without horizontal overflow. They are not pixel-diff baselines, and do not certify every route, font, density or viewport. Temporary validation scripts/configuration were removed after use.

A type/build check is not behavioral or visual equivalence. Native Tauri commands require the desktop host; browser fixtures cannot prove OS notification, terminal, shortcut or material behavior. The real React-left/Svelte-right comparison and production dependency checks belong to the parent integration; this scoped task does not alter its shell/configuration.

## Acceptance

| Area | Status | Evidence / Required Check |
| --- | --- | --- |
| Source inventory and public contract | Pass | Read actual source routes, nested widgets, hooks, models and sort helper |
| Svelte compilation and type checks | Pass | 17 components, zero compiler warnings; whole-app `npm run check` zero errors/warnings |
| Preference regression tests | Pass | 74 tests, including storage migration, invalid records, failure/recovery, live getters and independent Valar contrast |
| Scoped pointer/keyboard and async interactions | Pass | Ten target-only fixture groups listed above; native services simulated |
| Full source/target equivalence | Pending | Parent comparison at matched viewports; no parity claim from target-only checks |
| Complete accessibility and motion | Pending | Focus and reduced-motion scenarios checked; auto-scroll, all cancellation paths, non-reduced timing, touch and assistive technology still need acceptance |
| Light/dark, density and narrow layout | Pending | Two inspected target captures only; complete matched layouts/zoom/density still required |
| Removal-control sizing | Pending | Both destructive actions pass `fullWidth`; installed Valar applies it to the outer group, not the idle button. Parent shared styling must preserve the full-width, 44px account-removal hit area |
| Setup, menu bar and shortcut host behavior | Blocked | Actual native host validation required for terminal, directory, notification, global shortcut and Windows acrylic behavior |
| Resource cleanup | Pending | Escape removes drag markers; repeated interrupted mount/unmount, timers and late native replies still need dedicated checks |
| SSR | Not Applicable | TokenPlan is a client-only Tauri webview |
| Performance | Pending | Parent production build and target bundle inspection |

No commit, push, publication, or native host policy changes are part of this work. Original UI files are no longer needed in the production tree for this scope; the archived baseline is sufficient for comparison. Keep the pure sorting helper until its imports are deliberately redirected.

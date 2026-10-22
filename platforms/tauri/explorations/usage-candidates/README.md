# Home Quota Candidates (Disposable Exploration)

Audience: the TokenPlan owner, comparing three further Home quota treatments.
Job: decide whether a style makes the same quota easier to read or more distinctive.
Primary action: switch the comparison picker. No production setting is saved.
Data: explicitly synthetic accounts parsed through the existing desktop schema.
Surface: an isolated Vite route, `/explorations/usage-candidates/`.

The existing bars are the unchanged `MetricRow` baseline. Compact rings explore
list density. The graduated ruler explores a fixed scale and explicit warning
boundary. Concentric rings explore pairing two independent constraints without
an aggregate center. No direction has been selected for production.

## Sources and Composition

- Existing Arc Button, Select, Switch, foundation and project fonts are imported,
  not reinstalled. The fixed exploration picker follows the owner's explore skill.
- `arc-graphics.tsx` adapts the project's free Arc Gauge geometry: 270-degree arcs,
  bounds applied only to the graphic, raw accessible numbers and no animation.
  Compact layout moves the number outside; concentric layout uses radii 42/28 with
  explicit outer/inner labels. This does not copy Arc Pro Activity Rings.
- The ruler adapts the free Usage Meter's track, scaleX segment and limit marker,
  inspected at https://uiarc.dev/r/usage-meter.json on 2026-10-22. It removes
  categories, rescaling, motion and interactive legends; adds a fixed percentage
  scale and warning reference. This is a local adaptation, not an upstream prop.
- Gauge source: https://uiarc.dev/r/gauge.json. Arc's retained MIT attribution and
  license are in `../../src/components/arc/NOTICE.md` and `LICENSE`.
- The Arc install command was checked, but not run: the ordinary command would
  write into production. No dependencies or Pro source have been added.

## Boundaries to Compare

The fixture simulates Used/Remaining conversion once, as the real helper does.
Every graphic uses the received percent. Danger uses raw actual Used ≥80, not the
rounded displayed number. Missing readings have no meter value or fill; 0 remains
a real value. Overflow keeps its raw number; the graphic stops at the scale end.
Amounts stay text. No trend, prediction, total quota or request count is invented.

Concentric pairing is limited to exactly two adjacent quotas with distinct known
periods in one account. Single, three-or-more, same-period and interleaved metrics
fall back to independent compact rings without reordering. Unknown/missing data
does not become a full or empty real reading. Existing reset and expiry components
are reused. Scope names wrap in the new candidates rather than disappearing.

## States and Verification

All candidates expose normal, 0/100/112%, small fractions, 79.6/80% boundary,
missing/stale reading, not-started, unknown period/reset, loading, simulated failure,
empty and 40-item long-content scenarios. Error and empty actions load the normal
synthetic fixture. Preview controls include width, theme and Used/Remaining.

Run `npx tsc --noEmit -p explorations/usage-candidates/tsconfig.json` from
`platforms/tauri`. Browser verification is separate from production regression tests.
No production imports this directory. The preview is Chinese-only and does not
claim native-window, real-provider or screen-reader testing. Keep it separate until
the owner chooses; record that decision before integrating or removing prototypes.

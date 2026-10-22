# Detail Section Styles: Balance and Benefits

Audience: TokenPlan users choosing a readable detail view.
Job: read balances and available benefits, then inspect optional expiry dates.
Primary action: compare section styles, not save a production preference.
Data: typed, synthetic Metric/Account fixtures with the real product components.
Surface: isolated product exploration. No production code imports this directory.

## Scope and Owner Feedback

The owner asked to keep all previous quota designs, explore detail-page information
too, and eventually allow independently selected section styles. They retain the
final decision. No new candidate has been chosen for production. The two previous
preview routes remain unchanged; no settings, persistence or bridge schema changed.

This round deliberately covers one section, Balance and Benefits:

- Existing list: real MetricRow and the exact AccountDetail expiry disclosure.
- Number summaries: one static summary per metric; multiple value units stay in
  the same group. Dates are immediately visible. Higher density cost.
- Expandable benefits: plain rows without additional details; a real Arc
  ExpandableCard only where expiry dates exist. Values stay in the summary.
  Dates are disclosed; no fake action for rows without details.

## Arc Sources and Adaptations

Inspected via Arc MCP and public registry on 2026-10-22:

- https://uiarc.dev/components/expandable-card
- https://uiarc.dev/r/expandable-card.json
- https://uiarc.dev/components/metric-card
- https://uiarc.dev/r/metric-card.json

The install command was verified with MCP. Rather than run its default command
against production, the two free ExpandableCard source files were extracted into
this isolated directory. Only its shared motion-token import changed. The MIT
license is retained in arc/LICENSE. No Pro source or new dependency is included.
Existing Arc Select/Switch/Button and foundation/fonts are reused.

Number summaries adapt Metric Card's label/value/context structure, without its
animated counter, trend chip or single-line truncation. This is a local adaptation,
not a claim of upstream static/formatting props. Monetary values retain two decimals;
other numbers use MetricRow's compact formatting. The numeric candidate explicitly
labels the credits unit as Credits; the unchanged baseline retains its existing
Chinese translation. No totals or currency conversion.

Painter supplied an initial reference. It incorrectly called expiry dates “next
reset dates” and duplicated the open/closed example; the implemented preview fixes
both. The reset benefit count comes from the actual fixture shape, not from the
length of its expiry array (the 40-date stress fixture still has amount 3).

## Next Sections, Not Implemented Here

- Current quota: keep the previous bar/ring/ruler/number/cell candidates.
- History summary: numeric summary versus dated records; charts only with reliable
  coverage. Missing dates/costs must not become zero.
- Model breakdown: list versus part-of-whole only when records have a meaningful
  shared denominator. Never mix quota windows, units or accounts into a total.
- Account identity: compact profile rows or a grouped identity summary. No invented
  connection status, subscription renewal, payment method or billing actions.

Production integration, after owner selection, should offer separate section
preferences under Appearance, each with its existing display as the default.
Use the existing home-style preference's local validation and save-error pattern;
do not add a generic persisted configuration or provider fields for this preview.

## Verification

Run `npx tsc --noEmit -p explorations/detail-benefits/tsconfig.json` in platforms/tauri.
The comparison controls cover currencies, mixed units, zero, negatives, missing and
stale data, long names, 40 expiry dates, loading, failure/recovery and empty/recovery.
Browser checks and captures are recorded separately. This is a Chinese browser
prototype, not five-language, native desktop or real-provider acceptance.

Verified on 2026-10-22:

- Prototype TypeScript check passed. Existing tests: 17 frontend, 8 packaging passed.
- 60 scenario checks and 74 layout checks passed in Chromium and Linux WebKit.
  Covered 320/390/768/1024/1440 viewports, 360/390/480 panels, both themes, and
  200% CSS zoom. The initial zoom check exposed the comparison columns squeezing
  the panel; the isolated comparison shell now wraps instead, and the full run passed.
- Raw values, values[] precedence, monetary precision, true zero versus missing,
  stale-read rejection, independent date counts, and unchanged quota values checked.
- Keyboard/URL style selection, menu focus, Enter/Space/Escape disclosure, focus
  return, inert panels, rapid reversal, reduced motion, error/empty recovery and
  forty-date scrolling checked. Chromium's native accessibility tree excludes
  closed dates and includes open dates; no real screen reader was tested.
- Chromium touch emulation reports pointer:coarse and opens the card by tap.
  This is not an Android device or native desktop test.
- Inspected both themes, all three default layouts, open/closed details, missing,
  zero, mixed currencies, large values, long names, failure, empty and touch captures.
  The 14-second real-pointer recording shows comparison, disclosure, Escape and theme.
  Lower history/notes intentionally require scrolling in taller variants.
- Measured numeric-summary contrast: values 19.68:1 light / 15.71:1 dark; labels and
  dates 7.11:1 / 8.48:1. Expanded dates on the dark inset surface measured 7.49:1.
- Arc automated style sweep had no hits. No standalone lint command is configured.
  Existing baseline density and the prescribed exploration picker remain unchanged;
  loading uses explicit text rather than a new skeleton. Date formatting is browser
  local, matching the CSR product. No new animation timing or theme token was added.

Validation used a temporary browser script, not new permanent product tests.
No production files, dependency manifests, old exploration routes or settings changed.

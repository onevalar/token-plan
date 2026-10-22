# Home Quota Exploration, Round Two

Job: compare exact-readout emphasis against a segmented capacity impression.
Primary action: switch styles, not save a product setting.
Regions: existing Arc Select/Switch/Button comparison controls; unchanged product
identity and baseline; two locally adapted, free Arc quota treatments.

## Owner Feedback

The owner likes the previous compact ring, ruler and concentric options and asked
to keep them while exploring further. No winner or final production set has been
chosen. Round one remains unchanged at `/explorations/usage-candidates/`; this
round links to it and lives at `/explorations/usage-next/`.

## Two New Directions

- **Numbers:** Arc Metric Card's label, headline value and context hierarchy,
  adapted to independent two-column quota readings. No nested card chrome,
  rolling counter or fabricated change chip. Missing numbers use a dash and the
  existing missing/reset status. Amounts span a full row in their existing order.
- **Segmented:** Arc Usage Meter's track and scaleX segment fill adapted into
  twenty equal cells, each representing five percentage points. The last cell
  can be partially filled. No integer allocation or implied token/request count.
  Missing readings use a dashed placeholder, not twenty empty cells.

Both preserve the old prototype's integer visual formatting, raw accessible
percentage, unrounded warning boundary and actual Used/Remaining interpretation.
The number layout does not combine constraints. Only graphics clamp to 0–100.
Reset/expiry components, synthetic fixtures and the unchanged production baseline
are reused from round one. There is no new dependency or production import.

The new layouts explicitly label known reset countdowns with “距重置”; missing,
not-started and unknown resets never receive that label. All comparison windows
keep the same 704px height so the amount of scrolling remains comparable.

## Source and Adaptation Record

Official docs, free TSX/CSS and install command inspected on 2026-10-22:

- https://uiarc.dev/components/metric-card
- https://uiarc.dev/r/metric-card.json
- https://uiarc.dev/components/usage-meter
- https://uiarc.dev/r/usage-meter.json

The suggested install command writes to production, so it was not run. These are
explicit local adaptations of the inspected free components, not claimed upstream
props, new Arc component names or copies of Pro code. Retained Arc MIT attribution
is in `../../src/components/arc/NOTICE.md` and `LICENSE`.

Painter supplied a comparison reference; implementation uses actual project
materials and fixes the reference's inaccurate segment ratios. Generated images
are not testing evidence. No new motion parameters are proposed; values are static.

## Verification Scope

Run `npx tsc --noEmit -p explorations/usage-next/tsconfig.json` from `platforms/tauri`.
Use the shared scenario controls for normal, boundaries, missing/not-started,
mixed metrics, loading, error, empty and forty-item lists. Inspect both modes and
themes at narrow/wide panel widths. These are Chinese synthetic browser previews,
not native macOS, real-provider or screen-reader verification. Keep both rounds
until the owner chooses; do not interpret preview approval as a shipping decision.

Verified in this round: type check; 17 frontend and 8 packaging tests; 108
scenario/mode checks in Chromium and Linux WebKit; 63 layout checks including
320/390/768/1024/1440 viewports, both themes, another control accent and emulated
touch. The checks cover partial cell fill, 80% warning boundaries, missing values,
overflow, reset status, interleaved amount order, keyboard/URL switching, recovery
actions and scrolling. The prior round still opens with all four options.

Text contrast against the rendered panel background: normal number 19.68:1 light
and 16.46:1 dark; warning 5.63:1 and 6.95:1; reset text 5.04:1 and 5.48:1.
The numeric layout also stayed within the page/panel at 200% CSS zoom.

Arc review: typography, semantic colors, layout, documented control props,
independent quota meanings, explicit states, reduced motion, keyboard and narrow
layouts checked. Intentional exceptions: the prescribed exploration picker keeps
its 28px button height and own styling; preview loading uses labelled dashes rather
than installing a skeleton; free visualization sources have explicit local
adaptations, not upstream-only APIs. No claim of full production accessibility or
five-language acceptance is made.

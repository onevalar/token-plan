# Arc components

Source: https://uiarc.dev/

These are the free, open-source Button, DropdownMenu, Switch, Select, Input, ConfirmMorph, foundation and motion-token registry
items. Their public documentation labels them free/open-source:

- https://uiarc.dev/components/button/markdown
- https://uiarc.dev/components/dropdown-menu/markdown
- https://uiarc.dev/components/switch/markdown
- https://uiarc.dev/components/select/markdown
- https://uiarc.dev/components/input/markdown
- https://uiarc.dev/components/confirm-morph/markdown
- https://uiarc.dev/r/arc-foundation.json
- https://uiarc.dev/r/arc-motion-tokens.json

Retrieved 2026-10-20. These foundational components are free; the later Tick Ring
adaptation is Arc Pro and has a separate license, described below.
The upstream MIT license is retained in `LICENSE`, retrieved from
https://github.com/kuratlielia/arc-library/blob/main/LICENSE.

Local accessibility corrections to ConfirmMorph pause confirmation/result timeouts while focus is within the control
(including moves between its buttons), alongside the existing hover and document-visibility holds. Reduced-motion mode
stops the pending spinner instead of slowing it, while keeping pending text and accessible status feedback.
Button honors focus-preserving `aria-disabled` for activation and disabled styling. The light theme's muted text token
is darkened for readable small labels on both the canvas and muted surfaces.

Gauge and WaffleChart were retrieved on 2026-10-22 from the free registries:
- https://uiarc.dev/r/gauge.json
- https://uiarc.dev/r/waffle-chart.json

These read-only quota adaptations have deliberately smaller local interfaces,
not the upstream component APIs. Gauge
retains Arc's 270-degree arc geometry, proportions and central readout. Its arc and
ARIA range are bounded, but its visible number and accessible value preserve overflow;
warnings also color the number. WaffleChart retains Arc's largest-remainder allocation,
bottom-left column fill, 3px gaps and cell shape, using CSS grid for the fixed 100 cells.
The caller supplies a percentage and its complement; missing and out-of-range readings
do not mount a grid. Both omit interactive legends, tooltips, initial animation, count-up
and per-cell motion. No animation state, resize observers or untranslated interaction
copy are needed for a read-only quota. Labels come from TokenPlan's five-language tables.
The existing MIT license applies. No new package dependencies or Pro source were added.

The additional Home styles reuse that same Gauge geometry for compact and independent
concentric meters. Quota Ruler and Segmented Bar adapt the free Usage Meter's track,
scaleX fill and limit marker (https://uiarc.dev/r/usage-meter.json); the segmented
version partially fills its last piece. Numbers adopts the free Metric Card's static
label/value/context structure (https://uiarc.dev/r/metric-card.json). These are local,
read-only quota presentations, not claims that upstream exposes these variant props.
They omit animated counters, category toggles and fake goal-completion states.

ExpandableCard was retrieved from the free registry on 2026-10-22:
https://uiarc.dev/r/expandable-card.json. It retains native disclosure buttons, inert
closed panels, Escape focus return and reduced-motion support; local imports use the
existing Lucide icons and motion tokens. Benefits without expiry dates stay plain rows.

StaticDonut adapts the free Donut Chart's cumulative-angle sector geometry:
https://uiarc.dev/r/donut-chart.json. It keeps a fixed recorded-token denominator and
omits hidden-category renormalization, hover resizing, tooltips and animation. Exact
readings and zero-token models remain in the accompanying legend; invalid or overly
fragmented data retains the original list. Both use the existing MIT license.

StaticSparkline was adapted on 2026-10-24 from the free registry:
https://uiarc.dev/r/sparkline.json. Its point/line mapping is also ported to
`src-tauri/src/tray_sparkline.rs` for the actual native macOS menu-bar image.
Both use the existing MIT license. Calendar-day slots, a zero baseline and
straight segments replace min/max-normalized smoothing. Missing days break the
line, zero stays zero, and a single record stays a point. There are no invented
samples, forecasts, scrubbing, tooltips, fill animations or rolling numbers.

## Arc Pro Exception: Tick Ring

`tick-ring/tick-ring.tsx` and `tick-ring/tick-ring.module.css` adapt Activity Rings,
retrieved through the authorized Arc MCP connection on 2026-10-24:
https://uiarc.dev/components/activity-rings.
They retain the upstream radial tick geometry and circular mask, but present
one independent quota per dial, without averaged goals, dates, completion
celebrations or motion. This is a TokenPlan-specific adaptation, not the
upstream component API.

These two files are **not covered by the project or Arc free-component MIT
licenses**. Copyright (c) 2026 Elia Kuratli. The applicable Arc Pro terms are in
`tick-ring/LICENSE.md` and https://uiarc.dev/license (updated 2026-10-24).
The license permits embedding Pro source in a public open-source end product,
not distributing it as a standalone component, library, registry, kit or template.
Retain the notices and license exception in source and bundled licenses.

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

Retrieved 2026-10-20. No Arc Pro components are included.
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

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

# Daily Records Exploration

This Chinese-only, development-only comparison changes daily-record organization,
not quota usage, billing, history collection or product preferences. The owner has
not selected a winner. Existing explorations and production remain unchanged.

- **Current list:** focused reproduction of the daily-record block and nested
  source/model rows in `src/preview/HistoryPage.tsx`. One day expands at a time.
- **Date timeline:** recorded dates only, with independent day disclosures and
  Up/Down/Home/End navigation. Spacing does not imply elapsed time.
- **Daily summary cards:** token totals, recorded costs and source counts remain
  visible. Escape closes a disclosure and returns focus to its trigger.

The source of the two adaptations is the free Arc registry:

- https://uiarc.dev/r/timeline.json
- https://uiarc.dev/r/expandable-card.json

The timeline retains the marker/line/trigger structure and keyboard navigation,
but omits event timestamps, actors, relative clocks and entrance animations.
Cards retain the native trigger, spring-height disclosure, inert closed content
and Escape handling, but omit width morphing and rolling numbers. No tooltip,
new dependency, payment action or fake event is introduced. The existing Arc
Button, Select, Switch, fonts and tokens are reused.

Fixtures conform to the production account contract. Filtering, source deduping
and totals use `historyRange`, `historyRows` and `summarizeHistory`. The fixed local
reference day is **2026-10-22**; changing the wall clock does not empty the preview.
Claude is device-scoped, Cursor account-scoped. Missing dates are not zero-filled,
unknown costs stay unknown, and partially known totals are marked. Explicit zero
activity has its own scenario. Forty recorded days paginate seven at a time.

Open `/explorations/daily-records/`; `?v=1`, `?v=2`, `?v=3` choose the direction.
The bottom picker and keys 1–3 / Left / Right switch directions. Scenario and width
controls do not intercept those shortcuts. The fixed picker is comparison tooling,
not part of the proposed product UI.

Validation from `platforms/tauri`, with the existing Vite server on port 1420:

```sh
npx --no-install tsc --noEmit -p explorations/daily-records/tsconfig.json
AGENT_BROWSER_NAMESPACE=dr-lab agent-browser --session dr --restore open http://localhost:1420/explorations/daily-records/
AGENT_BROWSER_NAMESPACE=dr-lab agent-browser --session dr --restore set viewport 1280 1000 2
node explorations/daily-records/verify.mjs
AGENT_BROWSER_NAMESPACE=dr-lab agent-browser --session dr --restore close
```

The acceptance script checks visible results, source deduping, unknown and zero
costs, missing dates, all 40 records across six pages, nested expansion, recovery,
four viewport widths, three panel widths, dark mode, keyboard navigation, URL
restoration, reduced motion, inert content and a future clock. Browser validation
is not a native app, real-device or screen-reader test. The timeline and cards are
intentionally taller than the current list; their panel scrolls rather than
discarding records to fit one screenshot.

# Anthropic API

Reads official Claude Console organization usage and costs through the [Usage and Cost Analytics API](https://platform.claude.com/docs/en/manage-claude/usage-cost-analytics-api). This is a separate service from Claude subscription quotas and local session logs.

Configure an organization Admin key in service settings, or through `ANTHROPIC_ADMIN_KEY`. The service uses the existing private API-key store (`~/.config/tokenplan/anthropic.json` on macOS). Ordinary `ANTHROPIC_API_KEY` credentials are never reused. No key is included in UI state, fixtures, or source control.

- Homepage: this month's official USD cost. Details: today's cost, monthly tokens and requests. All four metrics enabled; only monthly cost on the homepage; none pinned by default.
- History: daily UTC token counts, model token breakdown and official cost. The report covers the current month and at least the last 30 calendar days, organization-wide, without workspace filters.
- Requests use hourly buckets so completed hours today are included, then aggregate by UTC date. Reports can lag by 4–24 hours and may be revised. The unfinished hour is excluded by the API.
- Amounts arrive as cents and are divided by 100; total tokens already include cache reads/writes. Cost is after discounts and before credits, not a balance or final invoice. Priority commitment fees are not included by the endpoint.
- Model costs are not currently exposed. Missing days are not fabricated; history joins days returned by both endpoints. The current month may be partial because of reporting delays.
- Local Claude logs can overlap API reports. Select the API service for official organization totals rather than combining it with local logs.
- GET only, fixed Anthropic host, required version/beta headers, bounded pagination. Permission errors, incomplete pages and malformed counters produce errors, never zero totals. Replacing a key clears the previous account's report cache.

## Verification

Mock responses cover cents conversion, cached tokens, Admin-key isolation, pagination and malformed/forbidden responses. Shared macOS/Windows/Linux UI tests cover key settings and official history. Real-account verification is pending a user-provided Anthropic Admin key; the owner requested development and mock tests first. Windows/Linux native desktop execution is not claimed by shared UI tests.

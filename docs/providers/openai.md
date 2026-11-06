# OpenAI API

OpenAI API is a separate, optional service from Codex. Add it in Subscription Management and enter an API Platform organization Admin key. Ordinary model API keys and ChatGPT workspace Admin keys are not substitutes. Only read access needed by the reporting endpoints should be granted.

## Readings

- Home defaults to this month's USD cost. Today, month tokens and month requests start in details. Nothing is pinned to the tray by default.
- Costs come from `GET /v1/organization/costs`, grouped by project and summed for the key's organization.
- Token counts, request counts and model breakdowns come from `GET /v1/organization/usage/completions`. Cached input is already included in input tokens and is not added again. This is not a claim to count every API product's tokens.
- Daily history joins dates actually returned by both sources. Dates and calendar months use UTC; reporting can lag. There is no fabricated reading for a missing day.
- Model costs are unknown: the Costs API's project totals are not allocated to models using token ratios. API costs are reported amounts, whereas other providers' local histories may be estimates.
- This connection reports the whole organization attached to the key. It does not automatically link organizations by email, combine ChatGPT credits with API billing, or expose project filtering in this first implementation.
- Prepaid balance is not available through this integration. Monthly spend and a personal reference budget are never labelled as an API balance.

## Credentials and failures

The service uses the existing local API-key editor. macOS uses the restricted local `~/.config/tokenplan/openai.json` store; Windows uses the current-user protected credential store; Linux uses the restricted local credential file. `OPENAI_ADMIN_KEY` is the explicit environment alternative. The development `.env.openai-admin.local` is ignored by Git and is not automatically read by the product or bundled.

Requests are GET-only and follow bounded pagination on the fixed OpenAI API host. They never call model, purchase, reset-consumption or organization-management mutation endpoints. 401 means replace the key; 403 means review reporting permissions; network and rate-limit errors remain distinct. Both reporting sources must succeed before replacing a snapshot; an incomplete fetch does not become zero spend. Last-good readings retain their timestamp and failure indicator. Changing a key clears the old organization's current readings. On launch, the API report is fetched before a persisted report is shown.

## Codex credits

Both engines preserve the returned credit count, including fractions and negative values. There is no fixed USD conversion. Unlimited, missing and measured zero are distinct. The existing Codex credential source and read-only usage request remain in use; this change does not launch a second Codex app server or rotate the formal app's login.

## Verification

The explicit development audit reads a configured key in a child process, not the formal application's configuration. Swift `ProviderLiveAuditTests` accepts `TOKENPLAN_AUDIT_PROVIDER=openai`; the .NET core test executable accepts `--openai-audit`. Neither prints keys, account identifiers or raw responses. A separate opt-in Swift test (`TOKENPLAN_AUDIT_CODEX_CREDITS=1`) reads the default Codex auth file without refreshing or saving credentials.

Automated coverage includes original credit units, fractional/negative/zero/unlimited states, model price absence, no double-counting cached tokens, ordinary-key exclusion, rejected permissions, pagination loops and malformed responses. Playwright exercises the shared interface in the macOS, Windows and Linux shell modes. These are not native Windows/Linux desktop installation tests.

### Development verification, 2026-10-29

Authorized read-only requests succeeded for Codex usage and the API Costs/Usage endpoints. The Swift provider and .NET provider both completed live API reads; the .NET result contained 29 daily records. Codex returned a finite credits balance as a numeric string. Raw responses, organization identifiers and credentials were not saved in fixtures or logs. These checks establish retrieval and parsing, not independent reconciliation against the web billing dashboard.

Final checks: Swift full regression passed (1,603 XCTest cases plus CLI/Swift Testing suites; opt-in live tests skipped by default), followed by focused bridge/missing-bucket tests. .NET passed 556 core checks and the desktop bridge compiled. Shared UI passed 137 unit tests, 9 build-script tests and 6 WebKit/Chromium shell tests across macOS/Windows/Linux modes; 10 native tray image tests passed. The macOS independent preview was rebuilt with synthetic data only. Windows/Linux native desktop launch remains untested on this Mac.

The homepage groups Codex and OpenAI API under OpenAI, with Codex and API subheadings. The group appears at the first visible OpenAI account's position; other services retain their relative order. Accounts retain their saved order within each service. Hidden services leave no empty section. This presentation does not merge credentials, metrics, account settings or history.

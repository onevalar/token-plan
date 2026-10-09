# Dashboard

Open TokenPlan from its menu bar icon to see current AI usage and available quota. TokenPlan reads existing provider logins — there is no TokenPlan account to sign into. Detected Claude and Codex logins share a service heading but keep separate usage cards. Matching plan names also show the login identity so the subscriptions remain distinguishable.

**Refresh** is at the top, beside the **…** menu. It shows progress while fetching and prevents duplicate requests. The overview has no bottom action bar. Open **Settings** or **Services & Subscriptions** from **…**; a subscription's right-hand chevron opens its details directly.

## First launch

A fresh install starts with Claude, Codex and Cursor, then checks for credentials already available on your Mac — existing local logins, saved API keys and supported environment variables. The detection itself sends nothing anywhere. TokenPlan switches to the detected providers; if none are found, it keeps the starter set. A one-time welcome card points to **Services & Subscriptions** and stays until dismissed.

Updates preserve your existing provider choices. When an update adds a provider you have never seen, local detection runs once for just that provider. See [Which Providers Are On](provider-enablement.md).

## Overview readings

- Quotas show a short cycle such as `5h` or `1w` (Chinese: `1周`) and a percentage without an extra Used/Left phrase. Model-specific scopes remain distinguishable, such as `Sonnet · 1w`.
- **Settings → Usage Display → Show Usage As** chooses whether the number and bar mean used or remaining. Screen readers retain that meaning. The numbers are display-only, not hidden setting buttons.
- Color always reflects actual remaining quota, not how fast you have been using it: blue above 20% remaining, yellow at 20% or less, red at 10% or less. Bands use the rounded whole-percentage reading and do not change with Used/Left.
- An hourglass precedes the countdown; its units are `d`, `h` and `m` in every language. A calendar precedes the exact time when that format is selected in Settings. No known reset date means no invented countdown. An elapsed snapshot reads `soon` until fresh data arrives — it does not prove the quota has recovered.
- Fresh rolling sessions say **Not started** until the provider's session-start signal is present.
- Balances remain compact text readings. Enabled reset-credit rows show **Reset Count**, the count and nearest expiry together. An elapsed expiry says **Expired**, not `soon`; missing expiry information is stated explicitly. Hide remains available in subscription configuration.

Only metrics configured as **Visible** appear here. There is no bottom Details expander. Usage history, trends and model breakdowns belong on the subscription detail page, even if an older saved layout marked them Visible. Those saved selections are not erased. A history-only subscription retains its heading and detail entry without an empty overview card.

If a provider cannot be read, the card shows the reason and suggested fix. The header also indicates errors, refresh progress or outdated data. With no tracked services, the overview offers **Services & Subscriptions**.

## Subscription details and configuration

The subscription's chevron opens one page with readings at the top and configuration below. Back returns to the screen you came from. **Services & Subscriptions** also lists disabled services, so you can enable them or inspect their saved configuration.

The top readings include enabled quota, balance and history metrics. Spend rows combine cost and tokens; a chevron opens a model breakdown where supported, and hovering the value also works. The reset-credit chevron opens the expiry list and any supported claim action. Claiming still requires confirmation — opening details never consumes a credit. Useful dashboard and account-management links open the provider's own website; provider status-page links are not included.

Below the readings are connection status, login source and optional notes. Notes stay off the overview unless you explicitly choose to show them. **Add Service Login** explains signing in through the provider's app or CLI and restarting TokenPlan to detect that login. It does not sign you in or switch accounts; restarting preserves display preferences. Additional-account discovery depends on supported Claude/Codex sources.

The **Display Metrics** table offers **Visible**, **Details** or **Hidden**, plus a **Menu Bar** checkbox. History metrics offer Details or Hidden only; reset-credit rows offer Visible or Hidden. Keep at least one non-history metric Visible when available. Up to two metrics per provider can be pinned to the menu bar. Drag grips reorder within a placement; use the dropdown to change placement. Supported API-key and cost-estimate controls remain below.

**Restore Defaults…** is a text action below the configuration, not a navigation icon. It asks for confirmation and restores this subscription's metric visibility, order and menu-bar selection without changing other subscriptions. **Restore All Defaults…** below the service list restores the overall layout and re-detects installed tools. Connection details and notes remain unchanged; resets clear the customization undo history.

## Usage History

Open **Settings → Usage History** for cross-provider totals. The title switches between **Cost**, **Cost/MTok** and **Tokens**; the period picker offers **Today**, **Yesterday** and **30 Days**. Both choices persist across launches.

The ring and ranked legend follow the selected metric. Cost/MTok shows each provider's rate and a blended overall rate. Hover the center for the exact value and any local-estimate note. An enabled spend-capable provider still contributes when its own spend rows are hidden. Unrelated dollar balances do not mix into history totals. A period without data shows an empty state, not a fabricated zero. With no history-capable service enabled, the page explains what to enable.

Per-provider spend rows, 30-day trends and model breakdowns remain on subscription details. Missing data is not presented as real zero usage. Large numbers are abbreviated, with exact values available on hover. Unknown-price warnings name models excluded from priced totals; see [Pricing](pricing.md).

With [iCloud Sync](icloud-sync.md) enabled, machine-local history combines across synced Macs. Cursor remains account-wide. Quotas, plans, balances and provider errors describe this Mac's refresh. Countdown rows tick every 30 seconds between refreshes.

## Management and menus

Right-click a metric for **Hide**, **Star for menu bar / Unstar**, **Refresh** and **Customize…**. Right-click a service heading to hide or refresh the service or open its configuration. Drag a visible overview row within its provider or drag a service heading to reorder services. There is no caret boundary to drag across. On a Force Touch trackpad, reordering gives a light tap at each new slot.

**⌘Z** undoes recent customization changes, including visibility, order and pins. Undo is per-session and resets clear it. New default metrics are added once to existing layouts; hiding one remains respected.

The **…** menu contains **Services & Subscriptions**, **Settings**, update checking when available, **About TokenPlan** and **Quit TokenPlan**. Screenshot sharing and Report an Issue are not included. About gives a short product introduction and a local license link; it does not upload information.

## Keyboard and closing

| Key | Action |
|---|---|
| Return | Open Services & Subscriptions from the overview; elsewhere, go back one level or to the entry screen |
| Esc | Go back; from the overview, close the popover |
| ⌘Z | Undo the last customization change |
| ⌘R | Refresh from any popover page, bypassing the cache |
| ⌘, | Open / close Settings |

A global shortcut recorded in Settings toggles the popover from anywhere. Closing returns navigation and the overview scroll position to the top; it does not reset your layout or display choices.

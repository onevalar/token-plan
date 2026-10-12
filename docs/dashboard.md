# Dashboard

Open TokenPlan from its menu bar icon to see current AI usage and available quota. TokenPlan reads existing provider logins — there is no TokenPlan account to sign into. Detected Claude and Codex logins share a service heading but keep separate usage sections. Matching plan names also show the login identity so the subscriptions remain distinguishable.

The labeled **Refresh** button is at the top, beside the **…** menu. It shows progress while fetching and prevents duplicate requests. The overview has no bottom action bar. Open **General Settings** or **Subscription Services** from **…**; a subscription's right-hand chevron opens its details directly.

## First launch

A fresh install starts with Claude, Codex and Cursor, then checks for credentials already available on your Mac — existing local logins, saved API keys and supported environment variables. The detection itself sends nothing anywhere. TokenPlan switches to the detected providers; if none are found, it keeps the starter set. A one-time welcome card points to **Subscription Services** and stays until dismissed.

Updates preserve your existing provider choices. When an update adds a provider you have never seen, local detection runs once for just that provider. See [Which Providers Are On](provider-enablement.md).

## Overview readings

- Quotas show a short cycle such as `5h` or `1w` in every language, and a percentage without an extra Used/Left phrase. Model-specific scopes remain distinguishable, such as `Sonnet · 1w`.
- **… → General Settings → Show Usage As** chooses whether the number and bar mean used or remaining. The choice persists and updates the preview immediately. Overview and detail quotas always use horizontal bars; Ring is menu-bar only. Screen readers retain the reading's meaning. The numbers are display-only, not hidden setting buttons.
- Color always reflects actual remaining quota, not how fast you have been using it: blue above 30% remaining, yellow above 10% through 30%, red at 10% or less. Bands use the actual remaining share before display rounding and do not change with Used/Left. Notification rules remain independent.
- An hourglass always precedes the countdown; its units are `d`, `h` and `m` in every language. The former Exact Time preference no longer changes quota rows. No known reset date means no invented countdown. An elapsed snapshot reads `soon` until fresh data arrives — it does not prove the quota has recovered.
- Fresh rolling sessions say **Not started** until the provider's session-start signal is present.
- Balances remain compact text readings. Reset-credit counts and expiries live only in subscription details, not in an extra overview row.

Only metrics configured as **Show on Home** appear here. There is no bottom Details expander. Reset credits, usage history, trends and model breakdowns belong on the subscription detail page, even if an older saved layout marked them Visible. Those saved selections are not erased. A details-only subscription retains its heading and detail entry without empty quota rows.

If a provider cannot be read, the card shows the reason and suggested fix. The header also indicates errors, refresh progress or outdated data. With no tracked services, the overview offers **Subscription Services**.

## Subscription details and configuration

The subscription's chevron opens a detail page with Usage and Settings tabs. Back returns to the screen you came from. **Subscription Services** also lists disabled services, so you can enable them or inspect their saved configuration.

Subscription details open on **Usage**, showing enabled quotas and balances. Enabled history, trends and reset credits are shown directly below the primary readings, without another disclosure. Spend rows combine cost and tokens; a chevron opens a model breakdown where supported, and hovering the value also works. **Reset Credits** has its own card with the count and one numeric local expiry (`2026-10-23 11:35`) per credit, soonest first. The same read-only rows are used for Claude and Codex, with no redemption action or countdown. Expired credits retain their date and an **Expired** label; unavailable dates are stated explicitly. Useful dashboard and account-management links open the provider's own website; provider status-page links are not included.

The **Settings** tab starts with Display Content. Connection status and a labeled Refresh button accompany the subscription name on both tabs. Optional multiline notes follow the controls. Notes stay off the overview unless you explicitly choose to show them. **Add Service Login**, available only on the **Subscription Services** list, explains signing in through the provider's app or CLI and restarting TokenPlan to detect that login. It does not sign you in or switch accounts; restarting preserves display preferences. Additional-account discovery depends on supported Claude/Codex sources.

**Display Content** is expanded at the top of the Settings tab. It lists Content Item and Status, plus menu-bar checkboxes. Status offers **Show on Home**, **Details Only** or **Hidden**. History and reset-credit metrics offer Details Only or Hidden. Keep at least one quota/balance metric on Home when available. The menu-bar counter shows up to two selections per subscription. Once full, unchecked boxes are disabled with a visible explanation; selected boxes remain removable, and removing one immediately restores the other choices. Drag grips reorder within a placement; use the dropdown to change placement. Supported API-key controls remain on Settings; cost estimates expand separately.

**Restore Defaults…** is a text action below the configuration, not a navigation icon. It asks for confirmation and restores this subscription's metric visibility, order and menu-bar selection without changing other subscriptions. **Restore All Defaults…** below the service list restores the overall layout and re-detects installed tools. Connection details and notes remain unchanged; resets clear the customization undo history.

## Usage History

Open **… → Usage History** for cross-provider totals. The title switches between **Cost**, **Cost/MTok** and **Tokens**; the period picker offers **Today**, **Yesterday** and **30 Days**. Both choices persist across launches.

The ring and ranked legend follow the selected metric. Cost/MTok shows each provider's rate and a blended overall rate. Hover the center for the exact value and any local-estimate note. An enabled spend-capable provider still contributes when its own spend rows are hidden. Unrelated dollar balances do not mix into history totals. A period without data shows an empty state, not a fabricated zero. With no history-capable service enabled, the page explains what to enable.

Per-provider spend rows, 30-day trends and model breakdowns remain on subscription details. Missing data is not presented as real zero usage. Large numbers are abbreviated, with exact values available on hover. Unknown-price warnings name models excluded from priced totals; see [Pricing](pricing.md).

With [iCloud Sync](icloud-sync.md) enabled, machine-local history combines across synced Macs. Cursor remains account-wide. Quotas, plans, balances and provider errors describe this Mac's refresh. Countdown rows tick every 30 seconds between refreshes.

## Management and menus

Right-click a metric for **Hide**, **Star for menu bar / Unstar**, **Refresh** and **Customize…**. Right-click a service heading to hide or refresh the service or open its configuration. Drag a visible overview row within its provider or drag a service heading to reorder services. There is no caret boundary to drag across. On a Force Touch trackpad, reordering gives a light tap at each new slot.

**⌘Z** undoes recent customization changes, including visibility, order and pins. Undo is per-session and resets clear it. New default metrics are added once to existing layouts; hiding one remains respected.

The **…** menu offers **Subscription Services**, **Display & Appearance**, **Usage History**, **General Settings**, update checking when available, **About** and **Quit**. Display & Appearance groups Usage Display, App Interface and System Menu Bar settings on one page. It and Usage History return directly to the overview. General Settings does not repeat them. Screenshot sharing and Report an Issue are not included. About displays only the installed version number. Repository and bundled license files remain unchanged.

## Keyboard and closing

| Key | Action |
|---|---|
| Return | Open Subscription Services from the overview; elsewhere, go back one level or to the entry screen |
| Esc | Go back; from the overview, close the popover |
| ⌘Z | Undo the last customization change |
| ⌘R | Refresh from any popover page, bypassing the cache |
| ⌘, | Open / close Settings |

A global shortcut recorded in Settings toggles the popover from anywhere. Closing returns navigation and the overview scroll position to the top; it does not reset your layout or display choices.

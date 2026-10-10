# Menu Bar

Choose compact percentages or one primary quota ring per selected account.

## Right-clicking the icon

Right-click (or control-click) the menu bar icon for a quick menu with **Settings** and **Quit**. Left-click opens the popover as usual.

## Starring

Percentage uses your stars. Star a metric from any row's right-click menu, or from the always-visible star beside a metric in Customize. Ring selects its primary quota automatically without changing these saved stars.

- On first launch the app ships with a default set of stars (Amp Agent/Orbs, Antigravity Session/Weekly, Claude Session/Weekly, Codex Session/Weekly, Cursor Models/Other Models, Copilot Credits, OpenRouter Credits, Z.ai Session/Weekly) so the strip shows numbers right away. Change them anytime; a provider's Reset restores its defaults, and Reset All restores the full set. Only providers that are turned on render in the strip — and a fresh install starts with just the providers detected on your Mac (see [Dashboard § First launch](dashboard.md#first-launch)) — so the default stars don't crowd the menu bar with tools you don't use.
- At most **2 stars per provider**.
- When a star isn't allowed, the star button stays clickable — clicking it shakes and shows the reason in a temporary pill over the bottom of Customize (for example, "Up to 2 stars per provider").

## Choosing services

**… → Display & Appearance → System Menu Bar → Shown Services** has an independent switch for each enabled service. Back returns to the overview. All are on by default. A switch covers every account of that service, including additional Claude and Codex logins.

- Hiding a service here only removes it from the menu bar. It stays enabled, keeps refreshing, and remains in the overview and subscription details.
- Your metric stars, order, and layout stay saved. Showing a service again restores the same menu-bar selections.
- Multi-account services show account switches beneath the service switch. All accounts are selected by default; keep them all or select individual accounts yourself. Hiding the whole service preserves those choices. No account is automatically picked or discarded because of its usage.
- Accounts of the same service carry small `1`, `2`, … badges in both styles. Numbers follow the saved account order and are assigned before hiding or missing-data filtering, so hiding account 1 does not rename account 2. The Settings rows show the same numbers and account names.
- Services with no stars or data still have a switch, so you can configure them before usage arrives. Turning a service off in Services & Subscriptions removes its switch until it is enabled again; its menu-bar choice stays saved.
- You can hide every service. The menu bar then shows the app icon.
- Restoring a subscription or all customization defaults resets stars and layout, but keeps these Settings-owned switches. **Reset All Settings** turns all of these switches back on.

## Choosing a style

**… → Display & Appearance → System Menu Bar → Menu Bar Style** offers exactly two choices:

- **Percentage** (default): numeric readings beside each provider mark. Percent quotas show percentages; balances and counts keep their own units.
- **Ring**: exactly one quota ring per selected account. Claude uses its 5-hour limit. Codex Plus uses 5-hour; Codex Pro (including Pro 100/200/500) uses weekly. Other or unknown plans use their available quota with the smallest actual remaining share. A missing primary quota falls back to another reported quota, not a fabricated reading. Without any reported quota, an available balance remains numeric.

There are no concentric rings or extra rings for secondary limits. Ring fill follows **Show Usage As → Used / Left**; selecting the primary quota does not change with that display mode. The menu bar follows macOS's light/dark tint rather than the overview's quota warning colors.

Both styles use the service/account switches and saved provider order. Percentage retains the two-star cap; switching back restores the same stars. Screen readers retain the account, metric name and numeric reading in either style. Overview and detail quotas always remain horizontal bars when menu-bar style changes.

The style survives relaunch and customization resets. **Reset All Settings** restores Percentage and turns every service switch on. Older saved Text/Bars choices, or an invalid saved style, read as Percentage without rewriting the preference at startup.

## Hiding usage while screen sharing

Settings → Privacy → **Hide From Screen Share** (off by default). While your screen is being shared or recorded — a Zoom/Meet/Teams share, a screen recording, macOS Screen Sharing — the strip is replaced with the TokenPlan icon and wordmark, so token counts and spend never show up in front of an audience. The moment the capture ends, your starred metrics come right back. Captures you start yourself (a screen recording, for example) count too, so those get the wordmark as well.

Detection rides the system's own "an app is capturing the screen" signal — the same one that lights the capture indicator in the menu bar — checked the instant it changes and re-checked every few seconds while the setting is on.

## What the strip shows

The strip only renders real data from selected accounts of enabled services whose menu-bar switch is on. Percentage skips stars without fetched data; Ring skips accounts with no eligible reading. There are no orphan logos or placeholder quota circles. When nothing has data, the strip falls back to the app icon. Stars follow your saved metric order and placement. A metric can be starred whether it appears in the overview or only in subscription details.

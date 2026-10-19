# Menu Bar

## Missing Menu Bar Entry on macOS 26

Check **System Settings → Menu Bar → Allow in the Menu Bar → TokenPlan** first. If it is already enabled, the system can still block TokenPlan through another application's saved menu-bar association. On one development Mac, enabling the build host's **ChatGPT** (`com.openai.codex`) switch immediately restored TokenPlan; disabling it blocked TokenPlan again. The TokenPlan switch alone had no effect.

To distinguish this from an image or layout problem, inspect Control Center's `appStatusItems` log for TokenPlan's bundle identifier. `Moving host to blocked list` confirms system blocking; `Unblocking host` confirms that it was lifted. A non-nil status button, a rendered image, or `isVisible == true` does not prove that the system is displaying the entry.

Change another application's display switch only with the user's agreement. A menu-bar manager can hide that application's own icon separately. Do not change TokenPlan's bundle identifier, repeatedly recreate its status item, or automatically reset Control Center to work around this state. This workaround restores visibility but does not remove the system's incorrect association.

For an explicit, targeted repair on an affected development Mac, `python3 script/repair_menu_bar_association.py` checks whether the `com.openai.codex` record contains `com.onevalar.tokenplan.dev`. `--apply` backs up the original preferences in `~/Library/Logs/TokenPlan/MenuBarRepairs/`, removes only that foreign reference, and verifies the write. Both applications' allow/deny switches and unrelated associations remain unchanged. The tool requires existing macOS permission to access the protected preferences; stop at a permission denial and have the user run it from an authorized Terminal. It does not grant itself access or restart system processes. Restart Control Center and launch TokenPlan from Finder after applying, then verify that TokenPlan remains visible while ChatGPT is disallowed. Keep using the app bundle through Finder or the build script's LaunchServices `open` path; avoid directly launching its inner executable from a development tool.

This targeted repair was verified on the affected Mac: it removed one reference, and TokenPlan remained in the visible menu-bar section after restarting both Control Center and TokenPlan while ChatGPT's system switch stayed off. Control Center logged TokenPlan as an allowed host and ChatGPT as a blocked host. This confirms the repaired local association; it does not guarantee that future macOS versions cannot create another incorrect association.

Choose compact percentages or one primary quota ring per selected account.

## Right-clicking the icon

Right-click (or control-click) the menu bar icon for a quick menu with **Settings** and **Quit**. Left-click opens the popover as usual.

## Starring

Percentage uses your stars. Star a metric from any row's right-click menu, or from the always-visible star beside a metric in Customize. Ring selects its primary quota automatically without changing these saved stars.

- On first launch the app ships with a default set of stars (Amp Agent/Orbs, Antigravity Session/Weekly, Claude Session/Weekly, Codex Session/Weekly, Cursor Models/Other Models, Copilot Credits, OpenRouter Credits, Z.ai Session/Weekly) so the strip shows numbers right away. Change them anytime; a provider's Reset restores its defaults, and Reset All restores the full set. Only providers that are turned on render in the strip — and a fresh install starts with just the providers detected on your Mac (see [Dashboard § First launch](dashboard.md#first-launch)) — so the default stars don't crowd the menu bar with tools you don't use.
- At most **2 stars per provider**.
- When a star isn't allowed, the star button stays clickable — clicking it shakes and shows the reason in a temporary pill over the bottom of Customize (for example, "Up to 2 stars per provider").

## Choosing services

**… → General Settings → System Menu Bar → Shown Services** has one independent switch per enabled account (one per service when there is only one account). Back returns to the overview. All are on by default.

- Hiding a service here only removes it from the menu bar. It stays enabled, keeps refreshing, and remains in the overview and subscription details.
- Your metric stars, order, and layout stay saved. Showing a service again restores the same menu-bar selections.
- Multi-account services show only account switches, without a redundant service switch. Claude labels use `Claude-email`. Each switch changes only that account. Older hidden-service settings remain hidden until changed; enabling one account keeps its siblings hidden.
- Accounts of the same service carry small `1`, `2`, … badges in both styles. Numbers follow the visible account order after hiding and missing-data filtering, so the remaining accounts are always numbered consecutively. The settings list and strip use the same grouped order, keeping accounts of each service adjacent. Settings labels omit number badges and organization metadata.
- Services with no stars or data still have a switch, so you can configure them before usage arrives. Turning a service off in Subscription Services removes its switch until it is enabled again; its menu-bar choice stays saved.
- You can hide every service. The menu bar then shows the app icon.
- Restoring a subscription or all customization defaults resets stars and layout, but keeps these Settings-owned switches. **Reset All Settings** turns all of these switches back on.

## Choosing a style

**… → General Settings → System Menu Bar → Menu Bar Style** offers exactly two choices:

- **Percentage** (default): numeric readings beside each provider mark. Percent quotas show percentages; balances and counts keep their own units. Saved stars take priority. If a selected account has no starred reading available, Percentage shows the same primary reading as Ring, without modifying its stars.
- **Ring**: exactly one quota ring per selected account. Claude uses its 5-hour limit. Codex Plus uses 5-hour; Codex Pro (including Pro 100/200/500) uses weekly. Other or unknown plans use their available quota with the smallest actual remaining share. A missing primary quota falls back to another reported quota, not a fabricated reading. Without any reported quota, an available balance remains numeric.

There are no concentric rings or extra rings for secondary limits. Ring fill follows **Show Usage As → Used / Left**; selecting the primary quota does not change with that display mode. The menu bar follows macOS's light/dark tint rather than the overview's quota warning colors.

Both styles use the account switches and the same grouped order as Settings. Percentage retains the two-star cap; switching back restores the same stars. Screen readers retain the account, metric name and numeric reading in either style. Overview and detail quotas always remain horizontal bars when menu-bar style changes.

The style survives relaunch and customization resets. **Reset All Settings** restores Percentage and turns every service switch on. Older saved Text/Bars choices, or an invalid saved style, read as Percentage without rewriting the preference at startup.

## Hiding usage while screen sharing

Settings → Privacy → **Hide From Screen Share** (off by default). While your screen is being shared or recorded — a Zoom/Meet/Teams share, a screen recording, macOS Screen Sharing — the strip is replaced with the TokenPlan icon and wordmark, so token counts and spend never show up in front of an audience. The moment the capture ends, your starred metrics come right back. Captures you start yourself (a screen recording, for example) count too, so those get the wordmark as well.

Detection rides the system's own "an app is capturing the screen" signal — the same one that lights the capture indicator in the menu bar — checked the instant it changes and re-checked every few seconds while the setting is on.

## What the strip shows

The strip only renders real data from selected accounts of enabled services whose menu-bar switch is on. Percentage skips stars without fetched data and falls back to the primary reading. Both styles skip accounts with no eligible data. There are no orphan logos or placeholder quota circles. When nothing has data, the strip falls back to the app icon. Stars follow your saved metric order and placement. A metric can be starred whether it appears in the overview or only in subscription details.

Account number badges appear only when multiple accounts of the same service are actually rendered. Disabled, menu-bar-hidden, or unavailable siblings do not leave a badge on the sole visible account. When multiple accounts are visible, they are numbered 1, 2, and so on in display order; these labels never change account identity or usage attribution. Ring and percentage modes use the same rule.

### Removing an account

Open the account’s subscription details → Settings → Remove Account. Confirming removes it from TokenPlan and prevents automatic rediscovery, including after restart. CLI login files and saved usage history remain untouched. Use the visibility switch instead when you only want to hide an account temporarily. macOS, Windows and Linux support removal of identified Claude and Codex accounts.

Claude account headings prefer the email from the verified account profile, followed by the plan. Generic Desktop labels such as “Personal” no longer overwrite a saved email. The overview, details and menu-bar settings share the same email label.

Quota row titles use compact periods consistently: OpenCode shows `5h`, `1w`, and `30d`; Antigravity’s independent Argon pool shows `Argon · 1w`, without repeating a translated “Weekly”. Whole-day quota periods omit zero hours. These labels do not change quota values or reset timestamps.

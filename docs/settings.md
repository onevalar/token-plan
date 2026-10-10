# Settings

Settings lives inside the popover — there is no separate window. Open it from the overview's **…** menu, with ⌘, while the popover is showing, or by right-clicking the menu bar icon and choosing Settings. One plain top-left Back button and Esc return one level at a time; ⌘, returns to the dashboard. There is no right-hand reset/navigation lookalike.

Navigation keeps one panel width across the overview, Settings and subscription details. The page being left retains its title and content until it is gone; revisiting Settings or Services & Subscriptions starts at its main page. Closing during a transition cancels it; reopening starts on the overview. Reduce Animations switches screens immediately and keeps the same navigation and keyboard behavior.

The main Settings page contains **General**, including Language, and links to **Display & Appearance**, **Menu Bar**, **Usage History**, **Notifications & Sync**, and **Privacy & Advanced**. Services & Subscriptions is managed directly from the overview's **…** menu, not duplicated in Settings. Usage History holds cross-provider totals that no longer appear on the overview.

The **…** menu also offers checked **Used / Left** and **Percentage / Ring** choices, plus direct **Usage History** and **Menu Bar Settings** shortcuts. These change the same saved preferences as their Settings pages, not separate quick-menu overrides.

**Services & Subscriptions** lets you enable services and open each subscription's connection, optional note, metric placement, menu-bar pins, and supported API-key controls. It explains how existing provider logins are detected; it is not a TokenPlan login screen. A restart detects supported additional logins without resetting display preferences. See [Dashboard](dashboard.md#subscription-details-and-configuration).

## Display & Appearance

| Setting | Options | What it does |
|---|---|---|
| Show Usage As | Used / Left | Whether the percentage and graphic mean used or remaining. Readings show just `48%` or `52%`; screen readers retain the meaning. |

Show Usage As sits above Theme, Density and the other appearance controls on one page. Its preview updates immediately and the choice survives relaunch. Overview and detail quotas always use horizontal bars; the old Vertical Bar/Ring preference is ignored without rewriting it at startup. Ring is available only in the menu bar. Colors always reflect actual remaining quota.

Reset countdowns always use an hourglass and `d/h/m`, regardless of language or a previously saved Exact Time choice. Credit expiry dates are listed numerically in subscription details. Overview numbers and times are display-only, not hidden global setting buttons.

## General

| Setting | Options | What it does |
|---|---|---|
| Refresh Interval | 1 / 2 / 5 / 10 / 15 / 30 minutes, 1 hour | How often provider data is re-fetched in the background (default 5 minutes). Applies immediately. |
| Language | System Default / English / 简体中文 / 繁體中文 / 日本語 / 한국어 | The interface language. Takes effect after a restart; Settings offers a **Restart Now** button. See [Localization](localization.md). |
| Launch at Login | on/off | Registers the app as a login item (the system's login-item registry is the source of truth). |
| Global Shortcut | record a shortcut | Global shortcut that toggles the popover from anywhere. Click the field and press a combo; the ⓧ clears it and disables the shortcut. |

## iCloud Sync

Under **Notifications & Sync**.

**Sync Across Macs** is off by default. Turning it on shares normalized TokenPlan history through the
app's private iCloud container and combines machine-local tokens and spend across Macs signed into the
same iCloud account. Settings shows the five-minute write cadence and each Mac's relative **Updated**
time; it also reports unavailable iCloud, loading, write, and malformed-file states. See
[iCloud Sync](icloud-sync.md) for what is included and which surfaces use the combined values.

## Appearance

Under **Display & Appearance**, alongside Show Usage As and its preview.

| Setting | Options | What it does |
|---|---|---|
| Theme | System / Light / Dark | System (default) follows macOS automatically, including changes while TokenPlan runs. Light and Dark override it only for TokenPlan. |
| Density | Default / Compact | Default breathes; Compact is a real information-dense mode — text steps down one size, rows and provider sections pull together, and Customize / Settings rows tighten with them. In both, consecutive one-line metrics (Today / Yesterday / …) pull together; Compact pulls harder. |
| Reduce Animations | Off / On | Off by default. On removes transitions, motion effects, and continuous decorative animation throughout the popover. The app also honors the macOS Reduce Motion accessibility setting. |
| Increase Transparency | Off / On | On by default: the popover uses native frosted blur. Off uses a solid background; an existing saved choice is preserved. macOS **Reduce Transparency** or **Increase Contrast** automatically keeps it solid (a note explains why), without changing your saved choice. |

## Menu Bar

Open **Settings → Menu Bar**, or **… → Menu Bar Settings** directly.

| Setting | Options | What it does |
|---|---|---|
| Menu Bar Style | Percentage / Ring | Percentage (default) shows starred readings. Ring shows one primary quota per selected account: Claude 5h, Codex Pro 1w, Plus 5h. Fill follows Used / Left. The overview and details remain horizontal bars. |
| Menu Bar Services | On / Off per service and account | All are selected by default. Keep every account or select individual accounts; multi-account services carry numbered badges. Hiding affects only the menu bar. See [Menu bar](menu-bar.md). |

Both menu-bar styles skip metrics without data. Older saved Text/Bars styles read as Percentage without a startup preference rewrite. The service switches include enabled services with no stars or data. Hiding one does not disable it, change the overview, stop refresh, or erase saved stars and layout; showing it again restores its selections. Hide every service to show only the app icon in either style. These choices survive relaunch and customization resets; **Reset All Settings** restores Percentage and all service switches to on.

The old Show Total Spend and Always Show Pacing toggles are removed. History is available on its own page; bars no longer show pace ticks or projections. Their colors reflect actual remaining quota. Pace-based notification choices below remain independent.

## Notifications

Under **Notifications & Sync**.

TokenPlan can alert you with a macOS notification when a metric runs low or its pace gets worse, so you don't have to keep the popover open to catch a quota creeping toward its limit. Alerts work while the app runs in the menu bar, even with the popover closed.

| Setting | Options | What it does |
|---|---|---|
| Almost Out | On / Off | Alerts when a metric crosses under 10% remaining, including balances without a reset window. |
| Cutting It Close | On / Off | Alerts when a metric is projected to finish the period with little left — close to its limit. |
| Will Run Out | On / Off | Alerts when a metric is projected to run out before it resets. |

Alerts fire on a new crossing or pace worsening, then stay deduplicated while that condition is unchanged, so you do not get repeats on every refresh. A quota already in a bad state when TokenPlan launches establishes the baseline without alerting. If it recovers and later worsens again, the alert re-arms; a new reset period also clears the reset-based history. **Almost Out** is based only on the remaining share, so it also works for bounded balances without a reset window. **Cutting It Close** and **Will Run Out** require reset-window pace context. Metrics whose data cannot be read never alert. Turn all three triggers off to silence everything. When several alerts fire at once, they stack into a single grouped banner.

All three alerts default off. The first time you turn one on, TokenPlan asks for notification permission; if you decline (or turn notifications off for TokenPlan in System Settings later), a warning mark appears on the Notifications header and an "Open System Settings" button shows under the toggles so you can re-enable them. A notification's title is the alert name, its subtitle names the provider and metric, and its body is the plain-language verdict. Tapping an alert opens the popover on the dashboard.

## Privacy

Under **Privacy & Advanced**, alongside the command-line tool, logging, reset, and update controls.

| Setting | Options | What it does |
|---|---|---|
| Hide From Screen Share | On / Off | Off (default). On replaces the menu bar strip with the TokenPlan icon and wordmark while your screen is being shared or recorded, and restores your starred metrics the moment the capture ends. See [Menu bar](menu-bar.md#hiding-usage-while-screen-sharing). |

## Advanced

| Setting | Options | What it does |
|---|---|---|
| Log Level | Error / Warning / Info / Debug | How much detail the app writes to its log file. Defaults to Info and persists across launches; raise to Debug while reproducing a problem. Applies immediately. |
| Copy Log Path | button | Copies the log file path (`~/Library/Logs/TokenPlan/TokenPlan.log`) to the clipboard. |
| Reveal in Finder | button | Opens a Finder window with the log file selected. |
| Reset All Settings… | button | Restores every setting to its default, behind a confirmation alert. |

See [Logging](logging.md) for the full behavior: subsystem tags, the file size cap, and the guarantee that secrets are never written.

**Reset All Settings…** restores every setting on this screen to its default — appearance, usage display, notifications, privacy, log level, refresh interval, the global shortcut (cleared), Launch at Login (turned off), iCloud sync (turned off), and the update preferences (stable channel, automatic checks on) — and also resets all customization, exactly like Customize's Reset All: default layout, order, and menu-bar stars, with providers turned back on for the tools you have installed. The reset cannot be undone.

Not touched: provider logins and API keys, cached usage data, subscription notes, and your language choice. Turning iCloud sync off as part of the reset works exactly like flipping its toggle off: this Mac's synced history is removed from the shared iCloud data, and your other Macs keep their own.

## Updates

The Updates section appears in official packaged builds that include the signed update feed. Local
developer builds do not show it.

| Setting | Options | What it does |
|---|---|---|
| Check Automatically | On / Off | Whether Sparkle checks for updates in the background. You can still check manually when this is off. |
| Beta Updates | On / Off | Adds pre-release builds to the updates you can receive. Stable releases remain available either way. |
| Check for Updates… | button | Starts a manual update check and opens Sparkle's update window. |

See [Updates](updates.md) for the dashboard banner, channels, and signature verification.

## Version

The app version shows in the Settings footer.

Your settings carry across updates — layout, stars, preferences, and the menu-bar shortcut all stay put. When an update changes how a setting is stored, the app upgrades it in place on launch, stepping through any in-between versions if you skipped a few. Nothing is reset. (Earlier betas wiped all settings on every update; that no longer happens.)

Which providers you have on also carries across updates — your choices are never overridden. A brand-new install picks its starting set by detecting the AI tools on your Mac (see [Dashboard § First launch](dashboard.md#first-launch)). When an update ships a provider you've never seen, the same local detection runs once for just that provider and turns it on only if you actually have the tool; everything you've already decided about stays exactly as you set it. See [Which Providers Are On](provider-enablement.md).

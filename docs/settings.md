# Settings

General Settings lives inside the popover. Open it from the overview’s **… → General Settings**, with ⌘, while the popover is showing, or by right-clicking the menu bar icon. Back and Esc return to the actual entry point; ⌘, returns to the dashboard from any settings destination.

Navigation keeps one panel width across the overview, Settings and subscription details. The page being left retains its title and content until it is gone; revisiting Settings or Subscription Services starts at its main page. Closing during a transition cancels it; reopening starts on the overview. Reduce Animations switches screens immediately and keeps the same navigation and keyboard behavior.

The overview menu opens **Subscription Services** and **General Settings**. Subscription Services starts with usage history as its Usage Overview. General Settings combines appearance, language, menu-bar display, refresh interval, launch at login and the global shortcut, plus **Notifications & Sync** and **Privacy & Advanced**; those two subpages return to General Settings.

Settings navigation records the entry point explicitly. Closing the popover or opening a different destination clears the previous return path. Usage History holds cross-provider totals; menu-bar style and usage-display preferences keep their existing saved values.

**Subscription Services** lets you enable services and open each subscription's connection, optional note, metric placement, menu-bar pins, and supported API-key controls. It explains how existing provider logins are detected; it is not a TokenPlan login screen. A restart detects supported additional logins without resetting display preferences. See [Dashboard](dashboard.md#subscription-details-and-configuration).

Supported API-key services (DeepSeek, Kimi, MiniMax, OpenRouter, SiliconFlow and Z.ai) show the API-key card first in their Settings tab. With no key configured, the input opens automatically. Missing-key errors point to the service’s Settings tab. Save is disabled for blank input; saved keys can be revealed or cleared. Environment keys can be overridden with a saved key. Saving credentials does not enable a disabled service; enable it in Subscription Services to fetch usage.

## Display & Appearance

| Setting | Options | What it does |
|---|---|---|
| Show Usage As | Used / Left | Whether the percentage and graphic mean used or remaining. Readings show just `48%` or `52%`; screen readers retain the meaning. |

General Settings includes three display sections: Usage Display (Show Usage As and a live preview), App Interface (theme, density, animations and transparency), and System Menu Bar (style and visible services/accounts). Its preview updates immediately and the choice survives relaunch. Overview and detail quotas always use horizontal bars; the old Vertical Bar/Ring preference is ignored without rewriting it at startup. Ring is available only in the menu bar. Colors always reflect actual remaining quota.

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

Under **General Settings**, alongside Show Usage As and its preview.

| Setting | Options | What it does |
|---|---|---|
| Theme | System / Light / Dark | System (default) follows macOS automatically, including changes while TokenPlan runs. Light and Dark override it only for TokenPlan. |
| Density | Default / Compact | Default breathes; Compact is a real information-dense mode — text steps down one size, rows and provider sections pull together, and Customize / Settings rows tighten with them. In both, consecutive one-line metrics (Today / Yesterday / …) pull together; Compact pulls harder. |
| Reduce Animations | Off / On | Off by default. On removes transitions, motion effects, and continuous decorative animation throughout the popover. The app also honors the macOS Reduce Motion accessibility setting. |
| Increase Transparency | Off / On | On by default: the popover uses native frosted blur. Off uses a solid background; an existing saved choice is preserved. macOS **Reduce Transparency** or **Increase Contrast** automatically keeps it solid (a note explains why), without changing your saved choice. |

## Menu Bar

Open **… → General Settings → System Menu Bar**. Back returns directly to the overview.

| Setting | Options | What it does |
|---|---|---|
| Menu Bar Style | Percentage / Ring | Percentage (default) shows starred readings. Ring shows one primary quota per selected account: Claude 5h, Codex Pro 1w, Plus 5h. Fill follows Used / Left. The overview and details remain horizontal bars. |
| Menu Bar Services | On / Off per account | All are selected by default. Keep every account or select individual accounts; multi-account services carry numbered badges. Hiding affects only the menu bar. See [Menu bar](menu-bar.md). |

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

The app version is available in About. Screens do not show a persistent app-name/version footer.

Your settings carry across updates — layout, stars, preferences, and the menu-bar shortcut all stay put. When an update changes how a setting is stored, the app upgrades it in place on launch, stepping through any in-between versions if you skipped a few. Nothing is reset. (Earlier betas wiped all settings on every update; that no longer happens.)

Which providers you have on also carries across updates — your choices are never overridden. A brand-new install picks its starting set by detecting the AI tools on your Mac (see [Dashboard § First launch](dashboard.md#first-launch)). When an update ships a provider you've never seen, the same local detection runs once for just that provider and turns it on only if you actually have the tool; everything you've already decided about stays exactly as you set it. See [Which Providers Are On](provider-enablement.md).

Subscription Services opens with Usage Overview and its period/metric selectors, followed by enabled services. Expand Other Services to enable another provider; enabled services remain reorderable. App preferences, including notifications and sync, are reached through General Settings in the overview menu.

Each subscription separates Usage from Settings. Usage shows all enabled details directly. Settings starts with Display Content, followed by optional notes and provider-specific options. Only the Refresh action accompanies the provider heading; actionable errors remain in the content. Display Content uses explicit Home / Details Only / Hidden choices under Display Configuration. Its menu-bar selection counter shows the per-subscription limit; at two selections, unselected checkboxes are disabled, while the count stays neutral. A short explanation describes display placement and replacing a menu-bar item; there is no persistent warning. Selected checkboxes remain available, and freeing a slot immediately enables the others. Add Service Login appears only on the Subscription Services list, not in each subscription. Notes save locally as you type and appear on the overview only when selected.

Appearance and language are part of General Settings. Usage history is the first Usage Overview section in Subscription Services; neither has a separate menu entry.

## About

About shows the app icon, description, actual bundle version, platform, license and privacy information, with project, issue-reporting and policy links. It uses a reusable native Mac window.

Reset-credit expiry details pair each credit with its date and local time. A single credit uses “Expiry Date” without an unexplained row number; multiple credits have explicit credit labels. Expired dates retain their status.

Display Configuration menus have identical control widths regardless of the selected label. Spend charts use stable provider colors, with neutral adaptive Codex colors rather than the earlier green.

# TokenPlan

Track your AI subscriptions and API balances from the macOS menu bar.

TokenPlan shows how much of your AI plans you've used — session and weekly limits, credits, balances and spend — in one popover, and can pin your most important numbers straight into the menu bar. It runs fully on your Mac: credentials stay local, nothing is sent to any analytics or crash-reporting service.

**Interface languages:** English · 简体中文 · 繁體中文 · 日本語 · 한국어 (Settings → General → Language, or follow macOS).

> TokenPlan is a fork of the MIT-licensed [OpenUsage](https://github.com/robinebers/openusage) by Robin Ebers, with its own name, icon, update feed and a different feature set. It is not affiliated with or endorsed by the OpenUsage project. See [LICENSE](LICENSE).

## Supported services

**Subscriptions and coding plans** (read from credentials already on your Mac)

- **[Claude](docs/providers/claude.md)** — session, weekly, extra usage, rate-limit resets, local spend
- **[Codex](docs/providers/codex.md)** — session, weekly, credits, rate-limit resets, local spend
- **[Cursor](docs/providers/cursor.md)** — plan usage, on-demand, requests, spend
- **[Antigravity](docs/providers/antigravity.md)**, **[Copilot](docs/providers/copilot.md)**, **[Devin](docs/providers/devin.md)**, **[Grok](docs/providers/grok.md)**, **[Ollama](docs/providers/ollama.md)**, **[OpenCode](docs/providers/opencode.md)**

**API keys you paste in** (Customize → provider → API Key, or an environment variable)

- **[DeepSeek 深度求索](docs/providers/deepseek.md)** — account balance (CNY/USD), topped-up vs. granted
- **[Kimi / Moonshot 月之暗面](docs/providers/moonshot.md)** — available balance, cash, vouchers (`api.moonshot.cn` and `api.moonshot.ai`)
- **[SiliconFlow 硅基流动](docs/providers/siliconflow.md)** — total, topped-up and gift balance (CNY)
- **[MiniMax](docs/providers/minimax.md)** — Coding Plan session and weekly quota
- **[Z.ai / 智谱 GLM](docs/providers/zai.md)** — session, weekly, web-search quotas (`api.z.ai` and `open.bigmodel.cn`)
- **[OpenRouter](docs/providers/openrouter.md)** — credits, balance, period spend

## Features

- **Menu bar pins.** Pin metrics to the menu bar (up to 2 per provider) as compact text or mini bars.
- **Dashboard popover.** Provider-grouped meters with live reset countdowns and pace indicators. Click a usage or reset value to flip its display everywhere; right-click a row for more.
- **Clear errors.** When a service can't be read (not logged in, key rejected…) the reason is written in its card, not only in a hover tooltip.
- **Configurable refresh.** Choose 1 – 60 minutes in Settings → General → Refresh Interval.
- **Customize.** Turn providers and metrics on or off, pick Always Visible vs. On Demand rows, drag to reorder.
- **Global shortcut**, **notifications** when a limit runs low, **iCloud sync** of usage history across Macs (optional).
- **[One-shot CLI](docs/cli.md)** (`tokenplan`) and **[local HTTP API](docs/local-http-api.md)** on `127.0.0.1:6757` — loopback-only, and closed to web pages.
- **[Proxy support](docs/proxy.md)** via `~/.tokenplan/config.json`.

## Windows and Linux

Early desktop clients (Claude, Codex and Cursor quotas and token history) are built from `platforms/desktop`. Each tagged release carries `TokenPlan-Setup-<version>.exe` (Windows, per-user, no admin rights) and `tokenplan_<version>_amd64.deb` (Debian/Ubuntu) on the Releases page — see [Windows and Linux clients](docs/desktop-clients.md#installers). They are not code-signed yet.

## Privacy

No analytics, no crash reports, no accounts. TokenPlan only talks to the services you enable (using the credentials on your Mac) and downloads public model-price lists. Details in [Privacy](docs/privacy.md).

## Requirements

- macOS 15 (Sequoia) or later; Apple Silicon or Intel.

An additional [Windows/Linux desktop preview](docs/desktop-clients.md) is available in
`platforms/desktop`. It currently supports Claude/Codex/Cursor account limits, provider enablement,
local quota history, Codex device-log token trends with 7/30-day filters, and five-language settings;
it does not yet have the macOS app's full provider and feature coverage.

## Building

```sh
swift build                      # debug build
swift test                       # run the test suite
./script/build_and_run.sh        # build, sign and launch the dev app from dist/ (no install)
```

Translations live in `script/l10n/*.py`; after editing them run `script/generate_localizations.py` to regenerate `Localization/*.lproj`. The app icon is drawn by `script/make_icon.py`.

## Documentation

Behavior docs are in [docs/](docs/README.md): [dashboard](docs/dashboard.md), [menu bar](docs/menu-bar.md), [settings](docs/settings.md), [refreshing](docs/refreshing.md), [updates](docs/updates.md), one page per provider. For developers: [architecture](docs/architecture.md), [adding a provider](docs/adding-a-provider.md), [localization](docs/localization.md), [debugging](docs/debugging.md), and [AGENTS.md](AGENTS.md) for conventions.

## Releasing

Pushing a `v*` tag builds, signs, notarizes and publishes a release and its Sparkle appcast (`.github/workflows/release.yml`). One-time setup: the repository secrets `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `SPARKLE_PUBLIC_KEY`, `SPARKLE_PRIVATE_KEY` (a matching EdDSA pair from Sparkle's `generate_keys`), and, if you use iCloud sync, `APPLE_DEVELOPER_ID_ICLOUD_PROFILE`. The appcast is served from GitHub Pages (`https://onevalar.github.io/token-plan/appcast.xml`); until a signed release exists the Updates section stays hidden. See [Updates](docs/updates.md) and [iCloud Sync](docs/icloud-sync.md#development-and-release-setup).

## License

[MIT](LICENSE) — original work © Robin Ebers, modifications © onevalar.

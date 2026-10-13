# Changelog

## v1.0.3

### Improvements
- 将「订阅服务」统一更名为「服务配置」，同步三平台。by @onevalar
- 统一 macOS 多账号与普通服务的详情箭头尺寸、右侧间距。by @onevalar
- 更新价格补充数据地址，改为基于 main 的无临时分支打包流程。by @onevalar

---

## v1.0.2

### Chores
- 完善云端构建、签名公证和三平台自动更新发布流程。by @onevalar

---

## Unreleased

TokenPlan starts from OpenUsage v0.7.14 (MIT, © Robin Ebers) and diverges as follows.

### Rebrand and independence
- New name, bundle identifiers (`com.onevalar.tokenplan`), icon, menu-bar mark, log/support folders and CLI (`tokenplan`).
- Update feed and release pipeline now point at this repository; no upstream endpoints remain.
- Anonymous analytics, daily-activity ping and crash reporting (PostHog) removed entirely, along with the dependency.

### Security
- The local HTTP API moved to port 6757, no longer sends permissive CORS headers, and refuses requests that carry an `Origin` header or a non-loopback `Host` (closes browser/DNS-rebinding reads).

### New
- Interface languages: English, 简体中文, 繁體中文, 日本語, 한국어 (Settings → General → Language).
- Refresh interval is user-configurable (1, 2, 5, 10, 15, 30 or 60 minutes).
- New providers: DeepSeek, Kimi/Moonshot, SiliconFlow, MiniMax (Coding Plan); Z.ai now also works with mainland 智谱 BigModel keys. CNY (¥) balances are supported.
- Provider errors and warnings are shown inside the provider card, not only in a tooltip.
- The empty dashboard offers an "Open Customize" button.

### Windows and Linux
- Installers: `TokenPlan-Setup-<version>.exe` (per-user, Start menu shortcut, uninstall entry, no admin rights) and `tokenplan_<version>_amd64.deb` (application-menu entry, icons, `apt remove`).
- A GitHub Actions workflow builds both on every `v*` tag and attaches them to the release.

### Changed
- Footer reads "Next refresh in …" (it counts down data refreshes, not app updates).
- Meters are announced by VoiceOver as "<metric>, <reading>".

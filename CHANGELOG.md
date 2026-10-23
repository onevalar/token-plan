# Changelog

## v2.2.0

### 修复
- 修复历史金额的长小数显示、每日记录卡片边距及整行账号移除按钮。
- 修复 Windows/Linux Antigravity 周期字段缺失，以及第三项额度导致首页双环退回单环的问题。
- 修复样式选择面板英文、日文长标签越界；五语言均检查浅色与深色布局。
- Windows/Linux 改用透明的软件托盘图标，移除托盘用量配置和首页重复指标；简化菜单并完善显示首页、窗口前置和 Windows 双击行为。Linux 的 SNI 接口不提供独立双击事件。
- 点击刷新后提示“已刷新”，但额度数据仍是旧的、过一会儿才更新：现在点击刷新（按钮、⌘R、卡片上的重试）一定会向服务重新取数；重启后的第一次刷新也一定取数；定时刷新不会再因为刚手动刷新过而被跳过。
- 刷新按钮只有在确实取到新数据时才显示“已刷新”；没有取到时显示“未刷新”。

### 体验优化
- 设置重新梳理，一类设置只放一个地方：通用设置依次为外观与语言、首页、菜单栏、数据刷新；首页用量样式改为展开后用缩略图选择。
- 菜单栏的所有设置集中在通用设置的“菜单栏”一块：预览置顶，账号列表直接展开，打开的账号下方直接点选最多 3 项菜单栏指标。
- 账号里的“设置”页签改名为“账号设置”，只保留这个账号自己的内容（首页指标、备注、密钥、移除），菜单栏和首页样式改为一行状态加“在通用设置中更改”；显示或隐藏账号只在账号管理里操作。
- 服务详情页出错时也提供“重试”“设置 API 密钥”按钮；用量页底部可直接跳转调整首页指标。
- 刷新状态直接显示在刷新按钮上（旋转、对勾或警告加一个短标签），不再插入横栏。
- 新增“添加账号”流程（可添加 / 其他账号两个标签），账号页更名为“账号”，备注默认收起，移除账号单独放在底部。
- 出错的服务卡片带有下一步按钮（重试、重新登录、设置 API 密钥、查看详情）；首页账号有设置快捷入口；5h/1w 与重置倒计时有悬停说明。
- 首次使用欢迎提示，以及用量接近上限时的一次性提醒开启建议；“关于”页增加链接与致谢。
- 小字号统一提升一档。

### 服务
- 智谱 Z.ai 与 MiniMax 在密钥无效时返回 HTTP 200 加响应体错误，现已识别并提示“密钥被拒绝”，且会继续尝试另一端点（Windows/Linux 与 Mac 助手一致）。

### 维护
- 原生 macOS 经典版 1.0.12 冻结：仅保留下载，不再更新；只维护 Tauri 版本。
- 新增 `script/preflight_release.py` 发布前检查与说明草稿。
## v1.0.5

### Bug Fixes
- 修复 macOS 透明图标漏包及灰色底回退，增加三平台最终安装资源校验。by @onevalar
- 将更新入口改为公开仓库文件直链，保留签名和完整性校验。by @onevalar

---

## v1.0.4

### Improvements
- 优化蓝色胶囊图标的边缘高光及小尺寸显示，同步三平台资源。by @onevalar
- 改进 macOS「关于」页的图标缩放质量。by @onevalar

---

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

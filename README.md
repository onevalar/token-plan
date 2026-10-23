<div align="center">
  <img src="assets/AppIcon-capsule-refined.png" width="56" alt="TokenPlan 胶囊图标">
  <h1>TokenPlan</h1>
  <p>从菜单栏或系统托盘打开面板，随时查看 AI 订阅额度、API 余额和用量记录。</p>
  <p>
    <a href="https://github.com/onevalar/token-plan/releases/latest">下载最新版</a> ·
    <a href="#安装">安装说明</a> ·
    <a href="#开始使用">开始使用</a> ·
    <a href="https://github.com/onevalar/token-plan/issues">问题反馈</a>
  </p>
</div>

TokenPlan 将多个 AI 服务的用量集中到一个轻量面板：查看还剩多少额度、何时重置、API 账户还有多少余额，以及本机记录的 token 与费用估算。支持 **macOS、Windows 和 Linux**，无需注册 TokenPlan 账号。

界面语言：**简体中文 · 繁體中文 · English · 日本語 · 한국어**。

## 下载

<!-- download-links:start -->
当前正式版：**2.1.1** · [发布说明](https://github.com/onevalar/token-plan/releases/tag/v2.1.1)

| 系统 | 安装包 | 平台要求 |
| --- | --- | --- |
| **macOS** | [下载 DMG](https://github.com/onevalar/token-plan/releases/download/v2.1.1/TokenPlan_2.1.1_universal.dmg) | macOS 15 及以上；Apple Silicon / Intel 通用版 |
| **Windows** | [下载 EXE](https://github.com/onevalar/token-plan/releases/download/v2.1.1/TokenPlan_2.1.1_x64-setup.exe) | Windows x64；需要 WebView2 |
| **Linux** | [下载 AppImage](https://github.com/onevalar/token-plan/releases/download/v2.1.1/TokenPlan_2.1.1_amd64.AppImage) · [下载 DEB](https://github.com/onevalar/token-plan/releases/download/v2.1.1/TokenPlan_2.1.1_amd64.deb) | Ubuntu 24.04 x64 验证；需要图形桌面 |

[SHA-256 校验文件](https://github.com/onevalar/token-plan/releases/download/v2.1.1/SHA256SUMS.txt) · [全部版本](https://github.com/onevalar/token-plan/releases)
<!-- download-links:end -->

### macOS 经典版

**TokenPlan 1.0.12（经典版）**保留原生 macOS 界面，供希望继续使用旧版的用户选择。

[下载经典版 DMG](https://github.com/onevalar/token-plan/releases/download/v1.0.12/TokenPlan-1.0.12.dmg) · [校验文件](https://github.com/onevalar/token-plan/releases/download/v1.0.12/SHA256SUMS.txt) · [1.0.12 发布说明](https://github.com/onevalar/token-plan/releases/tag/v1.0.12)

经典版保留当时的原始安装包，**不再更新，仅保留下载**；今后的新功能和修复只在 2.x 版本提供。两个版本使用同一个应用名称和账号配置，请退出当前版本后替换安装，不要同时运行。若希望停留在经典版，可关闭自动检查更新；经典版的“检查更新”仍可能提供 2.x 升级，请按自己的意愿选择。

macOS 正式安装包已完成 Developer ID 签名和 Apple 公证。Windows 安装包目前未进行代码签名。Windows/Linux 自带数据助手运行时，无需安装 .NET SDK。

> **升级至 2.0：** Mac 1.x 可通过“检查更新”迁移；Windows/Linux 1.x 需先退出旧版，手动安装一次 2.0，并保留用户数据。之后三个系统使用签名校验的 Tauri 更新；Linux 应用内更新使用 AppImage，DEB 由包管理器升级。[2.0 安装与迁移说明](docs/tauri-installation.md)

## 主要功能

- **订阅额度一眼可见**：查看服务返回的会话、每周或模型额度、重置倒计时、额外用量及余额。
- **菜单栏与系统托盘入口**：macOS 支持按账号显示环形或百分比；Windows/Linux 使用 TokenPlan 软件图标，通过托盘菜单打开首页或退出。三个系统的首页均可查看完整用量。
- **Claude / Codex 多账号**：识别受支持的本机登录来源，分别查看账号额度，独立设置显示内容。各平台支持的来源有所不同。
- **用量历史与费用估算**：查看可读取日志中的 token 和按模型价格估算的费用，提供今日、昨日、近 30 天等汇总。
- **按习惯配置**：调整服务顺序、显示指标、已用/剩余、刷新间隔、语言、浅色/深色主题及用量提醒。
- **认证续期与错误诊断**：支持可续期的 Claude/Codex CLI 登录，区分凭据问题、权限拒绝、限流和网络错误。
- **版本更新**：三个系统使用签名校验的更新包；Linux AppImage 可在应用内更新，DEB 由包管理器升级。

## 支持的服务

| 类别 | 服务 | 可查看的内容 |
| --- | --- | --- |
| 常用 AI 编程订阅 | [Claude](docs/providers/claude.md)、[Codex](docs/providers/codex.md)、[Cursor](docs/providers/cursor.md) | 订阅额度、重置时间、额外用量，以及可获取的用量记录 |
| 编程工具与智能体 | [Amp](docs/providers/amp.md)、[Antigravity](docs/providers/antigravity.md)、[GitHub Copilot](docs/providers/copilot.md)、[Devin](docs/providers/devin.md)、[Grok](docs/providers/grok.md)、[Ollama](docs/providers/ollama.md)、[OpenCode](docs/providers/opencode.md) | 对应工具提供的订阅、云服务额度或余额 |
| API 与 Coding Plan | [DeepSeek](docs/providers/deepseek.md)、[Kimi / Moonshot](docs/providers/moonshot.md)、[MiniMax](docs/providers/minimax.md)、[OpenRouter](docs/providers/openrouter.md)、[SiliconFlow](docs/providers/siliconflow.md)、[Z.ai / 智谱](docs/providers/zai.md) | 使用 API Key 获取余额、账期用量或套餐额度 |

显示内容取决于账号套餐、服务商接口和本机可读取的数据。未返回的指标会显示为无数据，不代表用量为零。各服务文档包含详细说明；其中钥匙串等 macOS 专属登录方式不适用于 Windows/Linux，后两者请同时参考[桌面客户端说明](docs/desktop-clients.md)。

## 安装

### macOS

1. 下载并打开上方的 `.dmg` 文件。
2. 将 **TokenPlan** 拖入 **Applications / 应用程序**。
3. 从“应用程序”启动 TokenPlan，点击菜单栏图标打开面板。
4. 首次读取已有登录时，如果系统询问钥匙串访问权限，可在确认是 TokenPlan 后授权。

正式下载版使用本机已有的服务登录，不需要 TestFlight。更新时可使用应用内“检查更新”。

### Windows

1. 下载并运行 Windows `.exe` 安装包，按安装向导完成安装。
2. 从开始菜单启动 TokenPlan。
3. 单击系统托盘图标打开菜单，选择“显示主页面”；双击图标可直接打开首页。看不到图标时，检查任务栏的隐藏图标区域。

安装在当前用户目录，通常不需要管理员权限。右键托盘图标可打开菜单或退出。若开启后台运行，关闭面板不会结束应用。

### Debian / Ubuntu

下载 `.deb` 后，在该文件所在目录打开终端，将命令中的文件名替换成你实际下载的文件名：

```sh
sudo apt install './TokenPlan_<版本号>_amd64.deb'
```

安装后从应用菜单启动 **TokenPlan**。AppImage 的运行方式见 [2.0 安装说明](docs/tauri-installation.md)。

支持系统托盘的桌面可单击图标，在系统菜单中选择“显示主页面”或“退出 TokenPlan”。Linux 的 SNI 托盘接口不提供独立双击事件，因此不保证双击直接打开首页。部分桌面没有兼容的托盘宿主，此时 TokenPlan 会保留普通窗口入口。不要用 `sudo` 启动应用，以免读取到另一个用户的配置。

## 开始使用

### 1. 先登录你使用的服务

TokenPlan 读取当前操作系统用户已有的登录信息，不会替你创建订阅或登录服务。

| 服务 | 准备方式 |
| --- | --- |
| Claude | 在本机 Claude Code 中完成订阅账号登录；Mac 还支持部分 Claude Desktop 登录来源 |
| Codex | 在本机 Codex CLI 中登录对应的 ChatGPT 订阅账号 |
| Cursor | 在 Cursor 桌面应用中登录 |
| Amp | 安装 Amp CLI，使用 `amp login` 登录 |
| Antigravity 等其他工具 | 先在对应工具中登录，具体来源见各服务文档 |
| API Key 服务 | 在 TokenPlan 的对应服务设置中填写 API Key |

只有 API Key 的登录，不一定能获取同一服务的订阅额度。浏览器里登录过网站，也不意味着本机 CLI 已有 TokenPlan 可读取的凭据。

### 2. 启用服务并刷新

打开面板右上角 **「⋯」→「账号管理」**，添加账号或启用你需要查看的服务。返回主面板点击 **「刷新」**，再点击服务右侧箭头查看详情。

Claude、Codex 的独立 CLI 登录可在满足条件时自动续期。账号切换工具保存的共享凭据快照保持只读，过期时需通过对应切换工具激活账号并续期，避免影响正在使用的 CLI。

### 3. 调整显示与日常行为

- **服务详情 → 账号设置 → 首页指标**：选择指标出现在首页、详情或隐藏，并编辑备注、密钥或移除账号。
- **「⋯」→ 通用设置**：调整语言、主题、首页用量样式、密度、已用/剩余、刷新间隔和用量提醒等选项。
- **通用设置 → 菜单栏（macOS）**：预览环形或百分比样式，选择账号及每个账号最多三项指标。账号排序在“账号管理”中调整。
- **「⋯」→ 用量历史**：查看已有历史记录与费用估算。

## 三个平台有什么区别？

| 能力 | macOS | Windows / Linux |
| --- | --- | --- |
| 日常入口 | 菜单栏弹出面板 | 系统托盘面板；无兼容托盘时保留窗口 |
| 常驻图标 | 多账号环形 / 百分比 | TokenPlan 软件图标；用量在首页查看 |
| Claude / Codex 多账号 | 多种本机凭据来源 | 独立配置目录及支持的账号切换工具 |
| 版本更新 | Tauri 签名自动更新；1.x 通过 Sparkle 迁移 | Windows / AppImage 支持签名自动更新；DEB 通过包管理器安装 |
| 历史记录存储 | 仅本地 | 仅本地 |
| 独立查询 CLI / 本地 HTTP API | 支持 | 不包含 Mac 的这些接口 |
| 代理配置 | 支持应用专用配置文件 | 使用运行环境及平台支持的默认代理配置 |

从 2.2.0 起，Windows/Linux 的托盘只显示软件图标，不再提供托盘用量样式设置；首页的用量样式仍可独立选择。

2.x 三个平台共用 Tauri + React / Arc 界面、导航和设置交互；系统托盘、凭据读取等平台能力仍有差异。更详细的说明见[共享桌面界面](docs/tauri-migration.md)。

## 常见问题

### 已经在终端登录，为什么仍然无法读取？

先确认 TokenPlan 与 CLI 使用同一个系统用户和配置目录，然后刷新。1.0.6 已补齐 Windows/Linux 的 Claude、Codex 认证续期，但被撤销的凭据仍需要重新登录；共享账号快照则需由账号切换工具续期。

网络超时、403 权限拒绝和登录过期是不同问题。桌面启动的应用不一定继承终端中的代理环境。Mac 可参考[代理配置](docs/proxy.md)；Windows/Linux 可在 **通用设置 → 隐私与高级 → 高级** 打开日志目录，查看网络诊断。不要把令牌、API Key 或完整登录文件贴到 Issue 中。

### 为什么额度变化了，历史记录却没有增加？

**订阅额度**来自服务商当前返回的账号限额；**token / 费用历史**来自可读取的使用记录。其他设备或云端工具产生的用量，可能影响订阅额度，却没有保存在本机日志里。

例如，Amp Orb 中使用 Claude 订阅产生的历史，当前不能自动同步；有原始日志时可按 [Amp 文档](docs/providers/amp.md#claude-subscriptions-used-inside-amp)手动导入。已删除或无法取得的记录不能凭额度百分比还原。

### 显示的美元金额是实际账单吗？

用量历史中的费用按 token 数量和模型 API 价格估算，**不等于订阅账单，也不代表需要额外支付这笔费用**。服务商直接报告的账户余额、积分和额外用量与历史估算是不同数据。

### 为什么 Linux 打开的是窗口？怎么退出？

是否能显示托盘面板取决于桌面环境提供的托盘支持。无兼容托盘时保留窗口是预期行为。可从托盘右键菜单，或面板右上角 **「⋯」→「退出」** 结束应用。

### Ubuntu 安装 2.x 后，为什么仍打开旧界面或显示 1.0.0？

已发布的 Tauri DEB 使用包名 `token-plan`，旧 Avalonia 客户端使用 `tokenplan`，因此可能同时安装。旧客户端未指定构建版本时会显示 1.0.0。先用 `dpkg-query -W tokenplan token-plan` 核对；如果已安装 `token-plan` 2.x，可用 `sudo apt remove tokenplan` 移除旧客户端，再运行 `tokenplan-shell` 打开新版。普通卸载不删除用户的账号配置和本地历史，不需要清空数据目录。

2.0.4 的安装包不包含旧包替换规则。源码已补上替换关系和旧启动入口兼容，将随后续版本发布。

## 隐私与数据

无需 TokenPlan 账号，不收集使用分析或崩溃报告。应用在本机处理可读取的登录与用量记录，向启用的服务请求额度，并下载公开价格数据和应用更新。凭据仅用于对应服务认证，不会上传到本项目仓库。

用量历史仅保存在本机，不进行跨设备同步，不上传登录凭据或原始会话日志。更多说明见[隐私说明](docs/privacy.md)。

## 开发与贡献

欢迎通过 [Issues](https://github.com/onevalar/token-plan/issues) 提交问题或建议，通过 Pull Request 贡献修复。报告问题时请附上系统与桌面环境、TokenPlan 版本、涉及的服务、操作步骤及脱敏后的错误信息。

### 当前 2.x 桌面客户端（三个平台）

使用 Node 22 和项目指定的 Rust 1.90。macOS 还需要 Swift / Xcode；Windows / Linux 需要 `platforms/desktop/global.json` 指定的 .NET SDK，Linux 还需要 WebKitGTK 等系统依赖，详见[构建说明](docs/tauri-migration.md#building-and-checking)。

```sh
cd platforms/tauri
npm ci
npm run prepare:bridge
npm run tauri -- dev
```

旧 SwiftUI 主程序和 `platforms/desktop/TokenPlan.Desktop` Avalonia 主程序是 1.x 界面。直接运行这些项目不会打开当前 Tauri 界面；2.x 继续复用它们的服务读取后端。

开发约定见 [AGENTS.md](AGENTS.md)；更多资料：[架构](docs/architecture.md) · [添加服务](docs/adding-a-provider.md) · [本地化](docs/localization.md) · [全部文档](docs/README.md)。

维护者确认版本号与发布说明后，推送正式 `vX.Y.Z` 标签即可触发三平台构建、测试、Mac 签名公证及发布。安装包和更新列表均发布在本仓库，首页下载链接随发布更新。配置方式见[发布与自动更新](docs/updates.md)。

## 开源许可与致谢

TokenPlan 基于 Robin Ebers 的 [OpenUsage](https://github.com/robinebers/openusage) 修改，保留原项目许可与署名，并拥有独立的名称、图标、更新地址和功能演进。TokenPlan 与 OpenUsage 原项目没有隶属或背书关系。

采用 [MIT License](LICENSE)：原始工作 © Robin Ebers，TokenPlan 修改 © onevalar。随安装包分发的第三方组件保留各自的许可说明。

<div align="center">
  <img src="assets/AppIcon-capsule-refined.png" width="56" alt="TokenPlan 胶囊图标">
  <h1>TokenPlan</h1>
  <p>在菜单栏与系统托盘，随时查看 AI 订阅额度、API 余额和用量记录。</p>
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
当前正式版：**1.0.12** · [发布说明](https://github.com/onevalar/token-plan/releases/tag/v1.0.12)

| 系统 | 安装包 | 平台要求 |
| --- | --- | --- |
| **macOS** | [下载 DMG](https://github.com/onevalar/token-plan/releases/download/v1.0.12/TokenPlan-1.0.12.dmg) | macOS 15 及以上；Apple Silicon / Intel 通用版 |
| **Windows** | [下载 EXE](https://github.com/onevalar/token-plan/releases/download/v1.0.12/TokenPlan-Setup-1.0.12.exe) | x64；当前用户安装 |
| **Linux** | [下载 DEB](https://github.com/onevalar/token-plan/releases/download/v1.0.12/tokenplan_1.0.12_amd64.deb) | Debian / Ubuntu x64（amd64），需要图形桌面 |

[SHA-256 校验文件](https://github.com/onevalar/token-plan/releases/download/v1.0.12/SHA256SUMS.txt) · [全部版本](https://github.com/onevalar/token-plan/releases)
<!-- download-links:end -->

macOS 正式安装包已完成 Developer ID 签名和 Apple 公证。Windows 安装包目前未进行代码签名。Windows/Linux 安装包自带 .NET 运行时，不需要另行安装 SDK。Linux 当前提供 DEB，尚未提供 RPM、AppImage 或 ARM64 正式安装包。

> **旧版本升级：** 从 1.0.6 起，源码、安装包和更新列表统一放在本仓库。Mac 旧版可通过“检查更新”升级；Windows/Linux 1.0.5 及更早版本需手动下载安装一次 1.0.6 或更新版本，之后使用新的应用内更新入口。原 `onevalar/apps` 仓库仅保留历史版本与迁移兼容信息。

## 主要功能

- **订阅额度一眼可见**：查看服务返回的会话、每周或模型额度、重置倒计时、额外用量及余额。
- **菜单栏与系统托盘入口**：Mac 可按账号显示环形或百分比；Windows/Linux 从托盘打开用量面板和菜单。
- **Claude / Codex 多账号**：识别受支持的本机登录来源，分别查看账号额度，独立设置显示内容。各平台支持的来源有所不同。
- **用量历史与费用估算**：查看可读取日志中的 token 和按模型价格估算的费用，提供今日、昨日、近 30 天等汇总。
- **按习惯配置**：调整服务顺序、显示指标、已用/剩余、刷新间隔、语言、浅色/深色主题及用量提醒。
- **认证续期与错误诊断**：支持可续期的 Claude/Codex CLI 登录，区分凭据问题、权限拒绝、限流和网络错误。
- **版本更新**：Mac 通过 Sparkle 更新；Windows/Linux 检查新版本、下载并校验安装包，再交由系统安装程序完成升级。

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

1. 下载并运行 `TokenPlan-Setup-<版本号>.exe`，按安装向导完成安装。
2. 从开始菜单启动 TokenPlan。
3. 点击系统托盘图标打开面板；看不到图标时，检查任务栏的隐藏图标区域。

安装在当前用户目录，通常不需要管理员权限。右键托盘图标可打开菜单或退出。若开启后台运行，关闭面板不会结束应用。

### Debian / Ubuntu

下载 `.deb` 后，在该文件所在目录打开终端，将命令中的文件名替换成你实际下载的文件名：

```sh
sudo apt install './tokenplan_<版本号>_amd64.deb'
```

安装后从应用菜单启动 **TokenPlan**，或在终端运行：

```sh
tokenplan
```

支持系统托盘的桌面可从托盘打开面板，并通过右键菜单退出。部分 Linux 桌面不提供兼容的托盘宿主，此时 TokenPlan 会保留普通窗口入口；这与 Mac 菜单栏的呈现方式有所不同。不要用 `sudo` 启动应用，以免读取到另一个用户的配置。

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

打开面板右上角 **「⋯」→「服务配置」**，启用你需要查看的服务。返回主面板点击 **「刷新」**，再点击服务右侧箭头查看详情。

Claude、Codex 的独立 CLI 登录可在满足条件时自动续期。账号切换工具保存的共享凭据快照保持只读，过期时需通过对应切换工具激活账号并续期，避免影响正在使用的 CLI。

### 3. 调整显示与日常行为

- **服务详情 → 设置 → 显示内容**：选择指标出现在首页、详情或隐藏，并配置菜单栏/托盘显示项。
- **「⋯」→ 通用设置**：调整语言、主题、已用/剩余、刷新间隔和登录启动等选项。
- **Mac 菜单栏样式**：选择环形或百分比，设置每个账号是否显示。
- **服务配置中的用量总览**：查看已有历史记录与费用估算。

## 三个平台有什么区别？

| 能力 | macOS | Windows / Linux |
| --- | --- | --- |
| 日常入口 | 菜单栏弹出面板 | 系统托盘面板；无兼容托盘时保留窗口 |
| 常驻用量 | 多账号环形 / 百分比 | 托盘菜单中的用量摘要 |
| Claude / Codex 多账号 | 多种本机凭据来源 | 独立配置目录及支持的账号切换工具 |
| 版本更新 | Sparkle 下载、验证与安装 | 下载、验证后打开系统安装程序 |
| iCloud 用量历史同步 | 可选，默认关闭 | 不支持 |
| 独立查询 CLI / 本地 HTTP API | 支持 | 不包含 Mac 的这些接口 |
| 代理配置 | 支持应用专用配置文件 | 使用运行环境及平台支持的默认代理配置 |

Windows/Linux 提供对应平台的桌面客户端，并非 Mac 全部功能的逐项复刻。更详细的差异见[桌面客户端说明](docs/desktop-clients.md)。

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

## 隐私与数据

无需 TokenPlan 账号，不收集使用分析或崩溃报告。应用在本机处理可读取的登录与用量记录，向启用的服务请求额度，并下载公开价格数据和应用更新。凭据仅用于对应服务认证，不会上传到本项目仓库。

Mac 可选的 iCloud 同步仅同步支持的用量汇总，不同步登录凭据或原始会话日志。更多说明见[隐私说明](docs/privacy.md)和 [iCloud 同步](docs/icloud-sync.md)。

## 开发与贡献

欢迎通过 [Issues](https://github.com/onevalar/token-plan/issues) 提交问题或建议，通过 Pull Request 贡献修复。报告问题时请附上系统与桌面环境、TokenPlan 版本、涉及的服务、操作步骤及脱敏后的错误信息。

### macOS 客户端

使用支持 Swift 6.2 的开发环境；当前云端构建使用 macOS 26 SDK，应用最低运行版本为 macOS 15。

```sh
swift build
swift test
./script/build_and_run.sh
```

### Windows / Linux 客户端

使用 `platforms/desktop/global.json` 指定的 .NET SDK，在源码根目录执行：

```sh
cd platforms/desktop
dotnet run --project TokenPlan.Desktop
dotnet run --project TokenPlan.Core.Tests
dotnet run --project TokenPlan.Desktop.Tests
```

开发约定见 [AGENTS.md](AGENTS.md)；更多资料：[架构](docs/architecture.md) · [添加服务](docs/adding-a-provider.md) · [本地化](docs/localization.md) · [全部文档](docs/README.md)。

维护者确认版本号与发布说明后，推送正式 `vX.Y.Z` 标签即可触发三平台构建、测试、Mac 签名公证及发布。安装包和更新列表均发布在本仓库，首页下载链接随发布更新。配置方式见[发布与自动更新](docs/updates.md)。

## 开源许可与致谢

TokenPlan 基于 Robin Ebers 的 [OpenUsage](https://github.com/robinebers/openusage) 修改，保留原项目许可与署名，并拥有独立的名称、图标、更新地址和功能演进。TokenPlan 与 OpenUsage 原项目没有隶属或背书关系。

采用 [MIT License](LICENSE)：原始工作 © Robin Ebers，TokenPlan 修改 © onevalar。随安装包分发的第三方组件保留各自的许可说明。

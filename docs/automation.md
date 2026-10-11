# 本地测试和三平台打包

日常使用仓库 `automation` 文件夹中的入口：

- `安装本地测试版.command`：构建当前代码，安装到 `~/Applications/TokenPlan Test.app`，使用独立开发版配置，保留正式版。
- `生成三平台安装包.command`：本地测试满意后运行，输入自己选择的版本号。
- `检查打包环境.command`：检查 GitHub、Developer ID 证书、描述文件、Apple 公证认证和空间。
- `配置公证.command`：仅首次需要。输入 Apple 账户和 App 专用密码，凭据保存在钥匙串 `TokenPlan-Notary` 中。

需要 macOS、Xcode 命令行工具、Python 3.11+ 和已登录的 GitHub CLI。Windows/Linux 在 GitHub Actions 上编译，不要求本机安装 Windows、Linux 或 .NET。Mac 在本机签名公证，因此运行期间请保持电脑唤醒和网络连接。需要至少 5 GB 可用空间。

打包会保存当前 Git 管理的代码和未忽略的新文件为独立快照，推送到当前 origin 的 `tokenplan-package/…` 分支。遵循 `.gitignore`，不会提交本地环境文件、安装包或输出目录；准备提交的新文件也应遵守仓库的凭据管理要求。不会修改工作分支、暂存区或创建发布标签，也不会发布公开 Release。快照分支保留用于追溯与重试。

本地测试后如又修改代码，打包会要求重新测试。三个包使用同一份快照：Mac 为 universal DMG（Apple Silicon / Intel），Windows 为 x64 EXE（目前未签名），Linux 为 Debian/Ubuntu x64 DEB。Windows/Linux 还会在各自系统运行核心测试。

文件自动保存在 `~/Downloads/TokenPlan 安装包/<版本>-<时间与唯一编号>/`，可通过 `TOKENPLAN_PACKAGES_DIR` 更改目录。只有全部检查通过、下载完整且 SHA256 校验一致后，状态才标记为 complete。`build-status.json` 记录源代码、云端运行链接和产物校验值；`mac/` 保留应用和调试符号。

断网、认证失败或关闭终端后，可以继续同一次任务：

```sh
python3 script/automation.py resume '/完整路径/build-status.json'
```

Mac 失败时保留临时工作树及构建缓存用于重试。云端构建失败请查看状态文件中的运行链接，修复代码后重新测试打包。成功后临时工作树自动删除；云端产物保留 14 天，本机已下载产物不受此期限影响。

本流程只负责打包，不接通软件内自动更新，不发布 TestFlight。用户首次运行可能仍需允许访问其 CLI 登录凭据。

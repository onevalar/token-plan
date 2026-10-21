# TokenPlan 2.0 安装与迁移

本页说明 Tauri 版的安装方式；只有发布页上的正式 2.0 安装包可用于升级。

- **Mac**：macOS 15 及以上，Apple Silicon / Intel 通用 DMG，完成 Developer ID 签名及公证。1.x 可通过“检查更新”迁移，也可退出旧版后将新应用拖入 Applications。沿用原有配置与本地历史记录。
- **Windows**：x64 EXE 安装向导，需要 Microsoft WebView2（安装器可协助安装）。从 1.x 升级时先退出旧客户端，手动安装一次 2.0；如出现两个开始菜单入口，卸载旧应用程序但保留用户配置。之后使用应用内更新。
- **Linux**：本轮构建、测试基线为 Ubuntu 24.04 x64，需要图形桌面。DEB 可用 `sudo apt install ./实际文件名.deb` 安装，由包管理器升级。AppImage 下载后执行 `chmod +x ./实际文件名.AppImage`，再直接运行；应用内更新仅用于可写目录中的 AppImage。不要使用 sudo 运行应用，也不要同时运行 DEB 与 AppImage 两份客户端。

退出旧版本后再运行新版本。已有账号、备注及可读取的历史记录会继续使用；TokenPlan 不会切换 CLI 登录。不同平台读取凭据的系统位置仍有差异。

所有平台仅保存本地历史记录，不进行跨设备同步。通知需操作系统允许，免打扰模式可能抑制横幅。Linux 全局快捷键目前使用 X11，Wayland 下会明确显示不可用；托盘行为也取决于桌面支持。快捷键注册失败会保留原组合并提示原因，不影响应用启动。

Windows 安装器暂未进行 Windows 代码签名。所有 Tauri 更新包另有更新签名；发布页提供 SHA256SUMS.txt 供手动下载校验。

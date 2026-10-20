"""Render download links from the actual artifacts, not guessed installer filenames."""
import re
from urllib.parse import quote


def update_readme(text, version, names):
    def asset(suffix):
        matches = [name for name in names if name.endswith(suffix)]
        if len(matches) != 1:
            raise ValueError(f'Expected one {suffix} download')
        return f'https://github.com/onevalar/token-plan/releases/download/v{version}/{quote(matches[0])}'
    block = f'''\n当前正式版：**{version}** · [发布说明](https://github.com/onevalar/token-plan/releases/tag/v{version})

| 系统 | 安装包 | 平台要求 |
| --- | --- | --- |
| **macOS** | [下载 DMG]({asset('.dmg')}) | macOS 15 及以上；Apple Silicon / Intel 通用版 |
| **Windows** | [下载 EXE]({asset('-setup.exe')}) | Windows x64；需要 WebView2 |
| **Linux** | [下载 AppImage]({asset('.AppImage')}) · [下载 DEB]({asset('.deb')}) | Ubuntu 24.04 x64 验证；需要图形桌面 |

[SHA-256 校验文件](https://github.com/onevalar/token-plan/releases/download/v{version}/SHA256SUMS.txt) · [全部版本](https://github.com/onevalar/token-plan/releases)
'''
    pattern = r'(<!-- download-links:start -->).*?(<!-- download-links:end -->)'
    if len(re.findall(pattern, text, re.S)) != 1:
        raise ValueError('Missing unique README download block')
    text = re.sub(pattern, lambda m: m[1] + block + m[2], text, flags=re.S)
    start = text.index('macOS 正式安装包已完成')
    end = text.index('## 主要功能', start)
    text = text[:start] + '''macOS 正式安装包已完成 Developer ID 签名和 Apple 公证。Windows 安装包目前未进行代码签名。Windows/Linux 自带数据助手运行时，无需安装 .NET SDK。

> **升级至 2.0：** Mac 1.x 可通过“检查更新”迁移；Windows/Linux 1.x 需先退出旧版，手动安装一次 2.0，并保留用户数据。之后三个系统使用签名校验的 Tauri 更新；Linux 应用内更新使用 AppImage，DEB 由包管理器升级。[2.0 安装与迁移说明](docs/tauri-installation.md)

''' + text[end:]
    text = text.replace('Mac 可按账号显示环形或百分比；Windows/Linux 从托盘打开用量面板和菜单。', '三个系统均支持按账号显示环形或百分比，并从菜单栏或托盘打开面板和退出菜单。')
    text = text.replace('Mac 通过 Sparkle 更新；Windows/Linux 检查新版本、下载并校验安装包，再交由系统安装程序完成升级。', '三个系统使用签名校验的更新包；Linux AppImage 可在应用内更新，DEB 由包管理器升级。')
    text = text.replace('`TokenPlan-Setup-<版本号>.exe`', 'Windows `.exe` 安装包')
    text = text.replace("'./tokenplan_<版本号>_amd64.deb'", "'./TokenPlan_<版本号>_amd64.deb'")
    text = text.replace('安装后从应用菜单启动 **TokenPlan**，或在终端运行：\n\n```sh\ntokenplan\n```', '安装后从应用菜单启动 **TokenPlan**。AppImage 的运行方式见 [2.0 安装说明](docs/tauri-installation.md)。')
    return text

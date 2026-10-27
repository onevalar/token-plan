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

'''
    pattern = r'(<!-- download-links:start -->).*?(<!-- download-links:end -->)'
    if len(re.findall(pattern, text, re.S)) != 1:
        raise ValueError('Missing unique README download block')
    text = re.sub(pattern, lambda m: m[1] + block + m[2], text, flags=re.S)
    return text

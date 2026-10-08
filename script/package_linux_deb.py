#!/usr/bin/env python3
"""Builds tokenplan_<version>_amd64.deb from a published linux-x64 folder, in pure Python (no dpkg needed).

Usage: script/package_linux_deb.py <publish_dir> <version> <out_dir>
  version: 0.1.0, or a pre-release such as 0.1.0-beta.1 (becomes 0.1.0~beta.1 so it sorts before 0.1.0).

Layout: the app lives in /opt/tokenplan, /usr/bin/tokenplan links to it, and the .desktop entry plus
hicolor icons make it appear in the application menu. Preferences and logs are per-user and are not
touched by uninstalling.
"""
import gzip, hashlib, io, lzma, os, sys, tarfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, 'platforms', 'desktop', 'assets', 'icons')
EXE = 'TokenPlan.Desktop'
HOMEPAGE = 'https://github.com/onevalar/token-plan'

DEPENDS = ', '.join([
    'libc6 (>= 2.31)', 'libgcc-s1', 'libstdc++6', 'zlib1g',
    'libx11-6', 'libice6', 'libsm6', 'libfontconfig1',
    # .NET needs ICU and OpenSSL; their package names differ per distribution release.
    'libicu76 | libicu75 | libicu74 | libicu72 | libicu70 | libicu67 | libicu66 | libicu-dev',
    'libssl3t64 | libssl3 | libssl1.1',
])

DESKTOP = f"""[Desktop Entry]
Type=Application
Version=1.0
Name=TokenPlan
GenericName=AI usage monitor
GenericName[zh_CN]=AI 用量监控
GenericName[zh_TW]=AI 用量監控
GenericName[ja]=AI 使用量モニター
GenericName[ko]=AI 사용량 모니터
Comment=Track your AI subscriptions and API balances
Comment[zh_CN]=追踪你的 AI 订阅额度和 API 余额
Comment[zh_TW]=追蹤你的 AI 訂閱額度與 API 餘額
Comment[ja]=AI サブスクリプションと API 残高を確認
Comment[ko]=AI 구독 한도와 API 잔액 확인
Exec=/usr/bin/tokenplan
Icon=tokenplan
Terminal=false
Categories=Utility;Monitor;
Keywords=AI;usage;quota;tokens;Claude;Codex;Cursor;
StartupWMClass={EXE}
"""

def deb_version(v):
    return v.replace('-', '~', 1)

def tar_bytes(entries, compress):
    """entries: list of (name, kind, mode, data|None, linkname). kind in 'd','f','l'."""
    raw = io.BytesIO()
    mtime = int(os.environ.get('SOURCE_DATE_EPOCH', time.time()))
    with tarfile.open(fileobj=raw, mode='w', format=tarfile.GNU_FORMAT) as tar:
        for name, kind, mode, data, link in entries:
            info = tarfile.TarInfo(name)
            info.uid = info.gid = 0
            info.uname = info.gname = 'root'
            info.mtime = mtime
            info.mode = mode
            if kind == 'd':
                info.type = tarfile.DIRTYPE
                tar.addfile(info)
            elif kind == 'l':
                info.type = tarfile.SYMTYPE
                info.linkname = link
                tar.addfile(info)
            else:
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
    blob = raw.getvalue()
    return gzip.compress(blob, 9, mtime=0) if compress == 'gz' else lzma.compress(blob, preset=6, check=lzma.CHECK_CRC32)

def ar_archive(members):
    out = b'!<arch>\n'
    mtime = int(os.environ.get('SOURCE_DATE_EPOCH', time.time()))
    for name, data in members:
        header = f'{name:<16}{mtime:<12}{0:<6}{0:<6}{"100644":<8}{len(data):<10}`\n'.encode()
        assert len(header) == 60, header
        out += header + data + (b'\n' if len(data) % 2 else b'')
    return out

def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    publish, version, out_dir = sys.argv[1:]
    if not os.path.isfile(os.path.join(publish, EXE)):
        sys.exit(f'{publish} has no {EXE}; publish linux-x64 first')
    dv = deb_version(version)

    data = []          # (name, kind, mode, bytes, link)
    md5 = []
    installed = 0

    def add_dir(path):
        data.append((path, 'd', 0o755, None, None))

    def add_file(path, content, mode):
        nonlocal installed
        data.append((path, 'f', mode, content, None))
        md5.append((path[2:], hashlib.md5(content).hexdigest()))
        installed += len(content)

    for d in ['./opt', './opt/tokenplan', './usr', './usr/bin', './usr/share', './usr/share/applications',
              './usr/share/doc', './usr/share/doc/tokenplan', './usr/share/icons', './usr/share/icons/hicolor']:
        add_dir(d)
    seen_dirs = {'./opt/tokenplan'}
    for base, dirs, files in os.walk(publish):
        dirs.sort()
        rel = os.path.relpath(base, publish)
        target = './opt/tokenplan' + ('' if rel == '.' else '/' + rel)
        if target not in seen_dirs:
            add_dir(target); seen_dirs.add(target)
        for f in sorted(files):
            p = os.path.join(base, f)
            with open(p, 'rb') as fh:
                content = fh.read()
            executable = f in (EXE, 'createdump')
            add_file(f'{target}/{f}', content, 0o755 if executable else 0o644)
    data.append(('./usr/bin/tokenplan', 'l', 0o777, None, '/opt/tokenplan/' + EXE))
    add_file('./usr/share/applications/tokenplan.desktop', DESKTOP.encode(), 0o644)
    for size in (16, 24, 32, 48, 64, 128, 256, 512):
        d = f'./usr/share/icons/hicolor/{size}x{size}'
        add_dir(d); add_dir(d + '/apps')
        with open(os.path.join(ICONS, f'tokenplan-{size}.png'), 'rb') as fh:
            add_file(f'{d}/apps/tokenplan.png', fh.read(), 0o644)
    with open(os.path.join(ROOT, 'LICENSE'), 'rb') as fh:
        lic = fh.read()
    add_file('./usr/share/doc/tokenplan/copyright', lic, 0o644)

    control = f"""Package: tokenplan
Version: {dv}
Architecture: amd64
Maintainer: onevalar <onevalar@users.noreply.github.com>
Installed-Size: {max(1, installed // 1024)}
Depends: {DEPENDS}
Section: utils
Priority: optional
Homepage: {HOMEPAGE}
Description: Track AI subscriptions and API balances
 TokenPlan shows how much of your AI plans you have used - Claude, Codex and
 Cursor quotas, reset times and token history - from the credentials already on
 this computer. Nothing is sent to any analytics service.
 .
 Interface languages: English, Simplified and Traditional Chinese, Japanese and
 Korean.
"""
    post = """#!/bin/sh
set -e
chmod 0755 /opt/tokenplan/TokenPlan.Desktop 2>/dev/null || true
if [ -x /usr/bin/update-desktop-database ]; then update-desktop-database -q /usr/share/applications || true; fi
if [ -x /usr/bin/gtk-update-icon-cache ]; then gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true; fi
exit 0
"""
    postrm = """#!/bin/sh
set -e
if [ -x /usr/bin/update-desktop-database ]; then update-desktop-database -q /usr/share/applications || true; fi
if [ -x /usr/bin/gtk-update-icon-cache ]; then gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true; fi
exit 0
"""
    prerm = """#!/bin/sh
set -e
# Stop a running instance so its files can be removed or replaced.
pkill -f /opt/tokenplan/TokenPlan.Desktop >/dev/null 2>&1 || true
exit 0
"""
    md5text = ''.join(f'{h}  {p}\n' for p, h in md5).encode()
    ctrl = [('./', 'd', 0o755, None, None),
            ('./control', 'f', 0o644, control.encode(), None),
            ('./md5sums', 'f', 0o644, md5text, None),
            ('./postinst', 'f', 0o755, post.encode(), None),
            ('./prerm', 'f', 0o755, prerm.encode(), None),
            ('./postrm', 'f', 0o755, postrm.encode(), None)]
    data.insert(0, ('./', 'd', 0o755, None, None))
    deb = ar_archive([('debian-binary', b'2.0\n'),
                      ('control.tar.gz', tar_bytes(ctrl, 'gz')),
                      ('data.tar.xz', tar_bytes(data, 'xz'))])
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f'tokenplan_{version}_amd64.deb')
    with open(out, 'wb') as fh:
        fh.write(deb)
    print(f'wrote {out} ({len(deb) / 1048576:.1f} MiB)')

if __name__ == '__main__':
    main()

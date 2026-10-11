#!/usr/bin/env python3
"""Builds TokenPlan-Setup-<version>.exe (an NSIS per-user installer) from a published win-x64 folder.

Usage: script/package_windows_installer.py <publish_dir> <version> <out_dir>
  version: 0.1.0, or a pre-release such as 0.1.0-beta.1 (the Windows file version keeps the numeric part).

Needs `makensis` (NSIS 3.x) on PATH, or MAKENSIS=/path/to/makensis (and NSISDIR if it isn't relocatable).
makensis runs on macOS and Linux, so the Windows installer can be built without a Windows machine.
"""
import os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NSI = os.path.join(ROOT, 'platforms', 'desktop', 'installer', 'TokenPlan.nsi')
ICON = os.path.join(ROOT, 'platforms', 'desktop', 'assets', 'TokenPlan.ico')
EXE = 'TokenPlan.Desktop.exe'

def nsis_path(path):
    return path.replace('$', '$$').replace('"', '$\\"')

def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    publish, version, out_dir = os.path.abspath(sys.argv[1]), sys.argv[2], os.path.abspath(sys.argv[3])
    if not os.path.isfile(os.path.join(publish, EXE)):
        sys.exit(f'{publish} has no {EXE}; publish win-x64 first')
    m = re.match(r'^(\d+)\.(\d+)\.(\d+)', version)
    if not m:
        sys.exit(f'bad version {version!r}')
    viversion = '.'.join(m.groups()) + '.0'
    makensis = os.environ.get('MAKENSIS') or shutil.which('makensis')
    if not makensis:
        sys.exit('makensis not found (install NSIS: `apt install nsis` / `brew install makensis`)')

    files = []
    for base, dirs, names in os.walk(publish):
        dirs.sort()
        for n in sorted(names):
            full = os.path.join(base, n)
            files.append((os.path.relpath(base, publish), n, full))
    files.sort(key=lambda t: (t[0] != '.', t[0], t[1]))

    install, uninstall, dirs_seen = [], [], set()
    current = None
    for rel, name, full in files:
        if rel != current:
            target = '$INSTDIR' if rel == '.' else '$INSTDIR\\' + nsis_path(rel.replace('/', '\\'))
            install.append(f'SetOutPath "{target}"')
            current = rel
            if rel != '.':
                parts = rel.split(os.sep)
                for i in range(1, len(parts) + 1):
                    dirs_seen.add('\\'.join(parts[:i]))
        install.append(f'File "{nsis_path(full)}"')
        win = name if rel == '.' else rel.replace('/', '\\') + '\\' + name
        uninstall.append(f'Delete "$INSTDIR\\{nsis_path(win)}"')
    for d in sorted(dirs_seen, key=lambda s: (-s.count('\\'), s)):
        uninstall.append(f'RMDir "$INSTDIR\\{nsis_path(d)}"')

    est_kb = sum(os.path.getsize(f[2]) for f in files) // 1024
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f'TokenPlan-Setup-{version}.exe')
    with tempfile.TemporaryDirectory() as tmp:
        ins, unin = os.path.join(tmp, 'install.nsh'), os.path.join(tmp, 'uninstall.nsh')
        open(ins, 'w', encoding='utf-8').write('\n'.join(install) + '\n')
        open(unin, 'w', encoding='utf-8').write('\n'.join(uninstall) + '\n')
        cmd = [makensis, '-V2', f'-DVERSION={version}', f'-DVIVERSION={viversion}', f'-DOUTFILE={out}',
               f'-DICON={ICON}', f'-DLICENSE_FILE={os.path.join(ROOT, "LICENSE")}', f'-DEST_KB={est_kb}',
               f'-DINSTALL_LIST={ins}', f'-DUNINSTALL_LIST={unin}', NSI]
        subprocess.run(cmd, check=True)
    print(f'wrote {out} ({os.path.getsize(out) / 1048576:.1f} MiB, {len(files)} files)')

if __name__ == '__main__':
    main()

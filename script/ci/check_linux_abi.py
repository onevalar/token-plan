#!/usr/bin/env python3
"""Reject Linux packages whose ELF objects require glibc newer than Ubuntu 22.04."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

BASELINE = (2, 35)


def versions(text):
    return [tuple(map(int, v.split('.'))) for v in re.findall(r'Name: GLIBC_(\d+(?:\.\d+)+)', text)]


def check_tree(root):
    count = 0
    for path in ([root] if root.is_file() else root.rglob('*')):
        if not path.is_file() or path.is_symlink():
            continue
        with path.open('rb') as stream:
            if stream.read(4) != b'\x7fELF':
                continue
        info = subprocess.check_output(['readelf', '--version-info', str(path)], text=True)
        # Only requirements, not versions defined by a bundled library itself.
        needs = info.split('Version needs section', 1)[-1] if 'Version needs section' in info else ''
        required = versions(needs)
        if required and max(required) > BASELINE:
            raise RuntimeError(f'{path}: GLIBC_{".".join(map(str,max(required)))} exceeds 2.35')
        count += 1
    if not count:
        raise RuntimeError(f'No ELF objects found in {root}')
    print(f'{root}: {count} ELF objects meet glibc <= 2.35')


def main(root):
    debs = list(root.rglob('*.deb'))
    images = list(root.rglob('*.AppImage'))
    if len(debs) != 1 or len(images) != 1:
        raise RuntimeError('Expected one DEB and one AppImage')
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp)
        subprocess.run(['dpkg-deb', '-x', str(debs[0].resolve()), str(dest / 'deb')], check=True)
        check_tree(dest / 'deb')
        image = images[0].resolve()
        image.chmod(image.stat().st_mode | 0o100)
        # AppImage runtime plus all bundled shared objects, including the .NET helper.
        check_tree(image)
        subprocess.run([str(image), '--appimage-extract'], cwd=dest, stdout=subprocess.DEVNULL, check=True)
        check_tree(dest / 'squashfs-root')


if __name__ == '__main__':
    main(Path(sys.argv[1]))

#!/usr/bin/env python3
"""Install a production DEB over coexisting legacy/2.0.4 fixtures on a disposable CI runner."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def output(*args):
    return subprocess.check_output(args, text=True).strip()


def fixture(root, name, version, files):
    package = root / name
    (package / 'DEBIAN').mkdir(parents=True)
    (package / 'DEBIAN/control').write_text(
        f'Package: {name}\nVersion: {version}\nArchitecture: amd64\n'
        'Maintainer: TokenPlan CI <onevalar@users.noreply.github.com>\n'
        'Description: Disposable migration fixture\n')
    for path, content in files.items():
        target = package / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        if path.startswith(('usr/bin/', 'opt/')):
            target.chmod(0o755)
    deb = root / f'{name}.deb'
    run('dpkg-deb', '--build', '--root-owner-group', str(package), str(deb))
    return deb


def main():
    if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('RUNNER_OS') != 'Linux':
        sys.exit('Only run on a disposable Linux GitHub Actions runner.')
    deb = Path(sys.argv[1]).resolve()
    assert output('dpkg-deb', '-f', str(deb), 'Package') == 'token-plan'
    version = output('dpkg-deb', '-f', str(deb), 'Version')
    for field in ['Conflicts', 'Replaces']:
        assert output('dpkg-deb', '-f', str(deb), field) == 'tokenplan'
    assert output('dpkg-deb', '-f', str(deb), 'Provides') == f'tokenplan (= {version})'
    with tempfile.TemporaryDirectory(prefix='tokenplan-deb-test-') as temporary:
        root = Path(temporary)
        root.chmod(0o755)
        legacy = fixture(root, 'tokenplan', '1.0.0', {
            'opt/tokenplan/TokenPlan.Desktop': '#!/bin/sh\nexit 99\n',
            'usr/bin/tokenplan': '#!/bin/sh\nexit 99\n',
            'usr/share/applications/tokenplan.desktop': '[Desktop Entry]\nName=TokenPlan\n',
        })
        previous = fixture(root, 'token-plan', '2.0.4', {
            'usr/bin/tokenplan-shell': '#!/bin/sh\nexit 98\n',
            'usr/share/applications/TokenPlan.desktop': '[Desktop Entry]\nName=TokenPlan\n',
        })
        run('sudo', 'dpkg', '-i', str(legacy), str(previous))
        run('sudo', 'apt-get', 'install', '--yes', '--reinstall', str(deb))
        status = subprocess.run(['dpkg-query', '-W', '-f=${db:Status-Status}', 'tokenplan'], capture_output=True, text=True)
        assert status.stdout.strip() != 'installed', status.stdout
        assert output('dpkg-query', '-W', '-f=${Version}', 'token-plan') == version
        for path in ['/usr/bin/tokenplan', '/opt/tokenplan/TokenPlan.Desktop']:
            shim = Path(path)
            assert os.access(shim, os.X_OK)
            assert 'exec /usr/bin/tokenplan-shell "$@"' in shim.read_text()
        entries = [p for p in Path('/usr/share/applications').glob('*.desktop')
                   if 'Name=TokenPlan\n' in p.read_text()]
        visible = [p for p in entries if 'NoDisplay=true' not in p.read_text()]
        assert len(visible) == 1, visible
        assert 'Exec=tokenplan-shell' in visible[0].read_text()
        assert 'Icon=tokenplan-shell' in visible[0].read_text()
        for size in [32,48,128,256,512]:
            icon = Path(f'/usr/share/icons/hicolor/{size}x{size}/apps/tokenplan-shell.png')
            assert icon.is_file(), icon
        assert 'NoDisplay=true' in Path('/usr/share/applications/tokenplan.desktop').read_text()
        print(f'DEB {version}: old package removed, one visible entry, standard icons, legacy launch paths forwarded.')


if __name__ == '__main__':
    main()

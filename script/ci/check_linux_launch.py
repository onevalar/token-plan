#!/usr/bin/env python3
"""Real packaged app launch under Xvfb/DBus with an empty HOME; no credentials."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time


def inner(command, report):
    with tempfile.TemporaryDirectory(prefix='tokenplan-launch-') as home:
        env = {**os.environ, 'HOME': home, 'XDG_CONFIG_HOME': home+'/config',
               'XDG_DATA_HOME': home+'/data', 'XDG_CACHE_HOME': home+'/cache',
               'APPIMAGE_EXTRACT_AND_RUN': '1', 'LIBGL_ALWAYS_SOFTWARE': '1'}
        with (report/'stderr.log').open('w') as log:
            app = subprocess.Popen([command], env=env, stdout=log, stderr=log, start_new_session=True)
            try:
                window = ''
                for _ in range(40):
                    if app.poll() is not None:
                        raise RuntimeError(f'App exited early: {app.returncode}')
                    window = subprocess.check_output(['xwininfo','-root','-tree'], text=True)
                    if '"TokenPlan"' in window:
                        break
                    time.sleep(.5)
                else:
                    raise RuntimeError('No TokenPlan window appeared')
                time.sleep(5)
                if app.poll() is not None:
                    raise RuntimeError('App exited after opening window')
                (report/'windows.txt').write_text(window)
                processes = subprocess.check_output(['ps','-eo','args'], text=True)
                if 'WebKitWebProcess' not in processes:
                    raise RuntimeError('WebKit renderer did not start')
                if 'tokenplan-bridge --desktop-bridge' not in processes:
                    raise RuntimeError('Bundled backend did not start')
                subprocess.run(['import','-window','root',str(report/'desktop.png')], check=True)
            finally:
                try:
                    os.killpg(app.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                app.wait(timeout=15)
        errors = (report/'stderr.log').read_text()
        for marker in ['version `GLIBC_', 'error while loading shared libraries', 'symbol lookup error']:
            if marker in errors:
                raise RuntimeError(errors)


def main(root):
    if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('RUNNER_OS') != 'Linux':
        raise RuntimeError('Only run on a disposable Linux GitHub Actions runner')
    image, = root.rglob('*.AppImage')
    image.chmod(image.stat().st_mode | 0o100)
    for label, executable in [('deb','/usr/bin/tokenplan'),('appimage',str(image.resolve()))]:
        report=Path('linux-smoke',label).resolve()
        report.mkdir(parents=True,exist_ok=True)
        subprocess.run(['xvfb-run','-a','-s','-screen 0 1024x768x24','dbus-run-session',
                        sys.executable,str(Path(__file__).resolve()),'--inner',executable,str(report)],check=True,timeout=90)
        print(f'{label}: installed app, WebKit renderer and bundled backend launched successfully')


if __name__ == '__main__':
    if sys.argv[1]=='--inner':
        inner(sys.argv[2],Path(sys.argv[3]))
    else:
        main(Path(sys.argv[1]))

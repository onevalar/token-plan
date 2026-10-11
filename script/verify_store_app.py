#!/usr/bin/env python3
"""Fail before store export if the archive accidentally contains the direct-distribution build."""
import pathlib
import plistlib
import subprocess
import sys


def verify(app, version, build, archive=False):
    app = pathlib.Path(app)
    with (app / 'Contents/Info.plist').open('rb') as stream:
        info = plistlib.load(stream)
    expected = {'CFBundleIdentifier': 'com.onevalar.tokenplan',
                'CFBundleShortVersionString': version, 'CFBundleVersion': build}
    for key, value in expected.items():
        if info.get(key) != value:
            raise ValueError(f'Unexpected {key}: {info.get(key)!r}')
    if any(key.startswith('SU') for key in info):
        raise ValueError('Sparkle configuration is not allowed in the store build')
    if any('sparkle' in path.name.lower() for path in app.rglob('*')):
        raise ValueError('Sparkle must not be embedded in the store build')
    subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
    result = subprocess.run(['codesign', '-d', '--entitlements', ':-', str(app)],
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    entitlements = plistlib.loads(result.stdout)
    if entitlements.get('com.apple.security.app-sandbox') is not True:
        raise ValueError('Store app must enable App Sandbox')
    if not archive and entitlements.get('com.apple.security.get-task-allow'):
        raise ValueError('Development debugging entitlement found in archive')
    if not (app / 'Contents/embedded.provisionprofile').is_file():
        raise ValueError('App Store provisioning profile missing')
    print('Store bundle identity, version, signature and sandbox verified.')


if __name__ == '__main__':
    try:
        args = sys.argv[1:]
        archive = '--archive' in args
        args = [arg for arg in args if arg != '--archive']
        verify(*args, archive=archive)
    except (ValueError, OSError, subprocess.CalledProcessError, TypeError) as error:
        sys.exit(f'Store verification failed: {error}')

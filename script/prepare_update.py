#!/usr/bin/env python3
"""Prepare a signed, notarized Sparkle release locally. Never uploads or publishes."""
import argparse
import html
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import time
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from signing_identity import find_signing

ROOT = Path(__file__).resolve().parent.parent
NS = '{http://www.andymatuschak.org/xml-namespaces/sparkle}'


def run(*args, capture=False, env=None):
    return subprocess.run(args, cwd=ROOT, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def validate_feed(feed, archive, version, build, prefix):
    root = ET.parse(feed).getroot()
    items = root.findall('./channel/item')
    matching = [item for item in items if item.findtext(NS + 'shortVersionString') == version]
    if len(matching) != 1:
        raise ValueError('Expected exactly one item for this version')
    item = matching[0]
    if item.findtext(NS + 'version') != str(build):
        raise ValueError('Feed build does not match the application')
    enclosure = item.find('enclosure')
    if enclosure is None or enclosure.get('url') != prefix + archive.name:
        raise ValueError('Download URL mismatch')
    if int(enclosure.get('length', '-1')) != archive.stat().st_size:
        raise ValueError('Archive length mismatch')
    signature = enclosure.get(NS + 'edSignature')
    if not signature:
        raise ValueError('Unsigned update archive')
    for other in items:
        if other is not item and int(other.findtext(NS + 'version', '0')) >= int(build):
            raise ValueError('New build must be newer than all existing builds')
    return signature


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    parser.add_argument('--verify-existing', action='store_true', help='Verify and finalize an already notarized local build without rebuilding')
    args = parser.parse_args()
    if not re.fullmatch(r'\d+\.\d+\.\d+', args.version):
        parser.error('Use an approved stable version, such as 1.0.1')
    config = json.loads((ROOT / 'release/update-config.json').read_text())
    notes = ROOT / f'release/{args.version}.md'
    if not notes.is_file() or not notes.read_text().strip():
        parser.error('Approved release notes are required')
    output = ROOT / 'dist/updates' / args.version
    if output.exists() and not args.verify_existing:
        parser.error(f'Output already exists; preserve it and use a fresh version or move it aside: {output}')
    identity, profile = find_signing()
    run('xcrun', 'notarytool', 'history', '--keychain-profile', config['notary_keychain_profile'],
        '--output-format', 'json', capture=True)
    bins = ROOT / '.build/artifacts/sparkle/Sparkle/bin'
    public = run(str(bins / 'generate_keys'), '--account', config['sparkle_account'], '-p', capture=True).strip()
    if public != config['sparkle_public_key']:
        raise ValueError('Keychain signing key does not match the configured public key')
    build = int(time.time())  # monotonic across local and CI, unlike unrelated Git commit counts
    if args.verify_existing:
        existing = plistlib.loads((output / 'mac/TokenPlan.app/Contents/Info.plist').read_bytes())
        if existing['CFBundleShortVersionString'] != args.version:
            raise ValueError('Existing bundle version mismatch')
        build = int(existing['CFBundleVersion'])
    output.mkdir(parents=True, exist_ok=args.verify_existing)
    feed_dir = output / 'feed'
    feed_dir.mkdir(exist_ok=args.verify_existing)
    previous_items = set()
    if config['publication_enabled']:
        previous = subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '30', config['feed_url']])
        (feed_dir / 'appcast.xml').write_bytes(previous)
        previous_items = {i.findtext(NS + 'version') for i in ET.fromstring(previous).findall('./channel/item')}
    env = dict(os.environ, CODESIGN_IDENTITY=identity, ICLOUD_PROVISIONING_PROFILE=profile,
               NOTARY_KEYCHAIN_PROFILE=config['notary_keychain_profile'], TOKENPLAN_VERSION=args.version,
               TOKENPLAN_BUILD=str(build), TOKENPLAN_DIST_DIR=str(output / 'mac'),
               SPARKLE_PUBLIC_KEY=public, FEED_URL=config['feed_url'], DISABLE_UPDATES='0')
    env.pop('ALLOW_UNNOTARIZED', None)
    if not args.verify_existing:
        # Bash reads incrementally: execute an immutable script copy if the checkout is being edited.
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', prefix='.release-run-', dir=ROOT / 'script') as script:
            script.write((ROOT / 'script/release.sh').read_text())
            script.flush()
            run('bash', script.name, env=env)
    app = output / 'mac/TokenPlan.app'
    archive = output / f'mac/TokenPlan-{args.version}.dmg'
    for target in (app, archive):
        run('xcrun', 'stapler', 'validate', str(target))
    run('codesign', '--verify', '--deep', '--strict', '-R=notarized', str(app))
    info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    if (info['CFBundleIdentifier'], info['SUFeedURL'], info['SUPublicEDKey']) != (
            'com.onevalar.tokenplan', config['feed_url'], public):
        raise ValueError('Packaged update configuration mismatch')
    shutil.copy2(archive, feed_dir / archive.name)
    (feed_dir / f'{archive.stem}.html').write_text('<pre>' + html.escape(notes.read_text()) + '</pre>')
    prefix = f'https://github.com/{config["distribution_repository"]}/releases/download/tokenplan-v{args.version}/'
    run(str(bins / 'generate_appcast'), '--account', config['sparkle_account'],
        '--download-url-prefix', prefix, '--maximum-versions', '0', '--embed-release-notes', str(feed_dir))
    feed = feed_dir / 'appcast.xml'
    signature = validate_feed(feed, archive, args.version, build, prefix)
    current_items = {i.findtext(NS + 'version') for i in ET.parse(feed).findall('./channel/item')}
    if not previous_items <= current_items:
        raise ValueError('Appcast lost existing versions')
    run(str(bins / 'sign_update'), '--account', config['sparkle_account'], '--verify', str(archive), signature)
    state = {'version': args.version, 'build': build, 'verified': True,
             'published': False, 'feed_url': config['feed_url'], 'archive': str(archive),
             'archive_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
             'feed_sha256': hashlib.sha256(feed.read_bytes()).hexdigest()}
    (output / 'verification.json').write_text(json.dumps(state, indent=2) + '\n')
    print(f'Verified private candidate: {output}. Nothing has been published or installed.')


if __name__ == '__main__':
    main()

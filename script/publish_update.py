#!/usr/bin/env python3
"""Publish only validated installers and update metadata to the public distribution repository."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET
from prepare_update import ROOT, NS, run, validate_feed


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def assemble(version, folder, build):
    names = [f'TokenPlan-{version}.dmg', f'TokenPlan-Setup-{version}.exe', f'tokenplan_{version}_amd64.deb']
    for name in names:
        path = folder / name
        if not path.is_file() or path.stat().st_size < 1024:
            raise ValueError(f'Missing or empty installer: {name}')
    with (folder / names[1]).open('rb') as f:
        if f.read(2) != b'MZ': raise ValueError('Invalid Windows installer')
    with (folder / names[2]).open('rb') as f:
        if f.read(8) != b'!<arch>\n': raise ValueError('Invalid Debian package')
    prefix = f'https://github.com/onevalar/apps/releases/download/tokenplan-v{version}/'
    validate_feed(folder / 'appcast.xml', folder / names[0], version, build, prefix)
    manifest = {'version': version, 'platforms': {}}
    for platform, name in zip(['macos-universal', 'windows-x64', 'linux-x64'], names):
        file = folder / name
        manifest['platforms'][platform] = {'url': prefix + name, 'sha256': digest(file), 'size': file.stat().st_size}
    (folder / 'latest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (folder / 'SHA256SUMS.txt').write_text(''.join(f'{digest(folder / name)}  {name}\n' for name in names))
    return names + ['SHA256SUMS.txt']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    parser.add_argument('--folder', type=Path, help='CI folder with three installers and verified appcast')
    parser.add_argument('--build', type=int)
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'\d+\.\d+\.\d+', args.version): parser.error('An approved stable version is required')
    config = json.loads((ROOT / 'release/update-config.json').read_text())
    if not config['publication_enabled'] or config['distribution_repository'] != 'onevalar/apps':
        parser.error('Public distribution is not enabled for onevalar/apps')
    if config['feed_url'] != 'https://onevalar.github.io/apps/tokenplan/appcast.xml': raise ValueError('Unexpected feed destination')
    notes = ROOT / f'release/{args.version}.md'
    if not notes.is_file() or not notes.read_text().strip(): raise ValueError('Approved nonempty release notes required')
    folder = args.folder
    if folder is None:
        output = ROOT / 'dist/updates' / args.version
        state = json.loads((output / 'verification.json').read_text())
        archive = Path(state['archive']); feed = output / 'feed/appcast.xml'
        if not state['verified'] or state['feed_url'] != config['feed_url'] or digest(archive) != state['archive_sha256'] or digest(feed) != state['feed_sha256']:
            raise ValueError('Verified candidate changed')
        signature = validate_feed(feed, archive, args.version, state['build'], f'https://github.com/onevalar/apps/releases/download/tokenplan-v{args.version}/')
        run(str(ROOT / '.build/artifacts/sparkle/Sparkle/bin/sign_update'), '--account', config['sparkle_account'], '--verify', str(archive), signature)
        folder = output / 'public'; folder.mkdir(exist_ok=True)
        shutil.copy2(archive, folder / archive.name); shutil.copy2(feed, folder / 'appcast.xml')
        for name in [f'TokenPlan-Setup-{args.version}.exe', f'tokenplan_{args.version}_amd64.deb']:
            shutil.copy2(output / 'desktop' / name, folder / name)
        args.build = state['build']
    folder = folder.resolve()
    if not args.build: raise ValueError('Verified Mac build number required')
    names = assemble(args.version, folder, args.build)
    if args.prepare_only:
        print(f'Validated release files: {folder}'); return
    repo = config['distribution_repository']; tag = f'tokenplan-v{args.version}'
    if json.loads(run('gh','api',f'repos/{repo}',capture=True))['private']: raise ValueError('Distribution repository must be public')
    # Retrieve releases successfully before interpreting absence; transient errors are never absence.
    releases = json.loads(run('gh','api','--paginate','--slurp',f'repos/{repo}/releases?per_page=100',capture=True))
    release = next((r for page in releases for r in page if r['tag_name'] == tag), None)
    if release:
        # Resume metadata publication only when the previously published binaries match exactly.
        with tempfile.TemporaryDirectory() as directory:
            run('gh','release','download',tag,'--repo',repo,'--dir',directory)
            for name in names:
                existing = Path(directory) / name
                if not existing.is_file() or digest(existing) != digest(folder / name):
                    raise ValueError('Release exists with different/incomplete assets. Never replace a published version.')
        if release['draft'] or release['prerelease']: raise ValueError('Expected a published stable release')
    else:
        run('gh','release','create',tag,*(str(folder / n) for n in names),'--repo',repo,'--title',f'TokenPlan {args.version}','--notes-file',str(notes),'--latest=false')
    with tempfile.TemporaryDirectory(prefix='tokenplan-public-') as directory:
        run('gh','repo','clone',repo,directory,'--','--depth','1','--branch','main')
        def git(*a): return subprocess.run(['git','-C',directory,*a],check=True,capture_output=True,text=True).stdout
        target = Path(directory) / 'tokenplan'; target.mkdir(exist_ok=True)
        old_feed = target / 'appcast.xml'
        if old_feed.exists():
            old = {i.findtext(NS+'version') for i in ET.parse(old_feed).findall('./channel/item')}
            new = {i.findtext(NS+'version') for i in ET.parse(folder/'appcast.xml').findall('./channel/item')}
            if not old <= new: raise ValueError('Concurrent feed change would remove existing versions')
        current_manifest = target / 'latest.json'
        if current_manifest.exists():
            previous = json.loads(current_manifest.read_text())['version']
            if tuple(map(int,previous.split('.'))) > tuple(map(int,args.version.split('.'))): raise ValueError('Refusing to downgrade the update manifest')
        for name in ['appcast.xml','latest.json']: shutil.copy2(folder/name,target/name)
        readme = Path(directory)/'README.md'
        if readme.exists():
            text = readme.read_text()
            text = re.sub(r'tokenplan-v\d+\.\d+\.\d+',tag,text)
            text = re.sub(r'\[TokenPlan \d+\.\d+\.\d+\]',f'[TokenPlan {args.version}]',text)
            text = re.sub(r'TokenPlan-(?:Setup-)?\d+\.\d+\.\d+\.(?:dmg|exe)',lambda m: re.sub(r'\d+\.\d+\.\d+',args.version,m[0]),text)
            text = re.sub(r'tokenplan_\d+\.\d+\.\d+_amd64.deb',f'tokenplan_{args.version}_amd64.deb',text)
            readme.write_text(text)
        git('config','user.name','Onevalar Apps Publisher'); git('config','user.email','apps-publisher@users.noreply.github.com')
        git('add','tokenplan/appcast.xml','tokenplan/latest.json','README.md')
        if git('diff','--cached','--name-only').strip():
            git('commit','-m',f'Publish TokenPlan {args.version} update metadata')
            git('push','origin','main')
    print(f'Published https://github.com/{repo}/releases/tag/{tag}')

if __name__ == '__main__': main()

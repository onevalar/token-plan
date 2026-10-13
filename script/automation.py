#!/usr/bin/env python3
"""One-click local test and private multi-platform packaging; no release tags."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from package_artifacts import verify_checksums
from signing_identity import find_signing

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / 'dist/automation'
OUTPUT = Path(os.environ.get('TOKENPLAN_PACKAGES_DIR', str(Path.home() / 'Downloads/TokenPlan 安装包')))


def run(*args, capture=False, env=None, cwd=ROOT):
    return subprocess.run(args, cwd=cwd, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def snapshot():
    # Never modify the user's index or checkout; ordinary Git ignore rules apply.
    with tempfile.TemporaryDirectory() as temp:
        env = dict(os.environ, GIT_INDEX_FILE=str(Path(temp) / 'index'))
        run('git', 'read-tree', 'HEAD', env=env)
        run('git', 'add', '-A', env=env)
        return run('git', 'write-tree', capture=True, env=env).strip()


def local_test():
    tree = snapshot()
    run('bash', 'script/build_and_run.sh', 'build', env=dict(os.environ, TOKENPLAN_DISPLAY_NAME='TokenPlan Test'))
    if snapshot() != tree:
        raise ValueError('构建期间代码发生变化，请重新运行本地测试。')
    target = Path.home() / 'Applications/TokenPlan Test.app'
    target.parent.mkdir(parents=True, exist_ok=True)
    # Only stop this test bundle, never the production application.
    subprocess.run(['pkill', '-f', '^' + re.escape(str(target / 'Contents/MacOS/TokenPlan')) + '$'], check=False)
    staged = target.with_name('TokenPlan Test.installing.app')
    if staged.exists(): shutil.rmtree(staged)
    run('ditto', str(ROOT / 'dist/TokenPlan.app'), str(staged))
    run('codesign', '--verify', '--deep', '--strict', str(staged))
    if target.exists(): shutil.rmtree(target)
    staged.rename(target)
    save(STATE / 'tested.json', {'tree': tree, 'installed': str(target), 'builtAt': dt.datetime.now(dt.timezone.utc).isoformat()})
    if os.environ.get('TOKENPLAN_NO_LAUNCH') != '1': run('/usr/bin/open', '-n', str(target))
    print(f'测试版已安装：{target}\n测试满意后，双击「生成三平台安装包」。')


def prerequisites():
    run('gh', 'auth', 'status')
    run('git', 'var', 'GIT_AUTHOR_IDENT', capture=True)
    run('xcrun', 'notarytool', 'history', '--keychain-profile', 'TokenPlan-Notary', '--output-format', 'json', capture=True)
    identity, profile = find_signing()
    if shutil.disk_usage(ROOT).free < 5 * 1024**3: raise ValueError('请至少保留 5 GB 磁盘空间。')
    return identity, profile


def package(version):
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-beta\.[0-9]+)?', version):
        raise ValueError('版本号格式：1.0.1 或 1.0.1-beta.1')
    tree = snapshot()
    tested = json.loads((STATE / 'tested.json').read_text())
    if tested['tree'] != tree: raise ValueError('代码与上次本地测试不一致，请先重新安装并测试。')
    identity, profile = prerequisites()
    unique = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d%H%M%S') + '-' + uuid.uuid4().hex[:8]
    folder = OUTPUT / f'{version}-{unique}'
    folder.mkdir(parents=True)
    state = {'version': version, 'tree': tree, 'folder': str(folder), 'status': 'building', 'macReady': False}
    statefile = folder / 'build-status.json'
    save(statefile, state)
    submit_snapshot(version, tree, statefile)
    build_mac(statefile, identity, profile)
    finish(statefile)


def submit_snapshot(version, tree, statefile):
    state = json.loads(Path(statefile).read_text())
    run('git', 'fetch', 'origin', 'main')
    commit = run('git', 'rev-parse', 'origin/main', capture=True).strip()
    published_tree = run('git', 'rev-parse', 'origin/main^{tree}', capture=True).strip()
    if tree != published_tree:
        raise ValueError('请先将测试通过的修改提交并推送到 main，再打包；不再创建临时分支。')
    request_id = Path(state['folder']).name
    state.update(commit=commit, branch='main', requestID=request_id)
    run('gh', 'workflow', 'run', 'package-private.yml', '--ref', 'main',
        '-f', f'version={version}', '-f', f'commit={commit}', '-f', f'request_id={request_id}')
    save(statefile, state)
    return state


def build_mac(statefile, identity=None, profile=None):
    statefile = Path(statefile)
    state = json.loads(statefile.read_text())
    if state['macReady']: return
    if identity is None: identity, profile = prerequisites()
    folder, version, commit = Path(state['folder']), state['version'], state['commit']
    # Build the same immutable snapshot locally; source edits cannot contaminate it.
    work = STATE / Path(state['folder']).name
    if not work.exists(): run('git', 'worktree', 'add', '--detach', str(work), commit)
    env = dict(os.environ, CODESIGN_IDENTITY=identity, ICLOUD_PROVISIONING_PROFILE=profile,
               NOTARY_KEYCHAIN_PROFILE='TokenPlan-Notary', DISABLE_UPDATES='1', TOKENPLAN_VERSION=version,
               TOKENPLAN_BUILD=str(int(time.time())), TOKENPLAN_DIST_DIR=str(folder / 'mac'))
    env.pop('ALLOW_UNNOTARIZED', None)
    # Retain failed build cache for resume; remove only after verified success.
    run('bash', 'script/release.sh', cwd=work, env=env)
    run('xcrun', 'stapler', 'validate', str(folder / 'mac/TokenPlan.app'))
    run('xcrun', 'stapler', 'validate', str(folder / f'mac/TokenPlan-{version}.dmg'))
    run('codesign', '--verify', '--deep', '--strict', '-R=notarized', str(folder / 'mac/TokenPlan.app'))
    shutil.copy2(folder / f'mac/TokenPlan-{version}.dmg', folder)
    state['macReady'] = True
    save(statefile, state)
    run('git', 'worktree', 'remove', '--force', str(work))

def finish(statefile):
    statefile = Path(statefile).resolve()
    state = json.loads(statefile.read_text())
    if not state['macReady']: raise ValueError('Mac 打包未完成，请先解决日志中报告的签名或公证问题。')
    folder, version = Path(state['folder']), state['version']
    print('等待 Windows / Linux 云端构建，可按 Ctrl+C 中断等待，稍后使用 resume 继续。', flush=True)
    deadline = time.monotonic() + 3600
    while time.monotonic() < deadline:
        commit_filter = [] if state.get('requestID') else ['--commit', state['commit']]
        runs = json.loads(run('gh', 'run', 'list', '--branch', state['branch'], '--workflow', 'package-private.yml', '--limit', '100', *commit_filter, '--json', 'databaseId,status,conclusion,workflowName,url,displayTitle', capture=True))
        matches = [r for r in runs if r['workflowName'] == 'Private packages' and
                   (not state.get('requestID') or r['displayTitle'] == f"Private package {state['requestID']}")]
        if matches:
            latest = max(matches, key=lambda r: r['databaseId'])
            state.update(run=latest['databaseId'], url=latest['url'])
            save(statefile, state)
            if latest['status'] == 'completed':
                if latest['conclusion'] != 'success': raise ValueError(f'云端构建失败：{latest["url"]}')
                break
        time.sleep(10)
    else: raise TimeoutError(f'等待超时；可使用 resume 继续：{statefile}')
    required = {f'TokenPlan-Setup-{version}.exe', f'tokenplan_{version}_amd64.deb'}
    with tempfile.TemporaryDirectory(dir=folder) as download:
        run('gh', 'run', 'download', str(state['run']), '-n', 'desktop-installers', '-D', download)
        entries = verify_checksums(Path(download), required)
        for name in entries: shutil.copy2(Path(download) / name, folder / name)
    dmg = folder / f'TokenPlan-{version}.dmg'
    with dmg.open('rb') as stream: entries[dmg.name] = hashlib.file_digest(stream, 'sha256').hexdigest()
    (folder / 'SHA256SUMS.txt').write_text(''.join(f'{sha}  {name}\n' for name, sha in sorted(entries.items())))
    verify_checksums(folder, required | {dmg.name})
    state.update(status='complete', sha256=entries, windowsSigned=False, linuxTarget='Debian/Ubuntu x64')
    save(statefile, state)
    print(f'三平台安装包已完成并校验：{folder}')
    run('/usr/bin/open', str(folder))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['test', 'package', 'doctor', 'resume'])
    parser.add_argument('value', nargs='?')
    args = parser.parse_args()
    STATE.mkdir(parents=True, exist_ok=True)
    # mkdir is atomic; prevents simultaneous builds replacing the same test bundle.
    lock = STATE / 'running.lock'
    try: lock.mkdir()
    except FileExistsError: raise ValueError(f'已有流程运行；如上次意外退出，确认进程结束后删除 {lock}')
    try:
        if args.action == 'test': local_test()
        elif args.action == 'doctor': prerequisites(); print('签名、公证和 GitHub 认证检查通过。')
        elif args.action == 'resume':
            candidates = sorted(OUTPUT.glob('*/build-status.json'), key=lambda p: p.stat().st_mtime, reverse=True)
            statefile = args.value or next((str(p) for p in candidates if json.loads(p.read_text()).get('status') != 'complete'), '')
            if not statefile: raise ValueError('没有未完成的打包任务。')
            saved = json.loads(Path(statefile).read_text())
            if 'commit' not in saved: submit_snapshot(saved['version'], saved['tree'], Path(statefile))
            # Existing runs can be resumed without recreating a remote branch.
            build_mac(statefile)
            finish(statefile)
        else: package(args.value or input('本次版本号（确认本地测试通过后输入）：').strip())
    finally: lock.rmdir()

if __name__ == '__main__':
    try: main()
    except (ValueError, OSError, subprocess.CalledProcessError, TimeoutError) as error:
        print(f'\n未完成：{error}', file=sys.stderr)
        sys.exit(1)

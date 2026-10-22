#!/usr/bin/env python3
"""Checks that a release is ready before you push its tag, and drafts notes from the commit log.

Usage:
  script/preflight_release.py 2.0.8            run the checks (nothing is changed or pushed)
  script/preflight_release.py 2.0.8 --tests    also run the unit, desktop and translation tests
  script/preflight_release.py 2.0.8 --draft    print commit subjects since the last release to help write release/2.0.8.md

The tag itself is always yours to push: this prints the command but never runs it.
"""
import json, os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEMVER = re.compile(r'^(\d+)\.(\d+)\.(\d+)$')


def parse(version):
    m = SEMVER.match(version)
    return tuple(int(part) for part in m.groups()) if m else None


def newest(tags):
    versions = [v for v in (parse(t[1:]) for t in tags if t.startswith('v')) if v]
    return max(versions) if versions else None


def notes_problem(text):
    """None when the notes are fit to publish, otherwise why not."""
    body = text.strip()
    if not body:
        return 'release notes are empty'
    if len([line for line in body.splitlines() if line.strip() and not line.startswith('#')]) < 2:
        return 'release notes need at least two lines describing the changes'
    if re.search(r'\b(TODO|TBD|FIXME)\b', body):
        return 'release notes still contain TODO/TBD'
    return None


def git(*args, check=True):
    return subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=True, check=check).stdout.strip()


def run(label, *cmd, cwd=None):
    result = subprocess.run(cmd, cwd=cwd or ROOT, text=True, capture_output=True)
    tail = (result.stdout + result.stderr).strip().splitlines()[-3:]
    return result.returncode == 0, label, ' | '.join(tail)


def checks(version, with_tests):
    out = []  # (ok, name, detail)
    wanted = parse(version)
    if not wanted:
        return [(False, 'version', f'{version!r} is not X.Y.Z')]
    tags = git('tag', '--list', 'v*').splitlines()
    previous = newest(tags)
    out.append((previous is None or wanted > previous, 'version is newer than the last release',
                f'last v{".".join(map(str, previous))}' if previous else 'first release'))
    remote = git('ls-remote', '--tags', 'origin', f'refs/tags/v{version}', check=False)
    out.append((f'v{version}' not in tags and not remote, f'tag v{version} is unused', 'exists already' if remote or f'v{version}' in tags else ''))
    notes = ROOT / 'release' / f'{version}.md'
    problem = notes_problem(notes.read_text()) if notes.exists() else f'{notes.relative_to(ROOT)} is missing'
    out.append((problem is None, f'release/{version}.md is ready', problem or ''))
    out.append((git('status', '--porcelain') == '', 'working tree is clean', 'uncommitted changes'))
    branch = git('rev-parse', '--abbrev-ref', 'HEAD')
    out.append((branch == 'main', 'on main', f'on {branch}'))
    git('fetch', 'origin', 'main', check=False)
    behind = git('rev-list', '--left-right', '--count', 'HEAD...origin/main', check=False).split()
    out.append((behind == ['0', '0'], 'main matches origin/main', 'ahead/behind ' + '/'.join(behind) if behind else 'cannot compare'))
    out.append(((ROOT / 'release' / 'tauri-accepted').exists(), 'Tauri line is accepted', 'release/tauri-accepted missing'))
    config = json.loads((ROOT / 'release' / 'update-config.json').read_text())
    out.append((config.get('publication_enabled') is True, 'publication is enabled', 'update-config.json has publication_enabled off'))
    out.append(run('translation tables are generated', 'python3', 'script/generate_localizations.py', '--report'))
    if with_tests:
        out.append(run('desktop core + translation checks', 'script/build_desktop.sh', 'test'))
        out.append(run('shared UI unit tests', 'npx', 'vitest', 'run', 'src', cwd=ROOT / 'platforms' / 'tauri'))
        out.append(run('release script tests', 'python3', '-m', 'unittest', 'discover', '-s', 'script', '-p', 'test_*.py'))
    return out


def draft(version):
    tags = git('tag', '--list', 'v*', '--sort=-v:refname').splitlines()
    base = tags[0] if tags else None
    rng = f'{base}..HEAD' if base else 'HEAD'
    subjects = [s for s in git('log', rng, '--no-merges', '--format=%s').splitlines() if not s.startswith('Publish Tauri update manifest')]
    print(f'# TokenPlan {version}\n')
    print('<!-- Rewrite these commit subjects as short, plain-language notes for users, then delete this comment. -->')
    for s in subjects:
        print(f'- {s}')
    print('\n## 更新说明\n\n（说明如何升级，以及需要用户手动处理的事项。）')


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if len(args) != 1:
        sys.exit(__doc__)
    version = args[0].lstrip('v')
    if '--draft' in argv:
        draft(version)
        return 0
    results = checks(version, '--tests' in argv)
    for ok, name, detail in results:
        print(f'{"PASS" if ok else "FAIL"}  {name}' + (f'  ({detail})' if detail and not ok else ''))
    failed = [r for r in results if not r[0]]
    if failed:
        print(f'\n{len(failed)} check(s) failed; do not tag yet.')
        return 1
    print(f'\nReady. When you approve the version, push the tag yourself:\n  git tag v{version} && git push origin v{version}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

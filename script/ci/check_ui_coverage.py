"""Check the actual Playwright inventory: every existing case once per platform."""
from collections import Counter
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / 'platforms' / 'tauri'


def inventory(config):
    result = subprocess.run(
        ['node', 'node_modules/@playwright/test/cli.js', 'test', '--config', config,
         '--list', '--reporter=json'], cwd=PROJECT, text=True, capture_output=True, check=True)
    data = json.loads(result.stdout)
    if data.get('errors'):
        raise RuntimeError(data['errors'])
    rows = []

    def walk(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                case = (spec['file'], spec['line'], spec['column'], spec['title'])
                for test in spec['tests']:
                    rows.append((test['projectName'], case))
            walk(suite.get('suites', []))

    walk(data['suites'])
    if not rows:
        raise RuntimeError(f'No tests collected from {config}')
    return rows


def main():
    expected = {case for _, case in inventory('playwright.config.ts')}
    expected |= {case for _, case in inventory('playwright.preview.config.ts')}
    actual = inventory('playwright.release.config.ts')
    for platform in ('macos', 'windows', 'linux'):
        counts = Counter(case for project, case in actual if project.startswith(platform + '-'))
        missing = expected - counts.keys()
        extra = counts.keys() - expected
        duplicates = {case for case, count in counts.items() if count != 1}
        if missing or extra or duplicates:
            raise RuntimeError(f'{platform}: missing={sorted(missing)}, extra={sorted(extra)}, duplicate={sorted(duplicates)}')
        print(f'{platform}: all {len(expected)} existing cases collected exactly once (platform skips remain in tests).')


if __name__ == '__main__':
    main()

"""Skip expensive checks only for documentation-only PRs; always check main."""
import json
import os
from pathlib import Path, PurePosixPath
import subprocess


def documentation(path):
    name = PurePosixPath(path)
    return (path in {'README.md', 'CONTRIBUTING.md'} or
            path.startswith(('docs/', 'showcase/', 'assets/showcase/')) or
            (name.parent == PurePosixPath('release') and name.suffix == '.md'))


def run_checks(event, files):
    # Empty/unknown diffs fail open to the full suite, never to a green skip.
    return event != 'pull_request' or not files or any(not documentation(f) for f in files)


def main():
    event = os.environ['GITHUB_EVENT_NAME']
    files = []
    if event == 'pull_request':
        payload = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
        pr = payload['pull_request']
        # Compare exact event commits, not a PR file listing that may have
        # changed since this run was queued. Large/truncated diffs run all tests.
        endpoint = (f'repos/{os.environ["GITHUB_REPOSITORY"]}/compare/'
                    f'{pr["base"]["sha"]}...{pr["head"]["sha"]}')
        diff = json.loads(subprocess.check_output(['gh', 'api', endpoint], text=True))
        changed = diff.get('files', [])
        if len(changed) < 300:
            for file in changed:
                files.append(file['filename'])
                if file.get('previous_filename'):
                    files.append(file['previous_filename'])
    value = str(run_checks(event, files)).lower()
    with Path(os.environ['GITHUB_OUTPUT']).open('a') as target:
        target.write(f'run_checks={value}\n')
    print(f'run_checks={value} ({event}, {len(files)} changed paths)')


if __name__ == '__main__':
    main()

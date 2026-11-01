import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from ci_changes import main, run_checks


class DocumentationChecks(unittest.TestCase):
    def test_only_documentation_prs_skip(self):
        docs = ['README.md', 'docs/releasing.md', 'release/2.3.5.md']
        self.assertFalse(run_checks('pull_request', docs))
        self.assertTrue(run_checks('push', docs))
        for paths in ([], docs + ['platforms/tauri/src/App.tsx'],
                      ['.github/workflows/ci.yml'], ['updates/tauri.json'],
                      ['Sources/OpenUsage/Providers/Claude/README.swift']):
            with self.subTest(paths=paths):
                self.assertTrue(run_checks('pull_request', paths))

    def test_api_renames_and_truncated_diffs_do_not_skip_code(self):
        cases = [
            ([{'filename': 'docs/renamed.md', 'previous_filename': 'script/build.sh'}], 'true'),
            ([{'filename': 'docs/readme.md'}] * 299, 'false'),
            ([{'filename': 'docs/readme.md'}] * 300, 'true'),
            ([], 'true'),
        ]
        for files, expected in cases:
            with self.subTest(count=len(files), expected=expected), tempfile.TemporaryDirectory() as temp:
                event, output = Path(temp) / 'event.json', Path(temp) / 'output'
                event.write_text(json.dumps({'pull_request': {
                    'base': {'sha': 'a' * 40}, 'head': {'sha': 'b' * 40}}}))
                env = {'GITHUB_EVENT_NAME': 'pull_request', 'GITHUB_EVENT_PATH': str(event),
                       'GITHUB_REPOSITORY': 'onevalar/token-plan', 'GITHUB_OUTPUT': str(output)}
                with patch.dict(os.environ, env), contextlib.redirect_stdout(io.StringIO()), \
                        patch('ci_changes.subprocess.check_output', return_value=json.dumps({'files': files})):
                    main()
                self.assertEqual(output.read_text(), f'run_checks={expected}\n')


if __name__ == '__main__':
    unittest.main()

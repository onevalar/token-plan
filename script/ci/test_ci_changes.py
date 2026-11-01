import unittest

from ci_changes import run_checks


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


if __name__ == '__main__':
    unittest.main()

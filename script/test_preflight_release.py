import sys, unittest
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import preflight_release as p


class PreflightHelpers(unittest.TestCase):
    def test_parse_accepts_only_plain_versions(self):
        self.assertEqual(p.parse('2.0.8'), (2, 0, 8))
        for bad in ('2.0', '2.0.8-beta.1', 'v2.0.8', '2.0.8.1', ''):
            self.assertIsNone(p.parse(bad), bad)

    def test_newest_compares_numerically_not_alphabetically(self):
        self.assertEqual(p.newest(['v2.0.9', 'v2.0.10', 'v1.0.12', 'junk']), (2, 0, 10))
        self.assertIsNone(p.newest([]))

    def test_notes_must_have_substance(self):
        self.assertEqual(p.notes_problem('  \n'), 'release notes are empty')
        self.assertIn('two lines', p.notes_problem('# TokenPlan 2.0.8\n- one change'))
        self.assertIn('TODO', p.notes_problem('# T\n- fixed it\n- TODO write the rest'))
        self.assertIsNone(p.notes_problem('# TokenPlan 2.0.8\n\n- fixed refresh\n- added tips\n'))


class PreflightRegressionGate(unittest.TestCase):
    def test_full_checks_include_platform_ui_and_coverage(self):
        with patch.object(p, 'run', side_effect=lambda label, *args, **kwargs: (label != 'three-platform UI regression', label, '')) as run:
            results = p.regression_checks()
        ui_calls = [c for c in run.call_args_list if 'test:release-ui' in c.args]
        self.assertEqual(len(ui_calls), 1)
        self.assertEqual(ui_calls[0].kwargs['cwd'], p.ROOT / 'platforms' / 'tauri')
        self.assertTrue(any('script/ci/check_ui_coverage.py' in c.args for c in run.call_args_list))
        self.assertEqual([r[1] for r in results if not r[0]], ['three-platform UI regression'])

    def test_unit_failure_does_not_start_browser_regression(self):
        with patch.object(p, 'run', return_value=(False, 'shared UI unit tests', 'failed')) as run:
            results = p.regression_checks()
        self.assertEqual(run.call_count, 1)
        self.assertEqual(len(results), 1)
        self.assertNotIn('test:release-ui', run.call_args.args)

    def test_metadata_only_does_not_claim_release_ready(self):
        output = StringIO()
        with patch.object(p, 'checks', return_value=[(True, 'metadata', '')]), redirect_stdout(output):
            self.assertEqual(p.main(['9.0.0']), 0)
        self.assertIn('UI regression has not run', output.getvalue())
        self.assertNotIn('git tag', output.getvalue())

    def test_failed_ui_blocks_tag_instructions(self):
        output = StringIO()
        with patch.object(p, 'checks', return_value=[(False, 'three-platform UI regression', 'failed')]), redirect_stdout(output):
            self.assertEqual(p.main(['9.0.0', '--tests']), 1)
        self.assertIn('do not tag yet', output.getvalue())
        self.assertNotIn('git tag', output.getvalue())

    def test_completed_full_checks_provide_tag_instructions(self):
        output = StringIO()
        with patch.object(p, 'checks', return_value=[(True, 'three-platform UI regression', '')]) as checks, redirect_stdout(output):
            self.assertEqual(p.main(['9.0.0', '--tests']), 0)
        checks.assert_called_once_with('9.0.0', True)
        self.assertIn('git tag v9.0.0', output.getvalue())


if __name__ == '__main__':
    unittest.main()

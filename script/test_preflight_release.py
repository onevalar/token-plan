import sys, unittest
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


if __name__ == '__main__':
    unittest.main()

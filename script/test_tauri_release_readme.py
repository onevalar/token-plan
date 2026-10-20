import unittest
from pathlib import Path
from tauri_release_readme import update_readme

class ReleaseReadmeTests(unittest.TestCase):
    names = ['TokenPlan_2.0.0_universal.dmg', 'TokenPlan_2.0.0_x64-setup.exe',
             'tokenplan_2.0.0_amd64.deb', 'TokenPlan_2.0.0_amd64.AppImage']
    text = (Path(__file__).resolve().parent.parent / 'README.md').read_text()

    def test_real_asset_names_and_all_platforms(self):
        result = update_readme(self.text, '2.0.0', self.names)
        self.assertNotIn('/v1.0.12/', result)
        self.assertIn('SHA256SUMS.txt', result)
        for name in self.names:
            self.assertIn('/v2.0.0/' + name, result)
        self.assertEqual(result, update_readme(result, '2.0.0', self.names))

    def test_incomplete_or_ambiguous_artifacts_are_rejected(self):
        for names in [self.names[:-1], self.names + ['duplicate.dmg']]:
            with self.assertRaises(ValueError):
                update_readme(self.text, '2.0.0', names)

if __name__ == '__main__':
    unittest.main()

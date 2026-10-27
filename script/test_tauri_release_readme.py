import unittest
from pathlib import Path
from tauri_release_readme import update_readme

class ReleaseReadmeTests(unittest.TestCase):
    names = ['TokenPlan_2.0.0_universal.dmg', 'TokenPlan_2.0.0_x64-setup.exe',
             'tokenplan_2.0.0_amd64.deb', 'TokenPlan_2.0.0_amd64.AppImage']
    text = (Path(__file__).resolve().parent.parent / 'README.md').read_text()

    def test_real_asset_names_and_all_platforms(self):
        result = update_readme(self.text, '2.0.0', self.names)
        current = result.split('<!-- download-links:start -->')[1].split('<!-- download-links:end -->')[0]
        self.assertNotIn('/v1.0.12/', current)
        self.assertNotIn('SHA256SUMS', current)
        self.assertNotIn('全部版本', current)
        for name in self.names:
            self.assertIn('/v2.0.0/' + name, result)
        self.assertEqual(result, update_readme(result, '2.0.0', self.names))

    def test_classic_mac_download_survives_subsequent_publications(self):
        result = update_readme(self.text, '2.0.0', self.names)
        classic = result.split('### macOS 经典版')[1].split('## 功能')[0]
        self.assertIn('/v1.0.12/TokenPlan-1.0.12.dmg', classic)
        self.assertIn('/v1.0.12/SHA256SUMS.txt', classic)
        self.assertEqual(classic, self.text.split('### macOS 经典版')[1].split('## 功能')[0])
    def test_publication_changes_only_the_download_block(self):
        result = update_readme(self.text, '2.0.0', self.names)
        self.assertEqual(result.split('<!-- download-links:start -->')[0], self.text.split('<!-- download-links:start -->')[0])
        self.assertEqual(result.split('<!-- download-links:end -->')[1], self.text.split('<!-- download-links:end -->')[1])

    def test_incomplete_or_ambiguous_artifacts_are_rejected(self):
        for names in [self.names[:-1], self.names + ['duplicate.dmg']]:
            with self.assertRaises(ValueError):
                update_readme(self.text, '2.0.0', names)

if __name__ == '__main__':
    unittest.main()

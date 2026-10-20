import json
import tempfile
import unittest
from pathlib import Path
from publish_update import assemble, update_readme_downloads

class PublicReleaseTests(unittest.TestCase):
    def test_download_links_follow_release_without_rewriting_migration_notes(self):
        source = '''Installation instructions
<!-- download-links:start -->
https://github.com/onevalar/token-plan/releases/download/v1.0.6/TokenPlan-1.0.6.dmg
https://github.com/onevalar/token-plan/releases/download/v1.0.6/TokenPlan-Setup-1.0.6.exe
https://github.com/onevalar/token-plan/releases/download/v1.0.6/tokenplan_1.0.6_amd64.deb
<!-- download-links:end -->
Migration notes for 1.0.5 must remain unchanged.
'''
        updated = update_readme_downloads(source, '1.2.3')
        before, block = updated.split('<!-- download-links:start -->')
        block, after = block.split('<!-- download-links:end -->')
        self.assertIn('/v1.2.3/TokenPlan-1.2.3.dmg', block)
        self.assertIn('/v1.2.3/TokenPlan-Setup-1.2.3.exe', block)
        self.assertIn('/v1.2.3/tokenplan_1.2.3_amd64.deb', block)
        self.assertEqual(before, source.split('<!-- download-links:start -->')[0])
        self.assertEqual(after, source.split('<!-- download-links:end -->')[1])
        self.assertIn('1.0.5', after)
        self.assertEqual(update_readme_downloads(updated, '1.2.3'), updated)
        with self.assertRaises(ValueError): update_readme_downloads('no markers', '1.2.3')

    def test_source_repository_downloads_and_checksums(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            files = {'TokenPlan-1.0.6.dmg': b'DMG', 'TokenPlan-Setup-1.0.6.exe': b'MZ', 'tokenplan_1.0.6_amd64.deb': b'!<arch>\n'}
            for name, magic in files.items(): (folder/name).write_bytes(magic + b'x'*2048)
            size = (folder/'TokenPlan-1.0.6.dmg').stat().st_size
            (folder/'appcast.xml').write_text(f'''<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel><item><sparkle:version>106</sparkle:version><sparkle:shortVersionString>1.0.6</sparkle:shortVersionString><enclosure url="https://github.com/onevalar/token-plan/releases/download/v1.0.6/TokenPlan-1.0.6.dmg" length="{size}" sparkle:edSignature="test-signature"/></item></channel></rss>''')
            self.assertEqual(len(assemble('1.0.6',folder,106)),4)
            manifest=json.loads((folder/'latest.json').read_text())
            for asset in manifest['platforms'].values():
                self.assertTrue(asset['url'].startswith('https://github.com/onevalar/token-plan/releases/download/v1.0.6/'))
                self.assertEqual(len(asset['sha256']),64)
            self.assertEqual(len((folder/'SHA256SUMS.txt').read_text().splitlines()),3)
            (folder/'appcast.xml').write_text((folder/'appcast.xml').read_text().replace('onevalar/token-plan/releases/download/v','onevalar/apps/releases/download/tokenplan-v'))
            with self.assertRaises(ValueError): assemble('1.0.6',folder,106)

if __name__ == '__main__': unittest.main()

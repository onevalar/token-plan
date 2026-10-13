import json
import tempfile
import unittest
from pathlib import Path
from publish_update import assemble

class PublicReleaseTests(unittest.TestCase):
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

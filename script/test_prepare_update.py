import tempfile
import unittest
from pathlib import Path
from prepare_update import validate_feed


class UpdateFeedTests(unittest.TestCase):
    def test_rejects_unsigned_wrong_url_wrong_size_and_nonmonotonic_feed(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'TokenPlan-1.0.1.dmg'
            archive.write_bytes(b'archive')
            feed = Path(directory) / 'appcast.xml'
            item = '<item><sparkle:version>100</sparkle:version><sparkle:shortVersionString>1.0.1</sparkle:shortVersionString><enclosure url="https://example.com/TokenPlan-1.0.1.dmg" length="7" sparkle:edSignature="signature"/></item>'
            def write(contents):
                feed.write_text('<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel>' + contents + '</channel></rss>')
            args = (feed, archive, '1.0.1', 100, 'https://example.com/')
            write(item)
            self.assertEqual(validate_feed(*args), 'signature')
            for invalid in [item.replace(' sparkle:edSignature="signature"', ''), item.replace('length="7"', 'length="9"'), item.replace('https://example.com/', 'https://wrong.example/'), item + '<item><sparkle:version>101</sparkle:version></item>']:
                write(invalid)
                with self.assertRaises(ValueError):
                    validate_feed(*args)


if __name__ == '__main__':
    unittest.main()

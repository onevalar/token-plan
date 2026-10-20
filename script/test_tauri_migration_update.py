import json
from pathlib import Path
import plistlib
import unittest
from tauri_migration_metadata import validate_migration_key

ROOT = Path(__file__).resolve().parents[1]

class MigrationKeyTests(unittest.TestCase):
    def test_missing_key_is_rejected_even_with_matching_bundle_identity(self):
        with self.assertRaises(ValueError):
            validate_migration_key({'CFBundleIdentifier': 'com.onevalar.tokenplan'}, {'sparkle_public_key': 'old-key'})

    def test_unintended_key_rotation_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_migration_key({'SUPublicEDKey': 'different-key'}, {'sparkle_public_key': 'old-key'})

    def test_retained_key_is_accepted(self):
        validate_migration_key({'SUPublicEDKey': 'old-key'}, {'sparkle_public_key': 'old-key'})

    def test_production_template_keeps_the_native_public_key(self):
        info = plistlib.loads((ROOT/'platforms/tauri/src-tauri/production-info.plist').read_bytes())
        config = json.loads((ROOT/'release/update-config.json').read_text())
        validate_migration_key(info, config)

if __name__ == '__main__':
    unittest.main()

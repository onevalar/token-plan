import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));

test('macOS packages keep required permissions without cloud capabilities', () => {
  execFileSync('python3', ['-c', `
from pathlib import Path
import plistlib
root = Path(${JSON.stringify(root)})
paths = ['script/TokenPlan.release.entitlements.plist', 'script/TokenPlan.dev.entitlements.plist',
         'platforms/macos-store/generated/TokenPlan.entitlements', 'platforms/tauri/src-tauri/production-info.plist']
values = [plistlib.loads((root / path).read_bytes()) for path in paths]
for path, value in zip(paths, values):
    assert not any('icloud' in key.lower() or 'ubiquit' in key.lower() for key in value), path
assert values[1]['com.apple.security.get-task-allow'] is True
assert values[2]['com.apple.security.app-sandbox'] is True
assert values[2]['com.apple.security.network.client'] is True
assert values[3]['SUPublicEDKey']
`], {stdio: 'pipe'});
});

test('Developer ID selection works without a provisioning profile and rejects another team', () => {
  const result = execFileSync('python3', ['-c', `
import os, sys
from unittest.mock import patch
sys.path.insert(0, ${JSON.stringify(root + 'script')})
from signing_identity import find_signing
with patch.dict(os.environ, {'TOKENPLAN_APPLE_TEAM_ID': 'TESTTEAM'}):
    identity = 'A' * 40
    listing = f'1) {identity} "Developer ID Application: Example (TESTTEAM)"'
    with patch('signing_identity.subprocess.check_output', return_value=listing):
        assert find_signing() == identity
    with patch('signing_identity.subprocess.check_output', return_value=listing.replace('TESTTEAM', 'OTHERTEAM')):
        try:
            find_signing()
        except ValueError:
            pass
        else:
            raise AssertionError('Unrelated team was selected')
print('ok')
`], {encoding: 'utf8'});
  assert.equal(result.trim(), 'ok');
});

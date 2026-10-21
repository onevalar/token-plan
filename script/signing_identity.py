"""Select a valid Developer ID certificate for this app; no cloud profile is required."""
import os
import re
import subprocess


def find_signing():
    output = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'codesigning'], text=True)
    team = os.environ.get('TOKENPLAN_APPLE_TEAM_ID', 'H4982D35ZR')
    identities = re.findall(r'([A-F0-9]{40}) "Developer ID Application:[^"\n]+ \(' + re.escape(team) + r'\)"', output)
    if not identities:
        raise ValueError('未找到本项目团队有效的 Developer ID Application 签名证书。')
    return identities[0]

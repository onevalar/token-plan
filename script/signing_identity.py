"""Select an installed Developer ID profile which actually contains the signing certificate."""
import datetime as dt
import hashlib
from pathlib import Path
import plistlib
import re
import subprocess


def find_signing():
    output = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'codesigning'], text=True)
    identities = re.findall(r'([A-F0-9]{40}) "Developer ID Application:', output)
    roots = [Path.home() / 'Library/Developer/Xcode/UserData/Provisioning Profiles', Path.home() / 'Library/MobileDevice/Provisioning Profiles']
    matches = []
    for root in roots:
        for file in root.glob('*provision*'):
            decoded = subprocess.run(['security', 'cms', '-D', '-i', str(file)], capture_output=True)
            if decoded.returncode: continue
            profile = plistlib.loads(decoded.stdout)
            entitlements = profile.get('Entitlements', {})
            if not profile.get('ProvisionsAllDevices'): continue
            if not entitlements.get('com.apple.application-identifier', '').endswith('.com.onevalar.tokenplan'): continue
            if 'iCloud.com.onevalar.tokenplan' not in entitlements.get('com.apple.developer.icloud-container-identifiers', []): continue
            expiry = profile['ExpirationDate'].replace(tzinfo=dt.timezone.utc)
            if expiry <= dt.datetime.now(dt.timezone.utc): continue
            certificates = {hashlib.sha1(c).hexdigest().upper() for c in profile['DeveloperCertificates']}
            for identity in identities:
                if identity in certificates: matches.append((expiry, identity, str(file)))
    if not matches: raise ValueError('未找到证书匹配且有效的 Developer ID / iCloud 描述文件。')
    _, identity, profile = max(matches)
    return identity, profile

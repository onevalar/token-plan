#!/usr/bin/env python3
"""Give the iCloud helper a real bundle/profile; bare sidecars cannot claim it."""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
bins = root/'platforms/tauri/src-tauri/binaries'
app = bins/'TokenPlan Bridge.app'
if app.exists():
    shutil.rmtree(app)
contents = app/'Contents'
(contents/'MacOS').mkdir(parents=True)
(contents/'Resources').mkdir()
shutil.copy2(bins/'tokenplan-bridge-universal-apple-darwin', contents/'MacOS/tokenplan-bridge')
shutil.copy2(os.environ['TOKENPLAN_ICLOUD_PROFILE'], contents/'embedded.provisionprofile')
shutil.copytree(bins/'OpenUsage_OpenUsage.bundle', contents/'Resources/OpenUsage_OpenUsage.bundle')
# An escaping framework symlink fails strict bundle validation. Use a loader path instead.
subprocess.run(['install_name_tool','-add_rpath','@executable_path/../../../../Frameworks',
                str(contents/'MacOS/tokenplan-bridge')],check=True)
info = plistlib.loads((root/'platforms/tauri/src-tauri/production-info.plist').read_bytes())
info.update(CFBundleIdentifier='com.onevalar.tokenplan', CFBundleExecutable='tokenplan-bridge',
            CFBundleName='TokenPlan', CFBundlePackageType='APPL',
            CFBundleVersion='1', CFBundleShortVersionString=os.environ['TOKENPLAN_VERSION'], LSUIElement=True)
(contents/'Info.plist').write_bytes(plistlib.dumps(info))
subprocess.run(['codesign','--force','--options','runtime','--timestamp',
                '--entitlements',os.environ['TOKENPLAN_ICLOUD_ENTITLEMENTS'],
                '--sign',os.environ['APPLE_SIGNING_IDENTITY'],str(app)],check=True)

subprocess.run(['codesign','--verify','--strict',str(app)],check=True)

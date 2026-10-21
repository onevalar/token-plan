#!/usr/bin/env python3
"""Let an installed native Mac app upgrade once to the approved Tauri release."""
import html
import json
from tauri_migration_metadata import validate_migration_key
import os
from pathlib import Path
import plistlib
import re
import subprocess
import xml.etree.ElementTree as ET
from prepare_update import ROOT, NS, validate_feed

version = os.environ['TOKENPLAN_VERSION']
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise ValueError('Invalid approved version')
base = ROOT/'platforms/tauri/src-tauri/target/universal-apple-darwin/release/bundle'
app = base/'macos/TokenPlan.app'
info = plistlib.loads((app/'Contents/Info.plist').read_bytes())
if (info['CFBundleIdentifier'], info['CFBundleShortVersionString']) != ('com.onevalar.tokenplan', version):
    raise ValueError('Production app identity/version mismatch')
validate_migration_key(info, json.loads((ROOT/'release/update-config.json').read_text()))
helper = app/'Contents/Helpers/TokenPlan Bridge.app'
helper_info = plistlib.loads((helper/'Contents/Info.plist').read_bytes())
if helper_info.get('CFBundleIdentifier') != info['CFBundleIdentifier']:
    raise ValueError('Helper bundle identity mismatch')
if helper_info.get('LSBackgroundOnly') is not True or helper_info.get('CFBundleName') != 'TokenPlan Bridge':
    raise ValueError('Helper must be a distinctly named background-only component')
for target in [app, helper]:
    entitlements = subprocess.run(['codesign','-d','--entitlements',':-',str(target)], check=True, capture_output=True).stdout
    signed = plistlib.loads(entitlements) if entitlements.strip() else {}
    if any('icloud' in key.lower() or 'ubiquity' in key.lower() for key in signed):
        raise ValueError('Retired cloud entitlements must not be present')
subprocess.run(['codesign','--verify','--deep','--strict','-R=notarized',str(app)], check=True)
subprocess.run(['xcrun','stapler','validate',str(app)], check=True)
archives = list((base/'dmg').glob('*.dmg'))
if len(archives) != 1:
    raise ValueError('Expected one universal Mac installer')
archive = archives[0]
key = os.environ['SPARKLE_PRIVATE_KEY']
signer = ROOT/'.build/artifacts/sparkle/Sparkle/bin/sign_update'
result = subprocess.run([str(signer),'--ed-key-file','-',str(archive)], input=key, text=True, capture_output=True, check=True)
match = re.search(r'edSignature="([^"]+)"', result.stdout)
if not match:
    raise ValueError('Sparkle signature missing')
signature = match[1]
subprocess.run([str(signer),'--verify','--ed-key-file','-',str(archive),signature], input=key, text=True, check=True, capture_output=True)
tree = ET.parse(ROOT/'updates/appcast.xml'); channel = tree.getroot().find('channel')
if any(item.findtext(NS+'shortVersionString') == version for item in channel.findall('item')):
    raise ValueError('Version already announced')
prefix = f'https://github.com/onevalar/token-plan/releases/download/v{version}/'
item = ET.Element('item')
ET.SubElement(item,'title').text = f'TokenPlan {version}'
ET.SubElement(item,NS+'version').text = str(info['CFBundleVersion'])
ET.SubElement(item,NS+'shortVersionString').text = version
ET.SubElement(item,NS+'minimumSystemVersion').text = '15.0'
ET.SubElement(item,'description').text = '<pre>'+html.escape((ROOT/f'release/{version}.md').read_text())+'</pre>'
ET.SubElement(item,'enclosure',{'url':prefix+archive.name,'length':str(archive.stat().st_size),'type':'application/octet-stream',NS+'edSignature':signature})
channel.insert(0,item)
ET.register_namespace('sparkle',NS[1:-1])
output = ROOT/'platforms/tauri/transition/appcast.xml';output.parent.mkdir(exist_ok=True)
tree.write(output, encoding='utf-8',xml_declaration=True)
validate_feed(output,archive,version,str(info['CFBundleVersion']),prefix)

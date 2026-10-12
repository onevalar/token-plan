#!/usr/bin/env python3
"""Verify the cloud-built Mac app and sign its public Sparkle feed."""
import html
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from prepare_update import ROOT, NS, run, validate_feed

version = os.environ['TOKENPLAN_VERSION']
config = json.loads((ROOT/'release/update-config.json').read_text())
folder = ROOT/'dist/cloud'; folder.mkdir(parents=True, exist_ok=True)
app = ROOT/'dist/TokenPlan.app'; archive = ROOT/f'dist/TokenPlan-{version}.dmg'
info = plistlib.loads((app/'Contents/Info.plist').read_bytes())
if (info['CFBundleIdentifier'],info['CFBundleShortVersionString'],info['SUFeedURL'],info['SUPublicEDKey']) != ('com.onevalar.tokenplan',version,config['feed_url'],config['sparkle_public_key']):
    raise ValueError('Signed application configuration mismatch')
for target in [app,archive]: run('xcrun','stapler','validate',str(target))
run('codesign','--verify','--deep','--strict','-R=notarized',str(app))
shutil.copy2(archive,folder/archive.name)
run('curl','--fail','--silent','--show-error','--location',config['feed_url'],'--output',str(folder/'appcast.xml'))
# A verification run can rebuild an already-published version, but its feed is never published.
if os.environ.get('TOKENPLAN_VERIFY_ONLY') == 'true':
    tree = ET.parse(folder/'appcast.xml'); channel = tree.getroot().find('channel')
    for item in list(channel.findall('item')):
        if item.findtext(NS+'shortVersionString') == version: channel.remove(item)
    tree.write(folder/'appcast.xml', encoding='utf-8', xml_declaration=True)
(folder/f'{archive.stem}.html').write_text('<pre>'+html.escape((ROOT/f'release/{version}.md').read_text())+'</pre>')
bins = ROOT/'.build/artifacts/sparkle/Sparkle/bin'
prefix = f'https://github.com/onevalar/apps/releases/download/tokenplan-v{version}/'
subprocess.run([str(bins/'generate_appcast'),'--ed-key-file','-','--download-url-prefix',prefix,'--maximum-versions','0','--embed-release-notes',str(folder)],input=os.environ['SPARKLE_PRIVATE_KEY'],text=True,check=True)
signature=validate_feed(folder/'appcast.xml',folder/archive.name,version,info['CFBundleVersion'],prefix)
# Verify the generated archive signature before any publication.
subprocess.run([str(bins/'sign_update'),'--verify','--ed-key-file','-',str(folder/archive.name),signature],input=os.environ['SPARKLE_PRIVATE_KEY'],text=True,check=True)
(folder/'build.txt').write_text(str(info['CFBundleVersion']))

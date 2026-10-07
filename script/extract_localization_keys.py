#!/usr/bin/env python3
"""Lists every English UI string the app can show, i.e. the keys of Localization/translations.json.

Sources: tr()/trf() literals, SwiftUI literal-initialised controls (Text, Button, Label, Toggle, Picker,
Section, Menu, Link) and tooltip/notice helpers, the compiler's String(localized:) extraction when a
.stringsdata directory is given, plus Localization/extra_keys.txt for strings that are built at runtime
(provider notes, composed phrases, quick-link labels).

Usage: script/extract_localization_keys.py [stringsdata_dir]
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STR = r'"((?:[^"\\\n]|\\.)*)"'

def unescape(s):
    return (s.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")
             .replace('\\\\', '\\').replace('\\u{2019}', '’'))

def swift_files():
    for base in ('Sources/OpenUsage',):
        for d, _, fs in os.walk(os.path.join(ROOT, base)):
            for f in fs:
                if f.endswith('.swift'):
                    yield os.path.join(d, f)

PATTERNS = [
    re.compile(r'\btrf?\(' + STR),
    re.compile(r'\b(?:Text|Button|Label|Toggle|Picker|Section|Menu|Link)\(' + STR),
    re.compile(r'\b(?:hoverTooltip|inlineNotice|accessibilityLabel|row|section)\(' + STR),
    re.compile(r'\b(?:title|subtitle|message|buttonTitle|text|header):\s*' + STR),
    re.compile(r'\.confirmationDialog\(' + STR),
]

def keys():
    found = {}
    for p in swift_files():
        for line in open(p, encoding='utf-8'):
            code = line.split('//')[0] if 'http' not in line else line
            if re.search(r'AppLog\.|Logger\(|print\(', code):
                continue
            for pat in PATTERNS:
                for m in pat.finditer(code):
                    s = unescape(m.group(1))
                    if '\\(' in m.group(1):
                        continue  # interpolated: comes from the compiler pass / extra_keys.txt
                    if len(s) < 2 or not re.search(r'[A-Za-z]{2}', s):
                        continue
                    found.setdefault(s, os.path.relpath(p, ROOT))
    if len(sys.argv) > 1:
        for f in glob.glob(os.path.join(sys.argv[1], '*.stringsdata')):
            for entries in json.load(open(f)).get('tables', {}).values():
                for e in entries:
                    found.setdefault(e['key'], 'compiler')
    extra = os.path.join(ROOT, 'Localization', 'extra_keys.txt')
    if os.path.exists(extra):
        for line in open(extra, encoding='utf-8'):
            line = line.rstrip('\n')
            if line and not line.startswith('#'):
                found.setdefault(line.replace('\\n', '\n'), 'extra_keys.txt')
    return found

if __name__ == '__main__':
    for k, src in sorted(keys().items()):
        print(f'{src}\t{k!r}')

#!/usr/bin/env python3
"""Verify literal desktop UI keys against the same tables used by SwiftUI."""
import importlib.util
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
table = {}
for file in (root / 'script/l10n').glob('part*.py'):
    spec = importlib.util.spec_from_file_location(file.stem, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    table.update(module.T)
keys = set()
for file in (root / 'platforms/desktop/TokenPlan.Desktop').glob('*.cs'):
    text = file.read_text()
    keys.update(re.findall(r'L\.T\("([^"]+)"\)', text))
    keys.update(re.findall(r'(?:Section|UtilityBody|SettingRow|Confirm)\("([^"]+)"', text))
    keys.update(re.findall(r'Action\("([^"]+)"', text))
keys.update(line for line in (root / 'Localization/extra_keys.txt').read_text().splitlines() if line and not line.startswith('#'))
for file in (root / 'platforms/desktop/TokenPlan.Core').glob('*.cs'):
    text = file.read_text()
    keys.update(re.findall(r'Fail\("([^"]+)"', text))
    keys.update(re.findall(r'ProviderFailure\("([^"]+)"', text))
    keys.update(re.findall(r'Add\(windows, "([^"]+)"', text))
missing = sorted(key for key in keys if key not in table)
assert not missing, f'Missing desktop translations: {missing}'
assert all(len(table[key]) == 4 and all(table[key]) for key in keys)
print(f'PASS: {len(keys)} desktop and dynamic keys have all four translations plus English source')

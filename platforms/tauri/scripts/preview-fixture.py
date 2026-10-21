#!/usr/bin/python3
"""Disposable native UI fixture helper. No credentials, network or installed preferences."""
import json
import pathlib
import sys

state = json.loads(pathlib.Path(__file__).with_name('preview-state.json').read_text())
for line in sys.stdin:
    try:
        request = json.loads(line)
        method, value = request.get('method'), request.get('value')
        account = next((a for a in state['accounts'] if a['id'] == request.get('accountId')), None)
        if method in ('enabled', 'tray', 'note') and account:
            account[method] = value
        elif method == 'settings':
            state['settings'].update(value)
        elif method == 'metric' and account:
            next(m for m in account['metrics'] if m['id'] == request['metricId']).update(value)
        elif method == 'remove':
            state['accounts'] = [a for a in state['accounts'] if a['id'] != request['accountId']]
        elif method == 'move' and account:
            i = state['accounts'].index(account)
            j = i + value
            if 0 <= j < len(state['accounts']):
                state['accounts'][i], state['accounts'][j] = state['accounts'][j], state['accounts'][i]
        print(json.dumps({'ok': True, 'state': state}), flush=True)
    except Exception:
        print(json.dumps({'ok': False, 'error': 'request_failed'}), flush=True)

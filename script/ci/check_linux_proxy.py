#!/usr/bin/env python3
"""Test GNOME system proxy routing using only local servers and synthetic hosts."""
import http.server
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading

if '--isolated' not in sys.argv:
    with tempfile.TemporaryDirectory(prefix='tokenplan-proxy-') as home:
        env = dict(os.environ, HOME=home, XDG_CONFIG_HOME=home + '/config',
                   XDG_CACHE_HOME=home + '/cache', XDG_CURRENT_DESKTOP='GNOME')
        for key in list(env):
            if key.lower() in ('http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'):
                del env[key]
        subprocess.run(['dbus-run-session', '--', sys.executable, __file__, '--isolated',
                        str(Path(sys.argv[1]).resolve())], env=env, check=True)
    sys.exit(0)

assembly = sys.argv[-1]
events = []
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def do_GET(self):
        events.append((self.server.server_port, 'GET', self.path))
        body = b'proxy-ok'
        self.send_response(200)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_CONNECT(self):
        events.append((self.server.server_port, 'CONNECT', self.path))
        self.send_error(403, 'Synthetic tunnel proof')

servers = [http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler) for _ in range(2)]
for server in servers:
    threading.Thread(target=server.serve_forever, daemon=True).start()

def setting(schema, key, value):
    subprocess.run(['gsettings', 'set', schema, key, str(value)], check=True)

def probe(url, extra=None):
    result = subprocess.run(['dotnet', assembly, '--proxy-probe', url],
                            env=dict(os.environ, **(extra or {})), text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
    if result.returncode:
        raise AssertionError(f'Probe failed: {result.stderr}')
    return result.stdout

try:
    subprocess.run(['dbus-update-activation-environment', 'HOME', 'XDG_CONFIG_HOME',
                    'XDG_CACHE_HOME', 'XDG_CURRENT_DESKTOP'], check=True)
    for scheme in ('http', 'https'):
        setting('org.gnome.system.proxy.' + scheme, 'host', '127.0.0.1')
        setting('org.gnome.system.proxy.' + scheme, 'port', servers[0].server_port)
    setting('org.gnome.system.proxy', 'ignore-hosts', "['localhost', '127.0.0.0/8', '::1']")
    setting('org.gnome.system.proxy', 'mode', 'manual')
    assert 'proxy-ok' in probe('http://tokenplan-proxy-check.invalid/')
    assert events[-1] == (servers[0].server_port, 'GET', 'http://tokenplan-proxy-check.invalid/')
    assert 'proxy-tunnel-reached' in probe('https://tokenplan-proxy-check.invalid/')
    assert events[-1] == (servers[0].server_port, 'CONNECT', 'tokenplan-proxy-check.invalid:443')
    assert 'proxy-ok' in probe('http://tokenplan-proxy-check.invalid/',
                             {'http_proxy': f'http://127.0.0.1:{servers[1].server_port}'})
    assert events[-1][0] == servers[1].server_port
    assert 'proxy-ok' in probe(f'http://127.0.0.1:{servers[1].server_port}/')
    assert events[-1] == (servers[1].server_port, 'GET', '/')
    setting('org.gnome.system.proxy', 'mode', 'none')
    print('PASS: system HTTP, system HTTPS, environment override, loopback bypass')
finally:
    for server in servers:
        server.shutdown()
        server.server_close()

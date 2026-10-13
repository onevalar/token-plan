# Proxy

This page describes the **macOS** app’s dedicated proxy configuration. Windows/Linux
use their runtime/platform default proxy configuration; they do not read this file.
See [desktop network diagnostics](desktop-clients.md#claude--codex-renewal-and-connection-diagnostics).

On macOS, TokenPlan can route provider requests through an optional proxy.

- Supported: `socks5://`, `http://`, `https://`
- Config file: `~/.tokenplan/config.json`
- Default: off
- UI: none — file only

## Config file

```json
{
  "proxy": {
    "enabled": true,
    "url": "socks5://127.0.0.1:10808"
  }
}
```

Authenticated proxies put credentials in the URL:

```json
{
  "proxy": {
    "enabled": true,
    "url": "http://user:pass@proxy.example.com:8080"
  }
}
```

When the URL has no port, the scheme's default applies (socks5 → 1080, http → 80, https → 443).

## Behavior

- The config is read once at launch — **restart TokenPlan after changing the file**.
- `localhost`, `127.0.0.1`, and `::1` always bypass the proxy (the [local HTTP API](local-http-api.md) is unaffected).
- A missing, disabled, invalid, or unreadable config simply leaves proxying off.

## Scope

Applies to provider HTTP requests made by the app, including the daily [model pricing](pricing.md) refresh. It is not a system-wide proxy.

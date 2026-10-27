# Proxy

Linux provider requests use inherited HTTP/HTTPS/ALL_PROXY environment settings first
(lowercase variants also work). Without these variables, the backend reads the desktop
system proxy through GIO, including GNOME's system proxy switch. This applies regardless
of whether the app starts from the application list, compatibility launcher, or terminal.
The DEB requires `glib-networking` for GNOME proxy resolution. Restart TokenPlan after
changing system proxy settings. Localhost connections bypass this proxy.

Windows keeps .NET's environment/system proxy selection. macOS uses URLSession's
system settings unless the optional configuration below overrides them. Windows/Linux
do not read that macOS configuration file. Shell-only proxy settings are not automatically
imported into desktop launches. This policy covers provider/OAuth and pricing requests,
not the separate Tauri update downloader. No proxy addresses or passwords are logged.

Linux regression checks use isolated GNOME settings and local mock proxies on Ubuntu
22.04 and 24.04; they do not access real provider accounts.
[Run 40469324922](https://github.com/onevalar/token-plan/actions/runs/40469324922)
passed on both versions: 540 core checks plus native HTTP/HTTPS proxy routing,
environment override and localhost bypass (2026-10-27).
See [desktop network diagnostics](desktop-clients.md#claude--codex-renewal-and-connection-diagnostics).

On macOS, TokenPlan can route provider requests through an optional proxy.

- Supported: `socks5://`, `http://`, `https://`
- Config file: `~/.tokenplan/config.json`
- Default: system configuration
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
- A missing, disabled, invalid, or unreadable config leaves URLSession’s system configuration in effect.

## Scope

Applies to provider HTTP requests made by the app, including the daily [model pricing](pricing.md) refresh. It is not a system-wide proxy.

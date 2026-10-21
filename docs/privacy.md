# Privacy & Usage Data

TokenPlan has **no analytics, no daily-activity ping and no crash reporting**. It makes no network requests
except the ones listed below, and it has no account or telemetry identifier.

## Credentials stored locally

Windows/Linux also read supported local CLI credentials. Renewable independent Claude/Codex
logins are saved back after renewal; shared switcher snapshots remain read-only. API keys saved
on Windows use current-user DPAPI protection; Linux uses files restricted to the current user.
Network diagnostic logs exclude credentials and response bodies. See [desktop behavior](desktop-clients.md).

The following Keychain and local scan-cache details describe macOS.

### macOS credentials

TokenPlan primarily reads credentials that provider tools already keep on your Mac. When it writes a
user-supplied API key or saves a refreshed credential, the file is replaced atomically and restricted to
your macOS account (owner read and write only). Antigravity's short-lived refreshed-token cache is tied
to the current Keychain login using a one-way fingerprint; the refresh credential itself is not copied.
The cache is never used after logout, an account change, or while Keychain access is unavailable.

Claude Desktop access is strictly read-only. TokenPlan may ask macOS for permission to use the
`Claude Safe Storage` Keychain item so it can decrypt Desktop's current access token. It never uses
Desktop's rotating refresh token and never modifies Desktop's config, cookies, or Keychain data.

## Other network requests

Besides the provider API calls the vendor's own tools would make, TokenPlan fetches public [model price lists](pricing.md) about once an hour (from `raw.githubusercontent.com` and `models.dev`, including the project’s public pricing supplement). These are plain downloads of public data — they carry no usage, log, or account information, and no analytics setting is required. The spend tiles are computed from local CLI logs entirely on your Mac; no log data ever leaves it.

To avoid re-reading unchanged Claude, Codex, and pi logs after every relaunch, TokenPlan keeps their
parsed usage events in `~/Library/Application Support/TokenPlan/log-scan-cache/`. These records contain
the usage metadata needed for local totals, including any per-event cost already recorded by a provider,
but not raw JSONL lines or conversation text. They are private to your macOS account and are never sent
to a provider or cloud storage. Old source-file records are dropped as the scan window advances, and
identity caches that have not been used for 35 days are removed. TokenPlan's pricing engine runs after
the cache is read, so its computed aggregates and totals are not persisted in this cache.

History is stored locally only. TokenPlan does not upload or synchronize usage history
between devices. Removing synchronization does not erase existing local records or
previously uploaded documents from older versions.

Application update checks and installer downloads use this project’s public GitHub release
metadata and assets. They do not upload usage history or provider credentials.

## The local HTTP API

The optional loopback API (`127.0.0.1:6757`) is reachable only from this Mac and rejects requests that come
from a web page (it sends no CORS headers and refuses an `Origin` header or a non-loopback `Host`). See
[Local HTTP API](local-http-api.md#browser-access-and-privacy).

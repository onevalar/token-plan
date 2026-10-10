# Amp

Reads the Amp CLI's current subscription quotas and, when reported, individual credit balance. TokenPlan uses your existing Amp login; there is no separate sign-in or CLI upgrade.

## What it tracks

| Metric | Meaning | Default placement |
|---|---|---|
| Agent Usage | Agent subscription quota used or remaining | Visible, enabled, starred for the menu bar |
| Orb Usage | Orb subscription quota used or remaining | Visible, enabled, starred for the menu bar |
| Balance | Individual credits actually reported by the CLI | Details, enabled, not starred |

The rows are declared in that order. Amp appears after Claude, Codex and Cursor, in the alphabetical service list. Use **Show Usage As** to choose Used or Left; the CLI's remaining percentages are converted once, not interpreted as usage.

TokenPlan runs `amp usage` off the interface thread with a 20-second timeout. It supports both percentage-first and allowance-first subscription output. Agent dollars and Orb hours are quota allowances, not individual credit balances. If a balance is not reported, it stays unavailable rather than becoming zero. Balance-only output remains visible with an explanation that subscription quotas were not reported.

Only an explicit reset timestamp creates a countdown. A date-only billing period or wording such as “in 21 days” does not provide an exact reset time, so TokenPlan does not invent one. There is no imported Amp history or forecast.

Amp's Agent and Orb tracks align within its own overview card. When neither has a reported countdown, there is no empty deadline column. Balance is shown in a separate **Individual Credits** band with cents, rather than another subscription percentage. It is independent of Used/Left; an unreported balance remains unavailable, and a reported zero is shown as `$0.00`. Existing visibility and menu-bar selections are preserved.

## Where the login comes from

- The CLI is found on your login-shell PATH or in standard Amp/Homebrew locations.
- `AMP_API_KEY`, when present, takes precedence over the saved login.
- Otherwise, the local-only detection and refresh use the same read-only loader for `~/.local/share/amp/secrets.json` (or the `XDG_DATA_HOME` location).
- The server comes from `AMP_URL`, then `amp.url` in `~/.config/amp/settings.json` (or `XDG_CONFIG_HOME`), then the public Amp server. Root addresses with and without a trailing slash are equivalent; another server's login is not used.

Finding an executable alone does not enable Amp. TokenPlan never writes the login file, switches accounts, invokes login, or needs `amp account list`; older CLI versions without that command are supported. Raw CLI output and credentials are not written to TokenPlan's logs.

## Troubleshooting

- **CLI not found** — install Amp and sign in with `amp login`, then restart TokenPlan to detect it.
- **Not logged in** — run `amp login` for the server you use, then refresh.
- **Saved login unreadable** — check file permissions or sign in again; TokenPlan will not silently substitute another login.
- **Usage failed or timed out** — run `amp usage` in Terminal to check the connection, then refresh.
- **Usage could not be read** — check the CLI's output or update it yourself. TokenPlan does not automatically upgrade Amp.

## Reference and license

The subscription-output patterns were adapted from [Rashun](https://github.com/AlexanderHeffernan/Rashun) under its MIT license. The permission notice and Alexander Heffernan attribution ship with TokenPlan's license document. Rashun's renewal estimates, updater, history inference and sync implementation are not used.

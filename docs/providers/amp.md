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

## Claude subscriptions used inside Amp

Claude account quota percentages include usage charged to that same Claude subscription. Daily token and estimated-cost history is separate: TokenPlan currently reads Claude session logs, not Amp conversation exports.

An October 12, 2026 check of a Claude Code-mode conversation running in an Amp Orb found no token or model-usage fields in `amp threads export`. The time-filtered `amp threads usage --details` response reported Orb runtime charges and zero tokens despite conversation activity. Do not import those zeros as measured Claude usage or classify Orb charges as Claude inference cost.

The Orb's underlying `~/.claude/projects/**/*.jsonl` logs do contain measured Claude usage, including subagents. A signed-in Amp browser additionally requires passkey verification before its Files and Terminal panels can access them. The CLI conversation export is not a substitute for these logs.

`script/amp_claude_history.py` provides an explicit, repeatable transfer:

1. Run `python3 amp_claude_history.py export tokenplan-amp-usage.jsonl` on the executor. It exports only IDs, timestamps, models and token counts, never conversation text or credentials.
2. Download the export through Amp's private Files panel.
3. On the TokenPlan machine, run `python3 script/amp_claude_history.py import <export.jsonl> --thread <T-UUID> --account <Claude-account-UUID> --organization <Claude-organization-UUID>`. Use the account whose subscription was used in that Orb; account identifiers are required rather than inferred from the model name. `--claude-home` supports a custom Claude configuration directory.
4. Refresh Claude in TokenPlan. Imports are stored under that Claude home's `projects/tokenplan-amp/`, with account ownership headers. The existing native scanner merges and deduplicates them with local logs. Reimporting the same source is idempotent; a partial export cannot erase earlier entries. Moving a source to another account is rejected.

**This is not automatic cloud synchronization.** Later Orb usage requires another export/import. The macOS account attribution and parser have been validated; Windows/Linux automatic remote collection has not been implemented. An Orb whose logs were deleted cannot be recovered this way. Token-derived costs are API-price estimates, not additional subscription charges. Temporary exports should be moved out of the project after downloading so they cannot accidentally be committed.

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

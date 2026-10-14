# Codex

Tracks your ChatGPT/Codex subscription limits using the login from the Codex CLI.

## What it tracks

| Metric | Meaning |
|---|---|
| Session | 5-hour rolling window usage |
| Weekly | 7-day window usage |
| Spark / Spark Weekly | GPT-5.3-Codex-Spark model limits — a 5-hour and a weekly window. Shown only when your account has the limit (otherwise "No data"), and tucked below the "show more" caret by default |
| Rate Limit Resets | Available reset-credit count and reported expiries in subscription details; never an overview row |
| Extra Usage | Flex credits, shown verbatim as dollars + credits (e.g. `$31.84 · 796 credits`) |
| Today / Yesterday / Last 30 Days | Local spend, as cost, tokens, or both (see below) |

When Codex reports your plan name, TokenPlan shows it beside the provider name.
Pro plans use the current names **Pro 100**, **Pro 200**, and **Pro 500** instead of the older usage multipliers.

| Usage API plan | Display name |
|---|---|
| `prolite` | Pro 100 |
| `pro` | Pro 200 |
| `promax` | Pro 500 |
| `self_serve_business_prolite` | Business Premium |

The Pro names match [OpenAI's published plan names](https://learn.chatgpt.com/docs/dots#access).
The Pro identifier mappings were verified against OpenAI's ChatGPT desktop app version 26.928.21956 (build 12404).
Other Business/team plans keep their existing names; unfamiliar plan identifiers keep a readable name.
If Codex reports only a 7-day window, it maps to Weekly without inventing a 5-hour Session meter.

## Where credentials come from

Sign in once with the Codex CLI (`codex`); TokenPlan reads the same auth files (`$CODEX_HOME` respected) with a Keychain fallback. Tokens refresh automatically and rotate back into the same auth file or Keychain item they came from.

The Keychain fallback selects the Codex CLI item for `$CODEX_HOME` (or `~/.codex` when unset), including when that home is a symlink. Other Codex homes can have separate Keychain logins; TokenPlan does not pick an unrelated item just because it has the same service name.

### Codex Swap accounts

TokenPlan shows accounts saved by [Codex Swap (`xswap`)](https://github.com/maddada/codex-swap).
Each account and workspace gets its own card, labeled with its alias and email. Cards and pins stay
with the same account when you switch the default login. Restart TokenPlan after adding, removing,
or renaming an account. Custom locations set with `XSWAP_HOME` or `XDG_DATA_HOME` are supported.
Upgrading from a version without Swap support refreshes saved shell settings before account discovery.

- Matching file, Keychain, and Swap logins share a card. If one expires, TokenPlan tries another
  login for that account. Keychain-only accounts and Swap custom main homes are included, even
  when they have no saved Swap slot. Keychain reads run in the background.
- TokenPlan only reads Swap credentials; Codex handles renewing them. If a card needs a login,
  run `xswap run <account>` or `xswap login <account>`, then refresh TokenPlan.
- Concurrent `xswap run` sessions are supported. Close Codex sessions before using `xswap switch`
  to change the global login, as required by Swap.

### Other Codex homes and pi logins

TokenPlan also finds signed-in accounts in `CODEX_HOME`, `~/.codex`, `~/.config/codex`, sibling
`~/.codex-*` folders, sibling `~/.config/codex-*` folders, and pi's `auth.json` (`openai-codex`,
`openai-codex-2`, …). Logins are matched by ChatGPT workspace and email, so two users in the same
workspace remain separate cards, and the same account signed in through several homes and pi shares
one card, named by its xswap alias, then its pi label, then its workspace and email. A login held only
in the Keychain counts as an account too. A single account keeps the plain Codex card, which still
uses a login found only in a sibling home or in pi, and counts that home's session logs in its
spend tiles. Restart TokenPlan after adding or removing a login.

A card renews the token in its own Codex homes the way the plain Codex card does, so an account you
only use through a second home keeps working between sessions; the plain card does the same for a
lone sibling home. Logins that belong to xswap, pi, or the Keychain are read as they are: TokenPlan
never rotates those tokens, even when `CODEX_HOME` is a link to a home xswap manages or points at an
xswap slot that names no account. Every source is re-read on each refresh, a login another tool
changed mid-refresh is left untouched (a renewed token that could not be saved still serves that
refresh), and each card tries every matching login. If a read-only login has expired, use that
account once in xswap or pi so the tool renews its own token, then refresh TokenPlan.

### Whose spending goes on which card

Codex session logs don't say which account ran them, so TokenPlan goes by folder: each Codex home's
spending goes to the account signed in to that home right now.

- An `xswap run` account home counts for its own account.
- The main home (`~/.codex` or `$CODEX_HOME`) counts for whoever is signed in there now. After
  `xswap switch`, that folder's whole history moves to the new account, and the old account's card
  stops showing it on the next refresh.
- Swap's **share history** option makes an account home reuse the main home's session folder instead
  of keeping its own. Those sessions live in one place, so they count once, for the main home's account.
  Share history is not fully supported: after `xswap switch`, the old account's card can keep showing
  the spending it had before the switch, so the same spend appears on two cards.
- A home whose login names no account counts for the account xswap registered there, or for the
  Keychain login in the main home. Without either, it counts for no card.
- pi spending goes to the account in pi's `openai-codex` login; after changing that login, restart
  TokenPlan. OpenCode spending goes to the account signed in to the main home.

With one account, all of this lands on its single card. Live limits and reset-credit actions work on
every card regardless.

## The spend tiles

Copied sessions count once per card; a session copied into two accounts' folders counts on both. Synced history must match the card's account and workspace.

Codex has no manual fallback pricing setting. Usage without a known model price is excluded from cost estimates and reported as unpriced; subscription quota readings are unaffected.

Today / Yesterday / Last 30 Days are computed **locally**: TokenPlan reads the Codex CLI's session rollouts under `~/.codex/sessions/` and `archived_sessions/` (or `$CODEX_HOME`) itself — no external tools needed. Symlinks are followed, so a Codex home linked into a synced location (say, a Dropbox folder) is read all the same. Codex usage from the [pi](https://github.com/earendil-works/pi) coding agent counts too: TokenPlan reads pi's session logs under `~/.pi/agent/sessions/` (or `$PI_CODING_AGENT_SESSION_DIR`) and folds any Codex usage there into the same tiles and trend. The same applies when OpenCode uses its built-in ChatGPT Pro/Plus OAuth login: TokenPlan reads the `openai` rows from OpenCode's local database — including OpenCode 2's newer logs — and attributes them to Codex. Newer OpenCode 2 logs only count from after that ChatGPT login; older OpenCode logs still count as before. OpenCode keeps a separate database and login per release channel (stable and preview), and each one is judged by its own login — a preview channel on ChatGPT still counts when the stable channel uses an API key, and vice versa. OpenCode API-key traffic is not included. Days are grouped in your Mac's local time zone, so they line up with your own calendar. Each period is one tile showing cost and tokens together (`$4.08 · 1.2M tokens`); a day with no usage reads **No data** rather than a misleading `$0.00 · 0 tokens` — the same as every other spend-tracking provider. The live Session and Weekly meters are unaffected. The dollars are estimated from token counts at API rates (that's the ⓘ) using the shared [model pricing](../pricing.md); sessions that ran on the fast/priority or Ultrafast service tier — as recorded in each session's own log — use the corresponding rates for exactly those turns. Older logs without tier metadata, and everything else, price at standard rates; the current `config.toml` setting is not consulted, so flipping the tier never reprices past days. Auto-review usage keeps its `codex-auto-review` name in the model breakdown, while its cost uses the dated model fallback available for that event. Luna Reserve usage keeps its `gpt-reserve` name the same way, priced at GPT-5.6 Luna rates. The token counts themselves are measured. Subagent and forked sessions copy their parent session's token history into their own log; TokenPlan recognizes those copies and counts each token once, no matter how many subagents a session spawns. No log data leaves your Mac.

Large session files are read in small chunks instead of being loaded into memory. Unusually large
individual records are skipped and logged; local spend can be incomplete if a skipped record contained usage.

For supported GPT-5.4, GPT-5.5, GPT-5.6, and GPT-6 models, requests above 272k input tokens use OpenAI's long-context rates for the whole request. These Codex-specific request rules apply consistently to native Codex logs and zero-cost Codex OAuth usage imported from pi or OpenCode. Daybreak Blue usage is priced as GPT-5.6 Sol, matching OpenAI's published alias and Daybreak pricing. Cached input uses the published cache-read discount when the pricing source provides one; otherwise it is estimated at the full input rate. Fast/priority estimates use each model's published Codex multiplier (for example, GPT-5.5 uses 2.5×); Ultrafast is 6× for GPT-6 Astra and uses the Fast multiplier for other models. Model names ending in `-fast` are normalized to their unscaled base rate before that multiplier is applied once.

## Troubleshooting

- **"Not logged in"** — run `codex` and sign in, then refresh.
- **A Codex Swap account needs login**: run `xswap login <account>` for the named account, then refresh.
- **A pi-only account needs login**: use that account in pi to renew its token, then refresh TokenPlan.
- **API-key-only setups** can't read subscription usage — sign in with your ChatGPT account instead.
- **Spend tiles show "No data"** — TokenPlan found no qualifying Codex usage in Codex, pi, or OpenCode logs from the last 30 days. If your Codex home lives somewhere custom, set `CODEX_HOME` so both the Codex CLI and TokenPlan look in the same place.
- **OpenCode usage is missing** — OpenCode must currently have an `openai` OAuth credential in
  `auth.json` or, on OpenCode 2, in that channel's `credential` table. An OpenAI API key is
  deliberately excluded from Codex subscription totals. Logging out of OpenCode 2 stops attribution
  for that channel even though the older `auth.json` entry stays on disk.

## Under the hood

`GET https://chatgpt.com/backend-api/wham/usage` with the Codex OAuth token; refresh via `auth.openai.com`. A 401/403 triggers one token refresh and retry. Session and Weekly are classified by each usage window's duration rather than by its primary/secondary slot. This matters when Codex temporarily removes one limit and moves the remaining weekly window into the primary slot. Payloads without a recognized duration retain the primary-as-Session and secondary-as-Weekly compatibility fallback; response headers fill percentages missing from the corresponding window.

For Codex Swap cards, a 401/403 instead tries the next matching access token without refreshing tokens.
Credential changes while a request is pending discard that result and retry from current matching
logins. Reset-credit dates are also bound to their card's account, including after a default switch.

Spark and Spark Weekly come from the same response's `additional_rate_limits` array — model-specific limits that reuse the duration-based Session/Weekly classification. TokenPlan surfaces the entry whose name identifies GPT-5.3-Codex-Spark as those two meters; accounts without the limit simply omit the entry, so the rows read "No data". Other model limits in that array aren't shown.

TokenPlan preserves Codex's reported `used_percent` verbatim. If the API reports 1% used for an untouched window, the app shows 99% left; if it reports 0%, the app shows 100% left. Codex rows use the normal reset label rather than inferring a special "Not started" state. Burn-rate pacing still waits until enough of the window has elapsed — and until something has actually been used — to make a useful projection.

Reset credits do not occupy an overview row. Subscription details show **Reset Credits**, the count, and the full timeline directly, soonest-first: a row number and numeric local expiry (`2026-10-23 11:35`). TokenPlan makes a best-effort `GET https://chatgpt.com/backend-api/wham/rate-limit-reset-credits` call for these dates. With no credits, the count reads `0` and details say `You have no rate limit resets`. If the dedicated call fails, the count falls back to the usage body (`rate_limit_reset_credits.available_count`); unavailable per-credit dates are stated, never invented. You can explicitly hide the metric in subscription configuration.

The expiry list is read-only. TokenPlan does not expose a redemption button in subscription details; use the provider's own tools to spend credits.

### Slow Local History

Live quota refreshes wait at most five seconds for local token-history processing. If a large archive
takes longer, quota still updates and the card shows a history-updating notice. One scan per provider
continues in the background; a later refresh collects its result. Previously loaded history is retained
while waiting. Pending history does not show a premature "No usage data" badge.
A fresh launch may show quota before history appears. Network and authentication
failures still use the normal stale-data handling.

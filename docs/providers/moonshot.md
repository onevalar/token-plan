# Kimi

Tracks your [Kimi / Moonshot AI 月之暗面](https://platform.kimi.com) open-platform API balance.

## What it tracks

| Metric | Meaning |
|---|---|
| Balance | Available balance (cash + vouchers) — ¥ on the mainland platform, $ on the global one |
| Cash | Cash balance; can be negative when in arrears (on demand) |
| Vouchers | Voucher balance (on demand) |

## Where credentials come from

Kimi has no companion app that TokenPlan can reuse a credential from, so you supply an API key. TokenPlan
reads it from the first place it finds one:

1. `~/.config/tokenplan/moonshot.json` — `{"apiKey":"…"}` (the file **Customize → Kimi → API Key** writes to)
2. The `MOONSHOT_API_KEY` or `KIMI_API_KEY` environment variable

Nothing leaves your Mac except the single request below, sent to `api.moonshot.cn` (and, if that rejects the key, `api.moonshot.ai`).

## Setup

1. Create an API key at [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys).
2. Paste it into **Customize → Kimi → API Key**, **or** export it (`export MOONSHOT_API_KEY="YOUR_KEY"`).
3. Kimi appears on the dashboard on the next refresh (turn it on in Customize if it isn't already).

## Under the hood

`GET https://api.moonshot.cn/v1/users/me/balance` (mainland, CNY), falling back to `https://api.moonshot.ai/v1/users/me/balance` (global, USD) on a 401/403. The body is `{"data":{"available_balance","voucher_balance","cash_balance"}}`.

This tracks the **API balance**, not the Kimi membership / Kimi Code quota, which has no documented API.

## Errors

| Message | Meaning |
|---|---|
| No Kimi API key… | No key was found in the file or environment. |
| Kimi API key invalid… | The service answered 401/403 — the key is wrong, revoked, or from another region. |
| Couldn't reach Kimi… | Network failure; the last good values stay on screen. |
| Kimi usage data unavailable… | The response had an unexpected shape. Please report it with the log (Settings → Advanced). |

> These endpoints were written from the provider's public documentation and have not been exercised against every account type. If a card shows an unexpected value, check the log and open an issue.

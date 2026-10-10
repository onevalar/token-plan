# Kimi

Tracks your [Kimi / Moonshot AI 月之暗面](https://platform.kimi.com) open-platform API balance.

## What it tracks

| Metric | Meaning |
|---|---|
| Balance | Available balance (cash + vouchers) — ¥ on the mainland platform, $ on the global one |
| Cash | Cash balance; can be negative when in arrears (in subscription details by default) |
| Vouchers | Voucher balance (in subscription details by default) |

## Where credentials come from

Kimi has no companion app that TokenPlan can reuse a credential from, so you supply an API key. TokenPlan
reads it from the first place it finds one:

1. `~/.config/tokenplan/moonshot.json` — `{"apiKey":"…"}` (the file **Services & Subscriptions → Kimi → Settings → API Key** writes to)
2. The `MOONSHOT_API_KEY` or `KIMI_API_KEY` environment variable

Nothing leaves your Mac except the single request below, sent to `api.moonshot.cn` (and, if that rejects the key, `api.moonshot.ai`).

## Setup

1. Create an API key at [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys).
2. Paste it into **Services & Subscriptions → Kimi → Settings → API Key**, **or** export it (`export MOONSHOT_API_KEY="YOUR_KEY"`).
3. Kimi appears on the dashboard on the next refresh (turn it on in Services & Subscriptions if it isn't already).

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

Only an authentication rejection triggers the regional fallback. A timeout, rate limit, server error, or malformed balance response retains its original error. Balance numbers must be finite. Response fields and regional currencies follow the [official balance API](https://platform.kimi.ai/docs/api/balance).

# DeepSeek

Tracks your [DeepSeek 深度求索](https://platform.deepseek.com) API account balance.

## What it tracks

| Metric | Meaning |
|---|---|
| Balance | Total balance — topped-up plus granted (¥ for CNY accounts, $ for USD) |
| Topped Up | The part you paid for (in subscription details by default) |
| Granted | Unexpired promotional credit (in subscription details by default) |

## Where credentials come from

DeepSeek has no companion app that TokenPlan can reuse a credential from, so you supply an API key. TokenPlan
reads it from the first place it finds one:

1. `~/.config/tokenplan/deepseek.json` — `{"apiKey":"…"}` (the file **Subscription Services → DeepSeek → Settings → API Key** writes to)
2. The `DEEPSEEK_API_KEY` environment variable

Nothing leaves your Mac except the single request below, sent to `api.deepseek.com`.

## Setup

1. Create an API key at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys).
2. Paste it into **Subscription Services → DeepSeek → Settings → API Key**, **or** export it (`export DEEPSEEK_API_KEY="YOUR_KEY"`).
3. DeepSeek appears on the dashboard on the next refresh (turn it on in Subscription Services if it isn't already).

## Under the hood

`GET https://api.deepseek.com/user/balance` with `Authorization: Bearer <key>`. The response lists `balance_infos` with `currency` (`CNY` or `USD`) and decimal-string `total_balance`, `granted_balance`, `topped_up_balance`.

## Errors

| Message | Meaning |
|---|---|
| No DeepSeek API key… | No key was found in the file or environment. |
| DeepSeek API key invalid… | The service answered 401/403 — the key is wrong, revoked, or from another region. |
| Couldn't reach DeepSeek… | Network failure; the last good values stay on screen. |
| DeepSeek usage data unavailable… | The response had an unexpected shape. Please report it with the log (Settings → Advanced). |

> These endpoints were written from the provider's public documentation and have not been exercised against every account type. If a card shows an unexpected value, check the log and open an issue.

The whale mark is extracted from [DeepSeek’s official logo](https://github.com/deepseek-ai/DeepSeek-LLM/blob/main/images/logo.svg). Regression coverage checks missing keys, saved-key authorization, successful balance mapping, rejected keys and malformed responses using an in-memory credential store and mocked HTTP responses. These tests do not substitute for a live-account check.

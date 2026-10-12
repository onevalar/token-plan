# SiliconFlow

Tracks your [SiliconFlow 硅基流动](https://cloud.siliconflow.cn) account balance (CNY).

## What it tracks

| Metric | Meaning |
|---|---|
| Balance | Total balance (¥) |
| Topped Up | Balance you topped up (on demand) |
| Gift | Gifted / promotional balance (on demand) |

## Where credentials come from

SiliconFlow has no companion app that TokenPlan can reuse a credential from, so you supply an API key. TokenPlan
reads it from the first place it finds one:

1. `~/.config/tokenplan/siliconflow.json` — `{"apiKey":"…"}` (the file **Subscription Services → SiliconFlow → Settings → API Key** writes to)
2. The `SILICONFLOW_API_KEY` environment variable

Nothing leaves your Mac except the single request below, sent to `api.siliconflow.cn`.

## Setup

1. Create an API key at [cloud.siliconflow.cn/account/ak](https://cloud.siliconflow.cn/account/ak).
2. Paste it into **Subscription Services → SiliconFlow → Settings → API Key**, **or** export it (`export SILICONFLOW_API_KEY="YOUR_KEY"`).
3. SiliconFlow appears on the dashboard on the next refresh (turn it on in Subscription Services if it isn't already).

## Under the hood

`GET https://api.siliconflow.cn/v1/user/info` with a bearer key. Only `totalBalance`, `chargeBalance` and `balance` are read; the profile fields (name, email) in the same response are ignored and never stored or logged.

## Errors

| Message | Meaning |
|---|---|
| No SiliconFlow API key… | No key was found in the file or environment. |
| SiliconFlow API key invalid… | The service answered 401/403 — the key is wrong, revoked, or from another region. |
| Couldn't reach SiliconFlow… | Network failure; the last good values stay on screen. |
| SiliconFlow usage data unavailable… | The response had an unexpected shape. Please report it with the log (Settings → Advanced). |

> These endpoints were written from the provider's public documentation and have not been exercised against every account type. If a card shows an unexpected value, check the log and open an issue.

# MiniMax

Tracks your [MiniMax](https://platform.minimaxi.com) Coding Plan / Token Plan quota.

## What it tracks

| Metric | Meaning |
|---|---|
| Session | Share of the rolling 5-hour window used, with its reset time |
| Weekly | Share of the weekly cap used, when the plan reports one |

## Where credentials come from

MiniMax has no companion app that TokenPlan can reuse a credential from, so you supply an API key. TokenPlan
reads it from the first place it finds one:

1. `~/.config/tokenplan/minimax.json` — `{"apiKey":"…"}` (the file **Customize → MiniMax → API Key** writes to)
2. The `MINIMAX_API_KEY` environment variable

Nothing leaves your Mac except the single request below, sent to `www.minimaxi.com` (mainland) or `www.minimax.io` (global).

## Setup

1. Create an API key at [platform.minimaxi.com](https://platform.minimaxi.com/user-center/basic-information/interface-key) — use the **Coding Plan** key.
2. Paste it into **Customize → MiniMax → API Key**, **or** export it (`export MINIMAX_API_KEY="YOUR_KEY"`).
3. MiniMax appears on the dashboard on the next refresh (turn it on in Customize if it isn't already).

## Under the hood

Mainland: `GET https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`. Global: `GET https://www.minimax.io/v1/token_plan/remains`. A key rejected by one is retried on the other. In each `model_remains` entry `current_interval_total_count` is the window quota and `current_interval_usage_count` is what is **remaining**; the model with the largest quota feeds the meters.

## Errors

| Message | Meaning |
|---|---|
| No MiniMax API key… | No key was found in the file or environment. |
| MiniMax API key invalid… | The service answered 401/403 — the key is wrong, revoked, or from another region. |
| Couldn't reach MiniMax… | Network failure; the last good values stay on screen. |
| MiniMax usage data unavailable… | The response had an unexpected shape. Please report it with the log (Settings → Advanced). |

> These endpoints were written from the provider's public documentation and have not been exercised against every account type. If a card shows an unexpected value, check the log and open an issue.

# Refreshing & Caching

## When data updates

- All enabled providers refresh together: once at launch, then every refresh interval — 5 minutes by default, adjustable from 1 to 60 minutes in **Settings → General → Refresh Interval** (a change takes effect immediately). Opening the popover does not start a second automatic pass. Providers fetch in parallel, so fast cards update without waiting for a slow one. The batch itself still finishes only after every provider returns; notifications and the next wait begin after that point.
- Turning a provider on (yourself in Customize, or automatically by first-launch/new-provider detection) fetches it promptly instead of waiting out the interval — even when the change lands in the middle of a refresh that's already running.
- The Dashboard and Settings footer shows `Next refresh in Nm`. **Clicking it (or pressing ⌘R while that footer is present)** refreshes immediately, skipping the cache.
- The one-shot `tokenplan` command reuses this same persisted cache for one refresh interval, refreshes missing or stale entries without starting the app, and exits. `tokenplan --force` runs the same forced provider refresh as ⌘R regardless of cache age.
- While a provider is fetching, a small spinner appears next to its name (and one shows in the footer beside the countdown), so you can tell a refresh is in flight rather than wondering if the numbers are stale.

## Desktop app (Tauri) refresh behavior

The Windows, Linux and Mac desktop interface talks to a helper that fetches the numbers. Its rules are simpler than the classic app's, so the Refresh button can be trusted:

- **Pressing Refresh always fetches.** The button, ⌘R and a card's Try Again ask the helper to bypass every reuse rule, so the numbers you see afterwards come from the provider, not from a snapshot. A provider that is in a rate-limit cooldown is still left alone.
- **The first refresh after launch always fetches**, even if the previous session fetched seconds earlier. Nothing fetched by an earlier launch counts as fresh.
- **The background timer and the launch refresh reuse a snapshot fetched in the last 20 seconds**, so two requests that land together do not hit the provider twice. This window is fixed and does not depend on the refresh interval, so a timer tick is never skipped because of an earlier manual refresh.
- The refresh button says **Refreshed** only when at least one account actually fetched new data. If nothing was fetched it says **Not refreshed**.

## Caching

Snapshots are cached on disk and load instantly at launch, so you see your last-known values immediately instead of placeholders — even before the first fetch finishes.

Claude and Codex cache entries also remember which account produced them. If you swap the account
signed in at the provider's default home between launches, the previous account's cached values are
discarded at the next launch (the card starts empty and fills on its first fetch) instead of briefly
showing the old account's limits and plan under the new login.

A cached value only counts as *fresh* (skip-a-refresh fresh) when it was fetched **during the current running session**. So a value cached in an earlier session always re-fetches on the first pass after launch — you still see it instantly, but the app never waits out the old interval before getting live numbers. This matters after an update: a new app version refreshes right away instead of showing the previous version's data until its interval lapses. Within a session, a freshly fetched value then counts as fresh for one refresh interval before the next pass re-fetches it.

Claude, Codex, and pi spend history has a separate local-log parse cache under
`~/Library/Application Support/TokenPlan/log-scan-cache/`. It stores parsed usage events before TokenPlan
applies model-rate estimates, so pricing updates take effect without re-reading unchanged JSONL. On
relaunch, an entry is reused only when its path, size, modification time, and parser version still match.
Same-home cards share parsed data, and changing one source file rewrites only that file's record. Old files
leave the cache as the history window advances, and identities unused for 35 days are removed. App writes
are debounced until after refresh; the one-shot CLI drains pending writes before it exits.

## When a fetch fails

A failed refresh **never wipes your data**: the last good values stay on screen, and a small warning triangle appears next to the provider's name, and the same message is written inside the provider's card (e.g. "Not logged in. Run `codex` to authenticate.") so you don't have to hover to learn what's wrong. The error clears on the next successful refresh.

A provider that stops responding altogether is given up on after two minutes. Its spinner stops, the
warning triangle reads "Refresh timed out after 120s", and it is tried again on a later pass — so one
stuck provider can't leave a spinner turning for the rest of the session. The wait is deliberately long:
a healthy provider on a slow network can legitimately take over a minute, and it should be reported as
slow, not as broken.

The last good normalized history is preserved too, so a temporary provider failure—or a successful
limit refresh whose local log scan is temporarily unavailable—does not erase previously recorded local usage.

Rows that have never had data show "No data" rather than made-up numbers.

## Stale data

Because a failed refresh keeps the last good values on screen, those values can persist if refreshes keep failing — so a plan or limit that changed on the provider's side could otherwise keep showing the old figures indefinitely. To make that obvious, a small **"Outdated"** tag appears next to the provider's name once its data is more than a couple of refresh cycles old (about ten minutes); hover it for the precise age ("Last updated 3h ago"). The tag stays short so it never crowds a long plan name. When you see it, the numbers below are from that earlier time, not live — usually because the provider is failing to refresh (check the warning triangle) or the Mac was asleep. A successful refresh clears it.

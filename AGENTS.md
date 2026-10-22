# AGENTS.md

TokenPlan is a SwiftPM-based SwiftUI menu-bar app for macOS that shows AI provider usage widgets (Claude, Codex, Cursor, Grok, Devin, and more).

This file documents the engineering conventions for the project. Read it before contributing.

## Agent Instructions

AGENTS.md is the source of truth for agent instructions in this repository. CLAUDE.md files may only point to the nearest AGENTS.md file with `@AGENTS.md`; do not add guidance, duplicate instructions, or project rules to CLAUDE.md.

> **Repository note:** TokenPlan is a fork of the MIT-licensed OpenUsage (original © Robin Ebers); the forked-from baseline is OpenUsage v0.7.14. It has its own name, bundle ids, icon, update feed and feature set. Do not reintroduce upstream names, logos, endpoints, analytics keys or contact details. Active development happens on `main`. Keep `main` as the only long-lived or packaging branch; use workflow dispatch and pinned main commits for test builds, and approved version tags for releases.

## Dependency Updates

- The owner requires `main` as the only repository branch. Do not enable Dependabot version-update or security-update PRs, or create dependency-update branches.
- Review dependency updates and run the relevant checks before committing them directly to `main`. Keep vulnerability alerts separate from automatic update PRs; do not disable alerts as part of this policy.

## Releases

Pushing an approved stable `vX.Y.Z` tag on `main` runs `.github/workflows/release.yml`: macOS signing/notarization and Windows/Linux installer builds, followed by publication to this public `onevalar/token-plan` repository under `vX.Y.Z`. Update feeds live in `updates/` on main. Source is open under the existing MIT license. The desktop-only workflow is a manual packaging check and does not publish. Version numbers are the owner's decision; confirm before tagging. Require nonempty approved `release/X.Y.Z.md` notes. Never leave a release in Draft or replace published binaries. See `docs/updates.md` for required cloud credentials.

## Architecture

- **The Tauri + React interface (`platforms/tauri`) is the only maintained product interface** (owner decision, 2026-10-22). Use Arc for its web UI. The original native macOS app (SwiftUI/AppKit, 1.0.12 "classic") is **frozen**: it stays available as a download but gets no new features, fixes or updates, and its UI code under `Sources/OpenUsage/Views`, `App` and `Stores` is not to be changed. The Swift provider/engine code (`Sources/OpenUsage/Providers`, `Services`, `Models`, `Pricing`) is *not* frozen — the Mac build of the Tauri app runs it as its bundled data helper, so provider fixes go there (macOS) and in `platforms/desktop/TokenPlan.Core` (Windows/Linux). Change both whenever a provider's behavior changes, and see `docs/tauri-migration.md` and `docs/mac-navigation-preview.md` for UI behavior.
- SwiftPM executable target; SwiftUI content hosted in an AppKit-owned `NSStatusItem` + custom key-capable `NSPanel`.
- Swift 6 with strict concurrency.
- Providers implement the small `ProviderRuntime` protocol: an auth store reads credentials already on the user's machine, a usage client calls the provider's API, and a mapper normalizes the response into `MetricLine` values. The UI renders those normalized values.
- See `docs/` for behavior docs and the developer docs (architecture overview, adding a provider).

## Providers

Conventions for the per-provider modules under `Sources/OpenUsage/Providers/<Name>/`.

- **Structure:** one folder per provider with an auth store (reads credentials already on the user's machine), a usage client (calls the provider API), and a mapper (normalizes to `MetricLine`), conforming to `ProviderRuntime` — `refresh()` plus `hasLocalCredentials()`, the local-only credential probe used by first-run detection (`FirstRunSeeder`) and by new-provider detection on the first launch after the provider ships (`NewProviderSeeder`); mirror the same local credential sources and usability filters that `refresh()` starts with, reusing the auth-store loaders instead of adding a second credential-reading path. See `docs/adding-a-provider.md` and `docs/provider-enablement.md`.
- **Model pricing:** all spend imputation (Claude, Codex, Cursor, Grok) prices through the shared engine in `Sources/OpenUsage/Pricing/` (see `docs/pricing.md`). Cursor-native model rates and alias rules live in `Sources/OpenUsage/Resources/pricing_supplement.json` — sync new or changed models from [Cursor models & pricing](https://cursor.com/docs/models-and-pricing.md) (update `updated_at`, pricing entries, and `alias_rules` for CSV model slugs); merging to `main` makes it available from the public source path, so installed apps pick it up without a release. The bundled LiteLLM/models.dev snapshots regenerate with `script/update_pricing_snapshots.sh` (a release-time chore).
- **Default order:** Claude, Codex, Cursor first (the established providers, in that order), then every other provider alphabetically by display name (Antigravity, Copilot, DeepSeek, Devin, Grok, Kimi, MiniMax, …). The order is the array order in `AppContainer`, which seeds `LayoutStore`'s default provider order (and `resetToDefault`). A new provider slots into the alphabetical tail.
- **Metric placement defaults:** when adding or changing a metric, choose these four defaults deliberately (and record the choice in the PR/docs):
  1. enabled on/off (`DefaultLayout.metricIDs`),
  2. Always Visible vs. On Demand — above the fold vs. behind the per-provider caret (`DefaultLayout.expandedMetricIDs`). A provider may have no Always Visible rows: keep its account heading and details entry, and never promote On Demand metrics onto the dashboard,
  3. pinned to the menu bar (`DefaultLayout.pinnedMetricIDs`),
  4. order (within a provider, the `widgetDescriptors` declaration order).

## Localization

All user-visible text ships in five languages (English, 简体中文, 繁體中文, 日本語, 한국어). Write the English text in code (`Text("…")`, `tr("…")`, `trf("…%@…", x)`, or `String(localized:)` for placeholders), add the four translations to `script/l10n/part*.py`, run `script/generate_localizations.py`, and see `docs/localization.md`. `swift test` verifies the tables.

## Running / Testing Changes

- Shared interface: from `platforms/tauri` run `npm test` (unit), `npx playwright test --config playwright.preview.config.ts` (macOS/Windows/Linux shell contracts) and `npx playwright test` (regression). Set `TOKENPLAN_TEST_BROWSER` to a Chromium executable if Playwright's own browser is missing. UI strings need translations (`script/l10n/part*.py`, then `script/generate_localizations.py` and `node platforms/tauri/scripts/sync-localizations.mjs`).
- Before tagging a release run `script/preflight_release.py X.Y.Z` (see `docs/releasing.md`).

- There is no hot reload. The app is a long-lived menu-bar process, so **every code change requires a full rebuild and restart of the running app** to take effect — kill the running instance, rebuild, and relaunch before testing.

## Orbs

`.agents/setup` prepares a fresh Linux orb, and Amp snapshots the result: the Debian packages the desktop client needs (NSIS for the Windows installer, Xvfb, CJK fonts), the .NET SDK pinned by `platforms/desktop/global.json`, the NuGet packages from the desktop lockfiles, a warm Debug build, and Pillow for `script/make_icon.py`. `dotnet` is on `PATH` at `/usr/local/bin/dotnet`. `.agents/resume` re-asserts that link after an orb wakes. Keep both scripts idempotent: Amp reruns setup for orbs restored from a stale snapshot.

The SwiftUI client cannot build in a Linux orb — SwiftUI and AppKit come from the macOS SDK. Use a Mac orb or a Mac runner for `swift build`, `swift test`, and macOS UI checks. In a Linux orb:

- Desktop client: `script/build_desktop.sh test` runs the core checks and the localization check; `dotnet run --project platforms/desktop/TokenPlan.Desktop.Tests` runs the UI checks and saves screenshots when `TOKENPLAN_UI_CAPTURE` names a directory; `xvfb-run -a dotnet run --project platforms/desktop/TokenPlan.Desktop -- --fixture` launches the Linux client.
- Shared logic: provider parsing, pricing and translations exist on both clients, so a change to one side usually needs the matching desktop or Python check to run here.
- Localization: `script/generate_localizations.py --report` checks the Swift sources without a Swift toolchain.

## Pull Requests

Every PR description must follow this structure so reviewers can skim it quickly:

- **TL;DR** — open with a one- or two-sentence plain-English summary of the change.
- **What was happening** — plain-English bullet points describing the prior behavior, bug, or gap that motivated the change.
- **What this changes** — bullet points describing what the PR actually changes.
- **Heads-up** (optional) — noteworthy things a reviewer or future maintainer should consider (risks, follow-ups, trade-offs).
- **Tests** (optional) — how the change was verified.
- **Screenshots** (optional in general, but **required for any PR that makes a visual change**) — images of the affected UI after the change.

## Documentation

- Logic changes must update any docs in `docs/` that describe the affected behavior.
- Keep docs simple, less-technical, and easy to skim; exclude visual design details.

## Code Conventions

- Add a regression test when fixing a bug, where it fits.
- Keep files under ~500 LOC; split or refactor as needed.
- No new dependencies without justification.
- When adding a provider, follow the conventions in "## Providers".
- New UI strings need translations (see "## Localization").

## Error Handling

Always fail loudly into the log file and show friendly errors to the user (the provider card shows the reason inline). There is no analytics or crash-reporting service — do not add one. Do not add silent fallbacks that hide real problems. Only validate at system boundaries (user input, external APIs); trust internal code and framework guarantees.

## UI

- Use title case for any hardcoded copy used as a title.
- Match the existing design language; TokenPlan has a specific look and feel.
- Only add tooltips (`hoverTooltip`) when explicitly asked to. Don't add them proactively to new controls.

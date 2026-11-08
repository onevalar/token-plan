# TokenPlan shared desktop interface

On `valar-svelte`: Tauri 2 + Svelte 5 + Valar components, with existing usage engines behind a
persistent JSON-lines bridge. See [migration status](../../docs/tauri-migration.md) for the
implemented features and [Svelte acceptance](../../docs/svelte-migration.md) for the
real original/target comparison, component inventory and verification limits.

Use the existing Node 24.22.2 for Valar synchronization, the repository's Rust 1.90
toolchain, and .NET 10 on Windows/Linux. Library commands pin pnpm 12.14.0 through npx;
do not change global Node/Corepack settings.
Mac builds use the existing `/Applications/Xcode.app` toolchain.

```
npm ci
npm run prepare:bridge
npm run tauri dev
```

`TOKENPLAN_DOTNET` selects an existing .NET 10 executable. `TOKENPLAN_UNIVERSAL=true`
builds the Mac helper for Apple Silicon and Intel. Development builds have a separate app
identifier, but deliberately read existing TokenPlan settings. Do not test preference edits
or live refreshes concurrently with the installed app. Automated tests use isolated settings
and synthetic accounts.

```
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:ui
```

The `Tauri migration checks` workflow runs all three operating systems and uploads signed
verification packages. It does not publish a release or move installed users onto a preview.
The Tauri update manifest is separate from the native Sparkle/desktop feeds.

The bridge exposes only account display data and explicit configuration actions. It does not
expose credential reads, arbitrary files or shell commands. Existing provider code retains
identity checks, token renewal, caches and rate-limit protection.

Missing reusable components enter the Valar library first, then this app consumes
the actual packages in `vendor/`. React and Arc run only in the isolated development
comparison baseline, never the production interface. Retained licenses and provenance
are in `vendor/Valar-NOTICE.md`; TickMeter is independently authored, not copied from
Arc Pro. See the acceptance record for package-refresh and comparison commands.

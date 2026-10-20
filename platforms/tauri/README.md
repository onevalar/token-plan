# TokenPlan shared desktop interface

Tauri 2 + React + free Arc components, with the existing native usage engines behind a
persistent JSON-lines bridge. See [migration status](../../docs/tauri-migration.md) for the
implemented features, platform integration and release acceptance requirements.

Use Node 22, the repository's Rust 1.90 toolchain, and .NET 10 on Windows/Linux.
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

Arc's free components are vendored unchanged from its public registry, following its manual
installation instructions when registry CLI requests failed. Its MIT license is bundled;
no Arc Pro source is redistributed. See `src/components/arc/NOTICE.md`.

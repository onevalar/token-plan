# Contributing

TokenPlan is a personal project; issues and pull requests are welcome at <https://github.com/onevalar/token-plan>.

- Read [AGENTS.md](AGENTS.md) for conventions and [docs/architecture.md](docs/architecture.md) for the layout.
- Build and test with `swift build` and `swift test`. The app has no hot reload: rebuild and relaunch (`./script/build_and_run.sh`) to see a change.
- Adding a provider: follow [docs/adding-a-provider.md](docs/adding-a-provider.md).
- UI text: see [docs/localization.md](docs/localization.md) — every new string needs entries for all five languages.
- Add a regression test when fixing a bug, and update the matching page in `docs/` when behavior changes.

By contributing you agree your work is released under the [MIT License](LICENSE).

# Updates

Direct-download builds of TokenPlan keep themselves up to date using [Sparkle](https://sparkle-project.org), the standard update
framework for Mac apps. Updates are downloaded from TokenPlan's own release feed and verified before
they install, so you always get a genuine, unmodified build.

## How it works

- **Automatic checks.** The app quietly checks for a new version in the background (about once an hour).
  When one is found, an **Update Available** banner appears at the top of the popover instead of a
  window popping up behind your other apps. Click **Install Update** to open the update window (release
  notes, download, install) front and center. The banner's close button snoozes it; it comes back the
  next time the app finds the update.
- **Manual check.** Open **Settings → Updates** and click **Check for Updates…** at any time.
  For both manual checks and banner installs, TokenPlan brings itself to the foreground before opening
  Sparkle so the update window doesn't get buried behind another app. Because TokenPlan normally lives
  only in the menu bar, it briefly shows a Dock icon for the update session, then hides again.
- **Turn it off.** The **Check Automatically** switch in **Settings → Updates** stops the
  background checks. You can still check manually.

## Beta updates

**Settings → Updates → Beta Updates** opts you into pre-release builds before they ship to
everyone. Turn it off to go back to stable-only; you'll stay on your current version until the next
stable release catches up.

Everyone always receives stable releases — the beta option only *adds* pre-release builds on top.

## Where updates come from

Update builds are published on TokenPlan's GitHub releases, and the list of available versions (the
"appcast") is served from `https://onevalar.github.io/token-plan/appcast.xml`. Each download is
signed two ways — Apple notarization plus TokenPlan's own signature — and the app refuses anything that
doesn't match. This is only available in the official signed release build, not in local developer
builds.

## TestFlight distribution (1.0.0)

The independent Xcode project in `platforms/macos-store` builds the native app for TestFlight.
It enables App Sandbox and excludes Sparkle, the bundled command-line executable and the CLI
installation setting. Updates for this build come from TestFlight/App Store.

Existing companion-app logins and local logs require explicit folder authorization in General
Settings → Local Service Files. The app remembers only security-scoped bookmarks. Keys entered
inside TokenPlan remain in its sandbox container; it does not source login-shell profiles.
A path lookup never grants access. Localhost API access still uses the existing authentication.

Regenerate the shared project with `xcodegen generate --spec platforms/macos-store/project.yml`
after changing its specification or source files, and commit the generated project for Xcode Cloud.
`script/build_testflight.sh check` validates project settings; `archive`, `export` and `upload`
require an explicit numeric version/build and `TEAM_ID`. The export verifier rejects a missing
sandbox, wrong bundle/version or embedded Sparkle. Xcode re-signs development archives during
App Store export; verification without `--archive` also rejects debugging entitlements.

Release status: App Store Connect record 6821419145 and App ID com.onevalar.tokenplan created.
The owner selected 1.0.0 for the first TestFlight release. Store-target compilation and four
resource/path/updater tests passed locally. Signing, sandbox UI/provider acceptance, cloud workflow,
upload and TestFlight processing are still pending. A passing compiler is not a release or proof
that every companion-app credential source works in App Sandbox.

The Xcode Cloud workflow `TestFlight 1.0.0` builds branch `testflight/1.0.0`. Cloud build 1 passed the store tests but failed distribution export because the document-container entitlement used a legacy team prefix. Both iCloud container entitlements now use the registered identifier `iCloud.com.onevalar.tokenplan` directly, matching the managed provisioning profile. Cloud validation must complete before calling this build installable.

Cloud build 2 signed and uploaded successfully. The generated app Info.plist now derives its version from MARKETING_VERSION and CURRENT_PROJECT_VERSION instead of XcodeGen defaults; a rebuilt local bundle verified 1.0.0 (1). The cloud workflow distributes successful builds to TokenPlan Internal, currently containing only the owner.

## Direct-download validation (2026-10-11)

The owner paused the TestFlight route after build 1.0.0 (3) could not access existing
Claude, Codex and Amp credentials/tools in App Sandbox. Build 3 was uploaded and
made available internally; external review was still waiting at the last check.
Use the non-sandboxed Developer ID route for the next installation. Do not treat
folder authorization as a verified fix for Claude Keychain access or Amp CLI execution.

`script/release.sh` accepts `NOTARY_KEYCHAIN_PROFILE` for credentials already saved by
`xcrun notarytool store-credentials`. This avoids putting an app-specific password in
shell history or environment variables. The existing environment credential method
remains supported for CI. A Developer ID provisioning profile must match the signing
certificate and production iCloud container; a Mac App Store profile is not interchangeable.

Before replacing the installed app, verify the final app and DMG signatures, notarization
and stapled tickets. Launch the packaged app from Finder and confirm fresh Claude,
Codex and Amp usage with the user's existing logins. Successful CLI refreshes from an
older non-sandboxed build are preliminary diagnostics, not final package acceptance.

For a locally installed Xcode account, Organizer also supports notarization without a
separate notarytool password: import the signed app archive, select Custom → Direct
Distribution → Upload, and choose the matching Developer ID profile. Export the
notarized app only after Apple reports success, then package that exported app.
`DISABLE_UPDATES=1` produces a standalone package without an unconfigured update feed;
`TOKENPLAN_DIST_DIR` keeps these artifacts separate from an existing development build.

Direct distribution 1.0.0 (4) completed on 2026-10-11. Xcode notarization submission
50269BB0-4C22-4485-9700-3F4C5D431C9C was accepted. The exported app has a valid stapled
ticket and passed `syspolicy_check distribution` (certificate/profile, notarization,
XProtect and Gatekeeper). The signed DMG contains this notarized app. The installed
`/Applications/TokenPlan.app` passed signature and ticket checks and refreshed Claude,
Codex and Amp successfully in the GUI. Existing local accounts were used; the user
approved the macOS Keychain prompt. No sandbox folder authorization was required.
This standalone package has no automatic-update feed configured. Codex's local history
scanner reported 10 oversized records skipped, so historical spend may be incomplete;
this does not prevent live quota refresh.

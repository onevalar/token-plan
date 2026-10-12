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

Local development and standalone builds without an update feed omit the Check for Updates menu item instead of showing an unusable disabled command. About remains available.

## Local signed update pipeline (1.0.1 preparation)

Public publication is **disabled at the owner's request**. The source repository is private.
The proposed distribution destination in `release/update-config.json` is reserved configuration,
not an existing deployment: `https://onevalar.github.io/tokenplan-updates/appcast.xml`.
No public repository or release was created. Current installed development builds remain unchanged
and do not update from this URL. Do not install the private candidate as a working updater until
the public URL and its download have passed the checks below.

The private Sparkle key is held in the macOS Keychain under the `tokenplan` account. Only its
public key is in the configuration. Apple Developer ID and the `TokenPlan-Notary` profile stay
on this Mac; no signing credentials are uploaded to GitHub. Keep a secure backup of the Sparkle
key before relying on this update channel; do not rotate the key for each release.

### Prepare privately

After approving the version and adding its notes to `release/<version>.md`, run:

```sh
python3 script/prepare_update.py 1.0.1
```

This builds the universal production app, signs it with Developer ID, notarizes and staples the
app and DMG, generates an EdDSA-signed Sparkle enclosure, verifies the archive signature, preserves
existing feed versions, and records verification results under `dist/updates/<version>/`.
Nothing is uploaded, tagged, or installed by this command. Existing output is never overwritten.
Build numbers use Unix timestamps so local and cloud builds share an increasing number space.

### Enable publication later

Only after the owner authorizes public downloads:

1. Create the public `onevalar/tokenplan-updates` distribution repository with an initial README.
   Keep the application source repository private. The distribution repository contains only
   release packages, notes, and the feed.
2. Confirm the destination in `release/update-config.json`, then set `publication_enabled` to true.
3. Run `python3 script/publish_update.py 1.0.1`. This rechecks artifact hashes and the Sparkle
   signature, publishes release notes and the DMG, pushes the feed without force, and enables
   branch-based Pages hosting if needed. It refuses private download repositories and existing
   release versions; it does not overwrite published packages.
4. Wait for Pages deployment. Fetch the feed without authentication; check that its version,
   build number, archive URL, length, and signature match the verified local candidate. Download
   that URL without authentication and verify its SHA-256 and Sparkle signature.
5. Install the production app and test Check for Updates. To test actual replacement, publish
   another owner-approved higher build and verify an upgrade from the preceding signed version.
   Reading a feed alone is not proof that an installation succeeded.

A development build has a different bundle identifier. The first move from `.dev` to production
requires a manual installation and explicit preservation of the active settings domain; Sparkle
must not be used to cross-update these bundle identities.

The legacy cloud release workflow is opt-in through `TOKENPLAN_CLOUD_RELEASES_ENABLED=true`.
It is not configured for the separate distribution repository and must remain off for this local
release route. The local pipeline is the supported route until cloud signing and destination
configuration are explicitly provisioned and tested.

## Public distribution and cloud releases

Source stays private in `onevalar/token-plan`. Public downloads and update metadata live in
`onevalar/apps`, under release tags `tokenplan-vX.Y.Z` and the `tokenplan/` directory. Only three
installers and their checksums are release assets; application source is never pushed there.
macOS uses `https://onevalar.github.io/apps/tokenplan/appcast.xml` and Sparkle signatures.
Windows and Linux check `https://onevalar.github.io/apps/tokenplan/latest.json` at startup and every
12 hours. A new release appears on the overview and in General Settings/About. Download size and
SHA-256 are verified before opening the installer. The user completes the platform installer;
these two platforms do not silently replace the running application.

A stable source tag `vX.Y.Z` on main runs `Publish TokenPlan`. It requires an approved nonempty
`release/X.Y.Z.md`. Both platform builds must succeed before publishing. Release binaries are immutable;
a retry only accepts existing assets with identical checksums. Feed publication preserves older Mac
entries and never replaces another software's directory. GitHub Pages publishes from apps/main.

Private source repository Actions configuration:
- Variable `APPS_APP_ID`: 5288559 (Onevalar Apps Publisher).
- Secret `APPS_APP_PRIVATE_KEY`: App private key. Installed only on onevalar/apps, Contents write,
  mandatory Metadata read. Publishing creates a short-lived installation token.
- Secrets `APPLE_CERTIFICATE` (base64 Developer ID .p12), `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_DEVELOPER_ID_ICLOUD_PROFILE` (base64 profile), `SPARKLE_PRIVATE_KEY`.
- Secrets `APPLE_ID` and `APPLE_PASSWORD` (app-specific notarization password); team H4982D35ZR.

The first public release may be prepared locally using `prepare_update.py` and `publish_update.py`.
Cloud release readiness is established only after a successful cloud run; merely adding this workflow
or some credentials is not evidence that cloud signing/notarization works.

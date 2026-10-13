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
"appcast") is served from `https://raw.githubusercontent.com/onevalar/apps/main/tokenplan/appcast.xml`. Each download is
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

## Local preparation

`python3 script/prepare_update.py <approved-version>` can prepare signed, notarized Mac
artifacts locally without publishing. Cloud builds are the normal release path described below.
The Sparkle signing key is backed up in the local Keychain and configured in the private source
repository's Actions secrets; keep the same key across releases.

A development build has a different bundle identifier. Moving from `.dev` to production requires
manual installation and preservation of the active settings domain. Sparkle does not cross-update
these bundle identities.

## Public distribution and cloud releases

Source stays private in `onevalar/token-plan`. Public downloads and update metadata live in
`onevalar/apps`, under release tags `tokenplan-vX.Y.Z` and the `tokenplan/` directory. Only three
installers and their checksums are release assets; application source is never pushed there.
macOS uses `https://raw.githubusercontent.com/onevalar/apps/main/tokenplan/appcast.xml` and Sparkle signatures.
Windows and Linux check `https://raw.githubusercontent.com/onevalar/apps/main/tokenplan/latest.json` at startup and every
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

For cloud verification without a release, dispatch Publish TokenPlan with `tag=main`,
`verify_only=true` and an already approved `verification_version`. It builds, signs, notarizes,
validates update metadata and checks the App token. Artifacts stay in private Actions storage;
no public release or update feed is changed. The selected source commit is pinned across jobs.

## Cloud release validation — 1.0.2 (2026-10-13)

Cloud run `38279425689` passed macOS tests, signing and Apple notarization, desktop builds,
and native Windows/Linux core, UI and installer checks. It published the three installers and
checksums to `onevalar/apps` as `tokenplan-v1.0.2`. GitHub Pages serves both production feeds;
the Mac feed retains 1.0.1. The source repository remains private.

On the owner's Mac, Sparkle's official command-line driver used the installed app's framework,
production feed and public key to download, verify and install 1.0.2 over 1.0.1. The app restarted
from `/Applications/TokenPlan.app`, with one running instance, valid code signature and stapled
notarization ticket. A subsequent check reported no newer update. The driver had to use the same
Developer ID team as the installer for Sparkle's authenticated IPC; an ad-hoc test driver was
rejected. The native check-update button was not exercised because UI automation could not attach.

The Windows/Linux updater implementation detected 1.0.2 from 1.0.1, downloaded both real public
installers, verified size and SHA-256, and did not offer the same version again. Cloud native tests
installed/reinstalled, launched fixture mode and uninstalled the packages; they did not exercise
an interactive end-user update click sequence or live provider credentials.


## Update feed connectivity (2026-10-13)

The update entry points now use GitHub raw content from the same public `onevalar/apps`
main branch. This removes GitHub Pages deployment as a dependency for update checks.
The Pages copies remain available for older installations. Installer downloads still use
GitHub Releases, with the existing Sparkle signatures and desktop SHA-256 checks.

On the owner's Mac, the Pages endpoint failed TLS negotiation through the configured local
proxy while the raw endpoint returned the same published feed and detected 1.0.4. The installed
1.0.3 build was repaired by setting its `SUFeedURL` preference to the raw URL, without modifying
its signed bundle or installing an update. This preference persists across app upgrades.
The URL change in source applies to subsequent releases; published 1.0.4 binaries remain immutable.

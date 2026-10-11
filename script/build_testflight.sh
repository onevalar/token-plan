#!/usr/bin/env bash
set -euo pipefail

# Separate sandboxed Xcode target. Never signs/exports the Developer ID build as a store build.
# Usage: build_testflight.sh generate|check|archive|export|upload VERSION BUILD
# archive/export/upload require TEAM_ID and installed App Store signing/provisioning.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-check}"
VERSION="${2:-}"
BUILD="${3:-}"
PROJECT="$ROOT/platforms/macos-store/TokenPlanStore.xcodeproj"
OUTPUT="$ROOT/dist/testflight"
case "$MODE" in generate|check|archive|export|upload) ;; *) echo 'Unknown mode' >&2; exit 2;; esac
command -v xcodegen >/dev/null
xcodegen generate --spec "$ROOT/platforms/macos-store/project.yml"
[[ "$MODE" != generate ]] || exit 0
if [[ "$MODE" == check ]]; then
  xcodebuild -project "$PROJECT" -scheme TokenPlan -showBuildSettings CODE_SIGNING_ALLOWED=NO
  exit 0
fi
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && "$BUILD" =~ ^[1-9][0-9]*$ ]] || {
  echo 'Supply the owner-approved numeric VERSION and BUILD.' >&2; exit 2;
}
: "${TEAM_ID:?Set TEAM_ID to the selected Apple Developer team}"
mkdir -p "$OUTPUT"
ARCHIVE="$OUTPUT/TokenPlan-$VERSION-$BUILD.xcarchive"
if [[ "$MODE" == archive ]]; then
  # Leave room for archive, compiler intermediates and export; do not evict unrelated caches.
  FREE_KB="$(df -k "$ROOT" | awk 'END {print $4}')"
  [[ "$FREE_KB" -ge 8388608 ]] || { echo 'Archive requires at least 8 GiB free disk space.' >&2; exit 1; }
  xcodebuild -project "$PROJECT" -scheme TokenPlan -configuration Release \
    -destination 'generic/platform=macOS' -archivePath "$ARCHIVE" \
    -derivedDataPath "$OUTPUT/DerivedData" -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM_ID" MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD" archive
  exit 0
fi
[[ -d "$ARCHIVE" ]] || { echo "Archive missing: $ARCHIVE" >&2; exit 1; }
APP="$ARCHIVE/Products/Applications/TokenPlan.app"
# Xcode may archive with a development profile and re-sign it during store export.
python3 "$ROOT/script/verify_store_app.py" "$APP" "$VERSION" "$BUILD" --archive
EXPORT_OPTIONS="$OUTPUT/ExportOptions.plist"
python3 - "$EXPORT_OPTIONS" "$TEAM_ID" "$MODE" <<'PY'
import plistlib, sys
with open(sys.argv[1], 'wb') as f:
    plistlib.dump({'method': 'app-store-connect', 'teamID': sys.argv[2],
                  'destination': 'upload' if sys.argv[3] == 'upload' else 'export',
                  'signingStyle': 'automatic', 'manageAppVersionAndBuildNumber': False}, f)
PY
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$OUTPUT/export-$VERSION-$BUILD" \
  -exportOptionsPlist "$EXPORT_OPTIONS" -allowProvisioningUpdates

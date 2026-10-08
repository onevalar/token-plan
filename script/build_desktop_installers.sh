#!/usr/bin/env bash
# Publishes the Windows and Linux desktop clients and wraps them in installers:
#   dist/installers/TokenPlan-Setup-<version>.exe        (Windows x64, per-user, no admin rights)
#   dist/installers/tokenplan_<version>_amd64.deb         (Debian/Ubuntu x64)
#   dist/installers/SHA256SUMS.txt
# Usage: script/build_desktop_installers.sh [version]     (default 0.1.0)
# Needs a .NET SDK (see platforms/desktop/global.json; TOKENPLAN_DOTNET selects one) and makensis.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-0.1.0}"
VERSION="${VERSION#v}"
export TOKENPLAN_VERSION="$VERSION"
OUT="$ROOT_DIR/dist/installers"
rm -rf "$ROOT_DIR/dist/desktop/win-x64" "$ROOT_DIR/dist/desktop/linux-x64" "$OUT"
mkdir -p "$OUT"
"$ROOT_DIR/script/build_desktop.sh" publish win-x64
"$ROOT_DIR/script/build_desktop.sh" publish linux-x64
python3 "$ROOT_DIR/script/package_windows_installer.py" "$ROOT_DIR/dist/desktop/win-x64" "$VERSION" "$OUT"
python3 "$ROOT_DIR/script/package_linux_deb.py" "$ROOT_DIR/dist/desktop/linux-x64" "$VERSION" "$OUT"
if command -v sha256sum >/dev/null 2>&1; then SUM="sha256sum"; else SUM="shasum -a 256"; fi
(cd "$OUT" && $SUM TokenPlan-Setup-*.exe tokenplan_*_amd64.deb > SHA256SUMS.txt)
echo "==> installers in $OUT"
ls -lh "$OUT"

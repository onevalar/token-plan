#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/platforms/desktop"
SDK="${TOKENPLAN_DOTNET:-dotnet}"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_GENERATE_ASPNET_CERTIFICATE=false AVALONIA_TELEMETRY_OPTOUT=1
export MSBUILDDISABLENODEREUSE=1
MODE="${1:-build}"
PROJECT="TokenPlan.Desktop/TokenPlan.Desktop.csproj"
OPTIONS=(-m:2 /nodeReuse:false /p:UseSharedCompilation=false)
# TOKENPLAN_VERSION (e.g. 0.1.0 or 0.1.0-beta.1) stamps the published assemblies; default comes from the .csproj.
[ -n "${TOKENPLAN_VERSION:-}" ] && OPTIONS+=("/p:Version=${TOKENPLAN_VERSION}")
case "$MODE" in
  build)
    "$SDK" restore "$PROJECT" --disable-parallel --configfile NuGet.Config
    "$SDK" build "$PROJECT" --no-restore "${OPTIONS[@]}"
    ;;
  test)
    "$SDK" restore TokenPlan.Core.Tests --disable-parallel --configfile NuGet.Config
    "$SDK" build TokenPlan.Core.Tests --no-restore "${OPTIONS[@]}"
    "$SDK" TokenPlan.Core.Tests/bin/Debug/net10.0/TokenPlan.Core.Tests.dll
    python3 "$ROOT_DIR/script/verify_desktop_localizations.py"
    ;;
  publish)
    RID="${2:?Usage: build_desktop.sh publish win-x64|win-arm64|linux-x64|linux-arm64}"
    case "$RID" in win-x64|win-arm64|linux-x64|linux-arm64) ;; *) echo "Unsupported runtime: $RID" >&2; exit 1 ;; esac
    "$SDK" restore "$PROJECT" -r "$RID" --disable-parallel --configfile NuGet.Config
    "$SDK" publish "$PROJECT" -c Release -r "$RID" --self-contained true --no-restore "${OPTIONS[@]}" -o "$ROOT_DIR/dist/desktop/$RID"
    ;;
  *) echo "Usage: build_desktop.sh build|test|publish <runtime>" >&2; exit 1 ;;
esac

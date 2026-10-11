#!/usr/bin/env python3
"""Inspect or repair one stale Tahoe menu-bar association. Dry-run by default.

Requires macOS permission to read the Control Center preferences. Never changes
permissions, app allow/deny switches, bundle identifiers, or other associations.
Run from an authorized Terminal; do not work around a permission denial.
"""

import argparse
import copy
import datetime
import os
from pathlib import Path
import plistlib
import subprocess
import sys


PREFERENCES = Path.home() / (
    "Library/Group Containers/group.com.apple.controlcenter/Library/Preferences/"
    "group.com.apple.controlcenter.plist"
)


def bundle_id(location):
    if not isinstance(location, dict):
        return None
    bundle = location.get("bundle")
    return bundle.get("_0") if isinstance(bundle, dict) else None


def repaired_tracking(payload, owner, target):
    """Return a patched payload and count; leave every unrelated value intact."""
    if not isinstance(payload, bytes):
        raise ValueError("trackedApplications is not an encoded property list")
    records = plistlib.loads(payload)
    if not isinstance(records, list):
        raise ValueError("Unrecognized trackedApplications format; refusing to edit")
    if owner == target:
        raise ValueError("Owner and target must be different applications")
    own_records = [r for r in records if isinstance(r, dict)
                   and bundle_id(r.get("location")) == target]
    if len(own_records) != 1 or own_records[0].get("isAllowed") is not True:
        raise ValueError("Target must have exactly one enabled record; check System Settings first")
    patched = copy.deepcopy(records)
    removed = 0
    for record in patched:
        if not isinstance(record, dict) or bundle_id(record.get("location")) != owner:
            continue
        locations = record.get("menuItemLocations")
        if not isinstance(locations, list):
            raise ValueError("Owner's menuItemLocations is not a list; refusing to edit")
        kept = [item for item in locations if bundle_id(item) != target]
        removed += len(locations) - len(kept)
        record["menuItemLocations"] = kept
    if not removed:
        return payload, 0
    fmt = plistlib.FMT_BINARY if payload.startswith(b"bplist") else plistlib.FMT_XML
    return plistlib.dumps(patched, fmt=fmt, sort_keys=False), removed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner", default="com.openai.codex")
    parser.add_argument("--target", default="com.onevalar.tokenplan.dev")
    parser.add_argument("--apply", action="store_true", help="Back up and update only trackedApplications")
    args = parser.parse_args()
    original = PREFERENCES.read_bytes()
    outer = plistlib.loads(original)
    original_payload = outer.get("trackedApplications")
    payload, count = repaired_tracking(original_payload, args.owner, args.target)
    print(f"Owner: {args.owner}\nTarget: {args.target}\nIncorrect references: {count}")
    if not count:
        print("No matching association; nothing changed.")
        return
    if not args.apply:
        print("Dry run only. Use --apply to back up and remove these references.")
        return
    # A concurrent settings edit must not be overwritten by this snapshot.
    latest = plistlib.loads(PREFERENCES.read_bytes())
    if latest.get("trackedApplications") != original_payload:
        raise RuntimeError("Menu-bar settings changed during inspection; rerun the check")
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup_dir = Path.home() / "Library/Logs/TokenPlan/MenuBarRepairs"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f"controlcenter-{stamp}.plist"
    with backup.open("xb") as stream:
        os.fchmod(stream.fileno(), 0o600)
        stream.write(original)
        stream.flush()
        os.fsync(stream.fileno())
    print(f"Backup: {backup}")
    # Use the preferences service instead of directly overwriting its backing
    # file, which can be replaced by an older cached copy. Only this key changes.
    subprocess.run(["/usr/bin/defaults", "write", str(PREFERENCES.with_suffix("")),
                    "trackedApplications", "-data", payload.hex()], check=True)
    result = subprocess.run(["/usr/bin/defaults", "export", str(PREFERENCES.with_suffix("")), "-"],
                            check=True, capture_output=True)
    written = plistlib.loads(result.stdout)["trackedApplications"]
    if plistlib.loads(written) != plistlib.loads(payload):
        raise RuntimeError(f"Read-back verification failed. Preserve the backup: {backup}")
    print("Verified: only the requested association was removed. Restart Control Center and TokenPlan, then verify visibility with the owner's switch still off.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, plistlib.InvalidFileException,
            subprocess.SubprocessError) as error:
        sys.exit(f"Repair stopped: {error}")

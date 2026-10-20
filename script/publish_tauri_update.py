#!/usr/bin/env python3
"""Publish approved Tauri verification artifacts, then advance only their update feed."""
import os
import hashlib
from tauri_release_readme import update_readme
from pathlib import Path
import re
import subprocess


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def main():
    version = os.environ["VERSION"]
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid approved version")
    source = os.environ["SOURCE_REF"]
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        raise ValueError("Missing source commit")
    notes = Path("artifacts/release-notes.md")
    notes.write_bytes(subprocess.check_output(["git", "show", f"{source}:release/{version}.md"]))
    if not notes.read_text().strip():
        raise ValueError("Empty release notes")
    feed = Path("artifacts/tauri.json")
    run("node", "platforms/tauri/scripts/update-feed.mjs", "artifacts", version, str(notes), str(feed))
    files = [p for p in Path("artifacts").rglob("*") if p.is_file() and
             (p.name.endswith((".dmg", ".deb", ".AppImage", "-setup.exe", ".app.tar.gz", ".sig")))]
    if len({p.name for p in files}) != len(files):
        raise ValueError("Duplicate release asset names")
    # Validate download metadata before creating an immutable public release.
    update_readme(Path("README.md").read_text(), version, [p.name for p in files])
    checksums = Path("artifacts/SHA256SUMS.txt")
    entries = []
    for asset in sorted([*files, feed], key=lambda p: p.name):
        with asset.open('rb') as stream:
            entries.append(f"{hashlib.file_digest(stream, 'sha256').hexdigest()}  {asset.name}\n")
    checksums.write_text(''.join(entries))
    native_feeds = list(Path("artifacts").rglob("appcast.xml"))
    if len(native_feeds) != 1:
        raise ValueError("Missing signed native Mac transition feed")
    # gh release create refuses an existing release: published installers are never replaced.
    run("gh", "release", "create", f"v{version}", "--verify-tag", "--title", f"TokenPlan {version}",
        "--notes-file", str(notes), *map(str, files), str(feed), str(checksums))
    # Publish the pointer only after installation assets exist. The Mac transition feed is separately signed with Sparkle.
    run("git", "pull", "--ff-only", "origin", "main")
    Path("updates/tauri.json").write_bytes(feed.read_bytes())
    Path("updates/appcast.xml").write_bytes(native_feeds[0].read_bytes())
    readme = Path("README.md")
    readme.write_text(update_readme(readme.read_text(), version, [p.name for p in files]))
    run("git", "config", "user.name", "github-actions[bot]")
    run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    run("git", "add", "updates/tauri.json", "updates/appcast.xml", "README.md")
    run("git", "commit", "-m", f"Publish Tauri update manifest for {version}")
    run("git", "push", "origin", "HEAD:main")


if __name__ == "__main__":
    main()

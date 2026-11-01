"""Identify cache compatibility without including credentials or generated packages."""
import hashlib
import os
from pathlib import Path
import subprocess


def output(*command):
    return subprocess.check_output(command, text=True, stderr=subprocess.STDOUT).strip()


def main():
    # Rust and NuGet use their setup actions' own keys. An unrelated Rust,
    # .NET or runner image refresh must not invalidate compatible Swift builds.
    versions = [output("swift", "--version"), output("xcodebuild", "-version")]
    digest = hashlib.sha256("\n".join(versions).encode()).hexdigest()[:24]
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as target:
        target.write(f"toolchain={digest}\n")


if __name__ == "__main__":
    main()

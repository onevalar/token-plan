"""Identify cache compatibility without including credentials or generated packages."""
import hashlib
import os
from pathlib import Path
import subprocess
import sys


def output(*command):
    return subprocess.check_output(command, text=True, stderr=subprocess.STDOUT).strip()


def main():
    versions = [output("rustc", "-vV"), os.environ.get("ImageOS", ""), os.environ.get("ImageVersion", "")]
    if sys.platform == "darwin":
        versions += [output("swift", "--version"), output("xcodebuild", "-version")]
    else:
        versions += [output("dotnet", "--version")]
    digest = hashlib.sha256("\n".join(versions).encode()).hexdigest()[:24]
    values = f"toolchain={digest}\nsource={output('git', 'rev-parse', 'HEAD')}\n"
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as target:
        target.write(values)


if __name__ == "__main__":
    main()

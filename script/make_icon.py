#!/usr/bin/env python3
"""Package the approved blue icon without redrawing it.

Source: assets/AppIcon-capsule-refined.png. Requires Pillow and macOS iconutil.
Produces macOS and desktop assets from the transparent capsule.
"""
from pathlib import Path
import subprocess
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

with Image.open(ASSETS / "AppIcon-capsule-refined.png") as source:
    if source.width != source.height:
        raise ValueError("The app icon source must be square")
    image = source.convert("RGBA")


def resized(size):
    return image.resize((size, size), Image.Resampling.LANCZOS)


resized(1024).save(ASSETS / "AppIcon-1024.png")
with tempfile.TemporaryDirectory() as temporary:
    iconset = Path(temporary) / "AppIcon.iconset"
    iconset.mkdir()
    for base in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            suffix = "@2x" if scale == 2 else ""
            resized(base * scale).save(iconset / f"icon_{base}x{base}{suffix}.png")
    subprocess.run([
        "iconutil", "-c", "icns", str(iconset), "-o", str(ASSETS / "AppIcon.icns")
    ], check=True)

with Image.open(ASSETS / "AppIcon-capsule-refined.png") as source:
    image = source.convert("RGBA")

resized(1024).save(ASSETS / "AppIcon-desktop.png")
desktop = ROOT / "platforms" / "desktop" / "assets"
for size in (16, 24, 32, 48, 64, 128, 256, 512):
    resized(size).save(desktop / "icons" / f"tokenplan-{size}.png")
resized(256).save(desktop / "TokenPlan.ico", sizes=[
    (size, size) for size in (16, 24, 32, 48, 64, 128, 256)
])

#!/usr/bin/env python3
"""Verify actual installed resources, not only the build's source directory."""
from pathlib import Path
import argparse
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent

def verify(folder, platform):
    name = 'AppIcon-capsule-refined.png' if platform == 'mac' else 'AppIcon-desktop.png'
    expected = (ROOT / 'assets' / name).read_bytes()
    if expected[:8] != b'\x89PNG\r\n\x1a\n': raise ValueError('Icon is not PNG')
    # All shipped masters are non-interlaced 8-bit RGBA with transparent canvas corners.
    _, _, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', expected[16:29])
    if (depth, color, interlace) != (8, 6, 0): raise ValueError('Expected 8-bit RGBA icon')
    offset, payload = 8, bytearray()
    while offset < len(expected):
        length = struct.unpack('>I', expected[offset:offset+4])[0]
        if expected[offset+4:offset+8] == b'IDAT': payload.extend(expected[offset+8:offset+8+length])
        offset += 12 + length
    # At the first pixel, all PNG filter predictors are zero, so alpha is unchanged.
    if zlib.decompress(payload)[4] != 0: raise ValueError('Icon background is not transparent')
    if platform == 'mac':
        candidates = list((folder / 'Contents/Resources').rglob(name))
        if len(candidates) != 1 or candidates[0].read_bytes() != expected:
            raise ValueError('Installed Mac interface icon is missing or incorrect')
    else:
        assembly = folder / 'TokenPlan.Desktop.dll'
        if expected not in assembly.read_bytes():
            raise ValueError('Installed desktop assembly does not embed the expected transparent icon')
    print(f'PASS: {platform} installed package contains the exact transparent interface icon')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('platform', choices=['mac', 'desktop'])
    parser.add_argument('folder', type=Path)
    args = parser.parse_args()
    verify(args.folder, args.platform)

#!/usr/bin/env python3
"""Draws the TokenPlan app icon (assets/AppIcon-1024.png) and builds assets/AppIcon.icns from it.
Needs Pillow (`pip install pillow`) and macOS `iconutil`. Edit the palette/geometry below and re-run."""
import math, os, shutil, subprocess
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S, OUT = 4096, 1024           # draw large, downsample for smooth edges
TOP, BOTTOM = (34, 44, 120), (10, 150, 152)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

g = Image.new('RGB', (64, 64)); gp = g.load()
for y in range(64):
    for x in range(64):
        gp[x, y] = lerp(TOP, BOTTOM, (y * 0.75 + x * 0.25) / 64)
grad = g.resize((S, S), Image.BICUBIC)
mask = Image.new('L', (S, S), 0)
pad = int(S * 0.098)
ImageDraw.Draw(mask).rounded_rectangle([pad, pad, S - pad, S - pad], radius=int((S - 2 * pad) * 0.2237), fill=255)
img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); img.paste(grad, (0, 0), mask)

ov = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
cx = cy = S // 2; r = int(S * 0.285); w = int(S * 0.06)
box = [cx - r, cy - r, cx + r, cy + r]

def arc_with_caps(start, end, color):
    d.arc(box, start=start, end=end, fill=color, width=w)
    for ang in (start, end):
        a = math.radians(ang)
        x, y = cx + (r - w / 2) * math.cos(a), cy + (r - w / 2) * math.sin(a)
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=color)

arc_with_caps(135, 405, (255, 255, 255, 80))   # faint 270° track, gap at the bottom
arc_with_caps(135, 330, (255, 255, 255, 255))  # the "used" portion
bw, gap, base = int(S * 0.052), int(S * 0.034), cy + int(S * 0.105)
for i, h in enumerate([int(S * 0.085), int(S * 0.150), int(S * 0.215)]):
    x = cx - (3 * bw + 2 * gap) // 2 + i * (bw + gap)
    d.rounded_rectangle([x, base - h, x + bw, base], radius=bw // 2, fill=(255, 255, 255, 255))

img = Image.alpha_composite(img, ov).resize((OUT, OUT), Image.LANCZOS)
img.save(os.path.join(ROOT, 'assets', 'AppIcon-1024.png'))
iconset = os.path.join(ROOT, 'assets', 'AppIcon.iconset')
shutil.rmtree(iconset, ignore_errors=True); os.makedirs(iconset)
for b in (16, 32, 128, 256, 512):
    for sc in (1, 2):
        sz = b * sc
        img.resize((sz, sz), Image.LANCZOS).save(f'{iconset}/icon_{b}x{b}{"@2x" if sc == 2 else ""}.png')
subprocess.run(['iconutil', '-c', 'icns', iconset, '-o', os.path.join(ROOT, 'assets', 'AppIcon.icns')], check=True)
shutil.rmtree(iconset)

#!/usr/bin/env python3
"""
Generate PWA icons for LockSys from a source image.

1. Save your logo as:  frontend/public/icon-source.png
2. Run:                python generate-icons.py

Pillow is installed automatically if missing.
"""
import os
import sys

# ── Auto-install Pillow if needed ─────────────────────────────────────────────
try:
    from PIL import Image
except ImportError:
    print("Pillow not found — installing...")
    import subprocess
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "Pillow", "-q"],
        stdout=subprocess.DEVNULL,
    )
    from PIL import Image  # type: ignore

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT    = os.path.dirname(os.path.abspath(__file__))
SOURCE  = os.path.join(ROOT, "public", "LockSys-Logo.png")
OUT_DIR = os.path.join(ROOT, "public")

SIZES = [
    (512, "pwa-512x512.png"),
    (192, "pwa-192x192.png"),
    (180, "apple-touch-icon.png"),
]

# Background color that matches the logo dark background (#2d3038)
BG_COLOR = (45, 48, 56)

# ── Load source ───────────────────────────────────────────────────────────────
if not os.path.exists(SOURCE):
    # Fallback: generate a simple geometric icon if no source provided
    print("No LockSys-Logo.png found — generating default LockSys icon.")
    _generate_default = True
else:
    _generate_default = False
    print(f"Source : {SOURCE}")

if _generate_default:
    # ── Default geometric icon (fallback) ────────────────────────────────────
    import struct, zlib, math

    def _crc32(data):
        return zlib.crc32(data) & 0xFFFFFFFF

    def _chunk(tag, data):
        body = tag.encode("ascii") + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", _crc32(body))

    def _dist_seg(px, py, ax, ay, bx, by):
        dx, dy = bx - ax, by - ay
        l2 = dx*dx + dy*dy
        if l2 == 0: return math.hypot(px-ax, py-ay)
        t = max(0.0, min(1.0, ((px-ax)*dx + (py-ay)*dy) / l2))
        return math.hypot(px-(ax+t*dx), py-(ay+t*dy))

    def _make_default(size):
        bg = BG_COLOR
        shield = (94, 129, 246)
        white  = (220, 230, 255)
        cx, cy = size/2, size/2
        rx, ry = size*0.38, size*0.44
        arm_w  = size*0.075
        top_y  = cy - ry*0.52
        bot_y  = cy + ry*0.42
        lx     = cx - rx*0.58
        rx2    = cx + rx*0.58
        pixels = []
        for y in range(size):
            for x in range(size):
                nx = (x-cx)/rx; ny = (y-cy)/ry
                in_shield = False
                if -0.95 <= ny <= 1.05:
                    if ny <= 0.15:
                        in_shield = abs(nx) <= 0.90
                    else:
                        taper = max(0, 1-(ny-0.15)/0.90)
                        in_shield = abs(nx) <= 0.90*taper
                if not in_shield:
                    pixels.append(bg); continue
                dl = _dist_seg(x, y, lx, top_y, cx, bot_y)
                dr = _dist_seg(x, y, rx2, top_y, cx, bot_y)
                pixels.append(white if dl<=arm_w or dr<=arm_w else shield)
        raw = bytearray()
        for row in range(size):
            raw.append(0)
            for col in range(size):
                raw.extend(pixels[row*size+col])
        compressed = zlib.compress(bytes(raw), 6)
        return (
            b"\x89PNG\r\n\x1a\n"
            + _chunk("IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
            + _chunk("IDAT", compressed)
            + _chunk("IEND", b"")
        )

    for size, name in SIZES:
        print(f"  {name} ({size}×{size})…", end=" ", flush=True)
        path = os.path.join(OUT_DIR, name)
        with open(path, "wb") as f:
            f.write(_make_default(size))
        print(f"{os.path.getsize(path):,} bytes")

else:
    # ── Resize from source image ──────────────────────────────────────────────
    img = Image.open(SOURCE).convert("RGBA")
    w, h = img.size
    print(f"  Loaded {w}×{h} px")

    # Center-square crop: if landscape, crop sides; if portrait, crop top/bottom
    side = min(w, h)
    left = (w - side) // 2
    top  = (h - side) // 2
    img_sq = img.crop((left, top, left + side, top + side))
    print(f"  Cropped to {side}×{side} (centered)")

    for size, name in SIZES:
        print(f"  {name} ({size}×{size})…", end=" ", flush=True)

        resized = img_sq.resize((size, size), Image.LANCZOS)

        # Flatten alpha onto the brand background color
        if resized.mode == "RGBA":
            bg = Image.new("RGB", resized.size, BG_COLOR)
            bg.paste(resized, mask=resized.split()[3])
            resized = bg
        else:
            resized = resized.convert("RGB")

        out_path = os.path.join(OUT_DIR, name)
        resized.save(out_path, "PNG", optimize=True)
        print(f"{os.path.getsize(out_path):,} bytes → {out_path}")

print("\nDone. Rebuild the frontend: npm run build")

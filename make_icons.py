"""Generate placeholder icon files for TacMapVisualizer."""
import struct
import zlib
import os

ACCENT = (204, 0, 51)  # #CC0033 neon maroon


def make_png(size, r, g, b):
    """Minimal PNG with a solid color fill."""
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    row = bytes([r, g, b] * size)
    raw = b"".join(b"\x00" + row for _ in range(size))
    idat = zlib.compress(raw)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", idat)
        + chunk(b"IEND", b"")
    )


def make_ico(sizes, r, g, b):
    """ICO container with PNG images at given sizes."""
    images = [(s, make_png(s, r, g, b)) for s in sizes]
    n = len(images)
    header = struct.pack("<HHH", 0, 1, n)
    offset = 6 + n * 16
    entries = []
    for size, png in images:
        w = 0 if size >= 256 else size
        h = 0 if size >= 256 else size
        entries.append(struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(png), offset))
        offset += len(png)
    return header + b"".join(entries) + b"".join(p for _, p in images)


os.makedirs("src-tauri/icons", exist_ok=True)

r, g, b = ACCENT

# icon.ico (Windows – required for tauri-build)
ico_data = make_ico([256, 48, 32, 16], r, g, b)
with open("src-tauri/icons/icon.ico", "wb") as f:
    f.write(ico_data)
print(f"icon.ico  ({len(ico_data):,} bytes)")

# PNGs required by tauri.conf.json bundle.icon
for size, name in [(32, "32x32.png"), (128, "128x128.png"), (256, "128x128@2x.png")]:
    data = make_png(size, r, g, b)
    path = f"src-tauri/icons/{name}"
    with open(path, "wb") as f:
        f.write(data)
    print(f"{name}  ({len(data):,} bytes)")

print("Done.")

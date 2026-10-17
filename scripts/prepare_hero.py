"""Turn the start-page artwork into public/welcome/hero.webp.

Removes a solid black (or near-black) background by flood-filling from the
image edges, so dark pixels inside the artwork (hair, robot visor) stay intact,
then trims the empty margin and saves a transparent WebP.

Usage: python3 -I scripts/prepare_hero.py SOURCE_IMAGE [--threshold 28] [--out public/welcome/x.webp]
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/welcome/hero.webp"


def main():
    source = Path(sys.argv[1])
    threshold = int(sys.argv[sys.argv.index("--threshold") + 1]) if "--threshold" in sys.argv else 28
    out = ROOT / sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else OUT
    image = Image.open(source).convert("RGBA")
    rgb = np.asarray(image)[:, :, :3].astype(int)
    dark = rgb.max(axis=2) <= threshold
    height, width = dark.shape
    background = np.zeros_like(dark)
    queue = deque()
    for x in range(width):
        for y in (0, height - 1):
            if dark[y, x] and not background[y, x]:
                background[y, x] = True
                queue.append((y, x))
    for y in range(height):
        for x in (0, width - 1):
            if dark[y, x] and not background[y, x]:
                background[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < height and 0 <= nx < width and dark[ny, nx] and not background[ny, nx]:
                background[ny, nx] = True
                queue.append((ny, nx))
    alpha = Image.fromarray(np.where(background, 0, 255).astype("uint8"))
    # Soften the cut edge by one pixel so it doesn't look jagged.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    image.putalpha(alpha)
    box = image.getbbox()
    if box:
        image = image.crop(box)
    image.thumbnail((1400, 1400))
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, "WEBP", quality=88, method=6)
    print(f"wrote {out.relative_to(ROOT)} {image.size}")


if __name__ == "__main__":
    main()

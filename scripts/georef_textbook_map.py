"""Georeference the textbook's blank map of Egypt for the map gallery.

The textbook map is drawn in a plate-carrée style (straight parallels and
meridians, equal spacing), so a per-axis linear fit from a few control points
places it. Leaflet uses Web Mercator, so the image is resampled row by row into
Mercator; markers then sit where they should.

Usage:
  python3 -I scripts/georef_textbook_map.py SOURCE.jpg [CONTROL_POINTS.json]

CONTROL_POINTS.json: [{"x": 0.036, "y": 0.081, "lng": 25.15, "lat": 31.58}, ...]
with x/y as fractions of the image width/height. Without it the defaults below
(read off the textbook map sent on 2026-10-16) are used.

Writes public/lesson-media/textbook-egypt-map.png and .json (bounds + note).
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

DEFAULT_POINTS = [
    # Libya border (25°E) on the 22°N line, bottom-left corner of Egypt
    {"x": 0.0363, "y": 0.9465, "lng": 25.0, "lat": 22.0},
    # Sallum, where the Libya border meets the coast
    {"x": 0.0444, "y": 0.0811, "lng": 25.15, "lat": 31.58},
    # Rafah, where the eastern border meets the coast
    {"x": 0.7702, "y": 0.1088, "lng": 34.25, "lat": 31.3},
    # Taba, head of the Gulf of Aqaba
    {"x": 0.8242, "y": 0.2691, "lng": 34.9, "lat": 29.49},
    # Sudan border (22°N) at the Red Sea, Halaib corner
    {"x": 0.9718, "y": 0.9465, "lng": 36.85, "lat": 22.0},
]

ROOT = Path(__file__).resolve().parent.parent
OUT_IMAGE = ROOT / "public/lesson-media/textbook-egypt-map.png"
OUT_META = ROOT / "public/lesson-media/textbook-egypt-map.json"


def fit(values, targets):
    """Least-squares a*v + b; returns (a, b, max residual)."""
    a, b = np.polyfit(values, targets, 1)
    residual = max(abs(a * v + b - t) for v, t in zip(values, targets))
    return a, b, residual


def mercator_y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def main():
    source = Path(sys.argv[1])
    points = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else DEFAULT_POINTS
    image = Image.open(source).convert("RGB")
    width, height = image.size

    lng_a, lng_b, lng_err = fit([p["x"] for p in points], [p["lng"] for p in points])
    lat_a, lat_b, lat_err = fit([p["y"] for p in points], [p["lat"] for p in points])
    west, east = lng_b, lng_a + lng_b
    north, south = lat_b, lat_a + lat_b
    print(f"bounds: lat {south:.3f}–{north:.3f}, lng {west:.3f}–{east:.3f}")
    print(f"max control-point error: {lng_err:.3f}° lng, {lat_err:.3f}° lat")

    # Mercator resampling: each output row is a Mercator y; find its latitude,
    # then the source row with that latitude in the plate-carrée image.
    top, bottom = mercator_y(north), mercator_y(south)
    out_height = round(height * (top - bottom) / math.radians(north - south))
    rows = []
    for row in range(out_height):
        merc = top - (row + 0.5) / out_height * (top - bottom)
        lat = math.degrees(2 * math.atan(math.exp(merc)) - math.pi / 2)
        rows.append(min(height - 1, max(0, round((lat - north) / (south - north) * height - 0.5))))
    pixels = np.asarray(image)
    warped = Image.fromarray(pixels[rows, :, :])
    OUT_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    warped.save(OUT_IMAGE, optimize=True)
    OUT_META.write_text(
        json.dumps(
            {
                "bounds": [[round(south, 4), round(west, 4)], [round(north, 4), round(east, 4)]],
                "credit": "خريطة مصر الصماء — الكتاب المدرسي",
                "note": "موضعة تعليمية تقريبية بنقاط تحكم (السلوم، رفح، طابا، الحدود الغربية والجنوبية).",
                "maxErrorDegrees": round(max(lng_err, lat_err), 3),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUT_IMAGE.relative_to(ROOT)} ({warped.size[0]}×{warped.size[1]}) and {OUT_META.name}")


if __name__ == "__main__":
    main()

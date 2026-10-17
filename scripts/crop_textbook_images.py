import sys, json
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
# boxes in the 826-px-wide page space (x1, y1, x2, y2); pages rendered at 2x
CROPS = {
  "lesson1_sukari.jpg": (3, (36, 74, 700, 282)),
  "lesson1_resources_map.jpg": (4, (154, 278, 702, 758)),
  "lesson1_iron.jpg": (4, (640, 782, 734, 868)),
  "lesson1_copper.jpg": (4, (638, 916, 734, 1000)),
  "lesson1_gold.jpg": (5, (606, 190, 700, 272)),
  "lesson1_phosphate.jpg": (5, (594, 316, 698, 404)),
  "lesson1_manganese.jpg": (5, (592, 458, 700, 538)),
  "lesson1_gas.jpg": (7, (114, 548, 312, 668)),
  "lesson1_high_dam.jpg": (7, (114, 722, 308, 834)),
  "lesson1_benban.jpg": (7, (114, 878, 312, 994)),
  "lesson1_gabal_elzeit.jpg": (8, (148, 194, 346, 312)),
  "lesson2_nile_aswan.jpg": (11, (36, 74, 790, 300)),
  "lesson2_water_map.jpg": (12, (213, 602, 643, 968)),
  "lesson3_new_alamein.jpg": (18, (36, 74, 790, 300)),
  "lesson3_projects_map.jpg": (19, (100, 164, 736, 656)),
  "lesson3_new_delta.jpg": (20, (128, 368, 370, 494)),
  "lesson3_birket_ghalioun.jpg": (20, (128, 742, 370, 868)),
  "lesson3_new_capital.jpg": (21, (110, 418, 308, 540)),
  "lesson3_rod_el_farag.jpg": (22, (138, 298, 352, 424)),
  "lesson3_suez_canal_map.jpg": (22, (130, 656, 336, 880)),
  "lesson3_benban.jpg": (23, (104, 324, 326, 456)),
  "lesson3_gabal_elzeit.jpg": (23, (104, 494, 312, 622)),
}
thumbs = []
for name, (page, box) in CROPS.items():
    im = Image.open(f"{src}/page-{page:02d}.jpg").convert("RGB")
    crop = im.crop(tuple(v * 2 for v in box))
    crop.save(f"{out}/{name}", quality=88, optimize=True)
    t = crop.copy(); t.thumbnail((300, 220)); thumbs.append((name, t))
sheet = Image.new("RGB", (4 * 310, ((len(thumbs) + 3) // 4) * 250), "white")
d = ImageDraw.Draw(sheet)
for i, (n, t) in enumerate(thumbs):
    x, y = (i % 4) * 310 + 5, (i // 4) * 250 + 5
    sheet.paste(t, (x, y)); d.text((x, y + 225), n, fill="black")
sheet.save(f"{out}/_sheet.jpg", quality=80)
print(len(thumbs))

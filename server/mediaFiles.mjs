// Finds teacher-added photos and videos in public/lesson-media/ by name.
// Names are matched forgivingly: any letter case, stray spaces, and the
// doubled extension Windows produces when extensions are hidden
// ("iron-bahariya.mp4.mp4").
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MEDIA_ROOT = fileURLToPath(new URL("../public/lesson-media/", import.meta.url));
export const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
export const VIDEO_EXT = ["mp4", "webm"];

export function normalizeMediaName(name) {
  const n = String(name).trim().toLowerCase().replace(/\s+/g, "");
  return n.replace(/\.(jpe?g|png|webp|mp4|webm)(\.\1)+$/, ".$1");
}

// {normalized name → real file name} for one folder under lesson-media.
export function mediaIndex(folder) {
  const dir = MEDIA_ROOT + folder;
  const index = new Map();
  if (existsSync(dir)) for (const f of readdirSync(dir)) index.set(normalizeMediaName(f), f);
  return index;
}

// Public URL of the first file named base.<ext>, or null.
export function findMedia(folder, index, base, exts) {
  for (const e of exts) {
    const real = index.get(`${base.toLowerCase()}.${e}`);
    if (real) return `/lesson-media/${folder}/${encodeURIComponent(real)}`;
  }
  return null;
}

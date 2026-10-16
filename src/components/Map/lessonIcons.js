// Map-symbol families from the icon sheets the teacher supplied on 2026-10-16:
// lesson 2 (موارد المياه) and lesson 3 (المشروعات القومية). Each resource id maps
// to one family; the family sets the map symbol, its colour and the subtitle in
// the map key. Families without a resource yet are ready for when locations are
// added through the CMS (set `iconFamily` on the resource).
export const ICON_FAMILIES = {
  // Lesson 2 — flat style
  rain: { label: "الأمطار", color: "#3aa8ef", style: "flat" },
  nile: { label: "نهر النيل", color: "#1a62d6", style: "flat" },
  groundwater: { label: "المياه الجوفية", color: "#17b3a0", style: "flat" },
  seas: { label: "البحار والبحيرات", color: "#14a39a", style: "flat" },
  cities: { label: "المدن", color: "#2f4f86", style: "flat" },
  // Lesson 3 — glossy style
  "train-stations": { label: "محطات القطار", color: "#1b3fa0", style: "glossy" },
  "fast-train": { label: "القطار السريع", color: "#1673e6", style: "glossy" },
  agriculture: { label: "مشروعات زراعية", color: "#2f9e2f", style: "glossy" },
  "wind-energy": { label: "طاقة الرياح", color: "#1c8fe8", style: "glossy" },
  "solar-energy": { label: "الطاقة الشمسية", color: "#e7a90c", style: "glossy" },
  "fish-farming": { label: "الاستزراع السمكي", color: "#16b2b8", style: "glossy" },
};

const LESSON_FAMILIES = {
  water: {
    "rain-harvesting-matrouh": "rain",
    "nile-river": "nile",
    "nile-delta": "nile",
    groundwater: "groundwater",
    "mediterranean-sea": "seas",
    "red-sea": "seas",
    "lake-nasser": "seas",
    // Desalinated water comes from the sea.
    desalination: "seas",
  },
  project: {
    "new-delta": "agriculture",
    "toshka-kheir": "agriculture",
    "high-speed-rail": "fast-train",
  },
};

export function iconFamily(resource) {
  if (!resource) return null;
  const key =
    resource.iconFamily || LESSON_FAMILIES[resource.kind]?.[resource.id];
  return key && ICON_FAMILIES[key] ? { key, ...ICON_FAMILIES[key] } : null;
}

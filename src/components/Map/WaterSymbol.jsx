import ResourcePin from "./ResourcePin";

// Lesson 2 (موارد المياه): one illustrated pin per water resource instead of the
// repeated pin, the same in the map key, on the map and on the card. The
// colours drive the map effects.
export const WATER_SYMBOLS = {
  "nile-river": { color: "#1a62d6" },
  "nile-delta": { color: "#2f86e8" },
  groundwater: { color: "#14a38f" },
  "lake-nasser": { color: "#2459c9" },
  "northern-lakes": { color: "#0f9aa8" },
  "mediterranean-sea": { color: "#0b8fd8" },
  "red-sea": { color: "#109e94" },
  "rain-harvesting-matrouh": { color: "#5aa9e6" },
  desalination: { color: "#5b6fd6" },
  "bahr-el-baqar": { color: "#2f9467" },
};

export const hasWaterSymbol = (resource) => Boolean(resource && WATER_SYMBOLS[resource.id]);

// Illustrated pins for the ten water resources, cut from the teacher's design
// (public/lesson-media/symbols/<id>.webp).
export default function WaterSymbol({ resource, className = "" }) {
  if (!WATER_SYMBOLS[resource?.id]) return null;
  return (
    <img
      className={`water-symbol ${className}`}
      src={`/lesson-media/symbols/${resource.id}.webp`}
      alt=""
      aria-hidden="true"
      draggable="false"
      data-water-symbol={resource.id}
    />
  );
}

// The lesson map, key and card use this: water symbols for lesson 2, pins elsewhere.
export function LessonSymbol({ resource, className }) {
  return hasWaterSymbol(resource) ? (
    <WaterSymbol resource={resource} className={className} />
  ) : (
    <ResourcePin resource={resource} className={className} />
  );
}

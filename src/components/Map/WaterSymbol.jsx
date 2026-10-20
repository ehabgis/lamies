import ResourcePin from "./ResourcePin";

// Lesson 2 (موارد المياه): one round symbol per water resource instead of the
// repeated pin, the same in the map key, on the map and on the card.
export const WATER_SYMBOLS = {
  "nile-river": { color: "#1a62d6", glyph: "river" },
  "nile-delta": { color: "#2f86e8", glyph: "fork" },
  groundwater: { color: "#14a38f", glyph: "well" },
  "lake-nasser": { color: "#2459c9", glyph: "dam" },
  "northern-lakes": { color: "#0f9aa8", glyph: "reeds" },
  "mediterranean-sea": { color: "#0b8fd8", glyph: "waves" },
  "red-sea": { color: "#109e94", glyph: "fish" },
  "rain-harvesting-matrouh": { color: "#5aa9e6", glyph: "rain" },
  desalination: { color: "#5b6fd6", glyph: "drop" },
  "bahr-el-baqar": { color: "#2f9467", glyph: "recycle" },
};

export const hasWaterSymbol = (resource) => Boolean(resource && WATER_SYMBOLS[resource.id]);

const GLYPHS = {
  river: <path d="M13 3c6 4-4 7 2 12s-4 8 2 14" strokeWidth="3.6" />,
  fork: <path d="M16 29V17m0 0L8 5m8 12 8-12m-8 12-3-7" />,
  well: (
    <>
      <path d="M6 12 16 5l10 7M9 12v7m14-7v7M16 12v4" />
      <path d="M7 19h18v8H7z" fill="currentColor" fillOpacity=".25" />
    </>
  ),
  dam: (
    <>
      <path d="M6 6h5l3 21H5z" fill="currentColor" />
      <path d="M16 13q2.5-2.5 5 0t5 0M16 19q2.5-2.5 5 0t5 0M16 25q2.5-2.5 5 0t5 0" />
    </>
  ),
  reeds: (
    <>
      <path d="M4 24q6 4 12 0t12 0M11 21V10m5 11V7m5 14V11" />
      <ellipse cx="11" cy="9" rx="1.6" ry="3" fill="currentColor" />
      <ellipse cx="16" cy="6" rx="1.6" ry="3" fill="currentColor" />
      <ellipse cx="21" cy="10" rx="1.6" ry="3" fill="currentColor" />
    </>
  ),
  waves: <path d="M4 10q3-3 6 0t6 0 6 0 6 0M4 16q3-3 6 0t6 0 6 0 6 0M4 22q3-3 6 0t6 0 6 0 6 0" />,
  fish: (
    <>
      <path d="M8 12c3-4 9-4 12 0-3 4-9 4-12 0zm12 0 5-3.5v7z" fill="currentColor" fillOpacity=".3" />
      <path d="M4 21q3-3 6 0t6 0 6 0 6 0M4 27q3-3 6 0t6 0 6 0 6 0" />
    </>
  ),
  rain: (
    <>
      <path d="M9.5 18a5 5 0 0 1 .4-10A7 7 0 0 1 23.4 10a4 4 0 0 1-.4 8z" fill="currentColor" />
      <path d="m11 22-1.5 4m7-4-1.5 4m7-4-1.5 4" />
    </>
  ),
  drop: (
    <>
      <path d="M15 5c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="currentColor" fillOpacity=".25" />
      <path d="m25 4 1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="currentColor" strokeWidth="1" />
    </>
  ),
  recycle: (
    <>
      <path d="M8 15a8 8 0 0 1 13.6-5.7M24 17a8 8 0 0 1-13.6 5.7M22 4v5.5h-5.5M10 28v-5.5h5.5" />
      <path d="M16 12c2 3 3 4.4 3 5.6a3 3 0 0 1-6 0c0-1.2 1-2.6 3-5.6z" fill="currentColor" />
    </>
  ),
};

export default function WaterSymbol({ resource, className = "" }) {
  const s = WATER_SYMBOLS[resource?.id];
  if (!s) return null;
  return (
    <svg
      className={`water-symbol ${className}`}
      viewBox="0 0 44 44"
      aria-hidden="true"
      data-water-symbol={resource.id}
      style={{ color: s.color }}
    >
      <circle cx="22" cy="22" r="20" fill="currentColor" stroke="#fff" strokeWidth="3" />
      <g
        transform="translate(6 6)"
        fill="none"
        stroke="#fff"
        color="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[s.glyph]}
      </g>
    </svg>
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

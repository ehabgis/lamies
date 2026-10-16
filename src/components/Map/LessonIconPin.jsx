import { useId } from "react";

// Pins for the lesson icon families (see lessonIcons.js). Same 84×108 box and
// tip point as ResourcePin so map anchoring is unchanged.
//  - flat   (lesson 2): solid ring, light face, flat glyph
//  - glossy (lesson 3): shaded ring with highlight, sky face, illustrated glyph
export default function LessonIconPin({ family, className = "" }) {
  const id = useId().replaceAll(":", "");
  const glossy = family.style === "glossy";
  return (
    <svg
      className={`resource-pin lesson-icon-pin ${className}`}
      viewBox="0 0 84 108"
      aria-hidden="true"
      data-icon-family={family.key}
      style={{ color: family.color }}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx=".4" cy=".3" r=".8">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#e3f3fc" />
        </radialGradient>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#7cc6f5" />
          <stop offset=".7" stopColor="#d9f0fd" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1=".2" y1="0" x2=".8" y2="1">
          <stop stopColor="#ffffff" stopOpacity=".55" />
          <stop offset=".25" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="#04162e" stopOpacity=".4" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="42" cy="42" r="29" />
        </clipPath>
      </defs>
      <path
        d="M42 105C33 92 4 68 4 42a38 38 0 1176 0c0 26-29 50-38 63Z"
        fill="currentColor"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      {glossy && (
        <path
          d="M42 105C33 92 4 68 4 42a38 38 0 1176 0c0 26-29 50-38 63Z"
          fill={`url(#${id}-rim)`}
        />
      )}
      <circle
        cx="42"
        cy="42"
        r="29.5"
        fill={glossy ? `url(#${id}-sky)` : `url(#${id}-face)`}
        stroke={glossy ? "#ffffffcc" : "none"}
        strokeWidth="2"
      />
      <g clipPath={`url(#${id}-clip)`}>{GLYPHS[family.key]}</g>
      {glossy && (
        <path
          d="M18 30a27 27 0 0136-14"
          fill="none"
          stroke="#ffffff"
          strokeOpacity=".7"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

const GLYPHS = {
  // ---------- Lesson 2 ----------
  rain: (
    <g>
      <path
        d="M27 44c-7 0-9-10-2-12 0-8 9-12 15-7 4-7 16-5 17 4 8 0 10 13 1 15Z"
        fill="#ffffff"
        stroke="#1872d6"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g fill="#1a80e2">
        <path d="M31 50q-4 6 0 8 4-2 0-8Z" />
        <path d="M42 54q-4 6 0 8 4-2 0-8Z" />
        <path d="M53 50q-4 6 0 8 4-2 0-8Z" />
      </g>
    </g>
  ),
  nile: (
    <g fill="none" strokeLinecap="round">
      <path d="M30 18c-12 12 4 18-6 30s2 18-4 26" stroke="#5aac3c" strokeWidth="3.5" />
      <path d="M58 18c-10 12 6 18-4 30s4 16-2 26" stroke="#5aac3c" strokeWidth="3.5" />
      <path d="M45 14c-14 13 6 19-6 32s6 18-1 30" stroke="#1786ea" strokeWidth="13" />
      <path d="M45 16c-13 13 6 19-6 32s6 18-1 28" stroke="#5db8ff" strokeWidth="2" />
    </g>
  ),
  groundwater: (
    <g>
      <path d="M26 22v24M58 22v24" stroke="#5a4636" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 23h40" stroke="#5a4636" strokeWidth="4" strokeLinecap="round" />
      <rect x="39" y="20" width="6" height="6" rx="1.5" fill="#b9853f" />
      <path d="M42 26v6" stroke="#8a6230" strokeWidth="1.6" />
      <path d="M35 33h14l-2 9h-10Z" fill="#26343f" />
      <ellipse cx="42" cy="33" rx="7" ry="2" fill="#2f9df0" />
      <path d="M22 46h40v15H22Z" fill="#8f979e" />
      <ellipse cx="42" cy="46" rx="20" ry="4" fill="#3c464e" />
      <g stroke="#c8ced3" strokeWidth="1.2">
        <path d="M22 53h40M32 46v7M42 50v3M52 46v7M27 53v8M37 53v8M47 53v8M57 53v8" />
      </g>
    </g>
  ),
  seas: (
    <g>
      <path d="M8 52q10-6 17 0t17 0 17 0 17 0V80H8Z" fill="#64bdfa" />
      <g fill="none" stroke="#1a86e6" strokeWidth="4.5" strokeLinecap="round">
        <path d="M17 30q6-5 12 0t12 0 12 0 12 0" />
        <path d="M17 41q6-5 12 0t12 0 12 0 12 0" />
      </g>
    </g>
  ),
  cities: (
    <g>
      <rect x="22" y="36" width="12" height="26" fill="#3d5a96" />
      <rect x="35" y="20" width="14" height="42" fill="#183563" />
      <rect x="50" y="34" width="12" height="28" fill="#4f6da6" />
      <g fill="#ffffff">
        <path d="M25 41h3v3h-3ZM25 48h3v3h-3ZM25 55h3v3h-3Z" />
        <path d="M38 25h3v3h-3ZM43 25h3v3h-3ZM38 32h3v3h-3ZM43 32h3v3h-3ZM38 39h3v3h-3ZM43 39h3v3h-3ZM38 46h3v3h-3ZM43 46h3v3h-3Z" />
        <path d="M53 39h2.5v2.5H53ZM57 39h2.5v2.5H57ZM53 45h2.5v2.5H53ZM57 45h2.5v2.5H57ZM53 51h2.5v2.5H53ZM57 51h2.5v2.5H57Z" />
      </g>
    </g>
  ),

  // ---------- Lesson 3 ----------
  "train-stations": (
    <g>
      <path d="M8 60h68v20H8Z" fill="#9fb3c4" />
      <path d="M17 38h50v24H17Z" fill="#ead7ad" stroke="#b99a62" strokeWidth="1" />
      <path d="M33 30h18v8H33Z" fill="#e2cb98" stroke="#b99a62" strokeWidth="1" />
      <circle cx="42" cy="34" r="3" fill="#ffffff" stroke="#59472a" strokeWidth=".8" />
      <path d="M42 30V18" stroke="#59472a" strokeWidth="1" />
      <path d="M42 18h8v2.3h-8Z" fill="#ce1126" />
      <path d="M42 20.3h8v2.3h-8Z" fill="#ffffff" />
      <path d="M42 22.6h8v2.3h-8Z" fill="#111111" />
      <path d="M36 62V50a6 6 0 0112 0v12Z" fill="#2c5f93" />
      <g fill="#2c5f93">
        <path d="M21 46h5v7h-5ZM29 46h4v7h-4ZM51 46h4v7h-4ZM58 46h5v7h-5Z" />
        <path d="M21 56h5v6h-5ZM58 56h5v6h-5Z" />
      </g>
      <path d="M15 38h54" stroke="#b99a62" strokeWidth="2" />
    </g>
  ),
  "fast-train": (
    <g>
      <path d="M6 62l72-12v30H6Z" fill="#8c99a4" />
      <path d="M6 64l72-11" stroke="#5a6570" strokeWidth="2" />
      <path
        d="M10 58V40l38-7c12-2 22 4 26 14l2 6-4 3Z"
        fill="#f6f8fa"
        stroke="#9aa6b2"
        strokeWidth="1"
      />
      <path d="M58 37c6 0 11 4 13 10l-13 2Z" fill="#26384c" />
      <path d="M10 50l62-6" stroke="#d61f26" strokeWidth="2.6" />
      <g fill="#3a5068">
        <path d="M15 42h7v5h-7ZM25 41h7v5h-7ZM35 39h7v5h-7ZM45 38h7v5h-7Z" />
      </g>
    </g>
  ),
  agriculture: (
    <g>
      <path d="M8 46h68v34H8Z" fill="#7cbf4f" />
      <g stroke="#4f8f2f" strokeWidth="2.4">
        <path d="M20 46 6 80M32 46l-8 34M52 46l8 34M64 46l14 34" />
      </g>
      <path d="M30 62q12-8 24 0l-2 10H32Z" fill="#7a4a26" />
      <path d="M42 64V40" stroke="#3a8f22" strokeWidth="3" strokeLinecap="round" />
      <path d="M42 46c-12 0-16-8-15-13 9-1 15 4 15 13Z" fill="#59b832" />
      <path d="M42 40c2-11 12-16 19-14 0 9-7 15-19 14Z" fill="#6fcf3c" />
      <path d="M42 46c-6-3-10-7-15-13M42 40c5-5 11-10 19-14" stroke="#2f7d1c" strokeWidth=".9" fill="none" />
    </g>
  ),
  "wind-energy": (
    <g>
      <path d="M40.5 42h3l2 36h-7Z" fill="#eef3f8" stroke="#a9b8c6" strokeWidth=".8" />
      <g fill="#ffffff" stroke="#a9b8c6" strokeWidth=".8">
        <path d="M42 40c-1-8 1-18 4-22 1 7-1 16-2 22Z" />
        <path d="M43.5 43.5c7 3 15 9 17 13-7-1-14-6-18-11Z" />
        <path d="M40.5 43.5c-6 4-15 8-20 8 4-5 12-10 18-11Z" />
      </g>
      <circle cx="42" cy="42" r="3.2" fill="#ffffff" stroke="#8fa1b2" strokeWidth="1" />
    </g>
  ),
  "solar-energy": (
    <g>
      <path d="M8 66h68v14H8Z" fill="#6fbf4a" />
      <g stroke="#f5b400" strokeWidth="2.4" strokeLinecap="round">
        <path d="M56 12v5M56 35v5M43 25h5M64 25h5M47 16l3 3M62 31l3 3M65 16l-3 3M50 31l-3 3" />
      </g>
      <circle cx="56" cy="26" r="7.5" fill="#ffd21f" />
      <path d="M14 46l34-10 10 22-34 10Z" fill="#183f8c" stroke="#c9d6e6" strokeWidth="1.2" />
      <g stroke="#7fa3dd" strokeWidth=".9">
        <path d="M25 42.7l10 22M36 39.5l10 22M18 52l34-10M21 59l34-10" />
      </g>
      <path d="M34 64v8M44 61v11" stroke="#6d7680" strokeWidth="2" />
    </g>
  ),
  "fish-farming": (
    <g>
      <path d="M6 58q9-6 18 0t18 0 18 0 18 0V82H6Z" fill="#2f95e6" />
      <path d="M6 64q9-6 18 0t18 0 18 0 18 0" fill="none" stroke="#8fd3ff" strokeWidth="2" />
      <path
        d="M20 42c8-11 26-13 38-4 3 2 4 5 2 7-12 9-30 8-40-3l-6 7 1-10-1-9Z"
        fill="#3d8be0"
        stroke="#1f5fae"
        strokeWidth="1"
      />
      <path d="M36 32c4-5 10-6 14-4-3 1-6 3-8 6Z" fill="#2d6fc0" />
      <path d="M28 44c10 4 22 4 30-1" stroke="#a9d6ff" strokeWidth="1.2" fill="none" />
      <circle cx="54" cy="38" r="2" fill="#0c2340" />
      <circle cx="54.6" cy="37.4" r=".6" fill="#ffffff" />
    </g>
  ),
};

import { useState } from "react";

// The «شاهد واكتشف» picture of each station: a teacher's video or photo from
// public/lesson-media/projects/ when there is one, otherwise a drawing.
export function ProjectScene({ scene }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [source, setSource] = useState(scene.video ? "video" : scene.image ? "image" : "art");
  if (source === "video")
    return (
      <video
        className="wq-scene-media"
        src={scene.video}
        poster={scene.image || undefined}
        muted
        loop
        playsInline
        autoPlay={!reduced}
        controls={reduced}
        aria-label={scene.alt}
        onError={() => setSource(scene.image ? "image" : "art")}
      />
    );
  if (source === "image")
    return <img className="wq-scene-media" src={scene.image} alt={scene.alt} onError={() => setSource("art")} />;
  return (
    <div className={`wq-scene-media wq-art pq-art pq-art-${scene.art}`} role="img" aria-label={`رسم توضيحي: ${scene.alt}`}>
      {ART[scene.art] || ART.wheat}
      <small className="wq-art-note">رسم توضيحي</small>
    </div>
  );
}

const Sky = ({ id, top = "#5fb4f2", bottom = "#d8efff" }) => (
  <>
    <defs>
      <linearGradient id={id} x2="0" y2="1">
        <stop stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill={`url(#${id})`} />
  </>
);
const Sun = ({ x, y, r = 46 }) => (
  <g className="pq-sun">
    <circle cx={x} cy={y} r={r * 1.9} fill="#fff6c9" opacity=".45" />
    <circle cx={x} cy={y} r={r} fill="#ffd34d" />
  </g>
);

const ART = {
  wheat: (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <Sky id="pq-sky-wheat" />
      <Sun x={640} y={90} />
      <path d="M0 230 Q200 200 400 225 T800 215 V450 H0Z" fill="#7fa24a" />
      <path d="M0 250 H800 V450 H0Z" fill="#e2b546" />
      {Array.from({ length: 34 }, (_, i) => (
        <g key={i} className="pq-stalk" style={{ "--i": i % 7 }} transform={`translate(${12 + i * 24} ${300 + (i % 3) * 40})`}>
          <path d="M0 0 V-70" stroke="#b88a22" strokeWidth="4" />
          <ellipse cx="0" cy="-80" rx="7" ry="18" fill="#f0c95a" stroke="#b88a22" strokeWidth="2" />
        </g>
      ))}
      <g transform="translate(250 205)">
        <rect x="0" y="40" width="230" height="80" rx="12" fill="#3f8f3a" />
        <rect x="150" y="0" width="80" height="60" rx="8" fill="#2f6f2c" />
        <rect x="160" y="10" width="60" height="34" rx="4" fill="#bfe6ff" />
        <rect x="-70" y="88" width="90" height="26" rx="6" fill="#d9a514" />
        <circle cx="60" cy="125" r="34" fill="#263238" />
        <circle cx="190" cy="130" r="26" fill="#263238" />
        <circle cx="60" cy="125" r="12" fill="#90a4ae" />
        <circle cx="190" cy="130" r="9" fill="#90a4ae" />
      </g>
    </svg>
  ),
  fish: (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <Sky id="pq-sky-fish" />
      <path d="M0 190 H800 V450 H0Z" fill="#cdbb8f" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <g key={`${row}-${col}`} transform={`translate(${40 + col * 190} ${210 + row * 80})`}>
            <rect width="170" height="64" rx="8" fill="#2f8fb5" stroke="#e8dcc0" strokeWidth="6" />
            <path className="pq-ripple" d="M20 32 q12-8 24 0 t24 0 t24 0 t24 0" fill="none" stroke="#bfefff" strokeWidth="3" />
          </g>
        )),
      )}
      <g className="pq-fish" transform="translate(330 300)">
        <path d="M0 0 c14-14 40-14 54 0 c-14 14-40 14-54 0Z M54 0 l16-12 v24Z" fill="#ffb347" />
        <circle cx="12" cy="-3" r="3" fill="#333" />
      </g>
    </svg>
  ),
  solar: (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <Sky id="pq-sky-solar" top="#2f8fe0" bottom="#cfeaff" />
      <Sun x={560} y={80} r={40} />
      <path d="M0 210 L120 150 L220 200 L330 140 L470 205 L600 160 L800 210 V450 H0Z" fill="#c9875a" />
      <path d="M0 230 H800 V450 H0Z" fill="#e7c08e" />
      {[0, 1, 2].map((row) =>
        Array.from({ length: 6 - row }, (_, col) => (
          <g key={`${row}-${col}`} transform={`translate(${30 + row * 40 + col * (130 + row * 14)} ${255 + row * 60})`}>
            <path d={`M0 ${40 + row * 6} L${110 + row * 10} ${40 + row * 6} L${96 + row * 10} 0 L14 0Z`} fill="#1f4f9a" stroke="#d9e8ff" strokeWidth="2" />
            <path d={`M${36 + row * 3} 0 L${30 + row * 3} ${40 + row * 6} M${70 + row * 6} 0 L${74 + row * 6} ${40 + row * 6}`} stroke="#9cc3ff" strokeWidth="1.5" />
            <path d={`M${55 + row * 5} ${40 + row * 6} V${58 + row * 8}`} stroke="#6b7a88" strokeWidth="5" />
          </g>
        )),
      )}
    </svg>
  ),
};

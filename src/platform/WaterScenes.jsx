import { useState } from "react";

// Shows the mission's own video or photo when the file exists in
// public/lesson-media/water/, otherwise a drawn illustration. Videos play
// muted and only when motion is allowed; sound never starts by itself.
export function SceneMedia({ scene }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [source, setSource] = useState(scene.video ? "video" : scene.image ? "image" : "art");
  if (source === "video")
    return (
      <video
        className="wq-scene-media"
        src={scene.video}
        poster={scene.image}
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
    <div className="wq-scene-media wq-art" role="img" aria-label={`رسم توضيحي: ${scene.alt}`}>
      {ART[scene.art] || ART.farm}
      <small className="wq-art-note">رسم توضيحي</small>
    </div>
  );
}

const Palm = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0 C 4 -40 2 -80 6 -120" stroke="#7a5532" strokeWidth="9" fill="none" strokeLinecap="round" />
    <g fill="#2f8f3a">
      <path d="M6 -120 C -30 -135 -55 -120 -70 -100 C -40 -112 -20 -115 6 -118Z" />
      <path d="M6 -120 C 40 -138 66 -124 80 -104 C 50 -114 28 -116 6 -118Z" />
      <path d="M6 -120 C -10 -150 -36 -160 -56 -156 C -30 -146 -14 -136 6 -120Z" />
      <path d="M6 -120 C 22 -152 48 -162 68 -156 C 42 -146 24 -136 6 -120Z" />
      <path d="M6 -120 C 2 -150 8 -168 14 -176 C 14 -158 12 -140 6 -120Z" />
    </g>
  </g>
);

const Sky = ({ id, top = "#8fd0ff", bottom = "#e6f6ff" }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill={`url(#${id})`} />
    <circle cx="120" cy="80" r="38" fill="#ffd84d" opacity="0.95" />
  </>
);

const ART = {
  farm: (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <Sky id="wq-sky-farm" />
      {[90, 210, 330, 470, 600, 720].map((x, i) => (
        <Palm key={x} x={x} y={210} s={0.55 + (i % 2) * 0.12} />
      ))}
      <rect y="200" width="800" height="250" fill="#6fae3f" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${330 + i * 55} 450 L ${430 + i * 30} 205`} stroke="#4f8f2a" strokeWidth="14" opacity="0.55" />
      ))}
      <path d="M0 450 L0 330 C 120 300 220 250 330 205 L 380 205 C 300 260 200 330 170 450Z" fill="#b48a5a" />
      <path className="wq-canal" d="M0 450 L0 352 C 110 320 210 270 336 210 L 362 210 C 270 270 180 340 140 450Z" fill="#3c9ee6" />
      <path className="wq-flow" d="M40 430 C 120 360 230 290 350 214" stroke="#d6f1ff" strokeWidth="4" fill="none" strokeDasharray="6 22" />
    </svg>
  ),
  oasis: (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <Sky id="wq-sky-oasis" top="#7cc7ff" bottom="#fff1d6" />
      <path d="M0 260 C 150 200 300 240 420 215 C 560 190 680 230 800 210 L800 450 L0 450Z" fill="#e8c27e" />
      <path d="M0 330 C 200 280 380 330 560 300 C 660 285 740 300 800 295 L800 450 L0 450Z" fill="#d9a85e" />
      <ellipse cx="420" cy="345" rx="150" ry="34" fill="#3c9ee6" />
      <ellipse cx="420" cy="340" rx="120" ry="20" fill="#7fd0ff" opacity="0.7" />
      {[270, 340, 500, 575].map((x, i) => (
        <Palm key={x} x={x} y={330 - (i % 2) * 8} s={0.7 + (i % 2) * 0.12} />
      ))}
      <rect x="640" y="300" width="56" height="46" rx="6" fill="#a4774a" />
      <rect x="632" y="292" width="72" height="12" rx="4" fill="#7a5532" />
      <text x="668" y="372" textAnchor="middle" fontSize="20" fontWeight="800" fill="#5a3c1d">بئر</text>
    </svg>
  ),
  coast: (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <Sky id="wq-sky-coast" />
      <rect y="210" width="800" height="240" fill="#1aa3c4" />
      <path className="wq-waves" d="M0 250 Q 40 240 80 250 T 160 250 T 240 250 T 320 250 T 400 250 T 480 250 T 560 250 T 640 250 T 720 250 T 800 250" stroke="#bdf0ff" strokeWidth="4" fill="none" />
      <path d="M0 450 L0 300 C 120 280 220 300 330 330 L 360 450Z" fill="#f0d39b" />
      {[30, 95, 160, 220].map((x, i) => (
        <g key={x}>
          <rect x={x} y={200 - i * 18} width="54" height={110 + i * 18} rx="4" fill={["#f4f7fb", "#dce9f6", "#fff", "#e9f1fa"][i]} />
          {Array.from({ length: 4 }, (_, r) => (
            <rect key={r} x={x + 10} y={214 - i * 18 + r * 24} width="34" height="10" rx="2" fill="#7ab6e8" />
          ))}
        </g>
      ))}
      <Palm x={290} y={320} s={0.6} />
    </svg>
  ),
};

// Step 3 picture: reacts to the child's choice. state: idle | correct | wrong
export function UseScene({ art, state }) {
  return (
    <div className={`wq-use-scene wq-use-${art} is-${state}`} role="img" aria-label={USE_LABEL[art]}>
      {USE_ART[art] || USE_ART.irrigate}
    </div>
  );
}

const USE_LABEL = {
  irrigate: "مزروعات بجوار خزان مياه عذبة وخزان مياه مالحة",
  drip: "نخيل في واحة وأنبوب ري",
  desalinate: "مياه البحر ومحطة تحلية وكوب ماء",
};

const Plants = ({ x = 470 }) => (
  <g className="wq-plants">
    {Array.from({ length: 5 }, (_, i) => (
      <g key={i} transform={`translate(${x + i * 58} 330)`}>
        <path d="M0 0 V -70" stroke="#3f7d26" strokeWidth="6" />
        <path className="wq-leaf" d="M0 -30 C -30 -40 -36 -62 -34 -70 C -16 -60 -6 -50 0 -36Z" />
        <path className="wq-leaf" d="M0 -46 C 28 -56 34 -78 32 -86 C 14 -76 4 -66 0 -52Z" />
      </g>
    ))}
  </g>
);

const USE_ART = {
  irrigate: (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
      <rect width="800" height="400" fill="#eaf6ff" />
      <rect y="320" width="800" height="80" fill="#8a5d34" />
      <rect y="310" width="800" height="16" fill="#6fae3f" />
      <g>
        <rect x="40" y="150" width="130" height="160" rx="14" fill="#3c9ee6" />
        <text x="105" y="140" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0b4f9c">مياه عذبة</text>
      </g>
      <g>
        <rect x="200" y="150" width="130" height="160" rx="14" fill="#6f9a95" />
        {[[225, 190], [270, 230], [300, 180], [245, 270], [295, 285]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="10" height="10" fill="#fff" transform={`rotate(45 ${x} ${y})`} />
        ))}
        <text x="265" y="140" textAnchor="middle" fontSize="22" fontWeight="800" fill="#2f5652">مياه مالحة</text>
      </g>
      <path className="wq-pipe" d="M170 290 C 260 360 380 320 470 310 L 760 310" stroke="#9fb7c9" strokeWidth="12" fill="none" />
      <path className="wq-pipe-flow" d="M170 290 C 260 360 380 320 470 310 L 760 310" stroke="#3c9ee6" strokeWidth="7" fill="none" strokeDasharray="14 14" />
      <Plants />
    </svg>
  ),
  drip: (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
      <rect width="800" height="400" fill="#fff4dc" />
      <rect y="300" width="800" height="100" fill="#e1b36c" />
      {[200, 400, 600].map((x) => (
        <Palm key={x} x={x} y={300} s={0.95} />
      ))}
      <path d="M60 296 H 760" stroke="#2b2b2b" strokeWidth="6" />
      {[200, 400, 600].map((x) => (
        <circle key={x} className="wq-drop" cx={x + 14} cy="304" r="6" fill="#3c9ee6" />
      ))}
      <ellipse className="wq-flood" cx="400" cy="340" rx="360" ry="34" fill="#3c9ee6" />
    </svg>
  ),
  desalinate: (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
      <rect width="800" height="400" fill="#eaf6ff" />
      <rect y="250" width="250" height="150" fill="#1aa3c4" />
      <text x="125" y="300" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">مياه البحر</text>
      <rect x="300" y="170" width="200" height="150" rx="14" fill="#f4f7fb" stroke="#7ab6e8" strokeWidth="4" />
      <text x="400" y="235" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0b4f9c">محطة تحلية</text>
      <text x="400" y="265" textAnchor="middle" fontSize="15" fill="#4a6178">تزيل الأملاح</text>
      <path d="M250 290 H 300" stroke="#9fb7c9" strokeWidth="12" />
      <path d="M500 290 H 600" stroke="#9fb7c9" strokeWidth="12" />
      <path className="wq-pipe-flow" d="M250 290 H 300 M500 290 H 600" stroke="#3c9ee6" strokeWidth="7" strokeDasharray="14 14" />
      <path d="M610 230 L 700 230 L 690 340 L 620 340Z" fill="#fff" stroke="#7ab6e8" strokeWidth="4" />
      <rect className="wq-glass-fill" x="622" y="250" width="66" height="88" fill="#7fd0ff" />
    </svg>
  ),
};

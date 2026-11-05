import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ArrowCounterClockwise, CheckCircle, Play, SpeakerHigh, Sparkle, Warning, XCircle } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./gold-journey.css";

// «من الصخر إلى الذهب» (lesson 1, gold). States, in this order only:
// focusing (the map flies to the Sukari mine, its marker glows, the robot asks)
// → exploring (a rock illustration and a lens the child drags or moves with
// the arrow keys) → video (the gold clip in the same media area) → info (the
// mine and the uses, with a quick question). «أعد الاستكشاف» goes back to
// exploring; «إغلاق» leaves and the map tools come back.
export const GOLD_ID = "gold";
const ASK = "هل الذهب موجود داخل الصخور؟ حرّك العدسة لنكتشف!";
const FOUND = "يحتاج الخام إلى الاستخراج والمعالجة للحصول على الذهب";
const QUESTION = "هل يُستخرج الذهب من الصخور جاهزًا على شكل سبيكة؟";
const RIGHT = "أحسنت! يحتاج الخام إلى الاستخراج والمعالجة للحصول على الذهب";
const WRONG = "حاول مرة أخرى. تذكّر مشاهد المعالجة والصهر في الفيديو";
const EXPLORE_MS = 3000; // moving the lens about this long shows the finding
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function GoldJourney({ map, resource, video, onLeave, onToolsHidden }) {
  const site = resource.locations?.[0];
  const [phase, setPhase] = useState("focusing");
  const [ask, setAsk] = useState(true);
  const [found, setFound] = useState(false);
  const [run, setRun] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(!video);
  const [answer, setAnswer] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const clip = useRef(null);
  const timers = useRef([]);
  const alive = useRef(true);
  const later = (fn, ms) => timers.current.push(setTimeout(() => alive.current && fn(), ms));

  useEffect(() => {
    alive.current = true;
    onToolsHidden?.(true);
    const off = narrator.subscribe((s) => setSpeaking(s.state === "speaking"));
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      off?.();
      narrator.stop();
      clip.current?.pause();
      onToolsHidden?.(false);
    };
  }, []);

  // Focusing: the golden halo on the mine and a short flight there.
  useEffect(() => {
    if (!site) return undefined;
    const halo = L.circleMarker([site.lat, site.lng], {
      radius: 30,
      color: "#f2b705",
      weight: 4,
      fillColor: "#ffd34d",
      fillOpacity: 0.28,
      interactive: false,
      className: "gold-halo",
    }).addTo(map);
    map.stop();
    map.flyTo([site.lat, site.lng], Math.max(map.getZoom(), 8), { animate: !reducedMotion(), duration: 1.6 });
    return () => halo.remove();
  }, []);

  // The robot's question: its bubble goes once the voice ends (or after a
  // while when there is no voice); the lens is ready right away.
  useEffect(() => {
    setAsk(true);
    let spoke = false;
    const off = narrator.subscribe((s) => {
      if (s.state === "speaking") spoke = true;
      else if (spoke) later(() => setAsk(false), 600);
    });
    narrator.speak(ASK);
    later(() => !spoke && setAsk(false), 6000);
    later(() => setPhase((p) => (p === "focusing" ? "exploring" : p)), reducedMotion() ? 0 : 1700);
    return () => off?.();
  }, [run]);

  function watch() {
    play("open");
    narrator.stop();
    setAsk(false);
    setPhase("video");
  }
  function startVideo() {
    const v = clip.current;
    if (!v) return;
    setBlocked(false);
    v.currentTime = 0;
    v.play().catch(() => setBlocked(true));
  }
  useEffect(() => {
    if (phase === "video" && !failed) startVideo();
    if (phase !== "video") clip.current?.pause();
  }, [phase]);
  function toInfo() {
    clip.current?.pause();
    setPhase("info");
  }
  function again() {
    play("select");
    narrator.stop();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFound(false);
    setAnswer(null);
    setFailed(!video);
    setPhase("exploring");
    setRun((n) => n + 1);
  }
  const info = [resource.description, resource.importance].filter(Boolean);

  return (
    <div className="gold" dir="rtl">
      {ask && (
        <div className="gold-ask" role="status">
          <p>{ASK}</p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      )}

      <aside className="gold-card" aria-label="الذهب">
        <h2>
          <Sparkle size={24} weight="fill" aria-hidden="true" /> الذهب <small>خام معدني</small>
        </h2>

        <div className="gold-media">
          {(phase === "focusing" || phase === "exploring") && (
            <RockLens key={run} onFound={() => setFound(true)} />
          )}
          {phase === "video" &&
            (failed ? (
              <div className="gold-missing" role="alert">
                <Warning size={28} weight="fill" aria-hidden="true" />
                <p>{video ? "تعذّر تحميل فيديو رحلة الذهب." : "فيديو رحلة الذهب غير مضاف بعد."}</p>
                {!video && <small>اسم الملف المنتظر: lesson-media/sites/gold-sukari.mp4</small>}
                <button type="button" onClick={toInfo}>
                  متابعة
                </button>
              </div>
            ) : null)}
          {video && (
            <div className="gold-player" hidden={phase !== "video" || failed}>
              <video
                ref={clip}
                src={video}
                preload="metadata"
                playsInline
                controls
                controlsList="nodownload"
                aria-label="فيديو رحلة الذهب"
                onEnded={() => later(toInfo, 800)}
                onError={() => phase === "video" && setFailed(true)}
              />
              {phase === "video" && blocked && (
                <button type="button" className="gold-start" onClick={startVideo}>
                  <Play size={28} weight="fill" aria-hidden="true" /> ابدأ المشاهدة
                </button>
              )}
            </div>
          )}
          {phase === "info" && (
            <div className="gold-done" aria-hidden="true">
              <GoldGrains />
            </div>
          )}
        </div>

        {phase === "exploring" && found && (
          <div className="gold-found" role="status">
            <p>{FOUND}</p>
            <button type="button" className="gold-cta" onClick={watch}>
              <Play size={20} weight="fill" aria-hidden="true" /> شاهد رحلة الذهب
            </button>
          </div>
        )}
        {phase === "video" && !failed && (
          <button type="button" className="gold-link" onClick={toInfo}>
            تخطَّ الفيديو
          </button>
        )}

        {phase === "info" && (
          <div className="gold-info">
            {info.map((t) => (
              <p key={t}>{t}</p>
            ))}
            <button
              type="button"
              aria-pressed={speaking}
              onClick={() => (speaking ? narrator.stop() : narrator.speak(["الذهب", ...info].join(". ")))}
            >
              <SpeakerHigh size={20} aria-hidden="true" /> {speaking ? "إيقاف" : "استمع للمعلومة"}
            </button>
            <section className="gold-quiz" aria-labelledby="gold-quiz-q">
              <h3>سؤال سريع</h3>
              <p id="gold-quiz-q">{QUESTION}</p>
              <div>
                {["نعم", "لا"].map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={answer === a}
                    disabled={answer === "لا"}
                    onClick={() => {
                      play(a === "لا" ? "correct" : "wrong");
                      setAnswer(a);
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {answer && (
                <p className={`gold-verdict ${answer === "لا" ? "is-right" : "is-wrong"}`} role="status">
                  {answer === "لا" ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <XCircle size={22} weight="fill" aria-hidden="true" />}
                  {answer === "لا" ? RIGHT : WRONG}
                </p>
              )}
            </section>
          </div>
        )}

        <footer>
          {phase !== "focusing" && (
            <button type="button" onClick={again}>
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> أعد الاستكشاف
            </button>
          )}
          <button
            type="button"
            className="gold-close"
            onClick={() => {
              narrator.stop();
              onLeave();
            }}
          >
            إغلاق
          </button>
        </footer>
      </aside>
    </div>
  );
}

// The rock as a drawing: a few faint flecks outside the lens, clear gold
// grains inside it (the lens shows the rock twice as big).
const W = 320;
const H = 190;
const ROCK = "M28 132 L44 74 L92 40 L160 30 L226 44 L282 78 L298 128 L268 162 L190 176 L104 172 L52 160 Z";
const GRAINS = (() => {
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const out = [];
  while (out.length < 90) {
    const x = 50 + rand() * 230;
    const y = 52 + rand() * 110;
    if (((x - 163) / 125) ** 2 + ((y - 104) / 62) ** 2 > 1) continue;
    out.push({ x, y, r: 1.3 + rand() * 1.8, a: rand() * 180 });
  }
  return out;
})();
const ZOOM = 2;
const LENS_R = 40;

function Rock({ bright }) {
  return (
    <>
      <path d={ROCK} fill="#8a7b6b" />
      <path d="M44 74 L92 40 L160 30 L226 44 L282 78 L230 70 L160 60 L96 66 Z" fill="#a39482" />
      <path d="M52 160 L104 172 L190 176 L268 162 L298 128 L250 150 L170 158 L96 154 Z" fill="#6c5f52" />
      <path d="M92 96 L130 84 M180 120 L214 106 M120 140 L150 132 M230 92 L256 100" stroke="#5d5247" strokeWidth="2" strokeLinecap="round" />
      {GRAINS.map((g, i) => (
        <polygon
          key={i}
          points={`${g.x - g.r},${g.y} ${g.x},${g.y - g.r * 0.8} ${g.x + g.r},${g.y + g.r * 0.2} ${g.x + g.r * 0.2},${g.y + g.r}`}
          transform={`rotate(${g.a} ${g.x} ${g.y})`}
          fill={bright ? "#ffd23f" : "#b39b62"}
          stroke={bright ? "#fff3b0" : "none"}
          strokeWidth={bright ? 0.4 : 0}
          opacity={bright ? 1 : 0.55}
        />
      ))}
    </>
  );
}

function RockLens({ onFound }) {
  const box = useRef(null);
  const [pos, setPos] = useState({ x: 110, y: 100 });
  const drag = useRef(false);
  const moved = useRef({ first: 0, done: false, total: 0 });
  const clamp = (p) => ({ x: Math.min(W - 30, Math.max(30, p.x)), y: Math.min(H - 24, Math.max(24, p.y)) });
  const track = (d) => {
    const m = moved.current;
    if (m.done) return;
    const now = performance.now();
    if (!m.first) m.first = now;
    m.total += d;
    if (now - m.first >= EXPLORE_MS && m.total > 120) {
      m.done = true;
      play("project");
      onFound();
    }
  };
  const at = useRef(pos);
  const moveTo = (p) => {
    const n = clamp(p);
    track(Math.hypot(n.x - at.current.x, n.y - at.current.y));
    at.current = n;
    setPos(n);
  };
  const fromEvent = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  // A slow check so the finding also shows if the child stops right after 3 s.
  useEffect(() => {
    const t = setInterval(() => track(0), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="gold-rock">
      <svg
        ref={box}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          moveTo(fromEvent(e));
        }}
        onPointerMove={(e) => drag.current && moveTo(fromEvent(e))}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
        aria-hidden="true"
      >
        <defs>
          <clipPath id="gold-lens-clip">
            <circle cx={pos.x} cy={pos.y} r={LENS_R} />
          </clipPath>
        </defs>
        <Rock />
        <g clipPath="url(#gold-lens-clip)">
          <rect x="0" y="0" width={W} height={H} fill="#f4ecd8" />
          <g transform={`translate(${pos.x} ${pos.y}) scale(${ZOOM}) translate(${-pos.x} ${-pos.y})`}>
            <Rock bright />
          </g>
        </g>
        <circle cx={pos.x} cy={pos.y} r={LENS_R} fill="none" stroke="#3b2d16" strokeWidth="6" />
        <circle cx={pos.x} cy={pos.y} r={LENS_R - 3} fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
        <line
          x1={pos.x + LENS_R * 0.7}
          y1={pos.y + LENS_R * 0.7}
          x2={pos.x + LENS_R * 1.35}
          y2={pos.y + LENS_R * 1.35}
          stroke="#3b2d16"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </svg>
      <button
        type="button"
        className="gold-lens-key"
        aria-label="العدسة: استعمل الأسهم لتحريكها فوق الصخرة"
        style={{ left: `${(pos.x / W) * 100}%`, top: `${(pos.y / H) * 100}%` }}
        onKeyDown={(e) => {
          const step = 14;
          const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
          if (!d) return;
          e.preventDefault();
          moveTo({ x: pos.x + d[0], y: pos.y + d[1] });
        }}
      />
      <span className="gold-badge">رسم توضيحي</span>
      <p className="gold-tip">حرّك العدسة فوق الصخرة</p>
    </div>
  );
}

function GoldGrains() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <rect width={W} height={H} rx="14" fill="#f4ecd8" />
      <g transform={`translate(160 95) scale(1.6) translate(-160 -95)`}>
        <Rock bright />
      </g>
    </svg>
  );
}

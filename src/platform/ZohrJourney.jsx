import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ArrowRight, CheckCircle, Play, XCircle, Drop, Lightbulb } from "phosphor-react";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./zohr-journey.css";

// «رحلة حقل ظهر للغاز الطبيعي» (lesson 1, gas; 2026-11-27). States, in order:
// flying (the satellite map moves from the coast out to sea, to the Zohr
// field's marker, about 2 s) → video (the offshore platform, in the map's own
// frame; a play button if the browser holds it) → diving (the sea surface rises,
// the water darkens, light rays and bubbles) → explore (an illustrated cut:
// sea water, the sea floor and the rocks under it; two places to tap) → quiz
// («أين يوجد الغاز الطبيعي في هذا المشهد؟», answered by tapping a place).
// «العودة إلى الخريطة» is there throughout: it stops the media and puts the
// map back where it was. Nothing here is graded or saved.
export const GAS_ID = "gas";
const FLY_MS = 2000;
const DIVE_MS = 2600;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SAY = {
  water: "هذه مياه البحر، ويقع قاع البحر أسفلها.",
  rocks: "يوجد الغاز الطبيعي داخل صخور تحت قاع البحر.",
};
const QUESTION = "أين يوجد الغاز الطبيعي في هذا المشهد؟";
const RIGHT = "أحسنت! يوجد الغاز الطبيعي داخل الصخور تحت قاع البحر.";
const WRONG = "انظر أسفل القاع وحاول مرة أخرى.";

export default function ZohrJourney({ map, resource, video, onLeave, onToolsHidden }) {
  const site = resource.locations?.[0];
  const [phase, setPhase] = useState("flying");
  const [arrived, setArrived] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(!video);
  const [lit, setLit] = useState(null);
  const [seen, setSeen] = useState(() => new Set());
  const [answer, setAnswer] = useState(null);
  const clip = useRef(null);
  const stageRef = useRef(null);
  const panelRef = useRef(null);
  const before = useRef(null);
  const timers = useRef([]);
  const alive = useRef(true);
  const later = (fn, ms) => timers.current.push(setTimeout(() => alive.current && fn(), ms));

  useEffect(() => {
    alive.current = true;
    before.current = { center: map.getCenter(), zoom: map.getZoom() };
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      clip.current?.pause();
      narrator.stop();
      onToolsHidden?.(false);
    };
  }, []);
  useEffect(() => {
    onToolsHidden?.(true);
  }, []);
  // The picture ends where the bar under it starts, whatever its height.
  useEffect(() => {
    const bar = panelRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => stageRef.current?.style.setProperty("--ph", `${bar.offsetHeight}px`));
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Flying: start over the coast (land in the lower part), then out to sea.
  useEffect(() => {
    if (!site) return undefined;
    const target = [site.lat, site.lng];
    const zoom = Math.min(map.getMaxZoom?.() || 18, 10);
    map.stop();
    let label = null;
    let halo = null;
    const arrive = () => {
      if (!alive.current) return;
      halo = L.circleMarker(target, {
        radius: 26,
        color: "#ffd34d",
        weight: 4,
        fillColor: "#ffd34d",
        fillOpacity: 0.2,
        interactive: false,
        className: "zohr-halo",
      }).addTo(map);
      label = L.tooltip({ permanent: true, direction: "top", offset: [0, -24], className: "zohr-label" })
        .setLatLng(target)
        .setContent("حقل ظهر")
        .addTo(map);
      setArrived(true);
      play("energy");
      later(() => setPhase("video"), reducedMotion() ? 600 : 1300);
    };
    if (reducedMotion()) {
      map.setView(target, zoom, { animate: false });
      arrive();
    } else {
      map.setView([31.45, 32.45], 8, { animate: false });
      later(() => {
        map.flyTo(target, zoom, { duration: FLY_MS / 1000, easeLinearity: 0.2 });
        map.once("moveend", arrive);
      }, 250);
    }
    return () => {
      map.off("moveend", arrive);
      halo?.remove();
      label?.remove();
    };
  }, []);

  // The video starts by itself on arrival; a play button if it is held.
  useEffect(() => {
    if (phase === "video" && !failed) startVideo();
    if (phase !== "video") clip.current?.pause();
  }, [phase]);
  function startVideo() {
    const v = clip.current;
    if (!v) return;
    setBlocked(false);
    v.play().catch(() => setBlocked(true));
  }
  function dive() {
    play("water");
    clip.current?.pause();
    setPhase("diving");
    later(() => setPhase("explore"), reducedMotion() ? 0 : DIVE_MS);
  }
  function touch(place) {
    if (phase === "quiz") {
      setLit(place);
      setAnswer(place);
      play(place === "rocks" ? "correct" : "wrong");
      return;
    }
    play("select");
    setLit(place);
    setSeen((s) => new Set(s).add(place));
  }
  function back() {
    play("close");
    timers.current.forEach(clearTimeout);
    clip.current?.pause();
    narrator.stop();
    const b = before.current;
    if (b) map.setView(b.center, b.zoom, { animate: !reducedMotion() });
    onLeave();
  }
  const under = phase === "explore" || phase === "quiz";
  const say = phase === "quiz" ? (answer === "rocks" ? RIGHT : answer === "water" ? WRONG : null) : lit ? SAY[lit] : null;

  return (
    <div className="zohr" dir="rtl">
      <section ref={stageRef} className={`zohr-stage is-${phase} ${arrived ? "is-arrived" : ""}`} aria-label="رحلة حقل ظهر للغاز الطبيعي">
        {video && (
          <div className="zohr-video" hidden={failed}>
            <video
              ref={clip}
              src={video}
              preload="auto"
              playsInline
              controls
              controlsList="nodownload"
              aria-label="فيديو منشأة حقل ظهر في البحر المتوسط"
              onError={() => setFailed(true)}
            />
            {phase === "video" && blocked && (
              <button type="button" className="zohr-play" onClick={startVideo}>
                <Play size={28} weight="fill" aria-hidden="true" /> شغّل الفيديو
              </button>
            )}
          </div>
        )}
        {phase === "video" && failed && (
          <p className="zohr-missing" role="alert">
            {video ? "تعذّر تحميل فيديو حقل ظهر." : "فيديو حقل ظهر غير مضاف بعد."}
          </p>
        )}

        {/* The dive: the surface rises out of view, the water darkens. */}
        <div className="zohr-dive" aria-hidden="true">
          <span className="zohr-surface" />
          <span className="zohr-rays" />
          <span className="zohr-bubbles">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ "--x": `${(i * 37) % 100}%`, "--d": `${(i % 7) * 0.25}s`, "--s": `${6 + (i % 4) * 3}px` }} />
            ))}
          </span>
        </div>

        {under && (
          <div className="zohr-cut">
            <SeaCut lit={lit} onTouch={touch} quiz={phase === "quiz"} />
            <span className="zohr-tag">مشهد توضيحي</span>
          </div>
        )}

        <div className="zohr-panel" ref={panelRef}>
          {phase === "flying" && <p className="zohr-caption">{arrived ? "وصلنا إلى حقل ظهر في البحر المتوسط" : "من الساحل إلى البحر المتوسط…"}</p>}
          {phase === "video" && (
            <>
              <p className="zohr-caption">منشأة حقل ظهر للغاز الطبيعي في البحر المتوسط</p>
              <button type="button" className="zohr-main" onClick={dive}>
                <Drop size={20} weight="fill" aria-hidden="true" /> اغطس تحت سطح البحر
              </button>
            </>
          )}
          {phase === "diving" && <p className="zohr-caption">ننزل تحت سطح البحر…</p>}
          {under && (
            <>
              <p className="zohr-caption">
                {phase === "quiz" ? <strong>{QUESTION}</strong> : "اضغط على «مياه البحر» ثم على «الصخور تحت القاع»."}
              </p>
              {say && (
                <p className={`zohr-say ${phase === "quiz" ? (answer === "rocks" ? "is-right" : "is-wrong") : ""}`} role="status">
                  {phase === "quiz" ? (answer === "rocks" ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <XCircle size={22} weight="fill" aria-hidden="true" />) : <Lightbulb size={22} weight="fill" aria-hidden="true" />}
                  {say}
                </p>
              )}
              {phase === "explore" && seen.size === 2 && (
                <button
                  type="button"
                  className="zohr-main"
                  onClick={() => {
                    play("select");
                    setLit(null);
                    setAnswer(null);
                    setPhase("quiz");
                  }}
                >
                  اختبر ملاحظتك
                </button>
              )}
            </>
          )}
          <button type="button" className="zohr-back" onClick={back}>
            <ArrowRight size={18} aria-hidden="true" /> العودة إلى الخريطة
          </button>
        </div>
      </section>
    </div>
  );
}

// An illustrated cut through the sea at the field: water, the sea floor, and
// layers of rock under it with gas held in one of them. Two tappable places.
function SeaCut({ lit, onTouch, quiz }) {
  const place = (id, label) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    "aria-pressed": lit === id,
    className: `zohr-place is-${id} ${lit === id ? "is-lit" : ""}`,
    onClick: () => onTouch(id),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onTouch(id);
      }
    },
  });
  return (
    <svg viewBox="0 0 1000 360" preserveAspectRatio="xMidYMid slice" className={quiz ? "is-quiz" : ""}>
      <defs>
        <linearGradient id="zc-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c6fae" />
          <stop offset="1" stopColor="#0b2e55" />
        </linearGradient>
        <linearGradient id="zc-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8875c" />
          <stop offset="1" stopColor="#6e5434" />
        </linearGradient>
      </defs>
      <g {...place("water", "مياه البحر")}>
        <rect x="0" y="0" width="1000" height="140" fill="url(#zc-sea)" />
        <rect className="zohr-glow" x="0" y="0" width="1000" height="140" />
        <text x="300" y="82" textAnchor="middle" className="zohr-name">مياه البحر</text>
      </g>
      {/* the sea floor */}
      <path d="M0 140 Q150 128 300 138 T600 136 T1000 142 V160 H0z" fill="#c9a76f" />
      <text x="820" y="156" textAnchor="middle" className="zohr-small">قاع البحر</text>
      <g {...place("rocks", "الصخور تحت القاع")}>
        <path d="M0 160 H1000 V360 H0z" fill="url(#zc-rock)" />
        <path d="M0 200 Q250 190 500 202 T1000 196" stroke="#5a442a" strokeWidth="3" fill="none" />
        <path d="M0 290 Q260 278 520 292 T1000 286" stroke="#5a442a" strokeWidth="3" fill="none" />
        {/* gas held in a rock layer */}
        <ellipse cx="500" cy="244" rx="190" ry="24" fill="#d8d2c4" opacity="0.65" />
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={330 + ((i * 53) % 340)} cy={236 + ((i * 7) % 18)} r={3 + (i % 3)} fill="#fff" opacity="0.7" />
        ))}
        <rect className="zohr-glow" x="0" y="160" width="1000" height="200" />
        <text x="300" y="330" textAnchor="middle" className="zohr-name">الصخور تحت القاع</text>
      </g>
      {/* the well from the platform down through the water */}
      <path d="M500 0 V236" stroke="#e9eef3" strokeWidth="6" strokeDasharray="14 8" opacity="0.8" pointerEvents="none" />
    </svg>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowCounterClockwise, Play, SpeakerHigh, MapPin, Warning } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./galala-journey.css";

const Site3DView = lazy(() => import("./Site3DView"));

// «رحلة إلى مدينة الجلالة» (lesson 3), all in the map's own space:
// teacher line → the map shows the Red Sea coast and the mountain (≈3 s) →
// the 3D camera climbs from the coast toward the plateau over real terrain
// (≈4.5 s) → the video (loaded from the start) fades in over the last view →
// at its end, back to the map on a clear view of the city with a short card,
// «استمع للمعلومة» and «أعد الرحلة».
//
// Places read off the Esri satellite imagery (checked 2026-11-03): the city
// lies on the plateau at about 29.434°N 32.402°E; the coast is to its
// north-east. The lesson's own pin (29.42, 32.48) is an older approximate one.
export const GALALA_ID = "galala-city";
export const CITY = [29.434, 32.402];
const COAST_VIEW = [
  [29.3, 32.25],
  [29.56, 32.62],
];
// The climb, as [lng, lat] centres. The last step must look like the first
// frame of the video (coast and mountain, wide): tune its bearing (0 north,
// 90 east, 180 south, 270 west) and pitch (0 from above, ~70 almost level)
// once the edited video is in.
export const GALALA_CLIMB = [
  { center: [32.47, 29.47], zoom: 11.6, pitch: 50, bearing: 230, duration: 2000 },
  { center: [32.43, 29.45], zoom: 12.6, pitch: 66, bearing: 222, duration: 2600 },
];
const START = { lat: 29.48, lng: 32.5 };
const HOLD_END_MS = 1200;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// States, in this order only: ascending (map to the coast, then the 3D climb)
// → video (a window over the map) → info (the card) → closed (onLeave).
// A video that is missing or fails gives a clear message with «تخطَّ».
export default function GalalaJourney({ map, resource, video, onLeave, onToolsHidden }) {
  const [phase, setPhase] = useState("ascending");
  const [climbing, setClimbing] = useState(false);
  const [run, setRun] = useState(0);
  const [hello, setHello] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(!video);
  const [zoom, setZoom] = useState(10);
  const clip = useRef(null);
  const timers = useRef([]);
  const alive = useRef(true);
  const later = (fn, ms) => timers.current.push(setTimeout(() => alive.current && fn(), ms));
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Map tools stay hidden while the video and the card are shown.
  useEffect(() => {
    onToolsHidden?.(phase === "video" || phase === "info");
  }, [phase]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clear();
      narrator.stop();
      clip.current?.pause();
      onToolsHidden?.(false);
    };
  }, []);

  // Ascending: other sounds stop, the line shows, the map goes to the coast,
  // then the camera climbs to the plateau.
  useEffect(() => {
    clear();
    narrator.stop();
    clip.current?.pause();
    setPhase("ascending");
    setClimbing(false);
    setHello(true);
    setBlocked(false);
    const animate = !reducedMotion();
    map.stop();
    map.flyToBounds(COAST_VIEW, { padding: [40, 40], animate, duration: 2.8 });
    later(() => setHello(false), reducedMotion() ? 2500 : 4200);
    later(() => {
      setZoom(map.getZoom());
      setClimbing(true);
    }, animate ? 3100 : 300);
    return clear;
  }, [run]);

  // Video: it starts as soon as the climb ends; a blocked start shows a big
  // play button, a missing or broken file a message with «تخطَّ».
  function startVideo() {
    const v = clip.current;
    if (!v) return;
    setBlocked(false);
    v.currentTime = 0;
    v.play().catch(() => setBlocked(true));
  }
  useEffect(() => {
    if (phase === "video" && !failed) startVideo();
  }, [phase]);
  function toInfo() {
    clip.current?.pause();
    map.setView(CITY, 14, { animate: false });
    setPhase("info");
  }

  return (
    <div className="gj" dir="rtl">
      {climbing && phase !== "info" && (
        <Suspense fallback={null}>
          <Site3DView
            key={run}
            inline
            site={{ ...START, name: resource.label, resource }}
            startZoom={zoom - 1}
            camera={{ path: GALALA_CLIMB }}
            onArrive={() => setPhase((p) => (p === "ascending" ? "video" : p))}
          />
        </Suspense>
      )}

      {phase === "ascending" && (
        <span className="gj-name">
          <MapPin size={18} weight="fill" aria-hidden="true" /> {resource.label}
        </span>
      )}

      {hello && phase === "ascending" && (
        <div className="gj-hello" role="status">
          <p>نصعد من ساحل البحر الأحمر لنكتشف مدينة الجلالة</p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      )}

      {/* The video window is in the page from the start so the file loads
          during the climb; it shows once the climb ends. */}
      <section
        className={`gj-window ${phase === "video" ? "is-on" : ""}`}
        role="dialog"
        aria-label={`فيديو ${resource.label}`}
        aria-hidden={phase !== "video"}
      >
        <header>
          <h2>
            <MapPin size={20} weight="fill" aria-hidden="true" /> {resource.label}
          </h2>
          <button type="button" className="gj-skip" onClick={toInfo}>
            تخطَّ <ArrowLeft size={18} aria-hidden="true" />
          </button>
        </header>
        {failed ? (
          <div className="gj-missing" role="alert">
            <Warning size={30} weight="fill" aria-hidden="true" />
            <p>
              {video ? "تعذّر تحميل فيديو مدينة الجلالة." : "فيديو مدينة الجلالة غير مضاف بعد."}
            </p>
            {video && (
              <button
                type="button"
                onClick={() => {
                  setFailed(false);
                  clip.current?.load();
                  later(startVideo, 300);
                }}
              >
                <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> إعادة المحاولة
              </button>
            )}
          </div>
        ) : null}
        {video && (
          <div className="gj-player" hidden={failed}>
            <video
              ref={clip}
              src={video}
              preload="auto"
              playsInline
              controls
              controlsList="nodownload"
              onEnded={() => later(toInfo, HOLD_END_MS)}
              onError={() => setFailed(true)}
            />
            {phase === "video" && blocked && (
              <button type="button" className="gj-start" onClick={startVideo}>
                <Play size={30} weight="fill" aria-hidden="true" /> ابدأ المشاهدة
              </button>
            )}
          </div>
        )}
      </section>

      {phase === "info" && (
        <aside className="gj-card" aria-label={resource.label}>
          <h2>
            <MapPin size={24} weight="fill" aria-hidden="true" /> {resource.label}
          </h2>
          <div className="gj-card-text">
            <p>{resource.description}</p>
            {resource.importance && <p>{resource.importance}</p>}
          </div>
          <button type="button" onClick={() => narrator.speak([resource.label, resource.description, resource.importance].filter(Boolean).join(". "))}>
            <SpeakerHigh size={20} aria-hidden="true" /> استمع للمعلومة
          </button>
          <button
            type="button"
            className="gj-main"
            onClick={() => {
              play("open");
              setFailed(!video);
              setRun((n) => n + 1);
            }}
          >
            <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /> أعد الرحلة
          </button>
          <button
            type="button"
            className="gj-link"
            onClick={() => {
              narrator.stop();
              onLeave();
            }}
          >
            إغلاق
          </button>
        </aside>
      )}
    </div>
  );
}

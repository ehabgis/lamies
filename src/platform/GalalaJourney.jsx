import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowCounterClockwise, Pause, Play, SpeakerHigh, MapPin, Warning } from "phosphor-react";
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

export default function GalalaJourney({ map, resource, video, onLeave }) {
  // hello+approach → climb → video → end; or error when the video fails.
  const [phase, setPhase] = useState("approach");
  const [run, setRun] = useState(0);
  const [hello, setHello] = useState(true);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [zoom, setZoom] = useState(10);
  const clip = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Steps 2–3: other sounds stop, the teacher speaks in a bubble, and the map
  // travels to the coast and the mountain.
  useEffect(() => {
    narrator.stop();
    document.querySelectorAll("video").forEach((v) => v !== clip.current && v.pause());
    setPhase("approach");
    setHello(true);
    setLeaving(false);
    setBlocked(false);
    clip.current?.pause();
    if (clip.current) clip.current.currentTime = 0;
    const animate = !reducedMotion();
    map.stop();
    map.flyToBounds(COAST_VIEW, { padding: [40, 40], animate, duration: 2.8 });
    later(() => setHello(false), reducedMotion() ? 2500 : 3200);
    later(() => {
      setZoom(map.getZoom());
      setPhase("climb");
    }, animate ? 3100 : 300);
    return clear;
  }, [run]);
  useEffect(() => () => {
    clear();
    narrator.stop();
  }, []);

  // Step 6: start the video over the last view of the climb.
  function startVideo() {
    const v = clip.current;
    if (!v) return setPhase("end");
    v.currentTime = 0;
    v.play()
      .then(() => setPaused(false))
      .catch(() => setBlocked(true));
  }
  useEffect(() => {
    if (phase === "video" && ready) startVideo();
  }, [phase, ready]);

  // Step 8: no loop; hold the last frame, then fade to the map on the city.
  function ended() {
    map.setView(CITY, 14, { animate: false });
    later(() => setLeaving(true), HOLD_END_MS);
    later(() => setPhase("end"), HOLD_END_MS + 900);
  }
  function backToMap() {
    clear();
    clip.current?.pause();
    map.setView(CITY, 14, { animate: false });
    setLeaving(false);
    setPhase("end");
  }
  const showVideo = phase === "video";

  return (
    <div className="gj" dir="rtl">
      {(phase === "climb" || phase === "video") && (
        <Suspense fallback={null}>
          <Site3DView
            key={run}
            inline
            site={{ ...START, name: resource.label, resource }}
            startZoom={zoom - 1}
            camera={{ path: GALALA_CLIMB }}
            onArrive={() => setPhase((p) => (p === "climb" ? (video ? "video" : "end") : p))}
          />
        </Suspense>
      )}

      {video && (
        <section className={`gj-video ${showVideo && ready && !leaving ? "is-on" : ""}`} aria-hidden={!showVideo}>
          <video
            ref={clip}
            src={video}
            preload="auto"
            muted
            playsInline
            onCanPlay={() => setReady(true)}
            onEnded={ended}
            onError={() => setPhase((p) => (p === "end" ? p : "error"))}
            aria-label={`فيديو ${resource.label}`}
          />
          {showVideo && blocked && (
            <button type="button" className="gj-start" onClick={() => (setBlocked(false), startVideo())}>
              <Play size={26} weight="fill" aria-hidden="true" /> ابدأ المشاهدة
            </button>
          )}
          {showVideo && (
            <div className="gj-tools">
              <button
                type="button"
                aria-label={paused ? "تشغيل" : "إيقاف مؤقت"}
                onClick={() => {
                  const v = clip.current;
                  if (v.paused) v.play().then(() => setPaused(false)).catch(() => {});
                  else {
                    v.pause();
                    setPaused(true);
                  }
                }}
              >
                {paused ? <Play size={22} weight="fill" /> : <Pause size={22} weight="fill" />}
              </button>
              <button type="button" aria-label="إعادة المشاهدة" onClick={() => (setLeaving(false), startVideo())}>
                <ArrowCounterClockwise size={22} weight="bold" />
              </button>
              <button type="button" className="gj-back" onClick={backToMap}>
                <ArrowRight size={20} weight="bold" aria-hidden="true" /> العودة للخريطة
              </button>
            </div>
          )}
        </section>
      )}

      {phase !== "end" && phase !== "error" && (
        <span className="gj-name">
          <MapPin size={18} weight="fill" aria-hidden="true" /> {resource.label}
        </span>
      )}

      {hello && (phase === "approach" || phase === "climb") && (
        <div className="gj-hello" role="status">
          <p>هيا نصعد من ساحل البحر الأحمر لاكتشاف مدينة الجلالة!</p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      )}

      {(phase === "end" || phase === "error") && (
        <aside className="gj-card" aria-label={resource.label}>
          <h2>
            <MapPin size={24} weight="fill" aria-hidden="true" /> {resource.label}
          </h2>
          <p>{resource.description}</p>
          {phase === "error" && (
            <p className="gj-error" role="alert">
              <Warning size={18} weight="fill" aria-hidden="true" /> تعذّر تحميل الفيديو.
            </p>
          )}
          <button type="button" onClick={() => narrator.speak(`${resource.label}. ${resource.description}`)}>
            <SpeakerHigh size={20} aria-hidden="true" /> استمع للمعلومة
          </button>
          <button
            type="button"
            className="gj-main"
            onClick={() => {
              play("open");
              if (phase === "error") {
                setReady(false);
                clip.current?.load();
              }
              setRun((n) => n + 1);
            }}
          >
            <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
            {phase === "error" ? "إعادة المحاولة" : "أعد الرحلة"}
          </button>
          <button type="button" className="gj-link" onClick={onLeave}>
            إغلاق
          </button>
        </aside>
      )}
    </div>
  );
}

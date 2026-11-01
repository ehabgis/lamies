import { useEffect, useRef, useState } from "react";
import { ArrowRight, SpeakerHigh, SpeakerSlash } from "phosphor-react";
import { isMuted } from "./sfx";
import "./reservoir-tour.css";

// «خزان أسوان» (lesson 1): one connected camera journey. The 2D map travels
// from a wide view of the Nile down to the reservoir, the scene tilts and turns
// in 3D (Site3DView inline, `RESERVOIR_CAMERA`), and the video fades in over the
// same space, without a window or frame. The video is loaded from the first
// tap, so it is ready when the camera arrives. Its sound rises slowly with the
// approach; it follows the site's sound switch.
export const RESERVOIR_ID = "hydro-aswan-reservoir";
// Where the 3D camera ends. Match it to the first frame of the video:
// bearing = the direction the video's first shot looks (0 north, 90 east),
// pitch = how steeply it looks down (0 straight down, 70 almost level).
// center: the dam itself, read off the satellite imagery (the lesson's pin for
// «خزان أسوان» is an approximate place ~3 km east of it).
export const DAM = [24.035, 32.869];
export const RESERVOIR_CAMERA = { center: [DAM[1], DAM[0]], zoom: 15.2, pitch: 58, bearing: 0, duration: 4200 };
const NILE = [
  [22.6, 31.4],
  [26.2, 33.4],
];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Step 1 on the 2D map: the wide Nile, then down to the reservoir.
export function ReservoirApproach({ map, site, onArrive }) {
  useEffect(() => {
    const target = DAM;
    let timer;
    const landed = () => (timer = setTimeout(() => onArrive(map.getZoom()), 300));
    if (reducedMotion()) {
      map.setView(target, 13, { animate: false });
      timer = setTimeout(() => onArrive(13), 200);
    } else {
      map.flyToBounds(NILE, { padding: [60, 60], duration: 1.4 });
      timer = setTimeout(() => {
        map.flyTo(target, 13.5, { duration: 2.6, easeLinearity: 0.2 });
        map.once("moveend", landed);
      }, 1900);
    }
    return () => {
      clearTimeout(timer);
      map.off("moveend", landed);
    };
  }, [map, site.lat, site.lng]);
  return null;
}

// Steps 3–5: the video in the map's own space, then «العودة للخريطة».
export function ReservoirVideo({ src, show, name, onBack }) {
  const video = useRef(null);
  const [muted, setMuted] = useState(isMuted());
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const v = video.current;
    if (!show || !v) return undefined;
    v.muted = muted;
    v.volume = reducedMotion() ? 1 : 0.12;
    v.play().catch(() => {
      // The browser refused sound without a fresh tap: play silently.
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    if (reducedMotion()) return undefined;
    // The water gets louder as the camera comes closer.
    const t0 = performance.now();
    let frame;
    const rise = (t) => {
      const k = Math.min((t - t0) / 6000, 1);
      v.volume = 0.12 + 0.88 * k;
      if (k < 1) frame = requestAnimationFrame(rise);
    };
    frame = requestAnimationFrame(rise);
    return () => cancelAnimationFrame(frame);
  }, [show]);
  return (
    <section className={`rv ${show ? "is-on" : ""}`} aria-hidden={!show} aria-label={`فيديو ${name}`}>
      <video
        ref={video}
        src={src}
        preload="auto"
        playsInline
        onEnded={() => setEnded(true)}
        aria-label={`فيديو ${name}`}
      />
      {show && (
        <div className="rv-tools">
          <button
            type="button"
            className="rv-sound"
            aria-pressed={!muted}
            aria-label={muted ? "تشغيل صوت المياه" : "كتم الصوت"}
            onClick={() => {
              video.current.muted = !muted;
              setMuted(!muted);
            }}
          >
            {muted ? <SpeakerSlash size={22} weight="bold" /> : <SpeakerHigh size={22} weight="bold" />}
          </button>
          <button type="button" className={`rv-back ${ended ? "is-ended" : ""}`} onClick={onBack}>
            <ArrowRight size={22} weight="bold" aria-hidden="true" /> العودة للخريطة
          </button>
        </div>
      )}
    </section>
  );
}

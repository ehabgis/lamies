import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, CheckCircle, Play, SpeakerHigh, Sparkle, Warning, XCircle } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./gold-journey.css";

// «رحلة الذهب» (lesson 1, gold; 2026-11-27). States, in this order:
// focus (the map comes close to the Sukari mine, the robot speaks beside its
// marker, the card shows a real ore sample and «شاهد رحلة الذهب»)
// → intro (about 4.5 s in the map's own frame: the camera closes in on the
// mine and tilts, an open pit seen from above, the camera goes down toward
// its steps, then a short walk in a lit rock tunnel marked «مشهد توضيحي»)
// → video (the gold clip in the same frame, loaded during the intro)
// → info (the mine and the uses, with a quick question).
// «تخطَّ المقدمة» starts the video at once; «العودة إلى الخريطة» stops the
// media and goes back to the mine on the map.
export const GOLD_ID = "gold";
const ASK = "هنا منجم السكري. تعال نشوف رحلة الذهب!";
const ORE = "معدن ثمين يوجد في الصخور داخل منجم السكري.";
const QUESTION = "هل يُستخرج الذهب من الصخور جاهزًا على شكل سبيكة؟";
const RIGHT = "أحسنت! يحتاج الخام إلى الاستخراج والمعالجة للحصول على الذهب";
const WRONG = "حاول مرة أخرى. تذكّر مشاهد المعالجة والصهر في الفيديو";
const ORE_PHOTO = "/lesson-media/gold-ore-sample.jpg";
const PIT_PHOTO = "/lesson-media/sites/gold-sukari.jpg";
const TUNNEL_PHOTO = "/lesson-media/sites/gold-sukari-3.jpg";
// The intro's beats (ms from «شاهد رحلة الذهب»).
const CLOSE_IN_MS = 1200;
const PIT_MS = 1600;
const TUNNEL_MS = 1700;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function GoldJourney({ map, resource, video, onLeave, onToolsHidden }) {
  const site = resource.locations?.[0];
  const [phase, setPhase] = useState("focus");
  const [beat, setBeat] = useState("map"); // intro: map → pit → tunnel
  const [spot, setSpot] = useState(null);
  const [ask, setAsk] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(!video);
  const [load, setLoad] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [run, setRun] = useState(0);
  const clip = useRef(null);
  const timers = useRef([]);
  const alive = useRef(true);
  const later = (fn, ms) => timers.current.push(setTimeout(() => alive.current && fn(), ms));
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const stage = phase === "intro" || phase === "video";

  useEffect(() => {
    alive.current = true;
    const off = narrator.subscribe((s) => setSpeaking(s.state === "speaking"));
    return () => {
      alive.current = false;
      clear();
      off?.();
      narrator.stop();
      clip.current?.pause();
      untilt();
      onToolsHidden?.(false);
    };
  }, []);
  // The map's tool list (right) steps aside for the card all along; «عرض
  // الجميع» and «المفتاح والأدوات» stay.
  useEffect(() => {
    onToolsHidden?.(true);
  }, []);

  // The golden halo on the mine.
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
    return () => halo.remove();
  }, []);

  // The robot stands beside the mine's marker (below the map's buttons) and
  // follows it when the map moves.
  useEffect(() => {
    if (!site) return undefined;
    const place = () => {
      const p = map.latLngToContainerPoint([site.lat, site.lng]);
      const size = map.getSize();
      setSpot({ x: p.x, y: p.y, w: size.x, h: size.y });
    };
    place();
    map.on("move zoom moveend", place);
    return () => map.off("move zoom moveend", place);
  }, []);

  // Focus: close in on Sukari, the mine in the free space left of the card.
  useEffect(() => {
    if (phase !== "focus" || !site) return undefined;
    flyToMine();
    setAsk(true);
    let spoke = false;
    const off = narrator.subscribe((st) => {
      if (st.state === "speaking") spoke = true;
      else if (spoke) later(() => setAsk(false), 1500);
    });
    narrator.speak(ASK);
    later(() => !spoke && setAsk(false), 8000);
    return () => off?.();
  }, [phase === "focus", run]);

  function flyToMine(zoomIn = 0) {
    const narrow = window.innerWidth <= 850;
    const z = Math.min(map.getMaxZoom?.() || 18, 12 + zoomIn);
    const size = map.getSize();
    // Leave room for the card (right) on wide screens, and for it below on phones.
    const shift = narrow ? L.point(0, size.y * 0.18) : L.point(Math.min(200, size.x * 0.17), 0);
    const centre = map.unproject(map.project([site.lat, site.lng], z).add(shift), z);
    map.stop();
    map.flyTo(centre, z, { animate: !reducedMotion(), duration: zoomIn ? CLOSE_IN_MS / 1000 : 1.4 });
  }
  function tilt() {
    const el = map.getContainer();
    el.classList.add("gold-tilting");
  }
  function untilt() {
    map.getContainer?.().classList.remove("gold-tilting");
  }

  function watch() {
    play("open");
    narrator.stop();
    setAsk(false);
    setFailed(!video);
    setLoad(true);
    if (reducedMotion()) return startVideoPhase();
    setPhase("intro");
    setBeat("map");
    flyToMine(2);
    tilt();
    later(() => {
      setBeat("pit");
      untilt();
    }, CLOSE_IN_MS);
    later(() => setBeat("tunnel"), CLOSE_IN_MS + PIT_MS);
    later(startVideoPhase, CLOSE_IN_MS + PIT_MS + TUNNEL_MS);
  }
  function startVideoPhase() {
    clear();
    untilt();
    setLoad(true);
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
  function backToMap() {
    play("close");
    clear();
    untilt();
    clip.current?.pause();
    narrator.stop();
    setPhase("focus");
    setRun((n) => n + 1);
  }
  function toInfo() {
    clip.current?.pause();
    untilt();
    setPhase("info");
    flyToMine();
  }
  function again() {
    play("select");
    narrator.stop();
    clear();
    setAnswer(null);
    setFailed(!video);
    setPhase("focus");
    setRun((n) => n + 1);
  }
  const info = [resource.description, resource.importance].filter(Boolean);
  // The robot and its bubble: left of the marker, never above the buttons row.
  const askStyle = spot
    ? {
        right: `${Math.max(8, spot.w - spot.x + 26)}px`,
        top: `${Math.min(Math.max(spot.y + 18, 76), spot.h - 170)}px`,
      }
    : undefined;

  return (
    <div className={`gold ${stage ? "is-stage" : ""}`} dir="rtl">
      {/* The intro and the video share one frame in the map's own space. */}
      <section
        className={`gold-stage ${stage ? "is-on" : ""} at-${phase === "video" ? "video" : beat}`}
        role="dialog"
        aria-label="رحلة الذهب"
        aria-hidden={!stage}
      >
        <div className="gold-scenes" aria-hidden="true">
          <figure className="gold-scene is-pit">
            <img src={PIT_PHOTO} alt="" loading="lazy" />
          </figure>
          <figure className="gold-scene is-tunnel">
            <img src={TUNNEL_PHOTO} alt="" loading="lazy" />
            <figcaption>مشهد توضيحي</figcaption>
          </figure>
        </div>
        {video && (
          <div className="gold-player" hidden={failed || phase !== "video"}>
            <video
              ref={clip}
              src={load ? video : undefined}
              preload={load ? "auto" : "none"}
              playsInline
              controls
              controlsList="nodownload"
              aria-label="فيديو رحلة الذهب من منجم السكري"
              onEnded={() => later(toInfo, 800)}
              onError={() => load && setFailed(true)}
            />
            {phase === "video" && blocked && (
              <button type="button" className="gold-start" onClick={startVideo}>
                <Play size={28} weight="fill" aria-hidden="true" /> ابدأ المشاهدة
              </button>
            )}
          </div>
        )}
        {phase === "video" && failed && (
          <div className="gold-missing" role="alert">
            <Warning size={28} weight="fill" aria-hidden="true" />
            <p>{video ? "تعذّر تحميل فيديو رحلة الذهب." : "فيديو رحلة الذهب غير مضاف بعد."}</p>
            <button type="button" className="gold-skip" onClick={toInfo}>
              متابعة <ArrowLeft size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <footer className="gold-stage-bar">
          {phase === "video" && <p>فيديو: رحلة الذهب من منجم السكري</p>}
          {phase === "intro" && (
            <button type="button" className="gold-skip is-strong" onClick={startVideoPhase}>
              تخطَّ المقدمة <ArrowLeft size={18} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="gold-skip" onClick={backToMap}>
            <ArrowRight size={18} aria-hidden="true" /> العودة إلى الخريطة
          </button>
        </footer>
      </section>

      {phase === "focus" && ask && (
        <div className="gold-ask" role="status" style={askStyle}>
          <p>{ASK}</p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      )}

      {!stage && (
        <aside className="gold-card" aria-label="الذهب">
          <h2>
            <Sparkle size={24} weight="fill" aria-hidden="true" /> الذهب <small>خام معدني</small>
          </h2>

          {phase === "focus" && (
            <>
              <figure className="gold-ore">
                <img src={ORE_PHOTO} alt="عينة من خام الذهب: صخرة رمادية من الكوارتز تلمع فيها حبيبات ذهب صفراء" />
                <figcaption>عينة خام ذهب داخل الكوارتز · صورة: Rob Lavinsky، CC BY-SA 3.0</figcaption>
              </figure>
              <button type="button" className="gold-cta" onClick={watch}>
                <Play size={20} weight="fill" aria-hidden="true" /> شاهد رحلة الذهب
              </button>
              <p className="gold-ore-text">{ORE}</p>
            </>
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
            {phase === "info" && (
              <button type="button" onClick={again}>
                <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> أعد الرحلة
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
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Target,
  Lightbulb,
  Info,
  MapPin,
  SpeakerHigh,
  SpeakerSlash,
  Stop,
  Compass,
} from "phosphor-react";
import * as narrator from "./narrator";
import { play } from "./sfx";
import ResourcePin from "../components/Map/ResourcePin";
import RobotGuide from "../components/Map/RobotGuide";

const KEY = (id, section) => `lamis.montage.${id}.${section || "all"}.v1`;
const HEAD_ICON = { objectives: Target, concepts: Lightbulb, intro: Info };
const spokenText = (s) =>
  s.type === "objective" ? `بنهاية الرحلة أستطيع أن ${s.text}` : [s.title, s.text].filter(Boolean).join(". ");

// One small card over the map with one objective, concept or piece of
// information at a time. Every item of the section is laid out in the same
// grid cell, so the card is as tall as the longest item and never jumps or
// scrolls when the child moves on. Sound plays only from «استمع».
export default function LessonMontage({
  lessonId,
  scenes,
  section,
  sectionTitle,
  sectionInfo = {},
  nextSection,
  startAt = 0,
  onClose,
  onSpotlight,
}) {
  const [index, setIndex] = useState(startAt);
  const [narr, setNarr] = useState(narrator.getSettings());
  const cardRef = useRef(null);
  const scene = scenes[index];
  useEffect(() => narrator.subscribe(setNarr), []);
  useEffect(() => setIndex(startAt), [startAt]);
  useEffect(() => {
    if (!scene) return;
    narrator.stop();
    onSpotlight?.(scene.spotlight ? { ...scene.spotlight, side: cardSide(scene) } : null);
    cardRef.current?.focus({ preventScroll: true });
    try {
      localStorage.setItem(KEY(lessonId, section), String(index));
    } catch {}
    // Keyed on the item number only: the parent re-renders when the map moves.
  }, [index]);
  useEffect(
    () => () => {
      narrator.stop();
      onSpotlight?.(null);
    },
    [],
  );
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.target.closest?.("input,textarea")) return;
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  if (!scene) return null;
  const last = index === scenes.length - 1;
  const next = () => {
    if (!last) {
      play("tap");
      setIndex(index + 1);
    } else if (nextSection) nextSection.go();
    else onClose();
  };
  const prev = () => index > 0 && setIndex(index - 1);
  const speaking = narr.state === "speaking" || narr.state === "paused";
  function listen() {
    if (speaking) return narrator.stop();
    if (narr.muted) narrator.update({ muted: false });
    narrator.speak(spokenText(scene));
  }
  const HeadIcon = HEAD_ICON[section] || Info;

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      className={`mc-card side-${cardSide(scene)} mc-${section}`}
      role="region"
      aria-roledescription="بطاقة"
      aria-label={`${sectionTitle}: ${sectionInfo.unit || ""} ${index + 1} من ${scenes.length}`}
    >
      <header className="mc-head">
        <span className="mc-head-icon" aria-hidden="true">
          <HeadIcon weight="duotone" />
        </span>
        <h2>{sectionTitle}</h2>
        <button type="button" className="mc-x" aria-label="إغلاق" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>
      </header>
      {scenes.length > 1 && (
        <span className="mc-count" aria-live="polite">
          {sectionInfo.unit} <bdi>{index + 1}</bdi> من <bdi>{scenes.length}</bdi>
        </span>
      )}
      <div className="mc-stage">
        {scenes.map((s, i) => (
          <div className="mc-item" key={i} aria-hidden={i !== index} data-current={i === index || undefined}>
            <SceneBody scene={s} />
          </div>
        ))}
      </div>
      {narr.available && (
        <button type="button" className={`mc-listen ${speaking ? "is-on" : ""}`} onClick={listen}>
          {speaking ? (
            <>
              <Stop size={18} weight="fill" aria-hidden="true" /> إيقاف الصوت
            </>
          ) : narr.muted ? (
            <>
              <SpeakerSlash size={20} aria-hidden="true" /> {sectionInfo.listen || "استمع"}
            </>
          ) : (
            <>
              <SpeakerHigh size={20} aria-hidden="true" /> {sectionInfo.listen || "استمع"}
            </>
          )}
        </button>
      )}
      <footer className="mc-nav">
        <button type="button" className="mc-prev" disabled={!index} onClick={prev}>
          <ArrowRight size={20} weight="bold" aria-hidden="true" /> السابق
        </button>
        <button type="button" className="mc-next" onClick={next}>
          {!last ? "التالي" : nextSection ? nextSection.label : "إنهاء"}
          <ArrowLeft size={20} weight="bold" aria-hidden="true" />
        </button>
      </footer>
      {section === "objectives" && (
        <button type="button" className="mc-explore" onClick={onClose}>
          <Compass size={22} weight="duotone" aria-hidden="true" /> هيا نستكشف الخريطة
        </button>
      )}
    </section>
  );
}

function SceneBody({ scene }) {
  if (scene.type === "objective")
    return (
      <>
        <p className="mc-intro">بنهاية الرحلة أستطيع أن…</p>
        <div className="mc-box mc-objective">
          <span className="mc-box-icon" aria-hidden="true">
            {/الخريطة|أحدد|أوزّع|أوزع/.test(scene.text) ? <MapPin weight="duotone" /> : <Target weight="duotone" />}
          </span>
          <p className="mc-main">{scene.text}</p>
        </div>
      </>
    );
  if (scene.type === "concept")
    return (
      <>
        <h3 className="mc-title">
          <span className="mc-title-icon" aria-hidden="true">
            <Lightbulb weight="duotone" />
          </span>
          {scene.title}
        </h3>
        <p className="mc-box mc-main">{scene.text}</p>
      </>
    );
  return (
    <>
      <h3 className="mc-title">
        {scene.resource ? (
          <ResourcePin resource={scene.resource} />
        ) : (
          <span className="mc-robot" aria-hidden="true">
            <RobotGuide />
          </span>
        )}
        {scene.title}
      </h3>
      <p className="mc-main">{scene.text}</p>
    </>
  );
}

// Card goes on the side away from the place being explained.
function cardSide(scene) {
  if (!scene?.spotlight) return "right";
  return scene.spotlight.lng > 30.8 ? "left" : "right";
}

export function savedScene(lessonId, section) {
  try {
    return Number(localStorage.getItem(KEY(lessonId, section)) || 0);
  } catch {
    return 0;
  }
}

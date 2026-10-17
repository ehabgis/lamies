import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowCounterClockwise,
  Pause,
  Play,
  X,
  CheckCircle,
  Lightbulb,
  SpeakerHigh,
  SpeakerSlash,
  BookOpen,
} from "phosphor-react";
import * as narrator from "./narrator";
import { api } from "./api";
import { play } from "./sfx";
import ResourcePin from "../components/Map/ResourcePin";
import RobotGuide from "../components/Map/RobotGuide";

const KEY = (id) => `lamis.montage.${id}.v1`;
const spokenText = (s) =>
  [s.title, s.items ? s.items.join("، ") : s.text].filter(Boolean).join(". ");

// One floating card at a time over the map, scene by scene, with the robot's
// voice. The child controls the pace; text stays visible when sound is off.
export default function LessonMontage({ lessonId, scenes, startAt = 0, demo, onClose, onSpotlight, onReadAll }) {
  const [index, setIndex] = useState(startAt);
  const [narr, setNarr] = useState(narrator.getSettings());
  const [check, setCheck] = useState({});
  const cardRef = useRef(null);
  const scene = scenes[index];
  useEffect(() => narrator.subscribe(setNarr), []);
  useEffect(() => setIndex(startAt), [startAt]);
  // Each scene: stop the previous voice, speak this one, move the map.
  useEffect(() => {
    if (!scene) return;
    narrator.speak(spokenText(scene));
    onSpotlight?.(scene.spotlight ? { ...scene.spotlight, side: cardSide(scene) } : null);
    setCheck({});
    cardRef.current?.focus({ preventScroll: true });
    try {
      localStorage.setItem(KEY(lessonId), String(index));
    } catch {}
    // Keyed on the scene number only: the parent re-renders when the map moves,
    // and that must not restart the voice.
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
  const next = () => {
    if (index < scenes.length - 1) {
      play("tap");
      setIndex(index + 1);
    } else onClose();
  };
  const prev = () => index > 0 && setIndex(index - 1);

  async function answer(value) {
    setCheck({ value, busy: true });
    try {
      const r = await api(`${demo ? "/demo" : ""}/lessons/${lessonId}/answers`, {
        method: "POST",
        body: { questionId: scene.question.id, answer: value },
      });
      play(r.correct ? "correct" : "wrong");
      setCheck({ value, correct: r.correct, text: r.correct ? r.explanation || "أحسنت!" : r.hint });
      narrator.speak(r.correct ? `أحسنت! ${r.explanation || ""}` : `حاول مرة أخرى. ${r.hint || ""}`);
    } catch (e) {
      setCheck({ value, error: e.message });
    }
  }

  const q = scene.question;
  const options =
    q?.type === "boolean"
      ? [
          { v: true, t: "صواب" },
          { v: false, t: "خطأ" },
        ]
      : (q?.options || []).map((o) => ({ v: o, t: o }));

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      className={`montage-card side-${cardSide(scene)} type-${scene.type}`}
      key={index}
      role="region"
      aria-roledescription="شرح متتابع"
      aria-label={`المشهد ${index + 1} من ${scenes.length}: ${scene.title}`}
    >
      <header className="montage-head">
        <span className="montage-count">
          <bdi>{index + 1}</bdi> من <bdi>{scenes.length}</bdi>
        </span>
        <button className="montage-x" aria-label="إغلاق الشرح" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>
      </header>
      <div className="montage-body">
        {scene.type === "hook" && (
          <span className="montage-robot" aria-hidden="true">
            <RobotGuide />
          </span>
        )}
        {scene.label && <small className="montage-label">{scene.label}</small>}
        <h2>
          {scene.resource && <ResourcePin resource={scene.resource} />}
          {scene.title}
        </h2>
        {scene.items ? (
          <ul className="montage-list">
            {scene.items.map((t, i) => (
              <li key={i}>
                <CheckCircle size={20} weight="fill" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        ) : scene.type === "check" ? (
          <>
            <p className="montage-text">{q.prompt}</p>
            <div className="montage-options" role="radiogroup" aria-label="الإجابة">
              {options.map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={check.value === o.v}
                  disabled={check.correct || check.busy}
                  className={check.value === o.v && check.correct != null ? (check.correct ? "is-correct" : "is-wrong") : ""}
                  onClick={() => answer(o.v)}
                >
                  {o.t}
                </button>
              ))}
            </div>
            {check.text && (
              <p className={check.correct ? "montage-ok" : "montage-hint"} role="status">
                {check.correct ? <CheckCircle size={20} weight="fill" /> : <Lightbulb size={20} />} {check.text}
              </p>
            )}
            {check.error && <p className="montage-hint" role="alert">تعذر التحقق الآن. حاول مرة أخرى.</p>}
          </>
        ) : (
          <p className="montage-text">{scene.text}</p>
        )}
        {scene.type === "end" && onReadAll && (
          <button type="button" className="montage-readall" onClick={onReadAll}>
            <BookOpen size={20} aria-hidden="true" /> اقرأ معلومات الدرس كاملة
          </button>
        )}
        {scene.image && (
          <figure className="montage-figure">
            <img src={scene.image} alt={`صورة ${scene.title}`} loading="lazy" />
            {scene.imageCredit && <figcaption>{scene.imageCredit}</figcaption>}
          </figure>
        )}
      </div>
      <nav className="montage-dots" aria-label="المشاهد">
        {scenes.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-label={`المشهد ${i + 1}: ${s.title}`}
            aria-current={i === index ? "step" : undefined}
            className={i < index ? "is-seen" : ""}
            onClick={() => setIndex(i)}
          />
        ))}
      </nav>
      <footer className="montage-controls">
        <button type="button" className="montage-nav" disabled={!index} onClick={prev} aria-label="المشهد السابق">
          <ArrowRight size={20} weight="bold" /> السابق
        </button>
        <div className="montage-voice" role="group" aria-label="الصوت">
          {narr.available && !narr.muted && (
            <>
              <button
                type="button"
                aria-label={narr.state === "speaking" ? "إيقاف مؤقت" : "استئناف"}
                title={narr.state === "speaking" ? "إيقاف مؤقت" : "استئناف"}
                onClick={() => (narr.state === "speaking" ? narrator.pause() : narr.state === "paused" ? narrator.resume() : narrator.speak(spokenText(scene)))}
              >
                {narr.state === "speaking" ? <Pause size={20} weight="bold" /> : <Play size={20} weight="fill" />}
              </button>
              <button type="button" aria-label="أعد المشهد" title="أعد المشهد" onClick={() => narrator.speak(spokenText(scene))}>
                <ArrowCounterClockwise size={20} weight="bold" />
              </button>
            </>
          )}
          <button
            type="button"
            aria-pressed={narr.muted}
            aria-label={narr.muted ? "تشغيل الصوت" : "كتم الصوت"}
            title={narr.muted ? "تشغيل الصوت" : "كتم الصوت"}
            onClick={() => narrator.update({ muted: !narr.muted })}
          >
            {narr.muted ? <SpeakerSlash size={20} weight="bold" /> : <SpeakerHigh size={20} weight="bold" />}
          </button>
        </div>
        <button type="button" className="montage-nav is-next" onClick={next}>
          {index < scenes.length - 1 ? "التالي" : "إنهاء"} <ArrowLeft size={20} weight="bold" />
        </button>
      </footer>
    </section>
  );
}

// Card goes on the side away from the place being explained.
function cardSide(scene) {
  if (!scene?.spotlight) return "right";
  return scene.spotlight.lng > 30.8 ? "left" : "right";
}

export function savedScene(lessonId) {
  try {
    return Number(localStorage.getItem(KEY(lessonId)) || 0);
  } catch {
    return 0;
  }
}

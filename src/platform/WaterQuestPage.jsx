import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Lock,
  Star,
  Trophy,
  Lightbulb,
  Gear,
  X,
  BookOpen,
  MapTrifold,
  ArrowCounterClockwise,
} from "phosphor-react";
import { api } from "./api";
import RobotGuide from "../components/Map/RobotGuide";
import WaterQuestMap from "./WaterQuestMap";
import { SceneMedia, UseScene } from "./WaterScenes";
import NarrationControls from "./NarrationControls";
import * as narrator from "./narrator";
import { play } from "./sfx";
import { Frame } from "./ExpeditionPage";
import "./expedition.css";
import "./water-quest.css";

const STEPS = ["شاهد واكتشف", "ابحث على الخريطة", "استخدم ما تعلمته"];
const LEGEND = [
  { type: "river", label: "نهر النيل" },
  { type: "sea", label: "البحار" },
  { type: "groundwater", label: "المياه الجوفية" },
  { type: "rain", label: "الأمطار" },
];
const KEY_TARGETS = [
  ["nile", "نهر النيل"],
  ["red-sea", "البحر الأحمر"],
  ["med-sea", "البحر المتوسط"],
  ["groundwater", "علامات المياه الجوفية"],
  ["rain", "علامة الأمطار"],
];
const fresh = { view: "start", missionId: null, step: 1, done: {} };
const storageKey = (id) => `lamis.water.${id}.v1`;
const loadProgress = (id) => {
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(storageKey(id)) || "{}") };
  } catch {
    return fresh;
  }
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// «رحلة المياه»: one situation per mission → find the source → use it.
export default function WaterQuestPage({ id = "lesson-2" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [p, setP] = useState(() => loadProgress(id));
  const [robot, setRobot] = useState("");
  const [drawn, setDrawn] = useState(false);
  const [wrongTick, setWrongTick] = useState(0);
  const [bookMap, setBookMap] = useState(false);
  const [settings, setSettings] = useState(false);
  const talkRef = useRef(null);

  useEffect(() => {
    api(`/demo/lessons/${id}/expedition`)
      .then((r) => setData(r.expedition))
      .catch((e) => setError(e.message));
    return () => narrator.stop();
  }, [id]);
  useEffect(() => {
    try {
      // The map animation state is not saved; a found source shows straight away after reload.
      localStorage.setItem(storageKey(id), JSON.stringify({ ...p, wrong: null }));
    } catch {}
  }, [id, p]);
  useEffect(() => {
    narrator.stop();
    talkRef.current?.focus({ preventScroll: true });
  }, [p.view, p.missionId, p.step]);

  const go = (next) => setP((old) => ({ ...old, ...next }));
  const say = (text) => {
    setRobot(text);
    narrator.speak(text);
  };
  const missions = data?.missions || [];
  const mission = missions.find((m) => m.id === p.missionId);
  const missionIndex = missions.indexOf(mission);
  const stars = Object.keys(p.done).length;
  const allDone = missions.length > 0 && missions.every((m) => p.done[m.id]);
  const nextMission = missions.find((m) => !p.done[m.id]);
  const unlocked = (i) => i === 0 || p.done[missions[i - 1]?.id];

  const nav = (
    <>
      <Link to={`/demo/${id}`}>
        <MapTrifold size={22} aria-hidden="true" /> الخريطة التفاعلية
      </Link>
      <button type="button" onClick={() => setBookMap(true)}>
        <BookOpen size={22} aria-hidden="true" /> خريطة الكتاب
      </button>
    </>
  );
  const frame = (children) => (
    <Frame
      title={data?.lessonTitle || "الدرس الثاني: موارد المياه"}
      stars={data ? stars : undefined}
      lessonPath="/explore"
      onSettings={data ? () => setSettings(true) : undefined}
      onAwards={() => go({ view: allDone ? "badge" : "start" })}
      extraNav={nav}
      className="water-quest"
    >
      {children}
      {bookMap && (
        <div className="wq-dialog" role="dialog" aria-modal="true" aria-label="خريطة الكتاب">
          <div className="wq-dialog-card">
            <header>
              <h2>خريطة الكتاب: موارد المياه</h2>
              <button aria-label="إغلاق" onClick={() => setBookMap(false)}>
                <X size={22} />
              </button>
            </header>
            <img src="/lesson-media/book/lesson2_water_map.jpg" alt="خريطة موارد المياه في مصر من كتاب الطالب" />
            <small>صورة من كتاب الطالب — للمراجعة</small>
          </div>
        </div>
      )}
      {settings && (
        <div className="exp-settings" role="dialog" aria-label="الإعدادات">
          <header>
            <h2>الإعدادات</h2>
            <button aria-label="إغلاق الإعدادات" onClick={() => setSettings(false)}>
              <X size={22} />
            </button>
          </header>
          <p>صوت المرشد</p>
          <NarrationControls text="مرحبًا! أنا المرشد. هيا نكتشف موارد المياه في مصر." />
          <p className="exp-note">التقدم محفوظ على هذا الجهاز فقط، ولا ينتقل إلى أجهزة أخرى.</p>
          <button
            className="exp-secondary"
            onClick={() => {
              if (window.confirm("هل تريد مسح تقدم رحلة المياه على هذا الجهاز؟")) {
                setP(fresh);
                setSettings(false);
              }
            }}
          >
            ابدأ الرحلة من جديد
          </button>
        </div>
      )}
    </Frame>
  );

  if (error)
    return frame(
      <div className="exp-error" role="alert">
        <p>تعذر تحميل الرحلة. {error}</p>
        <button className="p-button" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </button>
      </div>,
    );
  if (!data) return frame(<p className="exp-loading" role="status">جارٍ تجهيز الرحلة…</p>);

  async function check(body) {
    try {
      return await api(`/demo/lessons/${id}/expedition/check`, { method: "POST", body: { missionId: mission.id, ...body } });
    } catch (e) {
      setRobot(`تعذر التحقق الآن: ${e.message}. حاول مرة أخرى.`);
      return null;
    }
  }
  function startMission(m) {
    play("open");
    setDrawn(false);
    go({ view: "mission", missionId: m.id, step: 1, found: null, attempts: 0, hintLevel: 0, focus: null, useChoice: null, useSolved: false, useText: "", doneText: "" });
    say(m.scene.text);
  }
  async function pickTarget(target) {
    if (p.found) return;
    const attempt = (p.attempts || 0) + 1;
    const r = await check({ step: "find", target, attempt });
    if (!r) return;
    if (r.correct) {
      play("correct");
      setDrawn(false);
      go({ found: r.found, foundText: r.explanation, attempts: 0, hintLevel: 0, focus: null, wrong: null });
      setRobot("");
      narrator.speak(r.explanation);
    } else {
      play("wrong");
      setWrongTick((t) => t + 1);
      go({ attempts: attempt, wrong: target, ...(r.focus ? { focus: r.focus } : {}) });
      say(r.hint);
    }
  }
  async function askHint(step) {
    // A wrong try already gave its own feedback, so the button moves on.
    const level = (p.hintLevel || 0) + 1;
    const r = await check(step === "find" ? { step, target: "__hint__", attempt: level } : { step, answer: "__hint__", attempt: level });
    if (!r) return;
    go({ hintLevel: level, ...(r.focus ? { focus: r.focus } : {}) });
    say(`تلميح: ${r.hint}`);
  }
  async function chooseUse(answer) {
    const attempt = (p.attempts || 0) + 1;
    go({ useChoice: answer });
    const r = await check({ step: "use", answer, attempt });
    if (!r) return;
    if (r.correct) {
      play("star");
      go({ useSolved: true, useText: r.explanation, doneText: r.done, attempts: 0 });
      say(r.explanation);
    } else {
      play("wrong");
      go({ attempts: attempt });
      say(r.hint);
    }
  }
  function finishMission() {
    play("star");
    go({ view: "complete", done: { ...p.done, [mission.id]: true } });
    say(`أكملت مهمة ${mission.title}! ${p.doneText}`);
  }

  // ------------------------------------------------------------ stage
  let stage = null;
  let talk = null;
  if (p.view === "start" || !mission) {
    stage = <SceneMedia scene={(nextMission || missions[0]).scene} key="start" />;
    talk = (
      <>
        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
        <ol className="wq-missions">
          {missions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={!unlocked(i)}
                className={`${p.done[m.id] ? "is-done" : ""} ${!unlocked(i) ? "is-locked" : ""}`}
                onClick={() => startMission(m)}
                aria-label={`المهمة ${i + 1}: ${m.title}${p.done[m.id] ? " — مكتملة" : !unlocked(i) ? " — مقفلة حتى تكمل المهمة السابقة" : ""}`}
              >
                <span className="wq-mission-num">{p.done[m.id] ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : i + 1}</span>
                <b>{m.title}</b>
                {!unlocked(i) && <Lock size={18} weight="fill" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
        {allDone ? (
          <button className="exp-primary" onClick={() => go({ view: "badge" })}>
            شاهد شارتك <Trophy size={22} aria-hidden="true" />
          </button>
        ) : (
          <button className="exp-primary" onClick={() => startMission(nextMission)}>
            ابدأ مهمة {nextMission.title} <ArrowLeft size={22} aria-hidden="true" />
          </button>
        )}
      </>
    );
  } else if (p.view === "mission" && p.step === 1) {
    stage = <SceneMedia scene={mission.scene} key={mission.id} />;
    talk = (
      <>
        <p className="wq-say">{mission.scene.text}</p>
        <NarrationControls compact text={mission.scene.text} />
        <button
          className="exp-primary"
          onClick={() => {
            play("open");
            go({ step: 2, attempts: 0, hintLevel: 0 });
            say(mission.findPrompt);
          }}
        >
          هيا نبحث على الخريطة <ArrowLeft size={22} aria-hidden="true" />
        </button>
      </>
    );
  } else if (p.view === "mission" && p.step === 2) {
    const ready = p.found && (drawn || reducedMotion());
    stage = (
        <WaterQuestMap
          targets={data.targets}
          active={!p.found}
          onPick={pickTarget}
          wrong={p.wrong}
          wrongTick={wrongTick}
          focus={p.found ? null : p.focus}
          found={p.found}
          onDrawn={() => setDrawn(true)}
        />
    );
    talk = p.found ? (
      <div className="wq-found" role="status">
        {ready ? (
          <>
            <h2>
              <Star size={30} weight="fill" aria-hidden="true" /> أحسنت!
            </h2>
            <p className="wq-say">{p.foundText.replace(/^أحسنت!\s*/, "")}</p>
            <button
              className="exp-primary"
              onClick={() => {
                play("open");
                go({ step: 3, attempts: 0, hintLevel: 0 });
                say(mission.use.prompt);
              }}
            >
              استخدم ما تعلمته <ArrowLeft size={22} aria-hidden="true" />
            </button>
          </>
        ) : (
          <p className="wq-say">شاهد الخريطة…</p>
        )}
      </div>
    ) : (
      <>
        <p className="wq-say" aria-live="polite">{robot || mission.findPrompt}</p>
        <button className="exp-hint" onClick={() => askHint("find")}>
          <Lightbulb size={20} aria-hidden="true" /> تلميح
        </button>
        <details className="wq-keyboard">
          <summary>اختر بلوحة المفاتيح بدل الخريطة</summary>
          <div>
            {KEY_TARGETS.map(([t, label]) => (
              <button key={t} type="button" onClick={() => pickTarget(t)}>
                {label}
              </button>
            ))}
          </div>
        </details>
      </>
    );
  } else if (p.view === "mission" && p.step === 3) {
    const state = p.useSolved ? "correct" : p.useChoice ? "wrong" : "idle";
    stage = <UseScene art={mission.use.art} state={state} key={`${mission.id}-${p.useChoice}`} />;
    talk = (
      <>
        <p className="wq-say">{mission.use.prompt}</p>
        <div className="exp-options" role="radiogroup" aria-label="الاختيارات">
          {mission.use.options.map((o) => {
            const chosen = p.useChoice === o;
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={p.useSolved}
                className={chosen ? (p.useSolved ? "is-correct" : "is-wrong") : ""}
                onClick={() => chooseUse(o)}
              >
                {o}
                {chosen && p.useSolved && <CheckCircle size={20} weight="fill" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className={p.useSolved ? "exp-success" : "wq-feedback"} aria-live="polite">
          {p.useSolved ? (
            <>
              <Star size={22} weight="fill" aria-hidden="true" /> {p.useText}
            </>
          ) : p.useChoice ? (
            robot
          ) : null}
        </p>
        {p.useSolved ? (
          <button className="exp-primary" onClick={finishMission}>
            أنهِ المهمة <ArrowLeft size={22} aria-hidden="true" />
          </button>
        ) : (
          <button className="exp-hint" onClick={() => askHint("use")}>
            <Lightbulb size={20} aria-hidden="true" /> تلميح
          </button>
        )}
      </>
    );
  } else if (p.view === "complete" && mission) {
    stage = <UseScene art={mission.use.art} state="correct" />;
    const following = missions[missionIndex + 1];
    talk = (
      <div className="wq-complete" role="status">
        <span className="wq-complete-star" aria-hidden="true">
          <Star size={44} weight="fill" />
        </span>
        <h2>أكملت مهمة {mission.title}!</h2>
        <p>{p.doneText}</p>
        <p className="wq-earned">حصلت على نجمة إتمام ⭐</p>
        {following ? (
          <button className="exp-primary" onClick={() => startMission(following)}>
            المهمة التالية: {following.title} <ArrowLeft size={22} aria-hidden="true" />
          </button>
        ) : (
          <button className="exp-primary" onClick={() => go({ view: "badge" })}>
            استلم شارة {data.badge} <Trophy size={22} aria-hidden="true" />
          </button>
        )}
        <button className="exp-secondary" onClick={() => go({ view: "start" })}>
          كل المهام
        </button>
      </div>
    );
  } else {
    stage = <SceneMedia scene={missions[0].scene} key="badge" />;
    talk = (
      <div className="exp-badge" role="status">
        <span className="exp-badge-medal" aria-hidden="true">
          <Trophy size={52} weight="fill" />
        </span>
        <h1>{data.badge}</h1>
        <ul className="exp-summary">
          <li>نهر النيل مصدر المياه العذبة الرئيسي، ويُستخدم في الري والشرب.</li>
          <li>الواحات تعتمد على المياه الجوفية، ويجب ترشيدها.</li>
          <li>مياه البحر مالحة، ويمكن تحليتها لتصبح صالحة للشرب.</li>
        </ul>
        <button className="exp-secondary" onClick={() => go({ view: "start" })}>
          <ArrowCounterClockwise size={20} aria-hidden="true" /> راجع المهام
        </button>
      </div>
    );
  }

  const legend = (
    <aside className="wq-legend" aria-label="مفتاح الخريطة">
      <h2>مفتاح الخريطة</h2>
      <ul>
        {LEGEND.map((l) => (
          <li key={l.type}>
            <i className={`wq-swatch wq-swatch-${l.type}`} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>
    </aside>
  );
  const inMission = ["mission", "complete"].includes(p.view) && mission;
  const step = p.view === "complete" ? 4 : p.step;
  return frame(
    <>
      {inMission ? (
        <div className="wq-head">
          <button className="exp-back" onClick={() => go({ view: "start" })} aria-label="العودة إلى المهام">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <strong>
            المهمة {missionIndex + 1}: {mission.title}
          </strong>
          <ol className="exp-steps wq-steps" aria-label="خطوات المهمة">
            {STEPS.map((t, i) => (
              <li
                key={t}
                className={`${step === i + 1 ? "is-current" : ""} ${step > i + 1 ? "is-done" : ""}`}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <span className="exp-step-num">{step > i + 1 ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className={`wq-stage step-${p.view === "mission" ? p.step : p.view}`}>
        <div className="wq-stage-media">{stage}</div>
        <section
          ref={talkRef}
          tabIndex={-1}
          className={`wq-talk ${reducedMotion() ? "" : "has-motion"}`}
          key={`${p.view}-${p.missionId}-${p.step}-${!!p.found}`}
          aria-label="المرشد"
        >
          <span className="wq-robot" aria-hidden="true">
            <RobotGuide />
          </span>
          <div className="wq-talk-body">{talk}</div>
        </section>
        {p.view === "mission" && p.step === 2 && legend}
      </div>
    </>,
  );
}

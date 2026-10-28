import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Lock,
  Star,
  Trophy,
  House,
  BookOpen,
  MapTrifold,
  Gear,
  Lightbulb,
  ArrowCounterClockwise,
  X,
} from "phosphor-react";
import { api } from "./api";
import BrandMark from "./BrandMark";
import RobotGuide from "../components/Map/RobotGuide";
import ResourcePin from "../components/Map/ResourcePin";
import ExpeditionMap from "./ExpeditionMap";
import NarrationControls from "./NarrationControls";
import * as narrator from "./narrator";
import { play, resourceSound } from "./sfx";
import "./expedition.css";
import { studentKey } from "./guestProfile";

const STEPS = ["شاهد واكتشف", "ابحث على الخريطة", "استخدم ما تعلمته"];
const initial = { view: "start", missionId: "minerals", resourceId: null, step: 1, done: {}, finalDone: false };
const storageKey = (id) => studentKey(`lamis.expedition.${id}.v1`);
const loadProgress = (id) => {
  try {
    return { ...initial, ...JSON.parse(localStorage.getItem(storageKey(id)) || "{}") };
  } catch {
    return initial;
  }
};
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ExpeditionPage({ demo = true }) {
  const { id = "lesson-1" } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [p, setP] = useState(() => loadProgress(id));
  const [robot, setRobot] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    api(`/demo/lessons/${id}/expedition`)
      .then((r) => setData(r.expedition))
      .catch((e) => setError(e.message));
    return () => narrator.stop();
  }, [id]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(p));
    } catch {}
  }, [id, p]);
  // Moving between screens never carries the previous voice along.
  useEffect(() => {
    narrator.stop();
    cardRef.current?.focus({ preventScroll: true });
  }, [p.view, p.resourceId, p.step]);

  const missions = data?.missions || [];
  const mission = missions.find((m) => m.id === p.missionId) || missions[0];
  const resource = mission?.resources.find((r) => r.id === p.resourceId);
  const doneIn = (m) => m.resources.filter((r) => p.done[r.id]).length;
  const mineralsDone = missions[0] && doneIn(missions[0]) === missions[0].resources.length;
  const energyDone = missions[1] && doneIn(missions[1]) === missions[1].resources.length;
  const stars = Object.keys(p.done).length + (p.finalDone ? 1 : 0);

  const say = (text, spoken) => {
    setRobot(text);
    narrator.speak(text, spoken);
  };
  const go = (next) => setP((old) => ({ ...old, ...next }));

  if (error)
    return (
      <Frame title="رحلة كنوز مصر">
        <div className="exp-error" role="alert">
          <p>تعذر تحميل الرحلة. {error}</p>
          <button className="p-button" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>
        </div>
      </Frame>
    );
  if (!data)
    return (
      <Frame title="رحلة كنوز مصر">
        <p className="exp-loading" role="status">جارٍ تجهيز الرحلة…</p>
      </Frame>
    );

  // ------------------------------------------------------------ map props
  let mapProps = {};
  if (p.view === "resource" && resource) {
    if (p.step === 1) mapProps = { teach: resource.teach };
    else if (p.step === 2)
      mapProps = { candidates: mission.sites, found: p.found || {}, wrong: p.wrong, onPick: (s) => checkFind(s) };
    else mapProps = { teach: resource.teach };
  } else if (p.view === "final") {
    mapProps = { candidates: data.final.sites, found: p.finalFound || {}, wrong: p.wrong, onPick: (s) => go({ finalSite: s, wrong: null }) };
  }

  async function check(body) {
    try {
      return await api(`/demo/lessons/${id}/expedition/check`, { method: "POST", body });
    } catch (e) {
      setRobot(`تعذر التحقق الآن: ${e.message}. حاول مرة أخرى.`);
      return null;
    }
  }
  async function checkFind(siteId) {
    if (p.found?.[siteId]) return;
    const attempt = (p.attempts || 0) + 1;
    const r = await check({ step: "find", resourceId: resource.id, siteId, attempt });
    if (!r) return;
    if (r.correct) {
      play("correct");
      go({ found: { [siteId]: r.site.name }, attempts: 0, wrong: null, hintLevel: 0, solvedStep2: true });
      say(`${r.explanation} أحسنت!`);
    } else {
      play("wrong");
      go({ attempts: attempt, wrong: siteId });
      say(`ليس هذا الموقع. ${r.hint}`);
    }
  }
  async function askHint() {
    // A wrong try already showed hint N, so the button moves on to N+1.
    const level = Math.max(p.hintLevel || 0, p.attempts || 0) + 1;
    const step = p.step === 2 ? "find" : "use";
    const r = await check({ step, resourceId: resource.id, siteId: "__hint__", answer: "__hint__", attempt: level });
    if (!r) return;
    go({ hintLevel: level });
    say(`تلميح: ${r.hint}`);
  }
  async function checkUse(answer) {
    const attempt = (p.attempts || 0) + 1;
    go({ useChoice: answer });
    const r = await check({ step: "use", resourceId: resource.id, answer, attempt });
    if (!r) return;
    if (r.correct) {
      play("star");
      go({ useSolved: true, attempts: 0, useExplanation: r.explanation });
      say(r.explanation);
    } else {
      play("wrong");
      go({ attempts: attempt });
      say(`فكرة جيدة، لكن جرّب مرة أخرى. ${r.hint}`);
    }
  }
  function startResource(r) {
    play(resourceSound(r));
    go({ view: "resource", resourceId: r.id, step: 1, found: {}, wrong: null, attempts: 0, hintLevel: 0, useChoice: null, useSolved: false, solvedStep2: false });
    setRobot(`${r.label}: شاهد واكتشف!`);
  }
  function finishResource() {
    const done = { ...p.done, [resource.id]: true };
    const left = mission.resources.filter((r) => !done[r.id]).length;
    go({ done, view: "pick", resourceId: null, step: 1, picked: null });
    if (left) say(`رائع! اكتشفت ${resource.label}. اختر كنزًا آخر!`);
    else if (mission.id === "minerals") say("أكملت كنوز المعادن! فتحت مهمة مصادر الطاقة.");
    else say("أكملت مصادر الطاقة! حان وقت حصاد رحلتك.");
  }
  async function checkFinal() {
    const attempt = (p.attempts || 0) + 1;
    const r = await check({ step: "final", choice: p.finalChoice, siteId: p.finalSite, attempt });
    if (!r) return;
    if (r.correct) {
      play("star");
      go({ finalDone: true, finalFound: { [p.finalSite]: r.site.name }, view: "done", attempts: 0, wrong: null });
      say(`${r.explanation} حصلت على شارة ${data.badge}!`);
    } else {
      play("wrong");
      go({ attempts: attempt, wrong: r.part === "site" ? p.finalSite : null, ...(r.part === "choice" ? { finalChoice: null } : {}) });
      say(r.hint);
    }
  }

  // ------------------------------------------------------------ views
  let card;
  if (p.view === "start") {
    card = (
      <>
        <header className="exp-card-head">
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
        </header>
        <div className="exp-missions">
          {missions.map((m, i) => {
            const locked = i === 1 && !mineralsDone;
            const complete = doneIn(m) === m.resources.length;
            return (
              <button
                key={m.id}
                type="button"
                className={`exp-mission ${p.missionId === m.id ? "is-selected" : ""} ${locked ? "is-locked" : ""}`}
                disabled={locked}
                aria-label={`المهمة ${i === 0 ? "الأولى" : "الثانية"}: ${m.title}${locked ? " — مقفلة حتى تكمل المعادن" : complete ? " — مكتملة" : ""}`}
                onClick={() => {
                  play("select");
                  go({ missionId: m.id });
                }}
              >
                {m.image ? (
                  <img src={m.image} alt="" loading="lazy" />
                ) : (
                  <span className="exp-mission-symbols" aria-hidden="true">
                    {m.resources.map((r) => (
                      <ResourcePin key={r.id} resource={r} />
                    ))}
                  </span>
                )}
                {locked && (
                  <span className="exp-lock">
                    <Lock size={20} weight="fill" aria-hidden="true" /> مقفلة
                  </span>
                )}
                {complete && <CheckCircle className="exp-done-mark" size={28} weight="fill" aria-hidden="true" />}
                <small>المهمة {i === 0 ? "الأولى" : "الثانية"}:</small>
                <b>{m.title}</b>
                <span className="exp-mission-count">
                  {doneIn(m)} من {m.resources.length}
                </span>
              </button>
            );
          })}
        </div>
        <button
          className="exp-primary"
          onClick={() => {
            play("open");
            const m = mineralsDone ? missions.find((x) => x.id === p.missionId) || missions[1] : missions[0];
            go({ view: mineralsDone && energyDone ? (p.finalDone ? "done" : "final") : "pick", missionId: m.id });
            if (m.id === "energy" && !doneIn(m)) say(m.intro);
          }}
        >
          {stars === 0
            ? "ابدأ بكنوز المعادن"
            : mineralsDone && energyDone
              ? p.finalDone
                ? "شاهد شارتك"
                : "إلى حصاد رحلتك"
              : "أكمل رحلتك"}
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      </>
    );
  } else if (p.view === "pick" && mission) {
    const picked = mission.resources.find((r) => r.id === p.picked) || mission.resources.find((r) => !p.done[r.id]);
    const allDone = doneIn(mission) === mission.resources.length;
    card = (
      <>
        <header className="exp-card-head">
          <button className="exp-back" onClick={() => go({ view: "start" })} aria-label="العودة إلى بداية الرحلة">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <h1>{mission.title}</h1>
          <p>{mission.subtitle}</p>
        </header>
        <div className={`exp-resources count-${mission.resources.length}`} role="radiogroup" aria-label="اختر كنزًا">
          {mission.resources.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={picked?.id === r.id}
              className={`exp-resource ${p.done[r.id] ? "is-done" : ""}`}
              onClick={() => {
                play(resourceSound(r));
                go({ picked: r.id });
              }}
            >
              {r.image ? <img src={r.image} alt="" loading="lazy" /> : <ResourcePin resource={r} />}
              <b>{r.label}</b>
              {p.done[r.id] && (
                <span className="exp-res-done">
                  <CheckCircle size={20} weight="fill" aria-hidden="true" />
                  <span className="sr-only">مكتمل</span>
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="exp-counter" aria-live="polite">
          <span>
            اكتشفت <bdi>{doneIn(mission)}</bdi> من <bdi>{mission.resources.length}</bdi>
          </span>
          <ol aria-hidden="true">
            {mission.resources.map((r) => (
              <li key={r.id} className={p.done[r.id] ? "is-done" : ""} />
            ))}
          </ol>
        </div>
        {allDone ? (
          mission.id === "minerals" ? (
            <button
              className="exp-primary"
              onClick={() => {
                play("open");
                go({ missionId: "energy", picked: null });
                say(missions[1].intro);
              }}
            >
              افتح مهمة مصادر الطاقة <ArrowLeft size={22} aria-hidden="true" />
            </button>
          ) : (
            <button className="exp-primary" onClick={() => go({ view: p.finalDone ? "done" : "final" })}>
              {p.finalDone ? "شاهد شارتك" : "إلى حصاد رحلتك"} <ArrowLeft size={22} aria-hidden="true" />
            </button>
          )
        ) : (
          picked && (
            <button className="exp-primary" onClick={() => startResource(picked)}>
              {p.done[picked.id] ? `راجع ${picked.label}` : `اكتشف ${picked.label}`}
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
          )
        )}
      </>
    );
  } else if (p.view === "resource" && resource) {
    card = (
      <>
        <ol className="exp-steps" aria-label="خطوات الاكتشاف">
          {STEPS.map((t, i) => (
            <li
              key={t}
              className={`${p.step === i + 1 ? "is-current" : ""} ${p.step > i + 1 ? "is-done" : ""}`}
              aria-current={p.step === i + 1 ? "step" : undefined}
            >
              <span className="exp-step-num">{p.step > i + 1 ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        {p.step === 1 && (
          <div className="exp-watch">
            <div className="exp-watch-text">
              <h2>{resource.label}</h2>
              <p>{resource.watch}</p>
              {resource.note && <p className="exp-note">{resource.note}</p>}
              {resource.teach.some((t) => t.approximate) && <p className="exp-note">{data.approxNote}</p>}
              <NarrationControls text={resource.watch} spoken={resource.watch} />
            </div>
            <figure className="exp-watch-img">
              {resource.image ? (
                <>
                  <img src={resource.image} alt={`صورة ${resource.label}`} />
                  <figcaption>{resource.imageCredit}</figcaption>
                </>
              ) : (
                <div className="exp-no-img">
                  <ResourcePin resource={resource} />
                  <small>رسم توضيحي — لم تُضف صورة مرخصة بعد</small>
                </div>
              )}
            </figure>
          </div>
        )}
        {p.step === 2 && (
          <div className="exp-find">
            <h2>{resource.findPrompt}</h2>
            <p className="exp-help">كل العلامات متشابهة. اختر بعناية!</p>
            {p.solvedStep2 ? (
              <p className="exp-success" role="status">
                <CheckCircle size={22} weight="fill" aria-hidden="true" /> وجدت الموقع: {Object.values(p.found)[0]}
              </p>
            ) : (
              <button className="exp-hint" onClick={askHint}>
                <Lightbulb size={20} aria-hidden="true" /> أحتاج تلميحًا
              </button>
            )}
          </div>
        )}
        {p.step === 3 && (
          <div className="exp-use">
            <h2>{resource.use.prompt}</h2>
            <div className="exp-options" role="radiogroup" aria-label="الاختيارات">
              {resource.use.options.map((o) => {
                const chosen = p.useChoice === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    disabled={p.useSolved}
                    className={chosen ? (p.useSolved ? "is-correct" : "is-wrong") : ""}
                    onClick={() => checkUse(o)}
                  >
                    {o}
                    {chosen && p.useSolved && <CheckCircle size={20} weight="fill" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {p.useSolved ? (
              <p className="exp-success" role="status">
                <Star size={24} weight="fill" aria-hidden="true" /> {p.useExplanation}
              </p>
            ) : (
              <button className="exp-hint" onClick={askHint}>
                <Lightbulb size={20} aria-hidden="true" /> أحتاج تلميحًا
              </button>
            )}
          </div>
        )}
        <div className="exp-step-actions">
          {p.step > 1 && (
            <button className="exp-secondary" onClick={() => go({ step: p.step - 1 })}>
              <ArrowRight size={20} aria-hidden="true" /> السابق
            </button>
          )}
          {p.step === 1 && (
            <button className="exp-primary" onClick={() => { play("open"); go({ step: 2 }); say(resource.findPrompt); }}>
              هيا نبحث على الخريطة <ArrowLeft size={22} aria-hidden="true" />
            </button>
          )}
          {p.step === 2 && (
            <button className="exp-primary" disabled={!p.solvedStep2} onClick={() => { play("open"); go({ step: 3, attempts: 0, hintLevel: 0 }); say(resource.use.prompt); }}>
              استخدم ما تعلمته <ArrowLeft size={22} aria-hidden="true" />
            </button>
          )}
          {p.step === 3 && (
            <button className="exp-primary" disabled={!p.useSolved} onClick={finishResource}>
              {mission.resources.filter((r) => !p.done[r.id] && r.id !== resource.id).length ? "اختر كنزًا آخر" : "أكملت المهمة"}
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
          )}
        </div>
      </>
    );
  } else if (p.view === "final") {
    card = (
      <>
        <header className="exp-card-head">
          <button className="exp-back" onClick={() => go({ view: "start" })} aria-label="العودة إلى بداية الرحلة">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <h1>حصاد رحلتك</h1>
          <p>{data.final.prompt}</p>
        </header>
        <fieldset className="exp-final-step">
          <legend>١. اختر المورد</legend>
          <div className="exp-options is-chips" role="radiogroup" aria-label="الموارد">
            {data.final.options.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={p.finalChoice === o} onClick={() => { play("select"); go({ finalChoice: o }); }}>
                {o}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="exp-final-step-2">
          ٢. اضغط على موقعه في الخريطة.{" "}
          {p.finalSite ? <strong>اخترت موقعًا ✓</strong> : <span>لم تختر موقعًا بعد.</span>}
        </p>
        <div className="exp-step-actions">
          <button className="exp-primary" disabled={!p.finalChoice || !p.finalSite} onClick={checkFinal}>
            تحقق من إجابتي <ArrowLeft size={22} aria-hidden="true" />
          </button>
        </div>
      </>
    );
  } else {
    card = (
      <>
        <div className="exp-badge" role="status">
          <span className="exp-badge-medal" aria-hidden="true">
            <Trophy size={52} weight="fill" />
          </span>
          <h1>{data.badge}</h1>
          <p>
            جمعت <bdi>{stars}</bdi> نجمة. أحسنت يا مستكشف!
          </p>
        </div>
        <h2 className="exp-summary-title">ماذا تعلّمت؟</h2>
        <ul className="exp-summary">
          <li>المعادن: الحديد (الواحات البحرية)، المنجنيز (أم بجمة)، الفوسفات (أبو طرطور)، الذهب (منجم السكري).</li>
          <li>طاقة غير متجددة تُستخرج من الأرض: البترول، الفحم، الغاز الطبيعي.</li>
          <li>طاقة متجددة تنتج الكهرباء: الشمس (بنبان، الكريمات) والرياح (الزعفرانة، جبل الزيت).</li>
        </ul>
        <div className="exp-step-actions">
          <button className="exp-secondary" onClick={() => go({ view: "pick", missionId: "minerals" })}>
            راجع الموارد
          </button>
          <button className="exp-secondary" onClick={() => go({ view: "final", finalChoice: null, finalSite: null, wrong: null })}>
            <ArrowCounterClockwise size={20} aria-hidden="true" /> أعد التحدي
          </button>
        </div>
      </>
    );
  }

  const progressStages = [
    { key: "minerals", label: "كنوز المعادن", done: mineralsDone },
    { key: "energy", label: "مصادر الطاقة", done: energyDone },
    { key: "final", label: "حصاد رحلتك", done: p.finalDone },
  ];

  return (
    <Frame
      title={data.lessonTitle}
      stars={stars}
      onSettings={() => setSettingsOpen(true)}
      lessonPath={`/demo/${id}`}
    >
      <ol className="exp-path" aria-label="مسار التعلم">
        {progressStages.map((s, i) => {
          const current = (s.key === "final" ? ["final", "done"].includes(p.view) : p.missionId === s.key && !["final", "done"].includes(p.view));
          return (
            <li key={s.key} className={`${s.done ? "is-done" : ""} ${current ? "is-current" : ""}`}>
              <span>{s.done ? <CheckCircle size={18} weight="fill" aria-hidden="true" /> : i + 1}</span>
              {s.label}
              {s.done && <span className="sr-only"> — مكتملة</span>}
            </li>
          );
        })}
      </ol>
      <div className="exp-stage">
        <section className="exp-map-col" aria-label="الخريطة">
          <ExpeditionMap {...mapProps} />
          <div className="exp-robot">
            <RobotGuide />
            <p className="exp-bubble" aria-live="polite">
              {robot || data.missions[0].intro}
            </p>
          </div>
        </section>
        <section ref={cardRef} tabIndex={-1} className={`exp-card ${reduced() ? "" : "has-motion"}`} key={`${p.view}-${p.resourceId}-${p.step}`} aria-label="بطاقة المهمة">
          {card}
        </section>
      </div>
      {settingsOpen && (
        <div className="exp-settings" role="dialog" aria-label="الإعدادات">
          <header>
            <h2>الإعدادات</h2>
            <button aria-label="إغلاق الإعدادات" onClick={() => setSettingsOpen(false)}>
              <X size={22} />
            </button>
          </header>
          <p>صوت المرشد</p>
          <NarrationControls text="مرحبًا! أنا المرشد. هيا نكتشف كنوز مصر." />
          <p className="exp-note">التقدم محفوظ على هذا الجهاز فقط، ولا ينتقل إلى أجهزة أخرى.</p>
          <button
            className="exp-secondary"
            onClick={() => {
              if (window.confirm("هل تريد مسح تقدم رحلة كنوز مصر على هذا الجهاز؟")) {
                setP(initial);
                setSettingsOpen(false);
              }
            }}
          >
            ابدأ الرحلة من جديد
          </button>
        </div>
      )}
    </Frame>
  );
}

export function Frame({ title, children, stars, onSettings, lessonPath = "/demo/lesson-1", extraNav, className = "", current = "trips" }) {
  const navigate = useNavigate();
  return (
    <div className={`lamis-platform expedition ${className}`} dir="rtl">
      <header className="exp-top">
        <Link to="/" className="exp-brand">
          <BrandMark size={38} />
          <span>الخرائط التعليمية الذكية</span>
        </Link>
        <strong className="exp-lesson-title">{title}</strong>
        <div className="exp-top-tools">
          <button
            type="button"
            className="exp-return"
            aria-label="رجوع"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(lessonPath))}
          >
            <ArrowRight size={20} aria-hidden="true" /> <span>رجوع</span>
          </button>
          {stars != null && (
            <span className="exp-stars" title="النجوم">
              <Star size={18} weight="fill" aria-hidden="true" /> <bdi>{stars}</bdi>
              <span className="sr-only"> نجمة</span>
            </span>
          )}
          {onSettings && (
            <button className="exp-icon-btn" aria-label="الإعدادات" title="الإعدادات" onClick={onSettings}>
              <Gear size={22} weight="bold" />
            </button>
          )}
        </div>
      </header>
      <main className="exp-main">{children}</main>
      <nav className="exp-bottom" aria-label="التنقل">
        <Link to="/">
          <House size={22} aria-hidden="true" /> الرئيسية
        </Link>
        <Link to={lessonPath}>
          <BookOpen size={22} aria-hidden="true" /> الدروس
        </Link>
        {extraNav}
        <Link
          to="/demo/trips"
          className={current === "trips" ? "is-current" : ""}
          aria-current={current === "trips" ? "page" : undefined}
        >
          <MapTrifold size={22} aria-hidden="true" /> الرحلات
        </Link>
        <Link
          to="/achievements"
          className={current === "achievements" ? "is-current" : ""}
          aria-current={current === "achievements" ? "page" : undefined}
        >
          <Trophy size={22} aria-hidden="true" /> إنجازاتي
        </Link>
      </nav>
    </div>
  );
}

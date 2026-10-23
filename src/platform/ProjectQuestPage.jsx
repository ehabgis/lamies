import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Star,
  Trophy,
  Lightbulb,
  X,
  Eye,
  MapPin,
  Notepad,
  MapTrifold,
  FlagCheckered,
  ArrowCounterClockwise,
} from "phosphor-react";
import { api } from "./api";
import RobotGuide from "../components/Map/RobotGuide";
import ResourcePin from "../components/Map/ResourcePin";
import ProjectQuestMap, { TYPE_LABEL } from "./ProjectQuestMap";
import { ProjectScene } from "./ProjectScenes";
import NarrationControls from "./NarrationControls";
import * as narrator from "./narrator";
import { play } from "./sfx";
import { Frame } from "./ExpeditionPage";
import "./expedition.css";
import "./water-quest.css";
import "./project-quest.css";

const STEPS = [
  { label: "شاهد واكتشف", Icon: Eye },
  { label: "ابحث على الخريطة", Icon: MapPin },
  { label: "استخدم ما تعلمته", Icon: Notepad },
];
const fresh = { view: "start", missionId: null, step: 1, done: {} };
const storageKey = (id) => `lamis.projects.${id}.v1`;
const loadProgress = (id) => {
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(storageKey(id)) || "{}") };
  } catch {
    return fresh;
  }
};
const symbolOf = (type) => <ResourcePin resource={{ id: type, iconFamily: type }} />;

// «نكتشف مشروعات مصر»: three stations, each watch → find on the map → answer.
export default function ProjectQuestPage({ id = "lesson-3" }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [p, setP] = useState(() => loadProgress(id));
  const [robot, setRobot] = useState("");
  const [wrongTick, setWrongTick] = useState(0);
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
      localStorage.setItem(storageKey(id), JSON.stringify({ ...p, wrong: null }));
    } catch {}
  }, [id, p]);
  useEffect(() => {
    narrator.stop();
    talkRef.current?.focus({ preventScroll: true });
  }, [p.view, p.missionId, p.step]);

  const go = (next) => setP((old) => ({ ...old, ...next }));
  // The guide's words show at once; sound only from the listen button.
  const say = (text) => setRobot(text);
  const missions = data?.missions || [];
  const mission = missions.find((m) => m.id === p.missionId);
  const missionIndex = missions.indexOf(mission);
  const stars = Object.keys(p.done).length;
  const nextMission = missions.find((m) => !p.done[m.id]);

  const frame = (children) => (
    <Frame
      title={data?.lessonTitle || "الدرس الثالث: المشروعات القومية"}
      stars={data ? stars : undefined}
      lessonPath="/explore"
      onSettings={data ? () => setSettings(true) : undefined}
      onAwards={() => go({ view: stars === missions.length && missions.length ? "badge" : "start" })}
      extraNav={
        <Link to={`/demo/${id}`}>
          <MapTrifold size={22} aria-hidden="true" /> الخريطة التفاعلية
        </Link>
      }
      className="water-quest project-quest"
    >
      {children}
      {settings && (
        <div className="exp-settings" role="dialog" aria-label="الإعدادات">
          <header>
            <h2>الإعدادات</h2>
            <button aria-label="إغلاق الإعدادات" onClick={() => setSettings(false)}>
              <X size={22} />
            </button>
          </header>
          <p>صوت المرشد</p>
          <NarrationControls text="مرحبًا! أنا المرشد. هيا نكتشف مشروعات مصر." />
          <p className="exp-note">التقدم محفوظ على هذا الجهاز فقط، ولا ينتقل إلى أجهزة أخرى.</p>
          <button
            className="exp-secondary"
            onClick={() => {
              if (window.confirm("هل تريد مسح تقدم الرحلة على هذا الجهاز؟")) {
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
      say(`تعذر التحقق الآن: ${e.message}. حاول مرة أخرى.`);
      return null;
    }
  }
  function startMission(m) {
    play("open");
    go({ view: "mission", missionId: m.id, step: 1, found: null, info: null, attempts: 0, hintLevel: 0, focus: null, wrong: null, choice: null, solved: false, useText: "" });
    say(m.scene.text);
  }
  async function pickTarget(target) {
    if (p.found) return;
    const attempt = (p.attempts || 0) + 1;
    const r = await check({ step: "find", target, attempt });
    if (!r) return;
    if (r.correct) {
      play("correct");
      go({ found: r.found, info: r.info, attempts: 0, hintLevel: 0, focus: null, wrong: null });
      say(`وجدته! هذا مشروع ${r.found.label}.`);
    } else {
      play("wrong");
      setWrongTick((t) => t + 1);
      go({ attempts: attempt, wrong: target });
      say(r.hint);
    }
  }
  async function askHint(step) {
    const level = (p.hintLevel || 0) + 1;
    const r = await check(step === "find" ? { step, target: "__hint__", attempt: level } : { step, answer: "__hint__", attempt: level });
    if (!r) return;
    go({ hintLevel: level, ...(r.focus ? { focus: r.focus } : {}) });
    say(r.hint);
  }
  async function choose(answer) {
    if (p.solved) return;
    const attempt = (p.attempts || 0) + 1;
    go({ choice: answer });
    const r = await check({ step: "use", answer, attempt });
    if (!r) return;
    if (r.correct) {
      play("star");
      go({ solved: true, useText: r.explanation, attempts: 0, done: { ...p.done, [mission.id]: true } });
      say(r.explanation);
    } else {
      play("wrong");
      go({ attempts: attempt });
      say(r.hint);
    }
  }

  const steps = (current) => (
    <div className="pq-top">
      <ol className="pq-steps" aria-label="مراحل المحطة">
        {STEPS.map(({ label, Icon }, i) => (
          <li
            key={label}
            className={`${current === i + 1 ? "is-current" : ""} ${current > i + 1 ? "is-done" : ""}`}
            aria-current={current === i + 1 ? "step" : undefined}
          >
            {current > i + 1 ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : <Icon size={20} weight="bold" aria-hidden="true" />}
            {label}
          </li>
        ))}
      </ol>
      <span className="pq-station">
        المحطة <bdi>{Math.max(1, (missionIndex < 0 ? missions.indexOf(nextMission) : missionIndex) + 1)}</bdi> من{" "}
        <bdi>{missions.length}</bdi>
      </span>
    </div>
  );
  const guide = (children, { listen } = {}) => (
    <section ref={talkRef} tabIndex={-1} className="pq-guide" aria-label="المرشد" key={`${p.view}-${p.missionId}-${p.step}-${!!p.found}`}>
      <div className="pq-bubble">
        {children}
        {listen && <NarrationControls compact text={listen} />}
      </div>
      <span className="pq-robot" aria-hidden="true">
        <RobotGuide />
      </span>
    </section>
  );

  // ------------------------------------------------------------ start
  if (p.view === "start" || (!mission && p.view !== "badge")) {
    const first = nextMission || missions[0];
    return frame(
      <>
        {steps(0)}
        <div className="pq-stage">
          <div className="pq-media">
            <ProjectScene scene={first.scene} />
          </div>
          {guide(
            <>
              <h1>{data.title}</h1>
              <p className="pq-say" aria-live="polite">{data.welcome}</p>
              <ol className="pq-stations" aria-label="محطات الرحلة">
                {missions.map((m, i) => (
                  <li key={m.id} className={p.done[m.id] ? "is-done" : ""}>
                    {p.done[m.id] ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <bdi>{i + 1}</bdi>}
                    {m.title}
                  </li>
                ))}
              </ol>
              {nextMission ? (
                <button className="exp-primary" onClick={() => startMission(nextMission)}>
                  {stars ? `تابع: ${nextMission.title}` : "ابدأ الرحلة"} <ArrowLeft size={22} aria-hidden="true" />
                </button>
              ) : (
                <button className="exp-primary" onClick={() => go({ view: "badge" })}>
                  شاهد شارتك <Trophy size={22} aria-hidden="true" />
                </button>
              )}
            </>,
            { listen: data.welcome },
          )}
        </div>
      </>,
    );
  }

  // ------------------------------------------------------------ finale
  if (p.view === "badge") {
    return frame(
      <div className="pq-finale">
        <ul className="pq-cards">
          {missions.map((m) => (
            <li key={m.id}>
              <Picture src={m.image} scene={m.scene} />
              <b>{m.title}</b>
              <span>{m.benefit}</span>
              <i aria-hidden="true">{symbolOf(data.targets.find((t) => t.id === m.id)?.type)}</i>
            </li>
          ))}
        </ul>
        {guide(<p className="pq-say">{data.finale}</p>, { listen: data.finale })}
        <div className="pq-badge" role="status">
          <span className="pq-badge-stars" aria-hidden="true">
            <Star weight="fill" />
            <Star weight="fill" />
            <Star weight="fill" />
          </span>
          <strong>{data.badge}</strong>
        </div>
        <div className="pq-finale-actions">
          <button className="exp-primary" onClick={() => navigate(`/demo/${id}`)}>
            <MapTrifold size={22} aria-hidden="true" /> استكشف الخريطة
          </button>
          <button className="exp-secondary" onClick={() => navigate("/demo/trips")}>
            <FlagCheckered size={22} aria-hidden="true" /> إنهاء الرحلة
          </button>
          <button className="pq-link" onClick={() => setP(fresh)}>
            <ArrowCounterClockwise size={18} aria-hidden="true" /> العب الرحلة من جديد
          </button>
        </div>
      </div>,
    );
  }

  // ------------------------------------------------------------ between stations
  if (p.view === "complete") {
    const following = missions[missionIndex + 1];
    return frame(
      <>
        {steps(4)}
        <div className="pq-between">
          <section className="pq-well-done" role="status">
            <Star size={48} weight="fill" aria-hidden="true" />
            <h2>أحسنت!</h2>
            <p>{p.useText.replace(/^أحسنت!\s*/, "")}</p>
          </section>
          <ol className="pq-checklist" aria-label="محطات الرحلة">
            {missions.map((m, i) => (
              <li key={m.id} className={p.done[m.id] ? "is-done" : ""}>
                <bdi>{i + 1}</bdi> {m.title}
                {p.done[m.id] ? <CheckCircle size={24} weight="fill" aria-label="مكتملة" /> : <span className="pq-dot" aria-label="لم تكتمل بعد" />}
              </li>
            ))}
          </ol>
          {following && (
            <section className="pq-next">
              <h2>المحطة التالية: {following.title}</h2>
              <Picture src={following.image} scene={following.scene} />
              <button className="exp-primary" onClick={() => startMission(following)}>
                اكتشف المشروع التالي <ArrowLeft size={22} aria-hidden="true" />
              </button>
            </section>
          )}
          {guide(<p className="pq-say">{mission.next || data.finale}</p>, { listen: mission.next })}
        </div>
      </>,
    );
  }

  // ------------------------------------------------------------ station
  const keyPanel = (
    <aside className="pq-key" aria-label="مفتاح الخريطة">
      <h2>مفتاح الخريطة</h2>
      <ul>
        {data.targets.map((t) => (
          <li key={t.type}>
            {symbolOf(t.type)}
            {TYPE_LABEL[t.type]}
          </li>
        ))}
      </ul>
    </aside>
  );
  if (p.step === 1)
    return frame(
      <>
        {steps(1)}
        <div className="pq-stage">
          <div className="pq-media">
            <ProjectScene scene={mission.scene} key={mission.id} />
          </div>
          {guide(
            <>
              <p className="pq-say">{mission.scene.text}</p>
              <button
                className="exp-primary"
                onClick={() => {
                  play("open");
                  go({ step: 2, attempts: 0, hintLevel: 0, focus: null });
                  say(mission.findPrompt);
                }}
              >
                هيا نبحث <ArrowLeft size={22} aria-hidden="true" />
              </button>
            </>,
            { listen: mission.scene.text },
          )}
        </div>
      </>,
    );

  if (p.step === 2)
    return frame(
      <>
        {steps(2)}
        <div className="pq-stage is-map">
          <div className="pq-media">
            <ProjectQuestMap
              targets={data.targets}
              active={!p.found}
              onPick={pickTarget}
              wrong={p.wrong}
              wrongTick={wrongTick}
              focus={p.found ? null : p.focus}
              found={p.found}
            />
            {keyPanel}
          </div>
          {guide(
            p.found ? (
              <>
                <p className="pq-say pq-yes">
                  <Star size={24} weight="fill" aria-hidden="true" /> {robot}
                </p>
                <button
                  className="exp-primary"
                  onClick={() => {
                    play("open");
                    go({ step: 3, attempts: 0, hintLevel: 0, choice: null });
                    say(p.info.text);
                  }}
                >
                  تعرّف على المشروع <ArrowLeft size={22} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <p className="pq-say" aria-live="polite">{robot || mission.findPrompt}</p>
                <p className="pq-tip">اضغط على الرمز على الخريطة، والمفتاح يوضح معنى الرموز.</p>
                <button className="exp-hint" onClick={() => askHint("find")}>
                  <Lightbulb size={20} aria-hidden="true" /> تلميح
                </button>
              </>
            ),
          )}
        </div>
      </>,
    );

  // step 3: the project card, the map still in view, and one question
  return frame(
    <>
      {steps(3)}
      <div className="pq-use">
        <figure className="pq-project">
          <figcaption>{p.found?.label || mission.title}</figcaption>
          <Picture src={p.info?.image || mission.image} scene={mission.scene} alt={p.info?.alt} />
          <p>{p.info?.text}</p>
          {p.info?.text && <NarrationControls compact text={p.info.text} />}
        </figure>
        <div className="pq-use-map">
          <ProjectQuestMap targets={data.targets} found={p.found} compact />
        </div>
        <section className="pq-question" aria-labelledby="pq-q">
          <h2 id="pq-q">
            <span className="pq-mini-robot" aria-hidden="true">
              <RobotGuide />
            </span>
            {mission.use.prompt}
          </h2>
          <div className="exp-options" role="radiogroup" aria-label="الاختيارات">
            {mission.use.options.map((o) => {
              const chosen = p.choice === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  disabled={p.solved}
                  className={chosen ? (p.solved ? "is-correct" : "is-wrong") : ""}
                  onClick={() => choose(o)}
                >
                  <span className="pq-radio" aria-hidden="true" />
                  {o}
                  {chosen && p.solved && <CheckCircle size={20} weight="fill" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {p.solved ? (
            <>
              <p className="exp-success" role="status">
                <Star size={22} weight="fill" aria-hidden="true" /> {p.useText}
              </p>
              <button
                className="exp-primary"
                onClick={() => go({ view: missionIndex < missions.length - 1 ? "complete" : "badge" })}
              >
                {missionIndex < missions.length - 1 ? "تابع الرحلة" : "شاهد نهاية الرحلة"} <ArrowLeft size={22} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              {p.choice && (
                <p className="wq-feedback" role="status">
                  {robot}
                </p>
              )}
              <button className="exp-hint" onClick={() => askHint("use")}>
                <Lightbulb size={20} aria-hidden="true" /> تلميح
              </button>
            </>
          )}
        </section>
      </div>
    </>,
  );
}

// A teacher photo of the project, or the station's drawing when there is none.
function Picture({ src, scene, alt = "" }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" />
  ) : (
    <span className="pq-picture">
      <ProjectScene scene={{ ...scene, image: null, video: null }} />
    </span>
  );
}

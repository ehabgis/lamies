import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowCounterClockwise,
  Check,
  CheckCircle,
  HandPointing,
  Lightbulb,
  MapTrifold,
  BookOpen,
  Star,
  Trophy,
  Crosshair,
} from "phosphor-react";
import { api } from "./api";
import RobotGuide from "../components/Map/RobotGuide";
import ResourcePin from "../components/Map/ResourcePin";
import BuildMapCanvas from "./BuildMapCanvas";
import NarrationControls from "./NarrationControls";
import * as narrator from "./narrator";
import { play, resourceSound } from "./sfx";
import { Frame } from "./ExpeditionPage";
import "./expedition.css";
import "./build-map.css";

const STEPS = [
  { label: "اختر الرمز", Icon: HandPointing },
  { label: "ضعه على الخريطة", Icon: MapTrifold },
  { label: "تحقّق من إجابتك", Icon: CheckCircle },
];
const fresh = { round: 0, placed: {}, attempts: {}, hints: {}, reflections: {}, finished: false };
const storageKey = (id) => `lamis.buildmap.${id}.v1`;
const load = (id) => {
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(storageKey(id)) || "{}") };
  } catch {
    return fresh;
  }
};

export default function BuildMapPage() {
  const { id = "lesson-1" } = useParams();
  const [data, setData] = useState(null);
  const [resources, setResources] = useState({});
  const [error, setError] = useState("");
  const [p, setP] = useState(() => load(id));
  const [selected, setSelected] = useState(null);
  const [robot, setRobot] = useState("");
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState(null); // {itemId?, prompt, answer?, final?}
  const [cursor, setCursor] = useState(null); // keyboard crosshair
  const mapRef = useRef(null);

  useEffect(() => {
    setP(load(id));
    Promise.all([api(`/demo/lessons/${id}/build-map`), api(`/demo/lessons/${id}`)])
      .then(([a, l]) => {
        setData(a.activity);
        setResources(Object.fromEntries((l.lesson.content.resources || []).map((r) => [r.id, r])));
      })
      .catch((e) => setError(e.message));
    return () => narrator.stop();
  }, [id]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(p));
    } catch {}
  }, [id, p]);

  const go = (next) => setP((old) => ({ ...old, ...next }));
  const say = (text) => {
    setRobot(text);
    narrator.speak(text);
  };
  const round = data?.rounds[p.round];
  const items = Object.fromEntries(
    (round?.items || []).map((i) => [i.id, { ...i, resource: resources[i.resourceId] || { id: i.resourceId, label: i.label } }]),
  );
  const locked = (round?.items || []).filter((i) => p.placed[i.id]?.state === "locked").length;
  const roundDone = round && locked === round.items.length;
  const stars = Object.values(p.placed).filter((x) => x.state === "locked").length;
  const pending = Object.entries(p.placed).filter(([k, v]) => items[k] && v.state !== "locked");
  const step = !selected && !pending.length ? 1 : pending.length ? 3 : 2;

  function place(itemId, at) {
    const item = items[itemId];
    if (!item || p.placed[itemId]?.state === "locked") return;
    play("select");
    go({ placed: { ...p.placed, [itemId]: { ...at, state: "placed" } } });
    setSelected(null);
    setRobot(`وضعت ${item.label}. اضغط «تحقّق من إجابتي» أو حرّك الرمز إن أردت.`);
  }
  function choose(itemId) {
    if (p.placed[itemId]?.state === "locked") return;
    play(resourceSound(items[itemId].resource));
    setSelected(itemId);
    setRobot(`اخترت ${items[itemId].label}. اضغط على مكانه في الخريطة، أو اسحب الرمز إليها.`);
  }
  async function check() {
    if (!pending.length || busy) return;
    setBusy(true);
    const placed = { ...p.placed };
    const attempts = { ...p.attempts };
    const messages = [];
    let reflection = null;
    for (const [itemId, at] of pending) {
      const attempt = (attempts[itemId] || 0) + 1;
      try {
        const r = await api(`/demo/lessons/${id}/build-map/check`, {
          method: "POST",
          body: { itemId, lat: at.lat, lng: at.lng, attempt },
        });
        if (r.correct) {
          placed[itemId] = { lat: r.at.lat, lng: r.at.lng, state: "locked", name: r.name };
          messages.push(`أحسنت! ${items[itemId].label}: ${r.name}.`);
          if (r.why && !reflection) reflection = { itemId, ...r.why };
        } else {
          attempts[itemId] = attempt;
          placed[itemId] = { ...at, state: "wrong" };
          messages.push(`${items[itemId].label}: ليس هذا المكان. ${r.hint}`);
        }
      } catch (e) {
        messages.push(`تعذر التحقق الآن: ${e.message}`);
      }
    }
    setBusy(false);
    const good = Object.values(placed).filter((x) => x.state === "locked").length > stars;
    play(good ? "star" : "wrong");
    go({ placed, attempts });
    say(messages.join(" "));
    if (reflection) setWhy(reflection);
  }
  async function hint() {
    const target = selected || pending[0]?.[0] || round.items.find((i) => p.placed[i.id]?.state !== "locked")?.id;
    if (!target) return;
    const level = Math.max(p.hints[target] || 0, p.attempts[target] || 0) + 1;
    try {
      const r = await api(`/demo/lessons/${id}/build-map/check`, { method: "POST", body: { itemId: target, hint: true, attempt: level } });
      go({ hints: { ...p.hints, [target]: level } });
      say(`تلميح عن ${items[target].label}: ${r.hint}`);
    } catch (e) {
      setRobot(`تعذر جلب التلميح: ${e.message}`);
    }
  }
  function retry() {
    // Unchecked and wrong symbols go back to the box; correct ones stay.
    const placed = Object.fromEntries(Object.entries(p.placed).filter(([, v]) => v.state === "locked"));
    go({ placed });
    setSelected(null);
    say("حسنًا، جرّب مرة أخرى. اختر رمزًا وضعه في مكانه.");
  }
  // Arrow keys move the crosshair (about 40 km a press), Enter places the symbol.
  function cursorKeys(e) {
    if (!selected) return;
    const start = cursor || mapRef.current?.getCenter();
    if (!start) return;
    const step = e.shiftKey ? 1.2 : 0.4;
    const moves = { ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dLat, dLng] = moves[e.key];
      setCursor({
        lat: Math.min(31.8, Math.max(22, start.lat + dLat)),
        lng: Math.min(35.6, Math.max(24.8, start.lng + dLng)),
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      place(selected, { lat: start.lat, lng: start.lng });
      setCursor(null);
    } else if (e.key === "Escape") setCursor(null);
  }
  async function finishRound() {
    if (round.finalWhy && !p.reflections[`final-${p.round}`]) {
      setWhy({ final: true, prompt: round.finalWhy.prompt });
      return;
    }
    nextRound();
  }
  function nextRound() {
    setWhy(null);
    if (p.round < data.rounds.length - 1) {
      play("open");
      go({ round: p.round + 1 });
      say(data.rounds[p.round + 1].intro);
    } else {
      play("star");
      go({ finished: true });
      say("أكملت خريطتك كلها! أنت صانع خرائط ماهر.");
    }
  }
  async function revealWhy(text) {
    let answer = why.answer;
    if (why.final) {
      try {
        answer = (await api(`/demo/lessons/${id}/build-map/check`, { method: "POST", body: { reveal: "final", roundIndex: p.round } })).answer;
      } catch {
        answer = "";
      }
    }
    const key = why.final ? `final-${p.round}` : why.itemId;
    go({ reflections: { ...p.reflections, [key]: text || "" } });
    setWhy({ ...why, answer, shown: true, text });
    if (answer) narrator.speak(answer);
  }

  const nav = (
    <>
      <Link to={`/demo/${id}`}>
        <MapTrifold size={22} aria-hidden="true" /> الخريطة التفاعلية
      </Link>
    </>
  );
  if (error)
    return (
      <Frame title="ابنِ خريطتك" lessonPath="/explore">
        <div className="exp-error" role="alert">
          <p>تعذر تحميل النشاط. {error}</p>
          <button className="p-button" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>
        </div>
      </Frame>
    );
  if (!data)
    return (
      <Frame title="ابنِ خريطتك" lessonPath="/explore">
        <p className="exp-loading" role="status">جارٍ تجهيز الخريطة…</p>
      </Frame>
    );

  const guideText = robot || round?.intro;
  return (
    <Frame title={`ابنِ خريطتك — ${data.title}`} stars={stars} lessonPath="/explore" extraNav={nav} className="build-map-page">
      <div className="bm-layout">
        <aside className="bm-palette" aria-label="رموز الموارد">
          <h2>رموز الموارد</h2>
          <ul>
            {round.items.map((i) => {
              const state = p.placed[i.id]?.state;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    draggable={state !== "locked"}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", i.id);
                      e.dataTransfer.effectAllowed = "move";
                      setSelected(i.id);
                    }}
                    aria-pressed={selected === i.id}
                    disabled={state === "locked"}
                    className={`bm-chip ${state ? `is-${state}` : ""}`}
                    onClick={() => choose(i.id)}
                  >
                    <ResourcePin resource={items[i.id].resource} />
                    <b>{i.label}</b>
                    {state === "locked" && <CheckCircle className="bm-chip-done" size={22} weight="fill" aria-label="في مكانه الصحيح" />}
                    {state === "placed" && <small>على الخريطة</small>}
                    {state === "wrong" && <small>حرّكه وجرّب</small>}
                  </button>
                </li>
              );
            })}
          </ul>
          {selected && (
            <button
              type="button"
              className="bm-center-btn"
              aria-describedby="bm-keyboard-tip"
              onFocus={() => setCursor((c) => c || mapRef.current?.getCenter() || null)}
              onBlur={() => setCursor(null)}
              onKeyDown={cursorKeys}
              onClick={() => setCursor((c) => c || mapRef.current?.getCenter() || null)}
            >
              <Crosshair size={20} aria-hidden="true" /> ضعه بلوحة المفاتيح
            </button>
          )}
          <small className="bm-keyboard-tip" id="bm-keyboard-tip">
            بلوحة المفاتيح: اختر الرمز، ثم انتقل إلى «ضعه بلوحة المفاتيح» وحرّك العلامة بالأسهم، ثم اضغط Enter.
          </small>
        </aside>

        <section className="bm-main" aria-labelledby="bm-title">
          <header className="bm-head">
            <div>
              <h1 id="bm-title">ابنِ خريطتك</h1>
              <strong>{data.title}</strong>
              <p>{data.instruction}</p>
            </div>
            <ol className="bm-steps" aria-label="الخطوات">
              {STEPS.map(({ label, Icon }, i) => (
                <li key={label} className={step === i + 1 ? "is-current" : step > i + 1 ? "is-done" : ""}>
                  <span className="bm-step-num">{i + 1}</span>
                  <Icon size={24} aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </header>
          <BuildMapCanvas
            mapRef={mapRef}
            placed={Object.fromEntries(Object.entries(p.placed).filter(([k]) => items[k]))}
            items={items}
            selected={selected}
            cursor={cursor}
            onTapMap={(at) => selected && place(selected, at)}
            onDropItem={(itemId, at) => place(itemId, at)}
            onMove={(itemId, at) => go({ placed: { ...p.placed, [itemId]: { ...at, state: "placed" } } })}
          />
          <footer className="bm-bar">
            <div className="bm-progress" aria-live="polite">
              <span>
                <bdi>{locked}</bdi> من <bdi>{round.items.length}</bdi> · الجولة <bdi>{p.round + 1}</bdi> من <bdi>{data.rounds.length}</bdi>
              </span>
              <ol aria-hidden="true">
                {round.items.map((i) => (
                  <li key={i.id} className={p.placed[i.id]?.state === "locked" ? "is-done" : ""} />
                ))}
              </ol>
            </div>
            {roundDone ? (
              p.finished ? (
                <span className="bm-finished">
                  <Trophy size={24} weight="fill" aria-hidden="true" /> صانع الخرائط
                </span>
              ) : (
                <button type="button" className="exp-primary" onClick={finishRound}>
                  {p.round < data.rounds.length - 1 ? "الجولة التالية" : "أنهِ الخريطة"} <ArrowLeft size={22} aria-hidden="true" />
                </button>
              )
            ) : (
              <button type="button" className="exp-primary" disabled={!pending.length || busy} onClick={check}>
                <Check size={22} aria-hidden="true" /> {busy ? "جارٍ التحقق…" : "تحقّق من إجابتي"}
              </button>
            )}
            <button type="button" className="exp-secondary" onClick={retry} disabled={!pending.length}>
              <ArrowCounterClockwise size={20} aria-hidden="true" /> حاول من جديد
            </button>
          </footer>
        </section>

        <aside className="bm-guide" aria-label="المعلم الذكي">
          <span className="bm-guide-robot" aria-hidden="true">
            <RobotGuide />
          </span>
          <strong className="bm-guide-name">المعلم الذكي</strong>
          {why ? (
            <div className="bm-why">
              <p className="bm-bubble">{why.prompt}</p>
              {!why.shown ? (
                <WhyForm onSubmit={revealWhy} />
              ) : (
                <>
                  {why.text && <p className="bm-why-mine">تفسيرك: {why.text}</p>}
                  {why.answer && (
                    <p className="bm-why-book">
                      <BookOpen size={18} aria-hidden="true" /> من الكتاب: {why.answer}
                    </p>
                  )}
                  <button type="button" className="exp-primary" onClick={() => (why.final ? nextRound() : setWhy(null))}>
                    متابعة <ArrowLeft size={20} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="bm-bubble" aria-live="polite">
                {p.finished ? "أكملت خريطتك كلها! أنت صانع خرائط ماهر." : guideText}
              </p>
              <NarrationControls compact text={guideText} />
              {!roundDone && (
                <button type="button" className="exp-hint" onClick={hint}>
                  <Lightbulb size={20} aria-hidden="true" /> أحتاج تلميحًا
                </button>
              )}
              {p.finished && (
                <div className="bm-badge" role="status">
                  <Trophy size={40} weight="fill" aria-hidden="true" />
                  <b>صانع الخرائط</b>
                  <span>
                    <Star size={18} weight="fill" aria-hidden="true" /> {stars} نجمة
                  </span>
                  <button
                    type="button"
                    className="exp-secondary"
                    onClick={() => {
                      if (window.confirm("هل تريد بناء الخريطة من جديد؟")) {
                        setP(fresh);
                        setRobot("");
                      }
                    }}
                  >
                    ابنِ الخريطة من جديد
                  </button>
                </div>
              )}
            </>
          )}
          <small className="bm-note">التحقق من المكان يتم ببيانات الخريطة. التقدم محفوظ على هذا الجهاز فقط.</small>
        </aside>
      </div>
    </Frame>
  );
}

function WhyForm({ onSubmit }) {
  const [text, setText] = useState("");
  return (
    <form
      className="bm-why-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text.trim());
      }}
    >
      <label>
        <span>اكتب تفسيرك باختصار (اختياري)</span>
        <textarea value={text} maxLength={300} rows={3} onChange={(e) => setText(e.target.value)} />
      </label>
      <button type="submit" className="exp-primary">
        قارن بإجابة الكتاب
      </button>
    </form>
  );
}

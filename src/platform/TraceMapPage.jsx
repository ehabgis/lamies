import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PencilSimple,
  Eraser,
  ArrowCounterClockwise,
  ArrowUUpLeft,
  HandGrabbing,
  Eye,
  EyeSlash,
  Target,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Info,
  Plus,
  Minus,
  Star,
  Stack,
} from "phosphor-react";
import { api } from "./api";
import RobotGuide from "../components/Map/RobotGuide";
import { Frame } from "./ExpeditionPage";
import { studentKey } from "./guestProfile";
import { play } from "./sfx";
import "./expedition.css";
import "./trace-map.css";

// Plain «worksheet» projection of Egypt: x grows east, y grows south.
const B = { latMin: 21.6, latMax: 31.9, lngMin: 24.5, lngMax: 35.6 };
const KY = 100;
const KX = KY * Math.cos((27 * Math.PI) / 180);
const W = Math.round((B.lngMax - B.lngMin) * KX);
const H = Math.round((B.latMax - B.latMin) * KY);
const xy = ([lat, lng]) => [(lng - B.lngMin) * KX, (B.latMax - lat) * KY];
const ll = ([x, y]) => [B.latMax - y / KY, B.lngMin + x / KX];
const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
const ringsOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).flatMap((poly) => poly);
const ringPath = (ring) => path(ring.map(([lng, lat]) => xy([lat, lng]))) + "Z";

const SEA_LABEL = { med: [31.72, 28.4], red: [26.4, 34.9] };
const fresh = { view: "start", stage: 0, done: {}, seas: {}, solved: false };
const keyOf = (id) => studentKey(`lamis.trace.${id}.v1`);
const load = (id) => {
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(keyOf(id)) || "{}") };
  } catch {
    return fresh;
  }
};

// «تتبّع وارسم خريطتك»: trace → practise → draw alone, then name the seas.
export default function TraceMapPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [base, setBase] = useState(null);
  const [error, setError] = useState("");
  const [p, setP] = useState(() => load(id));
  const [strokes, setStrokes] = useState([]);
  const [tool, setTool] = useState("pen");
  const [guide, setGuide] = useState(true);
  const [peek, setPeek] = useState(false);
  const [result, setResult] = useState(null);
  const [say, setSay] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, w: W, h: H });
  const [pickedSea, setPickedSea] = useState(null);
  const [choice, setChoice] = useState(null);

  useEffect(() => {
    api(`/demo/lessons/${id}/trace`)
      .then((r) => setData(r.activity))
      .catch((e) => setError(e.message));
    Promise.all(["egypt-governorates", "egypt-seas"].map((f) => fetch(`/geodata/${f}.geojson`).then((r) => r.json())))
      .then(([gov, seas]) =>
        setBase({
          egypt: gov.features.flatMap((f) => ringsOf(f.geometry)).map(ringPath),
          seas: seas.features.map((f) => ({ name: f.properties.name_ar, d: ringsOf(f.geometry).map(ringPath).join("") })),
        }),
      )
      .catch(() => setBase({ egypt: [], seas: [] }));
  }, [id]);
  useEffect(() => {
    try {
      localStorage.setItem(keyOf(id), JSON.stringify(p));
    } catch {}
  }, [id, p]);

  const go = (next) => setP((old) => ({ ...old, ...next }));
  const stage = data?.stages[p.stage];
  const model = useMemo(
    () => (data ? Object.fromEntries(Object.entries(data.model).map(([k, line]) => [k, line.map(xy)])) : null),
    [data],
  );

  async function check(body) {
    setBusy(true);
    try {
      return await api(`/demo/lessons/${id}/trace/check`, { method: "POST", body });
    } catch (e) {
      setSay(`تعذر التحقق الآن: ${e.message}`);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function startStage(i) {
    setStrokes([]);
    setResult(null);
    setPeek(false);
    setGuide(true);
    setTool("pen");
    setView({ x: 0, y: 0, w: W, h: H });
    go({ view: "draw", stage: i });
    setSay(data.stages[i].tip);
  }
  async function finish() {
    if (!strokes.some((s) => s.length > 1)) return setSay("ارسم خطًا على الخريطة أولًا، ثم اضغط «انتهيت من الرسم».");
    // About 400 points are enough to compare a drawing with the river.
    const total = strokes.reduce((n, s) => n + s.length, 0);
    const every = Math.max(1, Math.ceil(total / 400));
    const r = await check({
      step: "draw",
      stage: stage.id,
      strokes: strokes.map((s) => s.filter((_, i) => i % every === 0 || i === s.length - 1).map((pt) => ll(pt).map((v) => Number(v.toFixed(4))))),
    });
    if (!r) return;
    play(r.passed ? "correct" : "tap");
    setResult(r);
    setSay(r.feedback);
    if (r.passed) setP((old) => ({ ...old, done: { ...old.done, [stage.id]: true } }));
  }
  async function placeSea(seaId, pt) {
    const [lat, lng] = ll(pt);
    const r = await check({ step: "label", sea: seaId, lat, lng });
    if (!r) return;
    play(r.correct ? "correct" : "wrong");
    setSay(r.feedback);
    setPickedSea(null);
    if (r.correct) setP((old) => ({ ...old, seas: { ...old.seas, [seaId]: pt } }));
  }
  async function answer(o) {
    setChoice(o);
    const r = await check({ step: "question", answer: o });
    if (!r) return;
    play(r.correct ? "star" : "wrong");
    setSay(r.correct ? r.explanation : r.hint);
    if (r.correct) go({ solved: true });
  }

  const frame = (children) => (
    <Frame title={data?.title || "تتبّع وارسم خريطتك"} lessonPath="/explore" className="trace-map">
      {children}
    </Frame>
  );
  if (error)
    return frame(
      <p className="exp-error" role="alert">
        تعذر تحميل النشاط. {error}
      </p>,
    );
  if (!data || !base || !model) return frame(<p className="exp-loading" role="status">نجهّز ورقة الرسم…</p>);

  const back = (
    <Link className="tm-crumb" to={`/demo/${id}`}>
      <ArrowRight size={16} aria-hidden="true" /> الأنشطة التفاعلية
    </Link>
  );
  // ------------------------------------------------------------ start card
  if (p.view === "start")
    return frame(
      <section className="tm-start">
        {back}
        <div className="tm-start-card">
          <span className="tm-start-icon" aria-hidden="true">
            <PencilSimple weight="duotone" />
          </span>
          <h1>{data.title}</h1>
          <p>{data.summary}</p>
          <div className="tm-start-robot">
            <span aria-hidden="true">
              <RobotGuide />
            </span>
            <p>{data.welcome}</p>
          </div>
          <button className="exp-primary" onClick={() => startStage(Object.keys(p.done).length >= 3 ? 0 : Object.keys(p.done).length)}>
            ابدأ الرسم <ArrowLeft size={22} aria-hidden="true" />
          </button>
        </div>
      </section>,
    );

  const drawing = p.view === "draw";
  const showGuide = drawing && !result && ((stage.id === "trace" && guide) || peek);
  const showEnds = drawing && !result && stage.id !== "alone";
  const seaNames = p.view !== "seas";
  const nileEnds = [model.stem[0], model.rosetta[model.rosetta.length - 1], model.damietta[model.damietta.length - 1]];

  const canvas = (
    <Canvas
      view={view}
      setView={setView}
      tool={p.view === "draw" && !result ? tool : p.view === "seas" && pickedSea ? "place" : "none"}
      strokes={strokes}
      setStrokes={setStrokes}
      onPlace={(pt) => pickedSea && placeSea(pickedSea, pt)}
    >
      <rect x={-W} y={-H} width={W * 3} height={H * 3} className="tm-land-other" />
      {base.seas.map((s) => (
        <path key={s.name} d={s.d} className="tm-sea" />
      ))}
      <g className="tm-egypt-edge">
        {base.egypt.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className="tm-egypt">
        {base.egypt.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {seaNames && (
        <g className="tm-sea-names" aria-hidden="true">
          <text x={xy(SEA_LABEL.med)[0]} y={xy(SEA_LABEL.med)[1]}>البحر المتوسط</text>
          <text x={xy(SEA_LABEL.red)[0]} y={xy(SEA_LABEL.red)[1]}>البحر الأحمر</text>
        </g>
      )}
      {p.view === "seas" &&
        Object.entries(p.seas).map(([sid, pt]) => (
          <text key={sid} x={pt[0]} y={pt[1]} className="tm-sea-placed">
            {data.seas.find((s) => s.id === sid)?.name}
          </text>
        ))}
      {showGuide && (
        <g className="tm-guide">
          {Object.values(model).map((line, i) => (
            <path key={i} d={path(line)} />
          ))}
        </g>
      )}
      {showEnds && (
        <g className="tm-ends">
          <circle cx={nileEnds[0][0]} cy={nileEnds[0][1]} r="11" className="is-start" />
          <text x={nileEnds[0][0] + 18} y={nileEnds[0][1] - 18}>ابدأ هنا</text>
          {stage.id === "practice" &&
            nileEnds.slice(1).map((e, i) => <circle key={i} cx={e[0]} cy={e[1]} r="9" className="is-end" />)}
        </g>
      )}
      <g className="tm-strokes">
        {strokes.map((s, i) => (
          <path key={i} d={path(s)} />
        ))}
      </g>
      {result && (
        <g className="tm-compare">
          {Object.values(model).map((line, i) => (
            <path key={i} d={path(line)} />
          ))}
        </g>
      )}
    </Canvas>
  );

  const steps = (
    <ol className="tm-steps" aria-label="مراحل النشاط">
      {data.stages.map((s, i) => {
        const current = drawing && i === p.stage;
        const done = p.done[s.id];
        return (
          <li key={s.id} className={`${current ? "is-current" : ""} ${done ? "is-done" : ""}`} aria-current={current ? "step" : undefined}>
            <span className="tm-step-num">{done && !current ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : i + 1}</span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );

  // ------------------------------------------------------------ side panel
  let panel;
  if (drawing) {
    panel = (
      <>
        <section className="tm-card">
          <h2>
            <Target size={22} weight="duotone" aria-hidden="true" /> مهمتك الآن
            <span className="tm-count">
              <bdi>{p.stage + 1}</bdi> من <bdi>{data.stages.length}</bdi>
            </span>
          </h2>
          <p>{stage.task}</p>
        </section>
        {result ? (
          <section className={`tm-card tm-result ${result.passed ? "is-good" : ""}`} role="status">
            <h2>{result.passed ? <Star size={24} weight="fill" aria-hidden="true" /> : <Info size={22} aria-hidden="true" />} قارن رسمك بالنموذج</h2>
            <p>{result.feedback}</p>
            <p className="tm-legend">
              <i className="tm-swatch-mine" /> رسمي <i className="tm-swatch-model" /> النموذج
            </p>
            <div className="tm-row">
              <button className="exp-secondary" onClick={() => startStage(p.stage)}>
                <ArrowCounterClockwise size={18} aria-hidden="true" /> أحاول مرة أخرى
              </button>
              <button
                className="exp-primary"
                onClick={() => {
                  play("open");
                  if (p.stage < data.stages.length - 1) startStage(p.stage + 1);
                  else {
                    setResult(null);
                    setStrokes([]);
                    go({ view: "seas" });
                    setSay("ضع اسم كل بحر في مكانه: اختر الاسم، ثم اضغط على البحر في الخريطة.");
                  }
                }}
              >
                التالي <ArrowLeft size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="tm-card">
              <h2>
                <PencilSimple size={22} weight="duotone" aria-hidden="true" /> أدوات الرسم
              </h2>
              <div className="tm-tools" role="group" aria-label="أدوات الرسم">
                <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} Icon={PencilSimple} label="قلم" />
                <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} Icon={Eraser} label="ممحاة" />
                <ToolButton onClick={() => setStrokes((s) => s.slice(0, -1))} Icon={ArrowUUpLeft} label="تراجع" disabled={!strokes.length} />
                <ToolButton active={tool === "move"} onClick={() => setTool("move")} Icon={HandGrabbing} label="تحريك" />
              </div>
              {stage.id === "trace" ? (
                <label className="tm-toggle">
                  {guide ? <Eye size={22} aria-hidden="true" /> : <EyeSlash size={22} aria-hidden="true" />}
                  إظهار المسار الإرشادي
                  <input type="checkbox" role="switch" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
                  <span className="tm-switch" aria-hidden="true" />
                </label>
              ) : stage.id === "practice" ? (
                <button
                  type="button"
                  className="exp-hint"
                  onClick={() => {
                    setPeek(true);
                    setSay("انظر جيدًا، سيختفي المسار بعد ثوانٍ.");
                    setTimeout(() => setPeek(false), 3000);
                  }}
                >
                  <Lightbulb size={20} aria-hidden="true" /> تلميح
                </button>
              ) : null}
            </section>
            <Robot text={say || stage.tip} />
            <button className="exp-primary tm-finish" onClick={finish} disabled={busy}>
              <CheckCircle size={22} weight="fill" aria-hidden="true" /> {busy ? "نقارن رسمك…" : "انتهيت من الرسم"}
            </button>
            <button className="exp-secondary" onClick={() => setStrokes([])} disabled={!strokes.length}>
              <ArrowCounterClockwise size={18} aria-hidden="true" /> ابدأ من جديد
            </button>
            <small className="tm-note">
              <Info size={16} aria-hidden="true" /> استخدم الماوس أو إصبعك للرسم. بلوحة المفاتيح: الأسهم تحرك المؤشر، والمسافة ترسم نقطة.
            </small>
          </>
        )}
      </>
    );
  } else if (p.view === "seas") {
    const left = data.seas.filter((s) => !p.seas[s.id]);
    panel = (
      <>
        <section className="tm-card">
          <h2>
            <Target size={22} weight="duotone" aria-hidden="true" /> ضع اسم كل بحر في مكانه
          </h2>
          <p>اختر الاسم، ثم اضغط على البحر المناسب في الخريطة.</p>
          <div className="tm-names">
            {data.seas.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`tm-name ${pickedSea === s.id ? "is-picked" : ""} ${p.seas[s.id] ? "is-placed" : ""}`}
                aria-pressed={pickedSea === s.id}
                disabled={!!p.seas[s.id] || busy}
                onClick={() => setPickedSea(pickedSea === s.id ? null : s.id)}
              >
                {p.seas[s.id] && <CheckCircle size={18} weight="fill" aria-hidden="true" />} {s.name}
              </button>
            ))}
          </div>
        </section>
        <Robot text={say || "ضع اسم كل بحر في مكانه."} />
        {!left.length && (
          <button className="exp-primary" onClick={() => go({ view: "question" })}>
            التالي <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}
      </>
    );
  } else if (p.view === "question") {
    panel = (
      <>
        <section className="tm-card">
          <h2>
            <Target size={22} weight="duotone" aria-hidden="true" /> {data.question.prompt}
          </h2>
          <div className="exp-options" role="radiogroup" aria-label="الاختيارات">
            {data.question.options.map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={choice === o}
                disabled={p.solved || busy}
                className={choice === o ? (p.solved ? "is-correct" : "is-wrong") : ""}
                onClick={() => answer(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </section>
        <Robot text={say || "انظر إلى نهاية النهر في شمال الخريطة."} />
        {p.solved && (
          <button className="exp-primary" onClick={() => go({ view: "done" })}>
            أنهِ النشاط <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}
      </>
    );
  } else {
    panel = (
      <>
        <section className="tm-card tm-result is-good" role="status">
          <h2>
            <Star size={26} weight="fill" aria-hidden="true" /> أحسنت!
          </h2>
          <p>رسمت نهر النيل بنفسك، ووضعت البحرين في مكانيهما، وعرفت أين يصب النيل.</p>
        </section>
        <Link className="exp-primary" to={`/demo/${id}`}>
          العودة إلى الأنشطة <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <button
          className="exp-secondary"
          onClick={() => {
            setP({ ...fresh, view: "draw" });
            startStage(0);
          }}
        >
          <ArrowCounterClockwise size={18} aria-hidden="true" /> ارسم من جديد
        </button>
      </>
    );
  }

  return frame(
    <div className="tm-layout">
      <aside className="tm-panel" aria-label="المهمة والأدوات">
        {back}
        <h1 className="tm-title">
          <PencilSimple size={28} weight="duotone" aria-hidden="true" /> {data.title}
        </h1>
        {panel}
      </aside>
      <section className="tm-board" aria-label="ورقة الرسم">
        {steps}
        <div className="tm-paper">
          {canvas}
          <span className="tm-layer-chip">
            <Stack size={18} aria-hidden="true" /> ورقة الرسم الشفافة
          </span>
          <div className="tm-map-legend" aria-hidden="true">
            {drawing && stage.id === "trace" && (
              <span>
                <i className="tm-swatch-guide" /> مسار إرشادي
              </span>
            )}
            <span>
              <i className="tm-swatch-mine" /> رسمي
            </span>
          </div>
          <div className="tm-zoom">
            <button type="button" aria-label="تكبير" onClick={() => setView((v) => zoom(v, 0.8))}>
              <Plus size={20} />
            </button>
            <button type="button" aria-label="تصغير" onClick={() => setView((v) => zoom(v, 1.25))}>
              <Minus size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>,
  );
}

function zoom(v, f) {
  const w = Math.min(W, Math.max(W / 4, v.w * f));
  const h = (w / W) * H;
  const cx = v.x + v.w / 2,
    cy = v.y + v.h / 2;
  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h });
}
function clampView(v) {
  return { ...v, x: Math.min(W - v.w, Math.max(0, v.x)), y: Math.min(H - v.h, Math.max(0, v.y)) };
}

function ToolButton({ active, Icon, label, ...rest }) {
  return (
    <button type="button" className={`tm-tool ${active ? "is-active" : ""}`} aria-pressed={active ?? undefined} {...rest}>
      <Icon size={26} weight={active ? "fill" : "regular"} aria-hidden="true" />
      {label}
    </button>
  );
}
function Robot({ text }) {
  return (
    <div className="tm-robot" aria-live="polite">
      <p>{text}</p>
      <span aria-hidden="true">
        <RobotGuide />
      </span>
    </div>
  );
}

// The drawing surface: the child's strokes are a separate layer on top of
// the map, so the eraser and «تراجع» never touch the map or the model.
function Canvas({ view, setView, tool, strokes, setStrokes, onPlace, children }) {
  const svg = useRef(null);
  const drag = useRef(null);
  const [cursor, setCursor] = useState(null);
  const toMap = (e) => {
    const pt = svg.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(svg.current.getScreenCTM().inverse());
    return [q.x, q.y];
  };
  const erase = (pt) =>
    setStrokes((all) => all.filter((s) => !s.some((q) => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < 18 * (view.w / W) + 6)));
  function down(e) {
    if (e.button > 0 || tool === "none") return;
    // Drawing must not select page text or scroll the page.
    e.preventDefault();
    const pt = toMap(e);
    if (tool === "place") return onPlace(pt);
    svg.current.setPointerCapture(e.pointerId);
    if (tool === "pen") {
      drag.current = { mode: "pen" };
      setStrokes((s) => [...s, [pt]]);
    } else if (tool === "eraser") {
      drag.current = { mode: "eraser" };
      erase(pt);
    } else if (tool === "move") drag.current = { mode: "move", x: e.clientX, y: e.clientY, v: view };
  }
  function move(e) {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "pen") {
      const pt = toMap(e);
      setStrokes((s) => {
        const last = s[s.length - 1];
        const prev = last[last.length - 1];
        if (Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) < 3) return s;
        return [...s.slice(0, -1), [...last, pt]];
      });
    } else if (d.mode === "eraser") erase(toMap(e));
    else {
      const r = svg.current.getBoundingClientRect();
      const scale = d.v.w / r.width;
      setView(clampView({ ...d.v, x: d.v.x - (e.clientX - d.x) * scale, y: d.v.y - (e.clientY - d.y) * scale }));
    }
  }
  const up = () => (drag.current = null);

  // Keyboard drawing: arrows move a cursor, Space adds a point, Enter/Escape
  // ends the line.
  function key(e) {
    if (tool !== "pen" && tool !== "place") return;
    const step = (e.shiftKey ? 30 : 10) * (view.w / W);
    const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    const c = cursor || [W * 0.6, H * 0.9];
    if (moves[e.key]) {
      e.preventDefault();
      setCursor([c[0] + moves[e.key][0], c[1] + moves[e.key][1]]);
    } else if (e.key === " ") {
      e.preventDefault();
      if (tool === "place") return onPlace(c);
      setStrokes((s) => (drag.current?.mode === "keys" ? [...s.slice(0, -1), [...s[s.length - 1], c]] : [...s, [c]]));
      drag.current = { mode: "keys" };
    } else if (e.key === "Enter" || e.key === "Escape") drag.current = null;
  }
  return (
    <svg
      ref={svg}
      className={`tm-svg tool-${tool}`}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label="خريطة مصر للرسم"
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      onBlur={() => setCursor(null)}
    >
      {children}
      {cursor && <circle cx={cursor[0]} cy={cursor[1]} r={9 * (view.w / W) + 3} className="tm-cursor" />}
    </svg>
  );
}

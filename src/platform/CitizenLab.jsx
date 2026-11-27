import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowLeft, CheckCircle, Eye, HandPointing, Sparkle, Star, XCircle } from "phosphor-react";
import { play } from "./sfx";
import "./citizen.css";

// «أنا مواطن مسؤول»: the citizens' part of «دور الدولة والمواطنين» as
// situations to watch, decide and see the result of. Each situation stands
// for one role written in the lesson (server/textbook-unit3.mjs realLife and
// examples); the drawings only show that role, they add no new one. Nothing
// here is graded, scored or saved: it is practice inside the book.
const SCENES = {
  "ترشيد استهلاك الطاقة": {
    kind: "lamp",
    ask: "خرجت من غرفتك في وضح النهار، والمصباح ما زال مضاءً. ماذا تفعل؟",
    options: [
      { label: "أُطفئ المصباح قبل أن أخرج", ok: true },
      { label: "أتركه مضاءً حتى أعود" },
    ],
    right: {
      badge: "وفّرنا الطاقة",
      text: "أطفأت المصباح، فهدأ عدّاد الكهرباء.",
      why: "ترشيد استهلاك الطاقة: نستخدم الكهرباء عند الحاجة فقط، فنحافظ على مصادر الطاقة.",
    },
    wrong: {
      badge: "طاقة تضيع",
      text: "المصباح يعمل والغرفة فارغة، والعدّاد يدور بسرعة: طاقة تضيع بلا فائدة.",
    },
    see: {
      ask: "غرفة نهارًا، الشمس من النافذة، والمصباح مضاء والطفل عند الباب.",
      right: "المصباح مطفأ، والعدّاد متوقف تقريبًا.",
      wrong: "المصباح مضاء في غرفة فارغة، والعدّاد يدور بسرعة.",
    },
  },
  "دعم استخدام الطاقة المتجددة": {
    kind: "solar",
    ask: "أسرتك تريد مصدرًا لكهرباء البيت. أيّهما يدعم استخدام الطاقة المتجددة؟",
    options: [
      { label: "مولّد يعمل بالسولار" },
      { label: "ألواح شمسية على السطح", ok: true },
    ],
    right: {
      badge: "طاقة من الشمس",
      text: "الألواح الشمسية تحوّل ضوء الشمس إلى كهرباء، فأضاءت نوافذ البيت.",
      why: "الشمس مصدر طاقة متجدد، ودعم استخدام الطاقة المتجددة من دور المواطنين.",
    },
    wrong: {
      badge: "دخان ووقود ينفد",
      text: "السولار من مشتقات البترول، والبترول مصدر طاقة غير متجدد. فكّر في مصدر لا ينفد.",
    },
    see: {
      ask: "بيت نوافذه مطفأة تحت شمس ساطعة.",
      right: "ألواح شمسية على سطح البيت، وأشعة الشمس تصل إليها، والنوافذ مضاءة.",
      wrong: "مولّد بجوار البيت يخرج منه دخان.",
    },
  },
  "الالتزام بقوانين التعدين والطاقة": {
    kind: "mine",
    ask: "في رحلة إلى الصحراء رأيت لافتة: «منطقة تعدين — ممنوع الدخول». ماذا تفعل؟",
    options: [
      { label: "أحترم اللافتة وأبقى خارج السور", ok: true },
      { label: "أدخل لأجمع بعض الأحجار" },
    ],
    right: {
      badge: "التزمت بالقانون",
      text: "بقيت خارج السور في أمان، والعمل في المنجم مستمر بنظام.",
      why: "الالتزام بقوانين التعدين والطاقة من دور المواطنين، والدولة تسنّ القوانين لحماية الثروة المعدنية.",
    },
    wrong: {
      badge: "مخالفة وخطر",
      text: "دخول منطقة التعدين مخالف للقانون وغير آمن؛ القانون وُضع لحماية الثروة المعدنية.",
    },
    see: {
      ask: "منجم في الصحراء خلف سور، ولافتة ممنوع الدخول، وطفل يقف أمام البوابة.",
      right: "الطفل يبتعد عن البوابة، وعلامة صح خضراء فوق اللافتة.",
      wrong: "الطفل عند بوابة المنجم، وعلامة تحذير حمراء.",
    },
  },
  "ترشيد استهلاك المياه": {
    kind: "tap",
    example: "نغلق الصنبور جيدًا ولا نترك الماء يجري دون استخدام.",
    ask: "تغسل أسنانك والصنبور مفتوح والماء يجري. ماذا تفعل؟",
    options: [
      { label: "أترك الماء يجري حتى أنتهي" },
      { label: "أغلق الصنبور وأستخدم كوبًا", ok: true },
    ],
    right: {
      badge: "كل نقطة لها قيمة",
      text: "أغلقت الصنبور فتوقف الماء، وفي الكوب ما يكفيك.",
      why: "نغلق الصنبور جيدًا ولا نترك الماء يجري دون استخدام.",
    },
    wrong: {
      badge: "ماء يضيع",
      text: "الماء يذهب إلى البالوعة دون أن نستخدمه، والمياه العذبة في مصر محدودة.",
    },
    see: {
      ask: "حوض وصنبور مفتوح يجري منه الماء، وطفل يمسك فرشاة أسنان.",
      right: "الصنبور مغلق، والكوب ممتلئ بالماء.",
      wrong: "الماء يجري إلى البالوعة دون توقف.",
    },
  },
  "عدم إلقاء المخلفات في المياه": {
    kind: "canal",
    example: "لا نلقي المخلفات في الترع والنيل.",
    ask: "معك كيس مخلفات وأنت تمشي بجوار الترعة. أين تضعه؟",
    options: [
      { label: "في سلة المخلفات", ok: true },
      { label: "في مياه الترعة" },
    ],
    right: {
      badge: "ترعة نظيفة",
      text: "وضعت الكيس في السلة، فبقيت المياه صافية والسمكة تسبح.",
      why: "لا نلقي المخلفات في الترع والنيل.",
    },
    wrong: {
      badge: "تلوّث المياه",
      text: "سقط الكيس في الماء فتعكّرت الترعة واختفت السمكة: المخلفات تلوث المياه.",
    },
    see: {
      ask: "ترعة فيها سمكة، وطفل على الشاطئ يحمل كيسًا، وسلة مخلفات قريبة.",
      right: "الكيس داخل السلة، والمياه زرقاء صافية.",
      wrong: "الكيس في الماء، والمياه متعكّرة.",
    },
  },
  "المشاركة في المبادرات البيئية لحمايتها": {
    kind: "river",
    ask: "مدرستك تنظّم مبادرة لتنظيف شاطئ النيل. ماذا تفعل؟",
    options: [
      { label: "لا أشارك، فهذا ليس دوري" },
      { label: "أشارك مع زملائي", ok: true },
    ],
    right: {
      badge: "معًا لحماية النيل",
      text: "شاركت مع زملائك، فجُمعت المخلفات وعاد الشاطئ نظيفًا.",
      why: "المشاركة في المبادرات البيئية تحمي المياه، وهي من دور المواطنين.",
    },
    wrong: {
      badge: "الشاطئ ينتظرنا",
      text: "بقيت المخلفات على الشاطئ، وقد يصل بعضها إلى الماء. حماية المياه دور كل مواطن.",
    },
    see: {
      ask: "شاطئ النيل عليه مخلفات، وتلاميذ يحملون لافتة: معًا لحماية النيل.",
      right: "المخلفات جُمعت في الكيس، والشاطئ نظيف، ونبتة صغيرة تنمو.",
      wrong: "المخلفات باقية على الشاطئ، وقطعة منها تتجه إلى الماء.",
    },
  },
};
const CHEERS = ["أحسنت!", "تصرّف مسؤول!", "رائع!", "ممتاز!"];
const strip = (t) => String(t).replace(/[.。]\s*$/, "").trim();

// The roles of a «دور الدولة والمواطنين» part that have a situation, and the
// lines of the list the situations already show (the lesson's examples).
export function citizenScenes(section) {
  const col = section?.columns?.find((c) => c.icon === "people");
  if (!col) return { scenes: [], rest: [] };
  const scenes = [];
  const shown = new Set();
  for (const line of col.list) {
    const s = SCENES[strip(line)];
    if (s && !scenes.some((x) => x.role === strip(line))) {
      scenes.push({ ...s, role: strip(line) });
      shown.add(line);
    }
  }
  for (const line of col.list) if (scenes.some((s) => s.example && strip(s.example) === strip(line))) shown.add(line);
  return { scenes, rest: col.list.filter((l) => !shown.has(l)), title: col.title };
}

export default function CitizenLab({ scenes }) {
  const [at, setAt] = useState(0);
  const [choice, setChoice] = useState(null);
  const [done, setDone] = useState(() => new Set());
  const [finished, setFinished] = useState(false);
  const feedback = useRef(null);
  const question = useRef(null);
  const moved = useRef(false);
  const picture = useRef(null);
  const scene = scenes[at];
  const picked = choice == null ? null : scene.options[choice];
  const state = picked ? (picked.ok ? "right" : "wrong") : "ask";

  useEffect(() => {
    if (picked) feedback.current?.focus({ preventScroll: true });
  }, [picked]);
  useEffect(() => {
    if (moved.current) question.current?.focus({ preventScroll: true });
    moved.current = true;
  }, [at, finished]);

  const choose = (i) => {
    if (choice != null) return;
    setChoice(i);
    // On a phone the picture may be above the screen: bring the result in.
    if (window.matchMedia?.("(max-width: 760px)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => picture.current?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }));
    }
    if (scene.options[i].ok) {
      play("correct");
      setDone((d) => new Set(d).add(at));
    } else play("wrong");
  };
  const open = (i) => {
    play("select");
    setFinished(false);
    setChoice(null);
    setAt(i);
  };
  const next = () => {
    if (at + 1 < scenes.length) open(at + 1);
    else {
      play("star");
      setFinished(true);
    }
  };
  const retry = () => {
    play("select");
    setChoice(null);
  };

  return (
    <section className="cz-lab" aria-labelledby="cz-title">
      <header className="cz-head">
        <div>
          <p className="cz-kicker">دور المواطنين</p>
          <h3 id="cz-title">أنا مواطن مسؤول</h3>
          <p className="cz-sub">شاهد الموقف، اختر تصرّفك، ثم شاهد النتيجة.</p>
        </div>
        <nav className="cz-steps" aria-label="المواقف">
          <span className="cz-count">
            الموقف {Math.min(at + 1, scenes.length)} من {scenes.length}
          </span>
          <ol>
            {scenes.map((s, i) => (
              <li key={s.role}>
                <button
                  type="button"
                  className={done.has(i) ? "is-done" : ""}
                  aria-current={i === at && !finished ? "step" : undefined}
                  aria-label={`الموقف ${i + 1}: ${s.role}${done.has(i) ? " (تم)" : ""}`}
                  title={s.role}
                  onClick={() => open(i)}
                >
                  {done.has(i) ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : i + 1}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {finished ? (
        <div className="cz-finish">
          <span className="cz-stars" aria-hidden="true">
            <Star weight="fill" />
            <Star weight="fill" />
            <Star weight="fill" />
          </span>
          <h4 ref={question} tabIndex={-1}>
            أنهيت المواقف كلها!
          </h4>
          <p>أنت مواطن مسؤول تعرف دورك:</p>
          <ul>
            {scenes.map((s) => (
              <li key={s.role}>
                <CheckCircle size={20} weight="fill" aria-hidden="true" /> {s.role}
              </li>
            ))}
          </ul>
          <button type="button" className="cz-btn is-soft" onClick={() => open(0)}>
            <ArrowCounterClockwise size={20} aria-hidden="true" /> العب المواقف من جديد
          </button>
        </div>
      ) : (
        <div key={at} className="cz-body">
          <div className="cz-rolebar">
            <p className="cz-role">
              <span>الدور:</span> {scene.role}
            </p>
            <ol className="cz-phases" aria-hidden="true">
              <li className={state === "ask" ? "is-on" : "is-past"}>
                <Eye size={16} /> شاهد
              </li>
              <li className={state === "ask" ? "is-on" : "is-past"}>
                <HandPointing size={16} /> اختر
              </li>
              <li className={state === "ask" ? "" : "is-on"}>
                <Sparkle size={16} /> النتيجة
              </li>
            </ol>
          </div>
          <figure ref={picture} className={`cz-scene is-${state}`}>
            <Scene kind={scene.kind} state={state} label={scene.see[state]} />
            {state !== "ask" && (
              <span className={`cz-badge ${state === "right" ? "is-good" : "is-bad"} at-${scene.kind}`}>
                {state === "right" ? <Sparkle size={18} weight="fill" aria-hidden="true" /> : <XCircle size={18} weight="fill" aria-hidden="true" />}
                {scene[state].badge}
              </span>
            )}
          </figure>

          {/* The question and the result share one place under the picture:
              every version is laid in the same cell and only one shows, so
              the book's pages keep their height before and after a choice. */}
          <div className="cz-zone">
            <div className={`cz-askbox ${picked ? "is-off" : ""}`} {...(picked ? { inert: "", "aria-hidden": true } : {})}>
              <h4 className="cz-ask" ref={question} tabIndex={-1}>
                {scene.ask}
              </h4>
              <div className="cz-options" role="group" aria-label="اختر تصرّفك">
                {scene.options.map((o, i) => (
                  <button key={o.label} type="button" className="cz-option" onClick={() => choose(i)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {["right", "wrong"].map((k) => {
              const live = state === k;
              const good = k === "right";
              const label = live ? picked.label : scene.options.find((o) => Boolean(o.ok) === good)?.label;
              return (
                <div
                  key={k}
                  className={`cz-feedback ${good ? "is-good" : "is-bad"} ${live ? "is-live" : "is-off"}`}
                  ref={live ? feedback : undefined}
                  tabIndex={live ? -1 : undefined}
                  role={live ? "status" : undefined}
                  {...(live ? {} : { inert: "", "aria-hidden": true })}
                >
                  <p className="cz-picked">
                    {good ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <XCircle size={22} weight="fill" aria-hidden="true" />}
                    {label}
                  </p>
                  <p className="cz-explain">
                    <strong>{good ? CHEERS[at % CHEERS.length] : "فكّر مرة أخرى."}</strong> {scene[k].text}
                    {good && <span className="cz-why"> {scene.right.why}</span>}
                  </p>
                  {good ? (
                    <button type="button" className="cz-btn" onClick={next}>
                      {at + 1 < scenes.length ? "الموقف التالي" : "أنهيت المواقف"} <ArrowLeft size={20} aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" className="cz-btn is-soft" onClick={retry}>
                      <ArrowCounterClockwise size={20} aria-hidden="true" /> حاول مرة أخرى
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------ the drawings
// Layered SVG: what changes after a choice has its own class, so the picture
// itself shows the result (a light goes out, water stops, a bag reaches the
// bin). Moving parts sit in an inner <g> so CSS never fights a transform.
function Scene({ kind, state, label }) {
  const Drawing = DRAWINGS[kind];
  return (
    <svg viewBox="0 0 400 225" role="img" aria-label={label} className={`cz-svg cz-${kind}`} data-state={state}>
      <Drawing />
    </svg>
  );
}

function Kid({ x, y, shirt = "#2c63c9", className = "", s = 1, hand }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={`cz-kid ${className}`}>
        <rect x="-9" y="24" width="7" height="22" rx="3" fill="#2b3a55" />
        <rect x="2" y="24" width="7" height="22" rx="3" fill="#2b3a55" />
        <rect x="-12" y="0" width="24" height="28" rx="9" fill={shirt} />
        <circle cx="0" cy="-10" r="11" fill="#c98b5b" />
        <path d="M-11 -12 a11 11 0 0 1 22 0 q-5 -6 -11 -5 q-6 -1 -11 5z" fill="#2a1b12" />
        <circle cx="-4" cy="-10" r="1.4" fill="#2a1b12" />
        <circle cx="4" cy="-10" r="1.4" fill="#2a1b12" />
        <path d="M-4 -5 q4 3 8 0" stroke="#7a3d22" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {hand}
      </g>
    </g>
  );
}

const DRAWINGS = {
  lamp: () => (
    <>
      <rect x="-300" width="1000" height="225" fill="#f6ead4" />
      <rect x="-300" y="178" width="1000" height="47" fill="#d8b688" />
      <rect x="30" y="40" width="96" height="78" rx="6" fill="#fff" />
      <rect x="36" y="46" width="84" height="66" fill="#bfe3ff" />
      <circle cx="100" cy="66" r="12" fill="#ffd34d" />
      <line x1="78" y1="46" x2="78" y2="112" stroke="#fff" strokeWidth="4" />
      <rect x="26" y="118" width="104" height="6" rx="2" fill="#e2cfa9" />
      <g className="cz-glow">
        <circle cx="200" cy="62" r="78" fill="url(#cz-glow)" />
      </g>
      <defs>
        <radialGradient id="cz-glow">
          <stop offset="0" stopColor="#ffe680" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe680" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="200" y1="0" x2="200" y2="34" stroke="#6b5a45" strokeWidth="2" />
      <path d="M182 34 h36 l10 20 h-56z" fill="#1d4fc4" />
      <circle className="cz-bulb" cx="200" cy="60" r="8" />
      <g transform="translate(150 118)">
        <rect width="40" height="50" rx="6" fill="#fff" stroke="#9aa7b8" strokeWidth="2" />
        <circle cx="20" cy="30" r="12" fill="#eef3f9" stroke="#9aa7b8" />
        <line className="cz-meter" x1="20" y1="30" x2="20" y2="20" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="8" y="6" width="24" height="7" rx="2" fill="#0b1f4d" />
      </g>
      <rect x="300" y="60" width="72" height="118" fill="#7a5230" />
      <rect x="306" y="66" width="60" height="112" fill="#f9f1e2" />
      <g transform="translate(276 104)">
        <rect width="16" height="26" rx="3" fill="#fff" stroke="#9aa7b8" />
        <rect className="cz-switch" x="5" y="4" width="6" height="9" rx="2" fill="#1d4fc4" />
      </g>
      <Kid x={322} y={132} shirt="#178a4a" />
    </>
  ),
  solar: () => (
    <>
      <defs>
        <linearGradient id="cz-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fd0ff" />
          <stop offset="1" stopColor="#e4f2ff" />
        </linearGradient>
      </defs>
      <rect x="-300" width="1000" height="225" fill="url(#cz-sky)" />
      <circle cx="345" cy="40" r="22" fill="#ffd34d" />
      <g className="cz-rays" stroke="#ffb703" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 7">
        <line x1="328" y1="56" x2="262" y2="86" />
        <line x1="338" y1="64" x2="282" y2="100" />
      </g>
      <rect x="-300" y="186" width="1000" height="39" fill="#9fcf7a" />
      <rect x="120" y="110" width="150" height="78" fill="#f3dfbf" />
      <path d="M104 112 L195 56 L286 112z" fill="#c4643c" />
      <g transform="translate(206 72) rotate(31.6)">
        <g className="cz-panels">
          <rect width="64" height="16" rx="2" fill="#1d3a8a" stroke="#9cbcf0" />
          <path d="M16 0v16M32 0v16M48 0v16M0 8h64" stroke="#9cbcf0" strokeWidth="1" />
        </g>
      </g>
      <rect className="cz-win" x="138" y="128" width="32" height="26" rx="3" />
      <rect className="cz-win" x="220" y="128" width="32" height="26" rx="3" />
      <rect x="183" y="140" width="26" height="48" rx="2" fill="#8a5a33" />
      <g transform="translate(36 150)">
        <g className="cz-gen">
          <rect width="50" height="34" rx="5" fill="#7d8796" />
          <rect x="6" y="6" width="22" height="12" rx="2" fill="#4c5563" />
          <rect x="38" y="-12" width="6" height="14" fill="#4c5563" />
          <circle cx="12" cy="36" r="5" fill="#2b3a55" />
          <circle cx="38" cy="36" r="5" fill="#2b3a55" />
          <circle className="cz-smoke" cx="41" cy="-18" r="7" fill="#8d8d8d" />
          <circle className="cz-smoke" cx="45" cy="-18" r="9" fill="#9a9a9a" />
          <circle className="cz-smoke" cx="38" cy="-18" r="6" fill="#a7a7a7" />
        </g>
      </g>
      <rect className="cz-haze" x="-300" width="1000" height="225" fill="#6d6d6d" />
      <Kid x={320} y={146} shirt="#d1495b" />
    </>
  ),
  mine: () => (
    <>
      <rect x="-300" width="1000" height="225" fill="#d6ecff" />
      <path d="M-300 130 L0 120 L60 70 L120 112 L190 60 L270 118 L400 90 L700 120 V160 H-300z" fill="#d9b37a" />
      <rect x="-300" y="150" width="1000" height="75" fill="#ecd2a0" />
      <ellipse cx="110" cy="168" rx="80" ry="18" fill="#b98b52" />
      <g transform="translate(70 120)">
        <rect width="46" height="24" rx="4" fill="#f2b632" />
        <rect x="26" y="-14" width="18" height="16" rx="3" fill="#f2b632" />
        <rect x="29" y="-11" width="12" height="9" fill="#bfe3ff" />
        <g className="cz-arm">
          <path d="M8 4 L-18 -18 L-34 6" stroke="#e09e1b" strokeWidth="6" fill="none" strokeLinejoin="round" />
          <path d="M-40 4 h14 l-4 10 h-8z" fill="#8a6a2e" />
        </g>
        <rect x="-2" y="24" width="52" height="9" rx="4" fill="#3a3a3a" />
      </g>
      <g stroke="#7b6a55" strokeWidth="3">
        {[20, 50, 80, 110, 140, 170, 200].map((x) => (
          <line key={x} x1={x} y1="148" x2={x} y2="186" />
        ))}
        <line x1="20" y1="158" x2="200" y2="158" strokeWidth="2" />
        <line x1="20" y1="172" x2="200" y2="172" strokeWidth="2" />
        <line x1="250" y1="148" x2="250" y2="186" />
      </g>
      <g transform="translate(250 92)">
        <rect x="52" y="38" width="6" height="56" fill="#7b6a55" />
        <rect width="110" height="44" rx="6" fill="#fff" stroke="#c0392b" strokeWidth="3" />
        <text x="55" y="18" textAnchor="middle" fontSize="13" fontWeight="900" fill="#0b1f4d">
          منطقة تعدين
        </text>
        <text x="55" y="35" textAnchor="middle" fontSize="13" fontWeight="900" fill="#c0392b">
          ممنوع الدخول
        </text>
        <g className="cz-ok">
          <circle cx="104" cy="2" r="13" fill="#178a4a" />
          <path d="M97 2 l5 5 l9 -10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <Kid x={300} y={164} shirt="#1d4fc4" className="cz-walker" s={0.85} />
      <g transform="translate(232 100)">
        <g className="cz-alert">
          <path d="M0 -16 L16 12 H-16z" fill="#e8590c" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <rect x="-1.5" y="-6" width="3" height="10" fill="#fff" />
          <circle cy="8" r="1.8" fill="#fff" />
        </g>
      </g>
    </>
  ),
  tap: () => (
    <>
      <rect x="-300" width="1000" height="225" fill="#e8f2fb" />
      <path d="M-300 45 H700 M-300 90 H700 M-300 135 H700 M0 0 V225 M420 0 V225 M480 0 V225 M-60 0 V225 M60 0 V225 M120 0 V225 M180 0 V225 M240 0 V225 M300 0 V225 M360 0 V225" stroke="#d3e3f3" strokeWidth="2" />
      <rect x="150" y="18" width="110" height="62" rx="8" fill="#cfe5f7" stroke="#fff" strokeWidth="5" />
      <rect x="120" y="140" width="170" height="14" rx="6" fill="#fff" stroke="#b9cde2" />
      <path d="M130 154 h150 q-8 34 -75 36 q-67 -2 -75 -36z" fill="#fff" stroke="#b9cde2" />
      <rect x="196" y="186" width="18" height="39" fill="#fff" stroke="#b9cde2" />
      <ellipse cx="216" cy="166" rx="9" ry="3" fill="#8aa1b8" />
      <g transform="translate(216 166)">
        <g className="cz-swirl">
          <path d="M-6 0 a6 2 0 1 0 6 -2" stroke="#4f9be0" strokeWidth="2" fill="none" />
        </g>
      </g>
      <rect x="196" y="92" width="10" height="48" fill="#a9b6c4" />
      <path d="M196 92 h30 a6 6 0 0 1 6 6 v12 h-10 v-8 h-26z" fill="#a9b6c4" />
      <g transform="translate(201 88)">
        <g className="cz-handle">
          <rect x="-14" y="-4" width="28" height="7" rx="3" fill="#1d4fc4" />
        </g>
      </g>
      <rect className="cz-stream" x="223" y="110" width="7" height="54" rx="3" fill="#6fb6f0" />
      <g className="cz-drops" fill="#6fb6f0">
        <circle cx="226" cy="170" r="2.5" />
        <circle cx="222" cy="174" r="2" />
      </g>
      <g transform="translate(258 116)">
        <rect width="20" height="26" rx="3" fill="#fff" stroke="#9cbcf0" strokeWidth="2" />
        <rect className="cz-cupwater" x="2" y="4" width="16" height="20" rx="2" fill="#6fb6f0" />
      </g>
      <Kid
        x={335}
        y={140}
        shirt="#7048e8"
        hand={<rect x="-24" y="4" width="16" height="4" rx="2" fill="#1d4fc4" />}
      />
    </>
  ),
  canal: () => (
    <>
      <rect x="-300" width="1000" height="225" fill="#d6ecff" />
      <rect x="-300" y="78" width="1000" height="34" fill="#8cc56b" />
      <g transform="translate(60 40)">
        <rect x="-3" y="20" width="6" height="30" fill="#7a5230" />
        <circle cy="18" r="20" fill="#4e9a3a" />
      </g>
      <rect className="cz-water" x="-300" y="108" width="1000" height="64" />
      <g stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M30 128 q10 -5 20 0 t20 0" />
        <path d="M250 150 q10 -5 20 0 t20 0" />
        <path d="M140 160 q10 -5 20 0 t20 0" />
      </g>
      <g transform="translate(120 140)">
        <g className="cz-fish">
          <path d="M0 0 q14 -10 28 0 q-14 10 -28 0z" fill="#ff922b" />
          <path d="M28 0 l10 -7 v14z" fill="#ff922b" />
          <circle cx="7" cy="-1" r="1.6" fill="#2a1b12" />
        </g>
      </g>
      <g className="cz-murk" fill="#6b5a3a">
        <rect x="80" y="122" width="14" height="6" rx="2" transform="rotate(-12 87 125)" />
        <rect x="300" y="132" width="12" height="7" rx="2" />
        <circle cx="200" cy="158" r="5" />
      </g>
      <rect x="-300" y="170" width="1000" height="55" fill="#9fcf7a" />
      <g transform="translate(330 150)">
        <path d="M-16 0 h32 l-4 40 h-24z" fill="#178a4a" />
        <rect x="-19" y="-6" width="38" height="7" rx="3" fill="#0f6b38" />
        <path d="M-5 16 l5 -6 l5 6 M0 10 v14" stroke="#fff" strokeWidth="2" fill="none" />
      </g>
      <Kid x={262} y={168} shirt="#e8590c" s={0.95} />
      <g transform="translate(244 184)">
        <g className="cz-bag">
          <path d="M-8 -6 h16 l3 18 h-22z" fill="#f1f3f5" stroke="#868e96" strokeWidth="1.5" />
          <path d="M-4 -6 q4 -7 8 0" stroke="#868e96" strokeWidth="1.5" fill="none" />
        </g>
      </g>
    </>
  ),
  river: () => (
    <>
      <rect x="-300" width="1000" height="225" fill="#d6ecff" />
      <rect className="cz-water" x="-300" y="34" width="1000" height="58" />
      <g stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M40 58 q10 -5 20 0 t20 0" />
        <path d="M220 74 q10 -5 20 0 t20 0" />
      </g>
      <path d="M-300 92 H0 Q100 84 200 92 T400 90 H700 V225 H-300z" fill="#e7cf9d" />
      <rect x="-300" y="170" width="1000" height="55" fill="#a7d17f" />
      {LITTER.map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className="cz-litter" style={{ "--dx": `${BAG[0] - x}px`, "--dy": `${BAG[1] - y}px`, "--i": i }}>
            <rect x="-6" y="-4" width="12" height="8" rx="2" fill={c} transform={`rotate(${i * 23 - 30})`} />
          </g>
        </g>
      ))}
      <g transform="translate(150 70)">
        <g className="cz-drift">
          <rect x="-5" y="-3" width="10" height="7" rx="2" fill="#adb5bd" />
        </g>
      </g>
      <g transform={`translate(${BAG[0]} ${BAG[1]})`}>
        <path d="M-12 -10 h24 l4 26 h-32z" fill="#1d4fc4" />
        <path d="M-6 -10 q6 -8 12 0" stroke="#1d4fc4" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(70 168)">
        <g className="cz-sprout">
          <path d="M0 0 v-18" stroke="#2f9e44" strokeWidth="3" />
          <path d="M0 -12 q-10 -6 -12 -14 q10 2 12 12z M0 -16 q8 -8 14 -8 q-4 8 -14 10z" fill="#40c057" />
        </g>
      </g>
      <g className="cz-team">
        <Kid x={262} y={158} shirt="#1d4fc4" s={0.85} />
        <Kid x={306} y={160} shirt="#178a4a" s={0.85} />
        <Kid x={350} y={158} shirt="#e8590c" s={0.85} />
        <rect x="248" y="106" width="116" height="26" rx="6" fill="#fff" stroke="#1d4fc4" strokeWidth="2" />
        <text x="306" y="124" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0b1f4d">
          معًا لحماية النيل
        </text>
      </g>
    </>
  ),
};
// Litter on the river bank, and the class bag it is gathered in.
const LITTER = [
  [40, 128, "#e03131"],
  [96, 146, "#adb5bd"],
  [150, 120, "#f08c00"],
  [186, 156, "#868e96"],
  [60, 196, "#e64980"],
];
const BAG = [228, 190];

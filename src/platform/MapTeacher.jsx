import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { X, BookOpen, MapPin, Compass, Ruler, ChatText, PaperPlaneRight, ArrowRight } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import AIAssistant from "./AIAssistant";
import { play } from "./sfx";
import "./map-teacher.css";

// «المعلم الذكي» on the lesson map: a small panel beside the map (which stays
// usable). The student picks the help they need; the guidance is written here
// and follows what they do on the map (the chosen symbol, the place found).
// Only a typed question that fits none of the helps goes to the AI assistant,
// which runs on the server with the student's consent.
const CAIRO = { id: "cairo", name: "القاهرة", lat: 30.0444, lng: 31.2357 };
const HELPS = [
  ["symbol", "فهم رمز في المفتاح", BookOpen],
  ["find", "العثور على مكان", MapPin],
  ["direction", "تحديد الاتجاه", Compass],
  ["measure", "قياس المسافة", Ruler],
  ["ask", "كتابة سؤالي", ChatText],
];
const first = (text) => String(text || "").split(/[.،؛]/)[0].trim();
const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
};
// Where a place lies from Cairo, in the words the book uses.
function direction(p) {
  const ns = p.lat > CAIRO.lat + 0.3 ? "شمال" : p.lat < CAIRO.lat - 0.3 ? "جنوب" : "";
  const ew = p.lng > CAIRO.lng + 0.3 ? "شرق" : p.lng < CAIRO.lng - 0.3 ? "غرب" : "";
  if (!ns && !ew) return "قريب جدًا من القاهرة";
  return `${ns && ew ? `${ns} ${ew}` : ns || ew} القاهرة`;
}
// A typed question that matches one of the helps starts it directly.
function route(text) {
  if (/مساف|بعيد|كيلو|كم\b|اقيس|أقيس|قياس/.test(text)) return "measure";
  if (/اتجاه|شمال|جنوب|شرق|غرب/.test(text)) return "direction";
  if (/فين|أين|اين|مكان|ألاقي|الاقي/.test(text)) return "find";
  if (/رمز|علامة|المفتاح/.test(text)) return "symbol";
  return "ask";
}

// `seeing`: ready questions about what is on the map now (e.g. Toshka's
// fields), each with its answer and an optional map action.
export default function MapTeacher({ name, lessonId, lessonTitle, demo, resources, resource, location, kindName, keyOpen, seeing = [], onSeeing, onFocusSite, onOpenKey, onMeasure, onClose }) {
  const [view, setView] = useState("menu");
  const [said, setSaid] = useState([]);
  const [waiting, setWaiting] = useState(null); // help waiting for a symbol from the key
  const [typed, setTyped] = useState("");
  const [asked, setAsked] = useState("");
  const [query, setQuery] = useState("");
  const sites = resources.flatMap((r) => (r.locations || []).map((l) => ({ ...l, resource: r })));
  const places = [CAIRO, ...sites];
  const [from, setFrom] = useState("cairo");
  const [to, setTo] = useState(location?.id || resource?.locations?.[0]?.id || sites[0]?.id || "");
  const closeRef = useRef(null);
  const end = useRef(null);
  const say = (text) => setSaid((s) => [...s, text]);
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [said.length, view]);
  useEffect(() => () => onMeasure(null), []);

  const explain = (r) =>
    say(
      `ده رمز ${r.label}${kindName(r) ? ` (${kindName(r)})` : ""}. ${first(r.description)}. اضغط عليه وشوف مكانه على الخريطة؛ هتلاقي نفس الرمز منوّر هناك.`,
    );
  const placeOf = (r, l) => l || (r?.locations?.[0] && { ...r.locations[0], resource: r });
  const tellDirection = (r, l) => {
    const p = placeOf(r, l);
    if (p) say(`${p.name} يقع ${direction(p)}. الشمال دايمًا لفوق في الخريطة، والشرق ناحية اليمين.`);
  };

  // The student answered with the map key: continue the help that asked for it.
  useEffect(() => {
    if (!waiting || !resource) return;
    if (waiting === "symbol") explain(resource);
    if (waiting === "direction") tellDirection(resource, location);
    setWaiting(null);
  }, [resource?.id]);

  function answerSeeing(h) {
    play("select");
    setView("seeing");
    setSaid([`«${h.q}»`, h.a]);
    onMeasure(null);
    onSeeing?.(h);
  }
  function start(id, text = "") {
    play("select");
    setView(id);
    setSaid([]);
    setWaiting(null);
    if (id !== "measure") onMeasure(null);
    if (id === "symbol") {
      if (resource) say(`تحب أشرح لك رمز ${resource.label}، ولا تختار رمزًا تاني؟`);
      else {
        say("اضغط على الرمز اللي عايز تعرف معناه في مفتاح الخريطة.");
        setWaiting("symbol");
        onOpenKey();
      }
    }
    if (id === "find") say("اكتب اسم المكان أو اختاره من القائمة، وأنا أوريهولك على الخريطة.");
    if (id === "direction") {
      say("في خريطتنا الشمال لفوق، والجنوب لتحت، والشرق ناحية اليمين، والغرب ناحية الشمال (اليسار).");
      if (resource) tellDirection(resource, location);
      else {
        say("اختار مكان من مفتاح الخريطة، وأنا أقولك اتجاهه من القاهرة.");
        setWaiting("direction");
        onOpenKey();
      }
    }
    if (id === "measure") {
      say("اختار المكانين، واضغط «قيس المسافة». هرسم خط مستقيم بينهما على الخريطة وأقولك طوله تقريبًا.");
      const p = placeOf(resource, location);
      if (p) setTo(p.id);
    }
    if (id === "ask") setAsked(text);
  }
  function measure() {
    const a = places.find((p) => p.id === from),
      b = places.find((p) => p.id === to);
    if (!a || !b || a.id === b.id) return say("اختار مكانين مختلفين.");
    onMeasure({ a, b, km: km(a, b) });
    say(`المسافة بخط مستقيم بين ${a.name} و${b.name} حوالي ${km(a, b)} كم. الطريق الحقيقي غالبًا أطول من الخط المستقيم.`);
  }
  const found = query.trim()
    ? sites.filter((s) => `${s.name} ${s.resource.label}`.includes(query.trim())).slice(0, 6)
    : sites.slice(0, 6);

  // On phones the panel tucks down to its title while the map key is open.
  return (
    <aside className={`mt-panel ${keyOpen ? "is-tucked" : ""}`} aria-label="المعلم الذكي" dir="rtl">
      <header>
        <span className="mt-robot" aria-hidden="true">
          <RobotGuide />
        </span>
        <h2>المعلم الذكي</h2>
        <button ref={closeRef} type="button" className="mt-x" aria-label="إغلاق المعلم الذكي" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>
      </header>

      <div className="mt-body">
        {view === "menu" ? (
          <>
            <p className="mt-hello">
              <b>أهلًا يا {name}!</b>
              محتاج مساعدة في إيه؟
            </p>
            {seeing.length > 0 && (
              <>
                <b className="mt-seeing-title">أسئلة عن اللي شايفه:</b>
                <ul className="mt-seeing">
                  {seeing.map((h) => (
                    <li key={h.q}>
                      <button type="button" onClick={() => answerSeeing(h)}>
                        {h.q}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ul className="mt-helps">
              {HELPS.map(([id, label, Icon]) => (
                <li key={id}>
                  <button type="button" onClick={() => start(id)}>
                    <Icon size={22} aria-hidden="true" /> {label}
                  </button>
                </li>
              ))}
            </ul>
            <small className="mt-tip">اختار مساعدة، وهنستكشف الخريطة مع بعض.</small>
          </>
        ) : (
          <>
            <button type="button" className="mt-back" onClick={() => (setView("menu"), onMeasure(null), setWaiting(null))}>
              <ArrowRight size={16} aria-hidden="true" /> كل المساعدات
            </button>
            <div className="mt-chat" aria-live="polite">
              {said.map((t, i) => (
                <p key={i} className={`mt-say ${view === "seeing" && i === 0 ? "is-me" : ""}`}>
                  {t}
                </p>
              ))}
            </div>
            {view === "symbol" && resource && said.length === 1 && !waiting && (
              <div className="mt-choices">
                <button type="button" onClick={() => explain(resource)}>
                  اشرح رمز {resource.label}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    say("اضغط على الرمز اللي عايز تعرف معناه في مفتاح الخريطة.");
                    setWaiting("symbol");
                    onOpenKey();
                  }}
                >
                  أختار رمزًا تاني
                </button>
              </div>
            )}
            {view === "find" && (
              <div className="mt-find">
                <label>
                  <span className="sr-only">اسم المكان</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="مثلًا: بنبان" />
                </label>
                <ul>
                  {found.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onFocusSite(s);
                          say(`لقيته! ${s.name} منوّر على الخريطة دلوقتي. ده من «${s.resource.label}».`);
                        }}
                      >
                        <MapPin size={16} weight="fill" aria-hidden="true" /> {s.name}
                        <small>{s.resource.label}</small>
                      </button>
                    </li>
                  ))}
                  {!found.length && <li className="mt-none">مش لاقي المكان ده في خريطة الدرس.</li>}
                </ul>
              </div>
            )}
            {view === "measure" && (
              <div className="mt-measure">
                <label>
                  من
                  <select value={from} onChange={(e) => setFrom(e.target.value)}>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  إلى
                  <select value={to} onChange={(e) => setTo(e.target.value)}>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="mt-main" onClick={measure}>
                  <Ruler size={20} aria-hidden="true" /> قيس المسافة
                </button>
              </div>
            )}
            {view === "ask" && (
              <div className="mt-ask">
                <AIAssistant key={asked} lessonId={lessonId} lessonTitle={lessonTitle} resource={resource} location={location} initial={asked} demo={demo} />
              </div>
            )}
            <span ref={end} />
          </>
        )}
      </div>

      {view !== "ask" && (
        <form
          className="mt-type"
          onSubmit={(e) => {
            e.preventDefault();
            const text = typed.trim();
            if (!text) return;
            setTyped("");
            // A question about what is on the map now gets its ready answer.
            const ready = seeing.find((h) => h.match?.test(text));
            if (ready) answerSeeing(ready);
            else start(route(text), text);
          }}
        >
          <label className="sr-only" htmlFor="mt-question">
            اكتب سؤالك
          </label>
          <input id="mt-question" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="اكتب سؤالك هنا…" />
          <button type="submit" aria-label="إرسال">
            <PaperPlaneRight size={20} weight="fill" mirrored />
          </button>
        </form>
      )}
    </aside>
  );
}

// The measured line on the map, with its length at the middle.
export function MeasureLine({ map, a, b, km: length }) {
  useEffect(() => {
    if (!map.getPane("teacher-measure")) {
      map.createPane("teacher-measure");
      map.getPane("teacher-measure").style.zIndex = "650";
    }
    const group = L.layerGroup().addTo(map);
    const line = [
      [a.lat, a.lng],
      [b.lat, b.lng],
    ];
    L.polyline(line, { pane: "teacher-measure", color: "#ffffff", weight: 7, opacity: 0.9, interactive: false }).addTo(group);
    L.polyline(line, { pane: "teacher-measure", color: "#0a62d6", weight: 4, dashArray: "10 8", interactive: false }).addTo(group);
    for (const p of [a, b])
      L.circleMarker([p.lat, p.lng], { pane: "teacher-measure", radius: 7, color: "#ffffff", weight: 3, fillColor: "#0a62d6", fillOpacity: 1, interactive: false })
        .bindTooltip(p.name, { permanent: true, direction: "top", offset: [0, -8], className: "mt-map-label" })
        .addTo(group);
    L.tooltip({ permanent: true, direction: "center", className: "mt-km", pane: "teacher-measure" })
      .setLatLng([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2])
      .setContent(`<bdi>${length}</bdi> كم`)
      .addTo(group);
    map.flyToBounds(line, {
      paddingTopLeft: [60, 120],
      paddingBottomRight: [window.innerWidth <= 850 ? 60 : 400, 120],
      maxZoom: 9,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.8,
    });
    return () => map.removeLayer(group);
  }, [map, a.id, b.id]);
  return null;
}

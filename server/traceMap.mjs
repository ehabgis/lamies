// «تتبّع وارسم خريطتك» (lesson 2): the child traces the Nile on a plain map
// of Egypt, with less help at each stage, then puts the two seas' names in
// place and answers one question. Drawings are compared here, against the
// Natural Earth Nile already used by the lesson map; nothing is awarded.
import { readFileSync } from "node:fs";

const geo = (name) => JSON.parse(readFileSync(new URL(`../public/geodata/${name}.geojson`, import.meta.url), "utf8"));
const NILE = geo("egypt-nile");
const SEAS = geo("egypt-seas");
const SOUTH = 22; // Egypt's southern border

const lines = (f) => (f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates]);
const toLatLng = (line) => line.map(([lng, lat]) => [Number(lat.toFixed(4)), Number(lng.toFixed(4))]);

// The river inside Egypt, south to north: Lake Nasser's centre line from the
// border, the river from the High Dam to Cairo, then the two branches.
function nileModel() {
  const byName = (n, cls) => NILE.features.filter((f) => f.properties.name === n && (!cls || f.properties.featurecla === cls));
  // Each line is turned to run south → north before joining.
  const northward = (l) => (l[0][1] > l[l.length - 1][1] ? [...l].reverse() : l);
  const lake = byName("Nile", "Lake Centerline").flatMap(lines).map(northward).flat();
  const river = byName("Nile", "River").flatMap(lines).map(northward).filter((l) => l.some(([, lat]) => lat > SOUTH)).flat();
  const stem = [...lake, ...river].filter(([, lat]) => lat >= SOUTH);
  const branch = (n) => {
    const l = byName(n).flatMap(lines).flat();
    return l[0][1] > l[l.length - 1][1] ? [...l].reverse() : l;
  };
  return {
    stem: toLatLng(thin(stem, 0.08)),
    rosetta: toLatLng(thin(branch("Rosetta Branch"), 0.05)),
    damietta: toLatLng(thin(branch("Damietta Branch"), 0.05)),
  };
}
// Drop points closer than `step` degrees to the last kept one.
function thin(line, step) {
  const out = [line[0]];
  for (const p of line.slice(1)) {
    const q = out[out.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= step) out.push(p);
  }
  if (out[out.length - 1] !== line[line.length - 1]) out.push(line[line.length - 1]);
  return out;
}
const MODEL = nileModel();
const MODEL_LINES = [MODEL.stem, MODEL.rosetta, MODEL.damietta];

const toRad = (d) => (d * Math.PI) / 180;
function kmToSegment(p, a, b) {
  const kx = 111.32 * Math.cos(toRad(p[0]));
  const ky = 110.57;
  const ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky;
  const bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
const kmToLines = (p, ls) => {
  let best = Infinity;
  for (const l of ls) for (let i = 1; i < l.length; i++) best = Math.min(best, kmToSegment(p, l[i - 1], l[i]));
  return best;
};
// Points every ~10 km along the model, to see how much of it was drawn.
function samples(ls) {
  const out = [];
  for (const l of ls)
    for (let i = 1; i < l.length; i++) {
      const [a, b] = [l[i - 1], l[i]];
      const n = Math.max(1, Math.round(kmToSegment(a, b, b) / 10));
      for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
  return out;
}
const MODEL_SAMPLES = samples(MODEL_LINES);

function inPolygon([lat, lng], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const SEA = {
  med: { name: "البحر المتوسط", ring: SEAS.features.find((f) => f.properties.name_ar === "البحر المتوسط").geometry.coordinates[0] },
  red: { name: "البحر الأحمر", ring: SEAS.features.find((f) => f.properties.name_ar === "البحر الأحمر").geometry.coordinates[0] },
};

const STAGES = [
  {
    id: "trace",
    label: "أتتبّع",
    task: "تتبّع مسار نهر النيل من جنوب مصر إلى الدلتا.",
    tip: "ابدأ من الجنوب واتبع الخط الباهت.",
    toleranceKm: 30,
  },
  {
    id: "practice",
    label: "أتدرّب",
    task: "ارسم نهر النيل بين نقطة البداية في الجنوب والدلتا في الشمال.",
    tip: "تظهر لك البداية والنهاية فقط. اطلب تلميحًا إذا احتجت.",
    toleranceKm: 40,
  },
  {
    id: "alone",
    label: "أرسم بنفسي",
    task: "ارسم نهر النيل من ذاكرتك، ثم قارن رسمك بالنموذج.",
    tip: "النيل يجري من الجنوب إلى الشمال، ثم يتفرع في الدلتا.",
    toleranceKm: 50,
  },
];

const QUESTION = {
  prompt: "يصب نهر النيل في أي بحر؟",
  options: ["البحر المتوسط", "البحر الأحمر", "بحيرة ناصر"],
  answer: "البحر المتوسط",
  hint: "انظر إلى المكان الذي ينتهي عنده فرعا دمياط ورشيد في شمال الخريطة.",
  explanation: "أحسنت! يجري النيل من الجنوب إلى الشمال، ويصب فرعاه في البحر المتوسط.",
};

export function traceMapPublic(lessonId) {
  if (lessonId !== "lesson-2") return null;
  return {
    title: "تتبّع وارسم خريطتك",
    summary: "تدرّب على رسم معالم خريطة مصر خطوة بخطوة.",
    welcome: "هيا نرسم خريطتنا! اختر القلم، واتبع الخط الباهت. يمكنك التراجع والمحاولة مرة أخرى.",
    stages: STAGES.map(({ toleranceKm, ...s }) => s),
    // The guide is the model itself; the last stage simply does not show it.
    model: MODEL,
    seas: Object.entries(SEA).map(([id, s]) => ({ id, name: s.name })),
    question: { prompt: QUESTION.prompt, options: [...QUESTION.options] },
  };
}

// {step:"draw", stage, strokes:[[[lat,lng],...]]} · {step:"label", sea, lat, lng}
// · {step:"question", answer}
export function checkTraceMap(lessonId, body = {}) {
  if (lessonId !== "lesson-2") return null;
  if (body.step === "draw") {
    const stage = STAGES.find((s) => s.id === body.stage);
    if (!stage || !Array.isArray(body.strokes)) return null;
    const points = body.strokes
      .slice(0, 60)
      .flatMap((s) => (Array.isArray(s) ? s.slice(0, 600) : []))
      .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .slice(0, 3000);
    if (points.length < 2) return { passed: false, coverage: 0, precision: 0, feedback: "ارسم خطًا على الخريطة أولًا، ثم اضغط «انتهيت من الرسم»." };
    const tol = stage.toleranceKm;
    const near = points.filter((p) => kmToLines(p, MODEL_LINES) <= tol).length;
    const precision = near / points.length;
    const covered = MODEL_SAMPLES.filter((m) => points.some((p) => Math.abs(p[0] - m[0]) < 1 && kmToSegment(m, p, p) <= tol)).length;
    const coverage = covered / MODEL_SAMPLES.length;
    const passed = coverage >= 0.7 && precision >= 0.7;
    const feedback = passed
      ? "رسم رائع! رسمك قريب من مسار النيل الحقيقي."
      : coverage < 0.7 && precision >= 0.7
        ? "بداية جيدة! أكمل الرسم على طول النهر من الجنوب حتى الدلتا وفرعيها."
        : "حاول أن يبقى خطك قريبًا من مسار النهر. قارن رسمك بالنموذج الأزرق.";
    return { passed, coverage: Math.round(coverage * 100), precision: Math.round(precision * 100), feedback };
  }
  if (body.step === "label") {
    const sea = SEA[body.sea];
    const p = [Number(body.lat), Number(body.lng)];
    if (!sea || !p.every(Number.isFinite)) return null;
    if (inPolygon(p, sea.ring)) return { correct: true, feedback: `أحسنت! هذا هو ${sea.name}.` };
    const other = Object.values(SEA).find((s) => s !== sea && inPolygon(p, s.ring));
    return {
      correct: false,
      feedback: other
        ? `هذا ${other.name}. ابحث عن ${sea.name} في مكان آخر.`
        : sea === SEA.med
          ? "ضع الاسم فوق البحر الذي يقع شمال مصر."
          : "ضع الاسم فوق البحر الذي يقع شرق مصر.",
    };
  }
  if (body.step === "question") {
    if (!QUESTION.options.includes(body.answer)) return null;
    return body.answer === QUESTION.answer
      ? { correct: true, explanation: QUESTION.explanation }
      : { correct: false, hint: QUESTION.hint };
  }
  return null;
}

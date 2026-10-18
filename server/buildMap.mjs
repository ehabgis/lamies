// «ابنِ خريطتك»: the child places resource symbols on an empty map of Egypt.
// Rounds of three items keep each activity short. Places and coordinates are
// the lesson sites already in the project (approximate ones say so); the
// accepted zones never leave the server, and grading is by distance.
import { readFileSync } from "node:fs";

const NILE = JSON.parse(
  readFileSync(new URL("../public/geodata/egypt-nile.geojson", import.meta.url), "utf8"),
);
const APPROX = "موضع تقريبي للمكان المذكور في الكتاب، يحتاج مراجعة المعلم.";

// zone: { points: [{lat,lng,name,approximate?}], radiusKm } or { line: "nile", radiusKm }
const LESSONS = {
  "lesson-1": {
    title: "الثروة المعدنية ومصادر الطاقة",
    instruction: "اسحب رمز المورد وضعه في موقعه الصحيح على الخريطة",
    rounds: [
      {
        intro: "هيا نبني خريطتنا! اختر رمز الحديد، ثم ضعه في المكان الذي تعلّمته.",
        items: [
          {
            id: "iron",
            label: "الحديد",
            resourceId: "iron",
            zone: { points: [{ lat: 28.35, lng: 28.86, name: "الواحات البحرية" }], radiusKm: 110 },
            hints: ["فكّر في موقع الواحات البحرية بالنسبة لنهر النيل.", "ابحث غرب نهر النيل، في الصحراء الغربية."],
            why: {
              prompt: "كيف عرفت المكان؟",
              answer: "خامات الحديد توجد في الواحات البحرية بالصحراء الغربية، غرب نهر النيل.",
            },
          },
          {
            id: "gold",
            label: "الذهب",
            resourceId: "gold",
            zone: { points: [{ lat: 25.414, lng: 34.738, name: "منجم السكري" }], radiusKm: 110 },
            hints: ["الذهب يُستخرج من الصحراء الشرقية.", "ابحث قرب ساحل البحر الأحمر، في جنوب الصحراء الشرقية."],
            why: { prompt: "أين يقع منجم السكري؟", answer: "منجم السكري في الصحراء الشرقية قرب ساحل البحر الأحمر." },
          },
          {
            id: "phosphate",
            label: "الفوسفات",
            resourceId: "phosphate",
            zone: { points: [{ lat: 24.95, lng: 28.67, name: "أبو طرطور" }], radiusKm: 110 },
            hints: ["الفوسفات يُستخرج من منطقة في الصحراء الغربية.", "ابحث في جنوب الصحراء الغربية، قرب الواحات الداخلة والخارجة."],
            why: { prompt: "فيم نستخدم الفوسفات؟", answer: "يدخل الفوسفات في صناعة الأسمدة التي تساعد المحاصيل على النمو." },
          },
        ],
      },
      {
        intro: "أحسنت! الجولة الثانية: المنجنيز والبترول والغاز الطبيعي.",
        items: [
          {
            id: "manganese",
            label: "المنجنيز",
            resourceId: "manganese",
            zone: { points: [{ lat: 29.24, lng: 33.39, name: "أم بجمة" }], radiusKm: 90 },
            hints: ["المنجنيز يُستخرج من شبه جزيرة سيناء.", "ابحث في غرب سيناء، قرب خليج السويس."],
          },
          {
            id: "oil",
            label: "البترول",
            resourceId: "oil",
            zone: {
              points: [
                { lat: 29.78, lng: 32.45, name: "خليج السويس" },
                { lat: 29.8, lng: 28.3, name: "أبو الغراديق", approximate: true },
              ],
              radiusKm: 100,
            },
            hints: ["البترول يُستخرج من خليج بين سيناء والصحراء الشرقية.", "ابحث عند خليج السويس، شمال البحر الأحمر."],
          },
          {
            id: "gas",
            label: "الغاز الطبيعي",
            resourceId: "gas",
            zone: { points: [{ lat: 31.78, lng: 32.75, name: "حقل ظُهر" }], radiusKm: 110 },
            hints: ["حقل ظُهر للغاز الطبيعي تحت البحر.", "ابحث في البحر المتوسط، شمال شرق الدلتا."],
          },
        ],
      },
      {
        intro: "الجولة الأخيرة: الفحم وطاقة الرياح والطاقة الشمسية.",
        items: [
          {
            id: "coal",
            label: "الفحم",
            resourceId: "coal",
            zone: { points: [{ lat: 30.72, lng: 33.38, name: "جبل المغارة", approximate: true }], radiusKm: 90 },
            hints: ["الفحم يوجد في جبل بشبه جزيرة سيناء.", "ابحث في شمال سيناء."],
          },
          {
            id: "wind",
            label: "طاقة الرياح",
            resourceId: "wind",
            zone: {
              points: [
                { lat: 29.08, lng: 32.63, name: "الزعفرانة" },
                { lat: 27.85, lng: 33.45, name: "جبل الزيت", approximate: true },
              ],
              radiusKm: 90,
            },
            hints: ["محطات الرياح على ساحل بحر في شرق مصر.", "ابحث على ساحل البحر الأحمر، في محافظة البحر الأحمر."],
          },
          {
            id: "solar",
            label: "الطاقة الشمسية",
            resourceId: "solar",
            zone: {
              points: [
                { lat: 24.48, lng: 32.73, name: "بنبان" },
                { lat: 29.27, lng: 31.15, name: "الكريمات", approximate: true },
              ],
              radiusKm: 90,
            },
            hints: ["أكبر محطة شمسية في محافظة تسطع فيها الشمس معظم العام.", "ابحث في جنوب مصر قرب أسوان، أو في الكريمات بالجيزة."],
          },
        ],
      },
    ],
  },
  "lesson-2": {
    title: "موارد المياه",
    instruction: "ضع رموز موارد المياه في أماكنها الصحيحة",
    rounds: [
      {
        intro: "ابدأ ببحيرة ناصر، ضع رمزها في المكان الصحيح.",
        items: [
          {
            id: "lake-nasser",
            label: "بحيرة ناصر",
            resourceId: "lake-nasser",
            zone: { points: [{ lat: 23.62, lng: 32.9, name: "بحيرة ناصر" }], radiusKm: 110 },
            hints: ["ابحث في جنوب مصر بالقرب من أسوان.", "البحيرة خلف السد العالي، جنوب أسوان على النيل."],
          },
          {
            id: "nile",
            label: "نهر النيل",
            resourceId: "nile-river",
            zone: { line: "nile", radiusKm: 30, name: "نهر النيل" },
            hints: ["النيل يجري من جنوب مصر إلى شمالها.", "ضع الرمز على الشريط الأخضر في وسط الصحراء."],
          },
          {
            id: "groundwater",
            label: "المياه الجوفية",
            resourceId: "groundwater",
            zone: {
              points: [
                { lat: 29.2, lng: 25.52, name: "واحة سيوة", approximate: true },
                { lat: 28.35, lng: 28.86, name: "الواحات البحرية" },
                { lat: 27.06, lng: 27.97, name: "واحة الفرافرة", approximate: true },
                { lat: 25.5, lng: 29, name: "الواحات الداخلة", approximate: true },
                { lat: 25.45, lng: 30.55, name: "واحة الخارجة", approximate: true },
              ],
              radiusKm: 80,
            },
            hints: ["المياه الجوفية تروي الواحات.", "ابحث في الصحراء الغربية، في إحدى الواحات غرب النيل."],
          },
        ],
        finalWhy: {
          prompt: "لماذا تعتمد الحياة في الواحات على المياه الجوفية؟",
          answer: "لأن الواحات بعيدة عن نهر النيل والأمطار نادرة في الصحراء، فيحفر السكان الآبار ليصلوا إلى المياه المخزونة تحت الأرض.",
        },
      },
      {
        intro: "الجولة الثانية: الأمطار والتحلية والبحيرات الشمالية.",
        items: [
          {
            id: "rain",
            label: "الأمطار الشتوية",
            resourceId: "rain-harvesting-matrouh",
            zone: { points: [{ lat: 31.35, lng: 27.23, name: "مرسى مطروح" }], radiusKm: 120 },
            hints: ["الأمطار في مصر تسقط شتاءً على الساحل الشمالي.", "ابحث على ساحل البحر المتوسط غرب الإسكندرية."],
          },
          {
            id: "desalination",
            label: "تحلية مياه البحر",
            resourceId: "desalination",
            zone: { points: [{ lat: 29.6, lng: 32.32, name: "العين السخنة", approximate: true }], radiusKm: 90 },
            hints: ["محطة التحلية على ساحل خليج.", "ابحث عند خليج السويس، جنوب مدينة السويس."],
          },
          {
            id: "northern-lakes",
            label: "البحيرات الشمالية",
            resourceId: "northern-lakes",
            zone: {
              points: [
                { lat: 31.15, lng: 33.13, name: "بحيرة البردويل", approximate: true },
                { lat: 31.25, lng: 32.03, name: "بحيرة المنزلة", approximate: true },
                { lat: 31.5, lng: 30.85, name: "بحيرة البرلس", approximate: true },
                { lat: 31.25, lng: 30.17, name: "بحيرة إدكو", approximate: true },
                { lat: 31.12, lng: 29.88, name: "بحيرة مريوط", approximate: true },
              ],
              radiusKm: 50,
            },
            hints: ["هذه البحيرات على ساحل البحر المتوسط.", "ابحث على ساحل الدلتا وشمال سيناء."],
          },
        ],
      },
    ],
  },
  "lesson-3": {
    title: "المشروعات القومية",
    instruction: "ضع رمز كل مشروع في موقعه الصحيح على الخريطة",
    rounds: [
      {
        intro: "ابدأ بمشروع بنبان، ضع رمزه في المكان الصحيح.",
        items: [
          {
            id: "benban",
            label: "بنبان",
            resourceId: "benban-solar",
            zone: { points: [{ lat: 24.48, lng: 32.73, name: "بنبان" }], radiusKm: 90 },
            hints: ["ابحث في جنوب مصر، في المحافظة التي تسطع فيها الشمس معظم العام.", "بنبان في محافظة أسوان، قرب نهر النيل."],
            why: {
              prompt: "لماذا اختيرت أسوان لإقامة مشروع بنبان؟",
              answer: "لأن الشمس تسطع في أسوان معظم أيام العام، فتنتج الألواح الشمسية كهرباء أكثر.",
            },
          },
          {
            id: "new-delta",
            label: "الدلتا الجديدة",
            resourceId: "new-delta",
            zone: { points: [{ lat: 30.5, lng: 30.5, name: "مشروع الدلتا الجديدة" }], radiusKm: 100 },
            hints: ["المشروع زراعي على أطراف الدلتا.", "ابحث غرب الدلتا، في الصحراء الغربية القريبة منها."],
          },
          {
            id: "birket-ghalioun",
            label: "بركة غليون",
            resourceId: "birket-ghalioun",
            zone: { points: [{ lat: 31.52, lng: 30.9, name: "بركة غليون", approximate: true }], radiusKm: 70 },
            hints: ["مشروع للاستزراع السمكي قرب بحيرة على الساحل الشمالي.", "ابحث في شمال الدلتا قرب بحيرة البرلس (كفر الشيخ)."],
          },
        ],
      },
      {
        intro: "الجولة الثانية: العاصمة الإدارية وجبل الزيت وقناة السويس الجديدة.",
        items: [
          {
            id: "new-capital",
            label: "العاصمة الإدارية الجديدة",
            resourceId: "new-administrative-capital",
            zone: { points: [{ lat: 30, lng: 31.7, name: "العاصمة الإدارية الجديدة" }], radiusKm: 70 },
            hints: ["العاصمة الجديدة قريبة من القاهرة.", "ابحث شرق القاهرة، في الطريق إلى السويس."],
          },
          {
            id: "gabal-elzeit",
            label: "جبل الزيت",
            resourceId: "wind-farms",
            zone: { points: [{ lat: 27.85, lng: 33.45, name: "جبل الزيت", approximate: true }], radiusKm: 90 },
            hints: ["محطة رياح على ساحل بحر في شرق مصر.", "ابحث على ساحل البحر الأحمر، جنوب خليج السويس."],
          },
          {
            id: "new-suez-canal",
            label: "قناة السويس الجديدة",
            resourceId: "new-suez-canal",
            zone: { points: [{ lat: 30.5, lng: 32.3, name: "قناة السويس الجديدة" }], radiusKm: 80 },
            hints: ["القناة تصل بين بحرين.", "ابحث بين البحر المتوسط وخليج السويس، غرب سيناء."],
          },
        ],
      },
    ],
  },
};

const findItem = (lesson, itemId) => {
  for (const [r, round] of lesson.rounds.entries()) {
    const item = round.items.find((i) => i.id === itemId);
    if (item) return { item, round, roundIndex: r };
  }
  return {};
};

// ---------------------------------------------------------------- geometry
const toRad = (d) => (d * Math.PI) / 180;
function km(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
// Distance to a line segment in a local flat projection (fine at map scale).
function kmToSegment(p, a, b) {
  const kx = 111.32 * Math.cos(toRad(p.lat));
  const ky = 110.57;
  const ax = (a.lng - p.lng) * kx, ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
const NILE_LINES = NILE.features.flatMap((f) =>
  f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates],
);
function kmToNile(p) {
  let best = Infinity;
  for (const line of NILE_LINES)
    for (let i = 1; i < line.length; i++)
      best = Math.min(best, kmToSegment(p, { lng: line[i - 1][0], lat: line[i - 1][1] }, { lng: line[i][0], lat: line[i][1] }));
  return best;
}
// Nearest accepted place and how far the press was from it.
function nearest(zone, p) {
  if (zone.line === "nile") return { name: zone.name, distance: kmToNile(p), point: null };
  return zone.points
    .map((pt) => ({ ...pt, distance: km(p, pt), point: pt }))
    .sort((a, b) => a.distance - b.distance)[0];
}
// Rough direction from the press to the place, for the last hint only.
function direction(from, to) {
  const ns = to.lat - from.lat > 0.6 ? "الشمال" : to.lat - from.lat < -0.6 ? "الجنوب" : "";
  const ew = to.lng - from.lng > 0.6 ? "الشرق" : to.lng - from.lng < -0.6 ? "الغرب" : "";
  if (ns && ew) return `${ns} و${ew}`;
  return ns || ew || "";
}

// ---------------------------------------------------------------- public API
export function buildMapPublic(lessonId) {
  const lesson = LESSONS[lessonId];
  if (!lesson) return null;
  return {
    lessonId,
    title: lesson.title,
    instruction: lesson.instruction,
    approxNote: APPROX,
    rounds: lesson.rounds.map((r) => ({
      intro: r.intro,
      items: r.items.map(({ id, label, resourceId }) => ({ id, label, resourceId })),
      ...(r.finalWhy ? { finalWhy: { prompt: r.finalWhy.prompt } } : {}),
    })),
  };
}

// {itemId, lat, lng, attempt} grades a placement; {itemId, hint:true, attempt}
// returns only a hint; {roundIndex, reveal:"final"} returns the round's book
// answer (asked after the round is finished on the page).
export function checkBuildMap(lessonId, body = {}) {
  const lesson = LESSONS[lessonId];
  if (!lesson) return null;
  if (body.reveal === "final") {
    const round = lesson.rounds[Number(body.roundIndex)];
    return round?.finalWhy ? { answer: round.finalWhy.answer } : null;
  }
  const { item } = findItem(lesson, body.itemId);
  if (!item) return null;
  const attempt = Math.max(1, Math.min(9, Number(body.attempt) || 1));
  const levelHint = (n) => item.hints[Math.min(n, item.hints.length) - 1];
  if (body.hint) return { correct: false, hint: levelHint(attempt) };
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 15 || lat > 37 || lng < 20 || lng > 40) return null;
  const p = { lat, lng };
  const near = nearest(item.zone, p);
  if (near.distance <= item.zone.radiusKm) {
    // Snap the symbol onto the place so the name label sits where it belongs.
    return {
      correct: true,
      name: near.name,
      at: near.point ? { lat: near.point.lat, lng: near.point.lng } : p,
      approximate: !!near.approximate,
      ...(item.why ? { why: { ...item.why } } : {}),
    };
  }
  // Wrong: authored hints first; from the third try a direction is added.
  let hint = levelHint(attempt);
  if (attempt >= 3 && near.point) {
    const dir = direction(p, near.point);
    if (dir) hint = `${hint} جرّب أن تحرك الرمز نحو ${dir}.`;
  }
  return { correct: false, hint };
}

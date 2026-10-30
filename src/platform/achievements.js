// «إنجازاتي»: reads what this device already saved for the journeys and
// «ابنِ خريطتك», and works out stars, badges and the certificate. Nothing here
// is graded or awarded: the journeys are checked on the server, and this page
// only counts what they recorded on the device (demo / guest mode).

import { studentKey } from "./guestProfile.js";

// Every key is the current student's own copy (see guestProfile.js).
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(studentKey(key)) || "null");
  } catch {
    return null;
  }
};
const count = (o) => Object.keys(o || {}).length;
const MINERALS = ["iron", "manganese", "phosphate", "gold"];
const ENERGY = ["oil", "coal", "gas", "wind", "solar"];

export const JOURNEYS = [
  { id: "lesson-1", title: "رحلة كنوز مصر", lesson: "الدرس الأول", lessonTitle: "الثروة المعدنية ومصادر الطاقة في مصر", name: "كنوز مصر", text: "اكتشف المعادن ومصادر الطاقة في مصر.", href: "/demo/lesson-1/expedition" },
  { id: "lesson-2", title: "رحلة المياه", lesson: "الدرس الثاني", lessonTitle: "موارد المياه في مصر", name: "المياه في مصر", text: "تعرّف على نهر النيل وموارد المياه.", href: "/demo/lesson-2/expedition" },
  { id: "lesson-3", title: "نكتشف مشروعات مصر", lesson: "الدرس الثالث", lessonTitle: "المشروعات القومية", name: "مشروعات مصر", text: "اكتشف المشروعات التي تبني مستقبل مصر.", href: "/demo/lesson-3/expedition" },
];
const MAPS = [
  { id: "lesson-1", title: "ابنِ خريطتك: الثروة المعدنية", href: "/demo/lesson-1/build-map" },
  { id: "lesson-2", title: "ابنِ خريطتك: موارد المياه", href: "/demo/lesson-2/build-map" },
  { id: "lesson-3", title: "ابنِ خريطتك: المشروعات القومية", href: "/demo/lesson-3/build-map" },
];

function journeyState(id) {
  if (id === "lesson-1") {
    const p = read("lamis.expedition.lesson-1.v1");
    const stars = count(p?.done) + (p?.finalDone ? 1 : 0);
    return {
      stars,
      done: !!p?.finalDone,
      started: !!p && (stars > 0 || (p.view && p.view !== "start")),
      minerals: MINERALS.every((r) => p?.done?.[r]),
      energy: ENERGY.every((r) => p?.done?.[r]),
    };
  }
  const p = read(id === "lesson-2" ? "lamis.water.lesson-2.v1" : "lamis.projects.lesson-3.v1");
  const stars = count(p?.done);
  return { stars, done: stars >= 3, started: !!p && (stars > 0 || (p.view && p.view !== "start")) };
}
function mapState(id) {
  const p = read(`lamis.buildmap.${id}.v1`);
  const stars = Object.values(p?.placed || {}).filter((x) => x.state === "locked").length;
  return { stars, done: !!p?.finished, started: stars > 0 };
}

export function readAchievements() {
  const journeys = JOURNEYS.map((j) => {
    const s = journeyState(j.id);
    return { ...j, ...s, status: s.done ? "done" : s.started ? "active" : "new" };
  });
  const maps = MAPS.map((m) => ({ ...m, ...mapState(m.id) }));
  const [l1, l2, l3] = journeys;
  const anyMap = maps.some((m) => m.done);
  const badges = [
    { id: "minerals", title: "مستكشف المعادن", Icon: "Diamond", earned: l1.minerals, short: "اكتشفت موارد مصر المعدنية", how: "أكمل مهمة «كنوز المعادن» في رحلة كنوز مصر.", why: "اكتشفت الحديد والمنجنيز والفوسفات والذهب في رحلة كنوز مصر." },
    { id: "energy", title: "خبير الطاقة", Icon: "Lightbulb", earned: l1.energy, short: "اكتشفت مصادر الطاقة", how: "أكمل مهمة «مصادر الطاقة» في رحلة كنوز مصر.", why: "اكتشفت خمسة مصادر للطاقة في رحلة كنوز مصر." },
    { id: "water", title: "بطل المياه", Icon: "Drop", earned: l2.done, short: "ساعدت في رحلة المياه", how: "أكمل المهام الثلاث في رحلة المياه.", why: "ساعدت المزرعة والواحة والمدينة الساحلية في رحلة المياه." },
    { id: "projects", title: "مستكشف المشروعات", Icon: "Buildings", earned: l3.done, short: "اكتشفت مشروعات مصر", how: "أكمل المحطات الثلاث في رحلة «نكتشف مشروعات مصر».", why: "زرت الدلتا الجديدة وبركة غليون وبنبان." },
    { id: "maps", title: "صانع الخرائط", Icon: "MapTrifold", earned: anyMap, short: "بنيت خريطتك كاملة", how: "أكمل نشاط «ابنِ خريطتك» في أحد الدروس.", why: "بنيت خريطة كاملة ووضعت كل رمز في مكانه." },
  ];
  const stars = journeys.reduce((n, j) => n + j.stars, 0) + maps.reduce((n, m) => n + m.stars, 0);
  const journeysDone = journeys.filter((j) => j.done).length;
  const mapsDone = maps.filter((m) => m.done).length;
  // «أكمل رحلتي» goes to the first unfinished part, which resumes where it stopped.
  const next = journeys.find((j) => !j.done) || maps.find((m) => !m.done) || null;
  return { journeys, maps, badges, stars, journeysDone, mapsDone, next, started: stars > 0 || journeys.some((j) => j.started) };
}

const CERT_KEY = "lamis.certificate.v1";
export function loadCertificate() {
  return read(CERT_KEY) || {};
}
export function saveCertificate(next) {
  try {
    localStorage.setItem(studentKey(CERT_KEY), JSON.stringify({ ...loadCertificate(), ...next }));
  } catch {}
}

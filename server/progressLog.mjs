// Learning record for signed-in students, and the report a linked parent sees.
//
// Only results the server itself graded are written here (question answers,
// journey steps, «ابنِ خريطتك», «تتبّع وارسم»). A lesson counts as complete
// only when its requirements are met; opening a lesson alone does not count.
import { demoLesson } from "./demo.mjs";
import { buildMapPublic } from "./buildMap.mjs";
import { mediaIndex, findMedia, IMAGE_EXT } from "./mediaFiles.mjs";

const ORDER = ["lesson-1", "lesson-2", "lesson-3"];
const QUESTIONS_NEEDED = 5;

// What «أكمل الدرس» means for each lesson: explore it on the map (its
// journey), finish its main activity, and answer short questions.
export const REQUIREMENTS = {
  "lesson-1": {
    title: "الخامات المعدنية ومصادر الطاقة في مصر",
    journey: { title: "رحلة كنوز مصر", items: ["final"] },
    activity: { id: "book-l1-drag-energy", title: "تصنيف مصادر الطاقة" },
  },
  "lesson-2": {
    title: "موارد المياه في مصر",
    journey: { title: "رحلة المياه", items: ["farm", "oasis", "coast"] },
    activity: { id: "book-l2-drag-water", title: "تصنيف موارد المياه" },
  },
  "lesson-3": {
    title: "المشروعات القومية",
    journey: { title: "نكتشف مشروعات مصر", items: ["new-delta", "birket-ghalioun", "benban-solar"] },
    activity: { id: "book-l3-match-goals", title: "صِل كل مشروع بهدفه" },
  },
};
const TOPIC = {
  mineral: "مواقع الخامات المعدنية واستخداماتها",
  energy: "مصادر الطاقة المتجددة وغير المتجددة",
  water: "موارد المياه العذبة والمالحة وأماكنها",
  project: "المشروعات القومية وأهدافها",
};
const ACTIVITY_TITLE = {
  drag: "تصنيف الموارد",
  match: "صِل المتشابهين",
  "image-match": "طابق الرموز",
  order: "رتّب الخطوات",
  blank: "أكمل الفراغ",
  life: "موقف من الحياة",
  compare: "قارن بين موردين",
  map: "اكتشف الموقع",
};

export function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS activity_events(id INTEGER PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,lesson_id TEXT NOT NULL,kind TEXT NOT NULL,item_id TEXT NOT NULL,correct INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS activity_events_user ON activity_events(user_id,created_at);
CREATE TABLE IF NOT EXISTS parent_links(parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,PRIMARY KEY(parent_id,student_id));
CREATE TABLE IF NOT EXISTS link_codes(code TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
INSERT OR IGNORE INTO schema_versions(version) VALUES(3);`);
}

// kind: question · activity · journey · build-map · trace
export function logEvent(db, user, lessonId, kind, itemId, correct) {
  if (user?.role !== "student" || !REQUIREMENTS[lessonId]) return;
  db.prepare("INSERT INTO activity_events(user_id,lesson_id,kind,item_id,correct,created_at) VALUES(?,?,?,?,?,?)").run(
    user.id,
    lessonId,
    kind,
    String(itemId).slice(0, 80),
    correct ? 1 : 0,
    Date.now(),
  );
}
// A demo question is either a short question (choice / true-false) or an activity.
export function questionKind(lessonId, questionId) {
  const q = demoLesson(lessonId)?.content.questions.find((x) => x.id === questionId);
  if (!q) return null;
  return ["choice", "boolean"].includes(q.type) && !q.kind ? "question" : "activity";
}

const mapItems = (lessonId) => (buildMapPublic(lessonId)?.rounds || []).flatMap((r) => r.items.map((i) => i.id));

function lessonReport(lessonId, events) {
  const req = REQUIREMENTS[lessonId];
  const content = demoLesson(lessonId).content;
  const mine = events.filter((e) => e.lesson_id === lessonId);
  const won = (kind, id) => mine.some((e) => e.kind === kind && e.item_id === id && e.correct);

  // Understanding = first try at each short question.
  const firstTry = new Map();
  const firstAt = new Map();
  for (const e of mine)
    if (e.kind === "question" && !firstTry.has(e.item_id)) {
      firstTry.set(e.item_id, !!e.correct);
      firstAt.set(e.item_id, e.created_at);
    }
  const answered = firstTry.size;
  const right = [...firstTry.values()].filter(Boolean).length;

  const journeyDone = req.journey.items.every((i) => won("journey", i));
  const activityDone = won("activity", req.activity.id);
  const items = mapItems(lessonId);
  const mapDone = items.length > 0 && items.every((i) => won("build-map", i));
  const questionsDone = answered >= QUESTIONS_NEEDED;
  const steps = [
    { short: "الاستكشاف", label: `يستكشف الموارد على الخريطة (${req.journey.title})`, done: journeyDone },
    { short: "النشاط", label: `يكمل نشاط ${req.activity.title}`, done: activityDone },
    { short: "الأسئلة", label: `يجيب عن ${QUESTIONS_NEEDED} أسئلة قصيرة على الأقل`, done: questionsDone, detail: `${Math.min(answered, QUESTIONS_NEEDED)} من ${QUESTIONS_NEEDED}` },
  ];
  const met = steps.filter((s) => s.done).length + (questionsDone ? 0 : Math.min(answered, QUESTIONS_NEEDED) / QUESTIONS_NEEDED);
  const complete = steps.every((s) => s.done);

  // What to review: the topic of the questions missed on the first try.
  const resources = Object.fromEntries((content.resources || []).map((r) => [r.id, r]));
  const missed = {};
  for (const [qid, ok] of firstTry) {
    if (ok) continue;
    const q = content.questions.find((x) => x.id === qid);
    const topic = TOPIC[resources[q?.resourceId]?.kind];
    if (topic) missed[topic] = (missed[topic] || 0) + 1;
  }
  const weakest = Object.entries(missed).sort((a, b) => b[1] - a[1])[0]?.[0];
  // The questions themselves (no answers), for «عرض الأخطاء».
  const wrong = [...firstTry]
    .filter(([, ok]) => !ok)
    .map(([qid]) => content.questions.find((x) => x.id === qid)?.prompt)
    .filter(Boolean)
    .slice(0, 8);
  const needsReview = answered >= 3 && right / answered < 0.7;
  return {
    id: lessonId,
    title: req.title,
    status: complete ? "done" : mine.length ? "active" : "new",
    percent: Math.round((met / steps.length) * 100),
    steps,
    questions: { answered, right },
    activities: { journey: journeyDone, activity: activityDone, buildMap: mapDone },
    review: needsReview ? weakest || "أسئلة هذا الدرس" : null,
    lastAt: mine.length ? mine[mine.length - 1].created_at : null,
    wrong,
    image: lessonPhoto(lessonId, content),
    firstTries: [...firstTry].map(([qid, ok]) => ({ at: firstAt.get(qid), ok })),
  };
}
// A teacher photo of one of the lesson's places, if there is one.
function lessonPhoto(lessonId, content) {
  const index = mediaIndex("sites");
  for (const r of content.resources || [])
    for (const l of r.locations || []) {
      const found = findMedia("sites", index, l.id, IMAGE_EXT);
      if (found) return found;
    }
  return null;
}
const PERIOD = { week: 7, month: 30 };

// Recent milestones, newest first, in sentences a parent can read.
function recent(events) {
  const out = [];
  for (let i = events.length - 1; i >= 0 && out.length < 6; i--) {
    const e = events[i];
    const lesson = REQUIREMENTS[e.lesson_id].title;
    if (e.kind === "question") {
      const day = new Date(e.created_at).toDateString();
      const same = out.find((o) => o.kind === "question" && o.lesson === e.lesson_id && o.day === day);
      if (same) same.count++;
      else out.push({ kind: "question", lesson: e.lesson_id, day, count: 1, at: e.created_at, text: "" });
      continue;
    }
    if (!e.correct) continue;
    let text = null;
    if (e.kind === "activity") {
      const q = demoLesson(e.lesson_id).content.questions.find((x) => x.id === e.item_id);
      text = `أكمل نشاط ${q?.title || ACTIVITY_TITLE[q?.kind] || ACTIVITY_TITLE[q?.type] || "تفاعلي"}`;
    } else if (e.kind === "journey") {
      const req = REQUIREMENTS[e.lesson_id].journey;
      if (e.item_id === req.items[req.items.length - 1]) text = `أكمل ${req.title}`;
    } else if (e.kind === "trace") text = "أكمل نشاط «تتبّع وارسم خريطتك»";
    if (text && !out.some((o) => o.text === text)) out.push({ kind: e.kind, at: e.created_at, text });
  }
  for (const o of out)
    if (o.kind === "question") o.text = `أجاب عن ${o.count} ${o.count === 1 ? "سؤال" : o.count === 2 ? "سؤالين" : o.count <= 10 ? "أسئلة" : "سؤالًا"} في درس ${REQUIREMENTS[o.lesson].title}`;
  return out.map(({ text, at, kind }) => ({ text, at, kind }));
}

// period: week · month · all. Lesson completion always counts everything;
// the question totals and recent list follow the chosen period.
export function childReport(db, student, period = "all") {
  const events = db
    .prepare("SELECT lesson_id,kind,item_id,correct,created_at FROM activity_events WHERE user_id=? ORDER BY created_at, id")
    .all(student.id);
  const since = PERIOD[period] ? Date.now() - PERIOD[period] * 86400000 : 0;
  const lessons = ORDER.map((id) => lessonReport(id, events));
  const tries = lessons.flatMap((l) => l.firstTries).filter((t) => t.at >= since);
  const answered = tries.length;
  const right = tries.filter((t) => t.ok).length;
  for (const l of lessons) delete l.firstTries;
  const activitiesDone = lessons.reduce((n, l) => n + Object.values(l.activities).filter(Boolean).length, 0);
  const current = lessons.filter((l) => l.lastAt).sort((a, b) => b.lastAt - a.lastAt)[0] || null;
  const review = lessons.find((l) => l.review);
  let enrollment = {};
  try {
    enrollment = JSON.parse(student.enrollment || "{}") || {};
  } catch {}
  const first = String(student.name || "").split(/\s+/)[0];
  const summary = current
    ? [
        `${first} يتعلّم الآن: ${current.title}.`,
        current.activities.activity ? `أكمل نشاط ${REQUIREMENTS[current.id].activity.title}،` : null,
        current.questions.answered
          ? `وأجاب عن ${current.questions.answered} أسئلة؛ منها ${current.questions.right} إجابات صحيحة من المحاولة الأولى.`
          : "ولم يُجب عن أسئلة هذا الدرس بعد.",
        current.review ? `يحتاج إلى مراجعة ${current.review}.` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : `لم يبدأ ${first} أي نشاط بعد.`;
  return {
    id: student.id,
    name: student.name,
    grade: enrollment.gradeName || "الصف الخامس الابتدائي",
    lastActive: events.length ? events[events.length - 1].created_at : null,
    summary,
    totals: {
      lessons: { done: lessons.filter((l) => l.status === "done").length, total: lessons.length },
      answered,
      right,
      activities: { done: activitiesDone, total: lessons.length * 3 },
    },
    lessons,
    review: review ? { lesson: review.title, topic: review.review } : null,
    period: PERIOD[period] ? period : "all",
    recent: recent(events.filter((e) => e.created_at >= since)),
    certificate: lessons.every((l) => l.activities.journey && l.activities.buildMap),
  };
}

// Six letters and digits that are not easily confused (no O/0, I/1).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newLinkCode(db, studentId, randomBytes) {
  db.prepare("DELETE FROM link_codes WHERE student_id=? OR expires<?").run(studentId, Date.now());
  let code;
  do {
    code = Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join("");
  } while (db.prepare("SELECT 1 FROM link_codes WHERE code=?").get(code));
  const expires = Date.now() + 7 * 86400000;
  db.prepare("INSERT INTO link_codes(code,student_id,expires) VALUES(?,?,?)").run(code, studentId, expires);
  return { code, expires };
}
export function useLinkCode(db, parentId, code) {
  const row = db
    .prepare("SELECT * FROM link_codes WHERE code=? AND expires>?")
    .get(String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""), Date.now());
  if (!row) return null;
  db.prepare("DELETE FROM link_codes WHERE code=?").run(row.code);
  db.prepare("INSERT OR IGNORE INTO parent_links(parent_id,student_id,created_at) VALUES(?,?,?)").run(parentId, row.student_id, Date.now());
  return row.student_id;
}

const cleanCode = (code) => String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
export function previewLinkCode(db, code) {
  const row = db
    .prepare("SELECT u.name, u.enrollment FROM link_codes c JOIN users u ON u.id=c.student_id WHERE c.code=? AND c.expires>? AND u.disabled=0")
    .get(cleanCode(code), Date.now());
  if (!row) return null;
  let enrollment = {};
  try {
    enrollment = JSON.parse(row.enrollment || "{}") || {};
  } catch {}
  return { name: row.name, grade: enrollment.gradeName || "الصف الخامس الابتدائي" };
}

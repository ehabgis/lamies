import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { legacyContent, legacyResourceMedia } from "./legacy-content.mjs";
import { applyTextbook } from "./textbook-unit3.mjs";
import { readFileSync } from "node:fs";
const seed = JSON.parse(
  readFileSync(new URL("./seed-content.json", import.meta.url), "utf8"),
);
export const DEMO_ID = "lesson-1";
export const DEMO_IDS = ["lesson-1", "lesson-2", "lesson-3"];
function fullContent(id) {
  return attachSiteMedia(applyTextbook(id, assembledContent(id)));
}

// Photos and short videos for one place: put files named after the place id
// in public/lesson-media/sites/ (e.g. iron-bahariya.jpg, iron-bahariya-2.jpg,
// iron-bahariya.mp4). Only files that exist are listed.
const SITE_DIR = fileURLToPath(new URL("../public/lesson-media/sites/", import.meta.url));
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const VIDEO_EXT = ["mp4", "webm"];
function siteFiles(id) {
  const find = (base, exts) => exts.map((e) => `${base}.${e}`).find((f) => existsSync(SITE_DIR + f));
  const images = [];
  for (const n of ["", "-2", "-3", "-4", "-5", "-6"]) {
    const f = find(id + n, IMAGE_EXT);
    if (f) images.push(`/lesson-media/sites/${f}`);
  }
  const video = find(id, VIDEO_EXT);
  return { images, video: video ? `/lesson-media/sites/${video}` : null };
}
function attachSiteMedia(content) {
  if (!content || !existsSync(SITE_DIR)) return content;
  for (const r of content.resources || [])
    for (const l of r.locations || []) {
      if (!/^[a-z0-9-]+$/i.test(l.id || "")) continue;
      const media = siteFiles(l.id);
      if (media.images.length || media.video) l.media = media;
    }
  return content;
}
function assembledContent(id) {
  const old = legacyContent(id);
  if (!old) return null;
  if (id !== DEMO_ID) return old;
  return {
    ...structuredClone(seed),
    legacyExtras: {
      ...old.legacyExtras,
      locationNotes: old.resources.map((r) => ({
        name: r.label,
        ...r.legacyDetails,
      })),
    },
    sources: [...seed.sources, ...old.sources],
    resources: seed.resources.map((r) => ({
      ...structuredClone(r),
      media: {
        ...r.media,
        ...Object.fromEntries(
          Object.entries(legacyResourceMedia(r.id)).filter(([, v]) => v),
        ),
      },
      legacyDetails: old.resources.find((l) => l.id.startsWith(`${r.id}-`))
        ?.legacyDetails,
    })),
    objectives: [...new Set([...seed.objectives, ...old.objectives])],
    concepts: [
      ...seed.concepts,
      ...old.concepts.filter(
        (c) => !seed.concepts.some((s) => s.term === c.term),
      ),
    ],
    questions: [...seed.questions, ...old.questions],
  };
}
export function demoLesson(id = DEMO_ID) {
  const content = fullContent(id);
  if (!content) return null;
  content.reviewRequired = true;
  content.sources = (content.sources || []).map((s) => ({
    ...s,
    approved: false,
  }));
  content.questions = content.questions
    .filter((q) => !q.duplicateOf)
    .map(({ answer, explanation, hints, ...question }) => question);
  return {
    id,
    title: id === DEMO_ID ? "الثروة المعدنية ومصادر الطاقة" : content.title,
    kind: "lesson",
    status: "draft",
    demo: true,
    content,
  };
}
const canonical = (v) =>
  JSON.stringify(
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, JSON.parse(canonical(v[k]))]),
        )
      : Array.isArray(v)
        ? v.map((x) => JSON.parse(canonical(x)))
        : v,
  );
// Hints get more specific with each wrong attempt but never name the answer:
// 1) the question's own hint, 2) where to look, 3) rule out one wrong option.
export function gradedHint(q, attempt = 1, answer) {
  const n = Math.max(1, Math.min(3, Number(attempt) || 1));
  const levels = Array.isArray(q.hints) && q.hints.length ? [...q.hints] : [];
  if (!levels.length) levels.push(q.hint || "اقرأ السؤال مرة أخرى وابحث عن الكلمة المهمة فيه.");
  if (levels.length < 2)
    levels.push(
      q.type === "map"
        ? "افتح بطاقة المورد على الخريطة وانظر إلى المواقع المحددة له."
        : "راجع بطاقة المورد أو معلومات الدرس، ثم فكّر في استخدامه أو مكانه.",
    );
  if (levels.length < 3) {
    const options = (q.options || []).map((o) => (typeof o === "object" ? o.id : o));
    const wrong = ["choice", "map"].includes(q.type)
      ? options.find((o) => o !== q.answer && o !== answer)
      : null;
    const label = (q.options || []).find((o) => (typeof o === "object" ? o.id : o) === wrong);
    levels.push(
      wrong != null && options.length > 2
        ? `«${typeof label === "object" ? label.label || label.name : label}» ليست الإجابة الصحيحة.`
        : "لا بأس، التعلّم يحتاج محاولات. اقرأ المعلومة في بطاقة المورد ثم جرّب من جديد.",
    );
  }
  return levels[Math.min(n, levels.length) - 1];
}
export function demoAnswer(questionId, answer, lessonId = DEMO_ID, attempt = 1) {
  const q = fullContent(lessonId)?.questions.find((q) => q.id === questionId);
  if (!q) return null;
  const clean = (v) =>
    q.type === "blank" && typeof v === "string"
      ? v
          .trim()
          .replace(/\s+/g, " ")
          .replace(/[أإآ]/g, "ا")
          .replace(/ى/g, "ي")
          .replace(/[\u064B-\u065F]/g, "")
      : v;
  // A blank may list several accepted spellings (e.g. «النحاس» / «نحاس»).
  const accepted =
    q.type === "blank" && Array.isArray(q.answer) ? q.answer : [q.answer];
  const correct = accepted.some(
    (a) => canonical(clean(a)) === canonical(clean(answer)),
  );
  return {
    demo: true,
    correct,
    questionId: q.id,
    hint: correct ? null : gradedHint(q, attempt, answer),
    explanation: correct ? q.explanation || "" : "",
    awarded: 0,
  };
}

// Public navigation metadata for the bundled sample only; never reads CMS drafts.
export function demoCatalog() {
  const nodes = [
    {
      id: "demo-primary",
      parentId: null,
      kind: "stage",
      title: "المرحلة الابتدائية",
    },
  ];
  const grades = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
  const add = (id, parentId, kind, title, extra = {}) =>
    nodes.push({ id, parentId, kind, title, ...extra });
  for (let g = 4; g <= 6; g++) {
    const grade = `demo-grade-${g}`;
    add(grade, "demo-primary", "grade", `الصف ${grades[g - 1]} الابتدائي`);
    for (let t = 1; t <= 2; t++) {
      const term = `${grade}-term-${t}`,
        year = `${term}-year`,
        subject = `${year}-social`;
      add(
        term,
        grade,
        "term",
        t === 1 ? "الفصل الدراسي الأول" : "الفصل الدراسي الثاني",
      );
      add(year, term, "year", "2026 / 2027");
      add(subject, year, "subject", "الدراسات الاجتماعية");
      for (let u = 1; u <= 3; u++) {
        const unit = `${subject}-unit-${u}`;
        add(
          unit,
          subject,
          "unit",
          g === 5 && t === 1
            ? // Unit names of the Grade 5, Term 1 textbook (2025/2026 edition).
              [
                "الوحدة الأولى: مصر موقع متميز وطبيعة متنوعة",
                "الوحدة الثانية: الحضارة المصرية القديمة",
                "الوحدة الثالثة: كنوز مصر",
              ][u - 1]
            : ["الوحدة الأولى", "الوحدة الثانية", "الوحدة الثالثة"][u - 1],
        );
        const titles =
          u === 3
            ? [
                "الدرس الأول: الثروة المعدنية ومصادر الطاقة",
                "الدرس الثاني: موارد المياه",
                "الدرس الثالث: المشروعات القومية (رؤية مصر للمستقبل)",
              ]
            : [`درس الوحدة ${u === 1 ? "الأولى" : "الثانية"}`];
        titles.forEach((title, i) =>
          add(`${unit}-lesson-${i + 1}`, unit, "lesson", title, {
            demo: true,
            status: "draft",
            available: g === 5 && u === 3,
            ...(g === 5 && u === 3 ? { demoLessonId: `lesson-${i + 1}` } : {}),
          }),
        );
      }
    }
  }
  return nodes;
}

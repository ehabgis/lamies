import { existsSync } from "node:fs";
import {
  CURRICULUM_DATA,
  MAP_LOCATIONS,
  LEVELS_SYSTEM,
  APP_SETTINGS,
} from "../src/data/curriculumData.js";
export const legacyArchive = {
  curriculum: CURRICULUM_DATA,
  locations: MAP_LOCATIONS,
  levels: LEVELS_SYSTEM,
  settings: APP_SETTINGS,
};
const questions = (items, prefix, indexKey = "correctIndex") =>
  (items || [])
    .filter(
      (q) =>
        Array.isArray(q.options) &&
        Number.isInteger(q[indexKey]) &&
        q.options[q[indexKey]] !== undefined,
    )
    .map((q, i) => ({
      id: `${prefix}-${i + 1}`,
      type: "choice",
      prompt: q.question,
      options: q.options,
      answer: q.options[q[indexKey]],
      hint: q.hint || "راجع معلومات الموقع ثم حاول مرة أخرى.",
      explanation: "إجابة من بيانات النسخة القديمة، وتحتاج مراجعة المعلم.",
    }));
const MEDIA_BINDINGS = {
  gold: {
    video: "/lesson-media/lesson1_gold_mine.webm",
    image: "/lesson-media/lesson1_sukari.jpg",
  },
  "gold-sukari": {
    video: "/lesson-media/lesson1_gold_mine.webm",
    image: "/lesson-media/lesson1_sukari.jpg",
  },
  oil: { video: "/lesson-media/lesson1_oil_gas.webm" },
  gas: { video: "/lesson-media/lesson1_oil_gas.webm" },
  solar: { video: "/lesson-media/lesson1_solar_station.webm" },
  wind: { video: "/lesson-media/lesson1_wind_farm.webm" },
  phosphate: { image: "/lesson-media/lesson1_phosphate.jpg" },
  "new-administrative-capital": {
    image: "/lesson-media/lesson3_new_capital.jpg",
  },
  "toshka-kheir": { image: "/lesson-media/lesson3_toshka.jpg" },
};
export function legacyAssetAvailable(path) {
  try {
    return (
      typeof path === "string" &&
      path.startsWith("/") &&
      !path.startsWith("//") &&
      !decodeURIComponent(path).split("/").includes("..") &&
      existsSync(new URL(`../public${path}`, import.meta.url))
    );
  } catch {
    return false;
  }
}
export function legacyResourceMedia(id) {
  const candidates = MEDIA_BINDINGS[id] || {};
  return {
    image: legacyAssetAvailable(candidates.image) ? candidates.image : null,
    video: legacyAssetAvailable(candidates.video) ? candidates.video : null,
  };
}
export function legacyContent(id) {
  const lesson = CURRICULUM_DATA.lessons.find((l) => l.id === id);
  if (!lesson) return null;
  const locations = Object.values(MAP_LOCATIONS)
    .flat()
    .filter((l) => l.lesson === id);
  const media = (lesson.media || []).map((m) => ({
    ...m,
    originalType: m.type,
    type: /\.(jpg|jpeg|png|gif|webp|jfif|svg)$/i.test(m.path || "")
      ? "image"
      : m.type,
    available: legacyAssetAvailable(m.path),
  }));
  const content = {
    id,
    title: lesson.title,
    intro: lesson.details,
    summary: lesson.summary,
    objectives: lesson.objectives || [],
    concepts: (lesson.vocabulary || []).map((v) => ({
      term: v.term,
      definition: v.meaning,
    })),
    reviewRequired: true,
    completionXp: 0,
    sources: [
      {
        id: `legacy-${id}`,
        title: "بيانات المشروع السابق — لم تعتمد بعد",
        text: [lesson.details, ...(lesson.keyPoints || [])].join("\n"),
        approved: false,
      },
    ],
    resources: locations.map((l) => ({
      id: l.id,
      label: l.name,
      kind:
        l.category === "water"
          ? "water"
          : l.category === "projects"
            ? "project"
            : "mineral",
      color: l.category === "water" ? "#0786bb" : "#21835e",
      description: l.characterDialog?.explanation || l.simpleInfo?.what || "",
      importance: l.characterDialog?.importance || l.simpleInfo?.why || "",
      locations: [{ id: l.id, name: l.name, lat: l.lat, lng: l.lng }],
      media: legacyResourceMedia(l.id),
      legacyDetails: {
        governorate: l.governorate,
        description: l.simpleInfo,
        dialog: l.characterDialog,
      },
    })),
    questions: [
      ...questions(lesson.practiceQuestions, `${id}-practice`),
      ...locations.flatMap((l) =>
        questions(l.quiz, `${id}-${l.id}`, "correct").map((q) => ({
          ...q,
          resourceId: l.id,
        })),
      ),
    ],
    legacyExtras: {
      keyPoints: lesson.keyPoints || [],
      examples: lesson.examples || [],
      realLife: lesson.realLife || "",
      funFacts: lesson.funFacts || [],
      secrets: lesson.secrets || [],
      media,
    },
  };
  if (id === "lesson-2") {
    content.resources.push(
      ...[
        ["mediterranean-sea", "البحر المتوسط", 32, 29, "#18aaff"],
        ["red-sea", "البحر الأحمر", 26, 35, "#1bceba"],
      ].map(([key, label, lat, lng, color]) => ({
        id: key,
        label,
        kind: "water",
        color,
        description: `${label} مسطح مائي مالح على ساحل مصر.`,
        importance:
          "يمكن الاستفادة من مياه البحر بعد التحلية؛ لا تُشرب مباشرة.",
        locations: [{ id: key, name: label, lat, lng }],
        media: { image: null, video: null },
        locationNote:
          "موضع إرشادي للمسطح المائي، وليست نقطة منشأة أو مصدر مياه عذبة.",
      })),
    );
    content.sources.push({
      id: "sea-water-teaching-draft",
      title: "إضافة توضيحية للمسطحات البحرية — تحتاج مراجعة المعلم",
      text: "البحر المتوسط والبحر الأحمر مصدران لمياه مالحة؛ تحتاج مياه البحر إلى التحلية قبل استخدامها للشرب.",
      approved: false,
    });
  }
  if (id !== "lesson-1") {
    const choices = content.concepts.map((c) => c.definition);
    const mapOptions = content.resources.slice(0, 6).map((r) => ({
      id: r.locations[0].id,
      label: r.label,
      lat: r.locations[0].lat,
      lng: r.locations[0].lng,
    }));
    content.questions.push(
      {
        id: `${id}-activity-concepts`,
        type: "match",
        prompt: "صل كل مفهوم بمعناه.",
        options: [],
        pairs: content.concepts.map((c, i) => ({
          id: `c${i}`,
          label: c.term,
          choices,
        })),
        answer: Object.fromEntries(
          content.concepts.map((c, i) => [`c${i}`, c.definition]),
        ),
        hint: "اقرأ المفاهيم في أعلى الدرس، ثم اختر معنى كل مفهوم.",
        explanation:
          "مطابقة مستمدة من مفردات النسخة القديمة وتحتاج مراجعة المعلم.",
      },
      {
        id: `${id}-activity-map`,
        type: "map",
        prompt: `حدد موقع ${mapOptions[0].label} على الخريطة.`,
        options: mapOptions,
        answer: mapOptions[0].id,
        hint: "راجع الموقع المضاء ومعلوماته على الخريطة.",
        explanation:
          "الموقع من إحداثيات النسخة القديمة التقريبية؛ النشاط يحتاج مراجعة تعليمية.",
      },
    );
  }
  return content;
}

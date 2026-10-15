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
export function legacyContent(id) {
  const lesson = CURRICULUM_DATA.lessons.find((l) => l.id === id);
  if (!lesson) return null;
  const locations = Object.values(MAP_LOCATIONS)
    .flat()
    .filter((l) => l.lesson === id);
  const media = (lesson.media || []).map((m) => ({
    ...m,
    available:
      m.path?.startsWith("/lesson-media/") &&
      existsSync(new URL(`../public${m.path}`, import.meta.url)),
  }));
  return {
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
      media: { image: null, video: null },
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
}

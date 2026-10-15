import { readFileSync } from "node:fs";
const seed = JSON.parse(
  readFileSync(new URL("./seed-content.json", import.meta.url), "utf8"),
);
export const DEMO_ID = "lesson-1";
export function demoLesson() {
  const content = structuredClone(seed);
  content.reviewRequired = true;
  content.sources = (content.sources || []).map((s) => ({
    ...s,
    approved: false,
  }));
  content.questions = content.questions.map(
    ({ answer, explanation, ...question }) => question,
  );
  return {
    id: DEMO_ID,
    title: seed.title,
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
export function demoAnswer(questionId, answer) {
  const q = seed.questions.find((q) => q.id === questionId);
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
  const correct = canonical(clean(q.answer)) === canonical(clean(answer));
  return {
    demo: true,
    correct,
    questionId: q.id,
    hint: correct ? null : q.hint || "حاول مرة أخرى",
    explanation: correct ? q.explanation || "" : "",
    awarded: 0,
  };
}

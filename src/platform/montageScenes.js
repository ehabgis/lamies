// Builds the lesson montage from the lesson content (objectives, concepts,
// resources with their places, and a few server-graded check questions).
// Content stays in the lesson data; this only orders it into scenes.
const HOOKS = {
  "lesson-1": {
    title: "هل تعلم؟",
    text: "تحت رمال مصر وجبالها كنوز كثيرة! من أين نحصل على الحديد والذهب؟ وكيف نصنع الكهرباء من الشمس والرياح؟",
  },
  "lesson-2": {
    title: "هل فكرت يومًا؟",
    text: "من أين يأتي الماء الذي نشربه كل يوم؟ ولماذا لا نشرب ماء البحر؟ هيا نكتشف موارد المياه في مصر!",
  },
  "lesson-3": {
    title: "تخيّل معي!",
    text: "مدن جديدة، وقطار سريع، ومزارع في قلب الصحراء… كيف تبني مصر مستقبلها؟ هيا نتعرف على المشروعات القومية!",
  },
};

const short = (t = "", max = 200) => {
  const s = String(t).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("،"));
  return (end > 80 ? cut.slice(0, end + 1) : cut) + (end > 80 ? "" : "…");
};

export const SECTIONS = {
  objectives: { title: "أهداف رحلتنا", unit: "الهدف", listen: "استمع للهدف", next: null },
  concepts: { title: "مفاهيم الدرس", unit: "المفهوم", listen: "استمع للتعريف", next: "intro", nextLabel: "إلى معلومات الدرس" },
  intro: { title: "معلومات الدرس", unit: "المعلومة", listen: "استمع للمعلومة", next: null },
};

// Each of the three lesson buttons opens its own card set: objectives,
// concepts (one per card + a quick check), or the lesson information tour.
export function buildScenes(lessonId, content, section) {
  const all = buildAllScenes(lessonId, content);
  return section ? all.filter((s) => s.section === section) : all;
}

// One item per card: an objective, a concept, or a piece of lesson
// information (with its place lit on the map).
function buildAllScenes(lessonId, content) {
  if (!content) return [];
  const scenes = [];
  (content.objectives || []).forEach((o) =>
    scenes.push({ type: "objective", text: o.trim().replace(/[.。]?$/, "."), section: "objectives" }),
  );
  (content.concepts || []).forEach((c) =>
    scenes.push({ type: "concept", title: c.term, text: c.definition, section: "concepts" }),
  );
  const hook = HOOKS[lessonId] || { title: "هيا نبدأ!", text: short(content.intro) };
  scenes.push({ type: "hook", title: hook.title, text: hook.text, section: "intro" });
  for (const r of content.resources || []) {
    const l = r.locations?.[0];
    if (!l) continue;
    scenes.push({
      type: "info",
      title: r.label,
      text: short([r.description, r.importance].filter(Boolean).join(" ")),
      resource: r,
      spotlight: { lat: l.lat, lng: l.lng, label: l.name },
      section: "intro",
    });
  }
  return scenes;
}

export const firstSceneOf = (scenes, section) => {
  if (section === "intro") return 0;
  const i = scenes.findIndex((s) => s.section === section && s.type !== "hook");
  return i < 0 ? 0 : i;
};

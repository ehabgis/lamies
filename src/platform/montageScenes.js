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
  objectives: { title: "أهداف الدرس", next: "concepts", nextLabel: "إلى مفاهيم الدرس" },
  concepts: { title: "مفاهيم الدرس", next: "intro", nextLabel: "إلى معلومات الدرس" },
  intro: { title: "معلومات الدرس", next: null },
};

// Each of the three lesson buttons opens its own card set: objectives,
// concepts (one per card + a quick check), or the lesson information tour.
export function buildScenes(lessonId, content, section) {
  const all = buildAllScenes(lessonId, content);
  return section ? all.filter((s) => s.section === section) : all;
}

function buildAllScenes(lessonId, content) {
  if (!content) return [];
  const scenes = [];
  const hook = HOOKS[lessonId] || { title: "هيا نبدأ!", text: short(content.intro) };
  scenes.push({ type: "hook", title: hook.title, text: hook.text, section: "intro" });
  if (content.objectives?.length)
    scenes.push({
      type: "objectives",
      title: "في نهاية الرحلة ستستطيع أن…",
      items: content.objectives.map((o) => o.replace(/\.$/, "")),
      text: `في نهاية الرحلة ستستطيع أن: ${content.objectives.join(" ")}`,
      section: "objectives",
    });
  (content.concepts || []).forEach((c, i) =>
    scenes.push({
      type: "concept",
      title: c.term,
      label: `مفهوم ${i + 1} من ${content.concepts.length}`,
      text: c.definition,
      section: "concepts",
    }),
  );
  const checks = (content.questions || []).filter(
    (q) => /^book-/.test(q.id) && ["boolean", "choice"].includes(q.type),
  );
  if (checks[0]) scenes.push({ type: "check", title: "سؤال سريع", question: checks[0], section: "concepts" });
  const places = (content.resources || []).filter((r) => r.locations?.length);
  places.forEach((r, i) => {
    const l = r.locations[0];
    scenes.push({
      type: "info",
      title: r.label,
      text: short([r.description, r.importance].filter(Boolean).join(" ")),
      image: r.media?.image || null,
      imageCredit: r.media?.imageCredit || null,
      resource: r,
      spotlight: { lat: l.lat, lng: l.lng, label: l.name },
      section: "intro",
    });
    // A quick check after every few places keeps the child active.
    if ((i + 1) % 4 === 0 && checks[1 + Math.floor(i / 4)])
      scenes.push({ type: "check", title: "سؤال سريع", question: checks[1 + Math.floor(i / 4)], section: "intro" });
  });
  scenes.push({
    type: "end",
    title: "أحسنت! انتهت جولة المعلومات",
    text: "يمكنك الآن استكشاف الخريطة بنفسك، أو الانتقال إلى الأنشطة والأسئلة.",
    section: "intro",
  });
  return scenes;
}

export const firstSceneOf = (scenes, section) => {
  if (section === "intro") return 0;
  const i = scenes.findIndex((s) => s.section === section && s.type !== "hook");
  return i < 0 ? 0 : i;
};

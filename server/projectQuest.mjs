// «نكتشف مشروعات مصر» — the exploration journey of lesson 3 (المشروعات القومية).
// Three stations: watch a situation, find the project on the map, then answer
// one question about its benefit. Facts follow the student book; places are
// the lesson-3 sites already in the project.
//
// The public view never includes answers, per-target feedback or hints;
// checkProjectQuest grades on the server.

import { mediaIndex, findMedia, IMAGE_EXT, VIDEO_EXT } from "./mediaFiles.mjs";


// What the child can press on the map: the three project symbols.
const TARGETS = {
  "new-delta": { name: "الدلتا الجديدة", type: "agriculture", lat: 30.5, lng: 30.5 },
  "birket-ghalioun": { name: "بركة غليون", type: "fish-farming", lat: 31.52, lng: 30.9 },
  "benban-solar": { name: "بنبان", type: "solar-energy", lat: 24.48, lng: 32.73 },
};

const MISSIONS = [
  {
    id: "new-delta",
    title: "الدلتا الجديدة",
    benefit: "زيادة المحاصيل",
    scene: {
      art: "wheat",
      alt: "حقل قمح ذهبي وقت الحصاد",
      text: "نستخدم القمح في صناعة الخبز. وتنفّذ مصر مشروعات لزراعة أراضٍ جديدة وزيادة إنتاج الغذاء. هيا نكتشف أحدها!",
    },
    findPrompt: "ابحث عن مشروع الدلتا الجديدة غرب دلتا النيل، واضغط على رمزه.",
    wrong: "هذا مشروع آخر. حاول البحث غرب دلتا النيل.",
    hints: ["الغرب على يسار الخريطة، ابحث غرب الدلتا.", "الدلتا هي المثلث الأخضر في شمال مصر؛ المشروع على يساره."],
    focus: { lat: 30.6, lng: 30.6, radiusKm: 150 },
    info: {
      alt: "أراضٍ زراعية جديدة في مشروع الدلتا الجديدة",
      text: "هذا مشروع الدلتا الجديدة. تُستصلح فيه أراضٍ جديدة وتُزرع بمحاصيل مثل القمح.",
    },
    use: {
      prompt: "عندما نزرع قمحًا أكثر في مصر، ماذا يحدث؟",
      options: ["نشتري قمحًا أقل من الخارج", "نحتاج إلى شراء قمح أكثر من الخارج", "يتوقف استخدام القمح في صناعة الخبز"],
      answer: "نشتري قمحًا أقل من الخارج",
      wrong: "فكّر: لو أصبح لدينا قمح أكثر، هل نحتاج إلى شراء كمية أكبر أم أقل؟",
      hints: ["القمح الذي نزرعه في مصر لا نحتاج إلى شرائه.", "الاستيراد يعني الشراء من الخارج. هل يزيد أم يقل؟"],
      explanation: "أحسنت! زيادة إنتاج القمح تساعد على تقليل استيراده من الخارج.",
    },
    next: "اكتشفنا مشروعًا لزيادة المحاصيل. هيا نكتشف مشروعًا لزيادة إنتاج الأسماك!",
  },
  {
    id: "birket-ghalioun",
    title: "بركة غليون",
    benefit: "زيادة إنتاج الأسماك",
    scene: {
      art: "fish",
      alt: "أحواض لتربية الأسماك",
      text: "يمكن تربية الأسماك في مزارع مخصّصة لزيادة إنتاجها. هيا نكتشف أحد هذه المشروعات.",
    },
    findPrompt: "ابحث عن مشروع بركة غليون بمحافظة كفر الشيخ، قرب ساحل البحر المتوسط.",
    wrong: "هذا مشروع آخر. ابحث في شمال مصر قرب ساحل البحر المتوسط.",
    hints: ["كفر الشيخ في شمال الدلتا، على ساحل البحر المتوسط.", "ابحث عند الحافة الشمالية للمثلث الأخضر بجوار البحر."],
    focus: { lat: 31.35, lng: 30.9, radiusKm: 110 },
    info: {
      alt: "أحواض الاستزراع السمكي في بركة غليون",
      text: "يساعد مشروع بركة غليون على زيادة إنتاج الأسماك وتوفير فرص عمل.",
    },
    use: {
      prompt: "كيف يفيد مشروع بركة غليون الناس؟",
      options: ["يوفّر الأسماك وفرص العمل", "يولّد الكهرباء من الشمس", "يسهّل عبور السفن"],
      answer: "يوفّر الأسماك وفرص العمل",
      wrong: "فكّر: ماذا يُربّى في أحواض هذا المشروع؟",
      hints: ["تذكّر صورة الأحواض المليئة بالمياه.", "المشروع يزيد طعامًا يأتي من الماء، ويعمل فيه كثير من الناس."],
      explanation: "أحسنت! يزيد المشروع إنتاج الأسماك للناس، ويوفّر فرص عمل.",
    },
    next: "وفّرنا الغذاء من الزراعة والأسماك. هيا نكتشف كيف نستفيد من الشمس لإنتاج الكهرباء!",
  },
  {
    id: "benban-solar",
    title: "بنبان",
    benefit: "إنتاج الكهرباء من الشمس",
    scene: {
      art: "solar",
      alt: "ألواح شمسية تحت شمس ساطعة",
      text: "تساعدنا الشمس على إنتاج كهرباء من مصدر متجدد. هيا نكتشف مشروع بنبان.",
    },
    findPrompt: "ابحث عن مشروع بنبان بمحافظة أسوان، جنوب مصر.",
    wrong: "هذا مشروع آخر. ابحث في جنوب مصر بجوار نهر النيل.",
    hints: ["الجنوب في أسفل الخريطة.", "أسوان على نهر النيل في أقصى جنوب مصر."],
    focus: { lat: 24.6, lng: 32.8, radiusKm: 160 },
    info: {
      alt: "ألواح محطة بنبان للطاقة الشمسية",
      text: "يولّد مشروع بنبان الكهرباء من الشمس، وتتميز المنطقة بسطوع الشمس معظم العام.",
    },
    use: {
      prompt: "لماذا تُعد منطقة بنبان مناسبة للطاقة الشمسية؟",
      options: ["لأن الشمس تسطع فيها معظم العام", "لأنها كثيرة الأمطار", "لأنها قريبة من البحر"],
      answer: "لأن الشمس تسطع فيها معظم العام",
      wrong: "فكّر: ماذا تحتاج الألواح الشمسية لتنتج الكهرباء؟",
      hints: ["الألواح الشمسية تحتاج إلى ضوء الشمس.", "جنوب مصر مشمس وقليل الأمطار طوال العام."],
      explanation: "أحسنت! الشمس تسطع في بنبان معظم العام، فتنتج الألواح كهرباء كثيرة.",
    },
    next: null,
  },
];

const BADGE = "مستكشف مشروعات مصر";

// Photos or short clips in public/lesson-media/projects/ named wheat, fish or
// solar replace the drawing (see docs/LESSON_MEDIA_GUIDE.md).
function sceneMedia(scene) {
  const index = mediaIndex("projects");
  return {
    ...scene,
    image: findMedia("projects", index, scene.art, IMAGE_EXT),
    video: findMedia("projects", index, scene.art, VIDEO_EXT),
  };
}

export function projectQuestPublic(lessonId) {
  if (lessonId !== "lesson-3") return null;
  return {
    kind: "projects",
    lessonId,
    lessonTitle: "الدرس الثالث: المشروعات القومية",
    title: "نكتشف مشروعات مصر",
    welcome: "مرحبًا يا مستكشف! هيا نتعرّف على مشروعات تساعد على توفير الغذاء والكهرباء وتحسين حياة الناس.",
    finale: "أحسنت يا مستكشف! تعرّفت على مواقع ثلاثة مشروعات، واكتشفت كيف تساعد على تحسين حياتنا.",
    badge: BADGE,
    // Every symbol is on the map from the start, so the positions say nothing
    // about which one is right.
    targets: Object.entries(TARGETS).map(([id, t]) => ({ id, type: t.type, lat: t.lat, lng: t.lng })),
    missions: MISSIONS.map((m) => ({
      id: m.id,
      title: m.title,
      benefit: m.benefit,
      // A teacher photo named after the project (e.g. new-delta.jpg), if any.
      image: findMedia("projects", mediaIndex("projects"), m.id, IMAGE_EXT),
      scene: sceneMedia(m.scene),
      findPrompt: m.findPrompt,
      use: { prompt: m.use.prompt, options: [...m.use.options] },
      next: m.next,
    })),
    source: "كتاب الطالب — الدراسات الاجتماعية، الصف الخامس، الوحدة الثالثة، الدرس الثالث (مسودة تحتاج مراجعة).",
  };
}

const level = (attempt, max) => Math.max(1, Math.min(max, Number(attempt) || 1));

// step "find": {missionId, target, attempt} · step "use": {missionId, answer, attempt}
// target / answer "__hint__" asks only for the hint at that level.
export function checkProjectQuest(lessonId, body = {}) {
  if (lessonId !== "lesson-3") return null;
  const m = MISSIONS.find((x) => x.id === body.missionId);
  if (!m) return null;
  if (body.step === "find") {
    const t = String(body.target || "");
    if (t === "__hint__") {
      const n = level(body.attempt, m.hints.length);
      return { correct: false, hint: m.hints[n - 1], focus: m.focus };
    }
    if (!TARGETS[t]) return null;
    if (t === m.id)
      return {
        correct: true,
        found: { target: t, label: TARGETS[t].name, lat: TARGETS[t].lat, lng: TARGETS[t].lng },
        info: { ...m.info, image: findMedia("projects", mediaIndex("projects"), m.id, IMAGE_EXT) },
      };
    return { correct: false, hint: m.wrong };
  }
  if (body.step === "use") {
    if (body.answer === "__hint__") {
      const n = level(body.attempt, m.use.hints.length);
      return { correct: false, hint: m.use.hints[n - 1] };
    }
    if (!m.use.options.includes(body.answer)) return null;
    if (body.answer === m.use.answer) return { correct: true, explanation: m.use.explanation };
    return { correct: false, hint: m.use.wrong };
  }
  return null;
}

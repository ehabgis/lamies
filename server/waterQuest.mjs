// «رحلة المياه» — the exploration activity of lesson 2 (موارد المياه).
// Each mission is one situation: watch it, find the right water source on the
// map, then use what was learned. Facts follow the student book; places are
// the lesson-2 sites already in the project (approximate ones are marked).
//
// The public view never includes the answer, the per-target feedback or the
// hints; checkWaterQuest grades on the server.

const APPROX = "موضع تقريبي للمكان المذكور في الكتاب، يحتاج مراجعة المعلم.";

// Things the child can press on the map. Lines and areas come from the local
// GeoJSON files; points are the lesson-2 sites.
const TARGETS = {
  nile: { name: "نهر النيل", type: "river" },
  "red-sea": { name: "البحر الأحمر", type: "sea" },
  "med-sea": { name: "البحر المتوسط", type: "sea" },
  groundwater: {
    name: "المياه الجوفية",
    type: "groundwater",
    points: [
      { lat: 29.2, lng: 25.52, name: "واحة سيوة", approximate: true },
      { lat: 28.35, lng: 28.86, name: "الواحات البحرية" },
      { lat: 27.06, lng: 27.97, name: "واحة الفرافرة", approximate: true },
      { lat: 25.5, lng: 29, name: "الواحات الداخلة", approximate: true },
      { lat: 25.45, lng: 30.55, name: "واحة الخارجة", approximate: true },
    ],
  },
  rain: {
    name: "الأمطار",
    type: "rain",
    points: [{ lat: 31.35, lng: 27.23, name: "مرسى مطروح" }],
  },
};

const MISSIONS = [
  {
    id: "farm",
    title: "ري المزرعة",
    scene: {
      art: "farm",
      // Drop a real photo or short clip here (see docs/MEDIA_GUIDE.md):
      image: "/lesson-media/water/farm.jpg",
      video: "/lesson-media/water/farm.mp4",
      alt: "مزرعة ذرة خضراء بجوار قناة ري",
      text: "هذه المزرعة تحتاج إلى مياه للري. أي مصدر مياه في مصر يمكن أن يساعدها؟ هيا نبحث عنه على الخريطة!",
    },
    findPrompt: "اختر مصدرًا مناسبًا لري المزرعة بالضغط عليه على الخريطة.",
    accepted: ["nile"],
    wrong: {
      "red-sea": "مياه البحر مالحة، ولا نستخدمها مباشرة لري هذه المزروعات. جرّب البحث عن مصدر مياه عذبة.",
      "med-sea": "مياه البحر مالحة، ولا نستخدمها مباشرة لري هذه المزروعات. جرّب البحث عن مصدر مياه عذبة.",
      groundwater: "المياه الجوفية عذبة وتروي الواحات في الصحراء، لكن هذه المزرعة بجوار قناة تأتي من نهر كبير. ابحث عن هذا النهر.",
      rain: "الأمطار في مصر قليلة وتسقط في الشتاء على الساحل الشمالي، فلا تكفي لري المزرعة طوال العام. ابحث عن مصدر يجري طوال العام.",
    },
    hints: [
      "ابحث عن النهر الذي يمتد من جنوب مصر إلى شمالها.",
      "انظر إلى الشريط الأخضر في وسط الصحراء؛ المصدر يجري في منتصفه.",
    ],
    // Second hint also shows a soft ring on the map around this area.
    focus: { lat: 27.2, lng: 31.2, radiusKm: 260 },
    success: {
      label: "نهر النيل",
      at: { lat: 26.6, lng: 31.85 },
      text: "أحسنت! مياه النيل عذبة وتُستخدم في ري المزروعات.",
      draw: "nile",
    },
    use: {
      art: "irrigate",
      prompt: "ساعد المزارع على ري مزروعاته. اختر المياه المناسبة:",
      options: ["مياه عذبة", "مياه مالحة"],
      answer: "مياه عذبة",
      hints: [
        "الأملاح الكثيرة تضر النباتات. أي المياه قليلة الأملاح؟",
        "مياه النيل التي وجدتها على الخريطة من هذا النوع.",
      ],
      explanation: "رائع! اخترت المياه المناسبة للري. المياه العذبة قليلة الأملاح وتناسب النباتات.",
      wrong: "المياه المالحة فيها أملاح كثيرة تضر النباتات وتُتلف التربة. جرّب مرة أخرى.",
    },
    done: "تعرّفت على موقع نهر النيل، وعرفت أن مياهه عذبة وتُستخدم في الري.",
  },
  {
    id: "oasis",
    title: "مياه الواحة",
    scene: {
      art: "oasis",
      image: "/lesson-media/water/oasis.jpg",
      video: "/lesson-media/water/oasis.mp4",
      alt: "واحة نخيل في قلب الصحراء",
      text: "هذه واحة في قلب الصحراء الغربية، بعيدة جدًا عن نهر النيل. ومع ذلك فيها نخيل ومزارع! من أين تأتي مياهها؟",
    },
    findPrompt: "اضغط على مصدر المياه الذي تعتمد عليه الواحات في الصحراء الغربية.",
    accepted: ["groundwater"],
    wrong: {
      nile: "النيل مصدر مياه عذبة، لكنه بعيد جدًا عن هذه الواحة. ابحث عن مصدر موجود تحت أرض الصحراء نفسها.",
      "red-sea": "مياه البحر مالحة وبعيدة عن الواحة. ابحث عن مياه عذبة قريبة من الواحات.",
      "med-sea": "مياه البحر مالحة وبعيدة عن الواحة. ابحث عن مياه عذبة قريبة من الواحات.",
      rain: "الأمطار نادرة جدًا في الصحراء الغربية. ابحث عن مياه مخزونة تحت سطح الأرض.",
    },
    hints: [
      "المياه هنا ليست فوق الأرض، بل مخزونة تحتها ويُحفر لها آبار.",
      "ابحث عن العلامات المنتشرة في الصحراء الغربية غرب النيل.",
    ],
    focus: { lat: 27.3, lng: 28, radiusKm: 330 },
    success: {
      label: "المياه الجوفية",
      text: "أحسنت! تعتمد الواحات على المياه الجوفية المخزونة تحت سطح الأرض، ونصل إليها بحفر الآبار.",
      draw: "groundwater",
    },
    use: {
      art: "drip",
      prompt: "المياه الجوفية لا تتجدد بسرعة. كيف يروي مزارع الواحة نخيله دون أن يُهدر الماء؟",
      options: ["بالري بالتنقيط", "بغمر الأرض بالماء كل يوم", "بترك البئر مفتوحًا طوال اليوم"],
      answer: "بالري بالتنقيط",
      hints: [
        "فكّر: أي طريقة تعطي النبات ما يحتاجه فقط؟",
        "الطريقة الصحيحة توصل الماء قطرة قطرة إلى جذور النبات.",
      ],
      explanation: "رائع! الري بالتنقيط يوصل الماء إلى الجذور مباشرة ويوفّر المياه الجوفية.",
      wrong: "هذه الطريقة تُهدر كثيرًا من الماء، والمياه الجوفية قد تنفد. جرّب طريقة أخرى.",
    },
    done: "عرفت أن الواحات تعتمد على المياه الجوفية، وأن ترشيدها مهم لأنها لا تتجدد بسرعة.",
  },
  {
    id: "coast",
    title: "مياه المدينة الساحلية",
    scene: {
      art: "coast",
      image: "/lesson-media/water/coast.jpg",
      video: "/lesson-media/water/coast.mp4",
      alt: "مدينة على ساحل البحر",
      text: "هذه مدينة جديدة على ساحل البحر الأحمر، بعيدة عن نهر النيل، ويحتاج سكانها إلى مياه للشرب. أي مصدر قريب منها يمكن أن نستفيد منه؟",
    },
    findPrompt: "اضغط على مصدر المياه القريب من هذه المدينة الساحلية.",
    accepted: ["red-sea"],
    wrong: {
      nile: "النيل مصدر عذب، لكنه بعيد عن ساحل البحر الأحمر، ونقل الماء منه مكلف. ابحث عن مسطح مائي كبير بجوار المدينة.",
      "med-sea": "هذا بحر أيضًا، لكنه بعيد عن ساحل البحر الأحمر. ابحث عن البحر الذي تطل عليه المدينة.",
      groundwater: "المياه الجوفية في الواحات بعيدة عن هذه المدينة. ابحث عن المسطح المائي الذي تطل عليه.",
      rain: "الأمطار قليلة جدًا على ساحل البحر الأحمر. ابحث عن مسطح مائي كبير بجوار المدينة.",
    },
    hints: [
      "المدينة تطل على مسطح مائي كبير في شرق مصر.",
      "ابحث شرق النيل، بين مصر وشبه الجزيرة العربية.",
    ],
    focus: { lat: 26.5, lng: 34.6, radiusKm: 280 },
    success: {
      label: "البحر الأحمر",
      at: { lat: 26.2, lng: 34.9 },
      text: "أحسنت! مياه البحر الأحمر مالحة، لكن يمكن تحليتها لتصبح صالحة للشرب، مثل محطة تحلية العين السخنة.",
      draw: "red-sea",
      approximate: true,
    },
    use: {
      art: "desalinate",
      prompt: "ماذا نفعل بمياه البحر قبل أن يشربها سكان المدينة؟",
      options: ["نحلّيها في محطة تحلية", "نشربها كما هي", "نخلطها بالرمل"],
      answer: "نحلّيها في محطة تحلية",
      hints: [
        "مياه البحر مالحة. ماذا نحتاج أن نزيل منها؟",
        "في العين السخنة محطة تفعل ذلك.",
      ],
      explanation: "رائع! محطة التحلية تزيل الأملاح من مياه البحر فتصبح عذبة وصالحة للشرب.",
      wrong: "مياه البحر مالحة ولا تصلح للشرب كما هي. فكّر في طريقة لإزالة الأملاح.",
    },
    done: "عرفت أن تحلية مياه البحر تساعد المدن البعيدة عن النيل.",
  },
];

const BADGE = "بطل المياه";

export function waterQuestPublic(lessonId) {
  if (lessonId !== "lesson-2") return null;
  return {
    kind: "water",
    lessonId,
    lessonTitle: "الدرس الثاني: موارد المياه",
    title: "رحلة المياه",
    subtitle: "شاهد موقفًا، ابحث عن مصدر المياه المناسب على الخريطة، ثم استخدم ما تعلمته.",
    badge: BADGE,
    approxNote: APPROX,
    targets: Object.fromEntries(
      Object.entries(TARGETS).map(([id, t]) => [
        id,
        { type: t.type, ...(t.points ? { points: t.points.map(({ lat, lng, approximate }) => ({ lat, lng, approximate: !!approximate })) } : {}) },
      ]),
    ),
    missions: MISSIONS.map((m) => ({
      id: m.id,
      title: m.title,
      scene: { ...m.scene },
      findPrompt: m.findPrompt,
      use: { art: m.use.art, prompt: m.use.prompt, options: [...m.use.options] },
    })),
    source: "كتاب الطالب — الدراسات الاجتماعية، الصف الخامس، الوحدة الثالثة، الدرس الثاني (مسودة تحتاج مراجعة).",
  };
}

const level = (attempt, max) => Math.max(1, Math.min(max, Number(attempt) || 1));

// step "find": {missionId, target, attempt} · step "use": {missionId, answer, attempt}
// target "__hint__" / answer "__hint__" asks only for the hint at that level.
export function checkWaterQuest(lessonId, body = {}) {
  if (lessonId !== "lesson-2") return null;
  const m = MISSIONS.find((x) => x.id === body.missionId);
  if (!m) return null;
  if (body.step === "find") {
    const t = String(body.target || "");
    const n = level(body.attempt, m.hints.length);
    if (t === "__hint__")
      return { correct: false, hint: m.hints[n - 1], ...(n >= 2 ? { focus: m.focus } : {}) };
    if (!TARGETS[t]) return null;
    if (m.accepted.includes(t)) {
      const target = TARGETS[t];
      return {
        correct: true,
        explanation: m.success.text,
        found: {
          target: t,
          label: m.success.label,
          draw: m.success.draw,
          ...(m.success.at ? { at: m.success.at } : {}),
          ...(target.points ? { points: target.points.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name })) } : {}),
        },
      };
    }
    // A wrong press explains why that source does not fit; the general hint
    // only arrives from the second wrong press on.
    const hint = m.wrong[t] || m.hints[0];
    return { correct: false, hint, ...(Number(body.attempt) >= 3 ? { focus: m.focus } : {}) };
  }
  if (body.step === "use") {
    const n = level(body.attempt, m.use.hints.length);
    if (body.answer === "__hint__") return { correct: false, hint: m.use.hints[n - 1] };
    if (!m.use.options.includes(body.answer)) return null;
    if (body.answer === m.use.answer)
      return { correct: true, explanation: m.use.explanation, done: m.done };
    return { correct: false, hint: Number(body.attempt) > 1 ? `${m.use.wrong} ${m.use.hints[n - 1]}` : m.use.wrong };
  }
  return null;
}

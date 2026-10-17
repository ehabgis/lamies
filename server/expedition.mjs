// «رحلة كنوز مصر» — the exploration activity of lesson 1 (unit 3, Grade 5).
// Facts follow the student book (pp. 68–75); coordinates are the project's
// existing lesson-1 sites (server/seed-content.json) unless marked
// `approximate`, which are places the book names without coordinates.
//
// The public view (expeditionPublic) never includes answers or which map site
// belongs to which resource; checkExpedition grades on the server.

const IMG = "/lesson-media/book/";
const CREDIT = "صورة من كتاب الطالب";
const APPROX = "موضع تقريبي للمكان المذكور في الكتاب، يحتاج مراجعة المعلم.";

// Every site that can appear on the map. Opaque ids so the map question
// does not reveal which resource a pin belongs to.
const SITES = {
  s1: { lat: 28.35, lng: 28.86, name: "الواحات البحرية", say: "الواحاتِ البحريّة" },
  s2: { lat: 29.24, lng: 33.39, name: "أم بجمة", say: "أُمّ بُجْمة" },
  s3: { lat: 24.95, lng: 28.67, name: "أبو طرطور", say: "أبو طَرْطور" },
  s4: { lat: 25.414, lng: 34.738, name: "منجم السكري", say: "منجمِ السُّكَّري" },
  s5: { lat: 29.78, lng: 32.45, name: "خليج السويس", say: "خليجِ السويس" },
  s6: { lat: 30.72, lng: 33.38, name: "جبل المغارة", say: "جبلِ المَغارة", approximate: true },
  s7: { lat: 31.78, lng: 32.75, name: "حقل ظُهر", say: "حقلِ ظُهْر" },
  s8: { lat: 29.08, lng: 32.63, name: "الزعفرانة", say: "الزَّعْفَرانة" },
  s9: { lat: 27.85, lng: 33.45, name: "جبل الزيت", say: "جبلِ الزَّيت", approximate: true },
  s10: { lat: 24.48, lng: 32.73, name: "بنبان", say: "بَنْبان" },
  s11: { lat: 29.27, lng: 31.15, name: "الكريمات", say: "الكُرَيْمات", approximate: true },
};

const RESOURCES = {
  iron: {
    label: "الحديد",
    kind: "mineral",
    image: IMG + "lesson1_iron.jpg",
    say: "الحديد",
    watch: "الحديد خام معدني يُستخدم في صناعة الآلات ووسائل النقل والسكك الحديدية. توجد خامات الحديد في الواحات البحرية بالصحراء الغربية.",
    sites: ["s1"],
    findPrompt: "أين توجد خامات الحديد؟ اضغط على الموقع الصحيح.",
    findHints: [
      "الحديد في الصحراء الغربية، غرب نهر النيل.",
      "ابحث عن واحة في وسط الصحراء الغربية، شمال أبو طرطور.",
    ],
    use: {
      prompt: "مصنع يصنع عربات قطار. أي مورد يحتاجه؟",
      options: ["الحديد", "الفوسفات", "الذهب"],
      answer: "الحديد",
      hints: ["فكّر: من أي معدن تُصنع القضبان والعربات الثقيلة؟", "هو أساس الصناعة الحديثة ويُستخرج من الواحات البحرية."],
      explanation: "أحسنت! الحديد أساس الصناعة الحديثة، ومنه تُصنع عربات القطار والسكك الحديدية.",
    },
  },
  manganese: {
    label: "المنجنيز",
    kind: "mineral",
    image: IMG + "lesson1_manganese.jpg",
    say: "المَنْجَنيز",
    watch: "المنجنيز خام معدني يدخل في صناعة الصلب والدهانات. يُستخرج المنجنيز من أم بجمة في شبه جزيرة سيناء.",
    sites: ["s2"],
    findPrompt: "أين يُستخرج المنجنيز؟ اضغط على الموقع الصحيح.",
    findHints: ["المنجنيز في شبه جزيرة سيناء.", "ابحث في غرب سيناء، قرب خليج السويس."],
    use: {
      prompt: "مصنع دهانات يحتاج خامًا يدخل أيضًا في صناعة الصلب. ماذا يختار؟",
      options: ["الفوسفات", "المنجنيز", "الذهب"],
      answer: "المنجنيز",
      hints: ["تذكّر بطاقة الخام الذي يُستخرج من أم بجمة.", "الخام نفسه يدخل في الصلب والدهانات."],
      explanation: "رائع! المنجنيز يدخل في صناعة الصلب والدهانات.",
    },
  },
  phosphate: {
    label: "الفوسفات",
    kind: "mineral",
    image: IMG + "lesson1_phosphate.jpg",
    say: "الفوسفات",
    watch: "الفوسفات خام معدني يُستخدم في صناعة الأسمدة الكيماوية والمبيدات الحشرية. يُستخرج من منطقة أبو طرطور بالصحراء الغربية.",
    sites: ["s3"],
    findPrompt: "أين يُستخرج الفوسفات؟ اضغط على الموقع الصحيح.",
    findHints: ["الفوسفات في الصحراء الغربية.", "ابحث في جنوب الصحراء الغربية، أبعد جنوبًا من الواحات البحرية."],
    use: {
      prompt: "مزارع يريد سمادًا يساعد النباتات على النمو. من أي خام تُصنع الأسمدة الكيماوية؟",
      options: ["الحديد", "الذهب", "الفوسفات"],
      answer: "الفوسفات",
      hints: ["الخام الذي يخدم الزراعة.", "يُستخرج من أبو طرطور."],
      explanation: "ممتاز! الفوسفات يُستخدم في صناعة الأسمدة الكيماوية والمبيدات الحشرية.",
    },
  },
  gold: {
    label: "الذهب",
    kind: "mineral",
    image: IMG + "lesson1_gold.jpg",
    say: "الذَّهَب",
    watch: "الذهب من المعادن النادرة، يُستخدم في صناعة الحُلي ويدخل في علاج بعض الأمراض. يُستخرج الذهب من منجم السكري بالصحراء الشرقية.",
    sites: ["s4"],
    findPrompt: "أين يُستخرج الذهب؟ اضغط على الموقع الصحيح.",
    findHints: ["الذهب في الصحراء الشرقية، شرق النيل.", "ابحث قرب ساحل البحر الأحمر في جنوب الصحراء الشرقية."],
    use: {
      prompt: "ورشة تصنع الأساور والسلاسل. أي معدن نادر تحتاجه؟",
      options: ["المنجنيز", "الذهب", "الحديد"],
      answer: "الذهب",
      hints: ["معدن نادر لامع.", "يُستخرج من منجم السكري."],
      explanation: "أحسنت! الذهب معدن نادر يُستخدم في صناعة الحُلي.",
    },
  },
  oil: {
    label: "البترول",
    kind: "nonrenewable",
    image: null,
    say: "البترول",
    watch: "البترول مصدر طاقة غير متجدد. يُستخرج منه البنزين والسولار، وتدخل بعض مشتقاته في صناعة البلاستيك. يُستخرج من خليج السويس وشمال الصحراء الغربية والصحراء الشرقية.",
    note: "هذا موقع استخراج.",
    sites: ["s5"],
    findPrompt: "أين يُستخرج البترول؟ اضغط على الموقع الصحيح.",
    findHints: ["البترول في خليج بين سيناء والصحراء الشرقية.", "ابحث في شمال الخليج الغربي من البحر الأحمر."],
    use: {
      prompt: "سيارة الأسرة تحتاج بنزينًا لتسير. البنزين مشتق من:",
      options: ["البترول", "الفحم", "طاقة الرياح"],
      answer: "البترول",
      hints: ["البنزين والسولار مشتقان من مصدر واحد.", "يُستخرج من خليج السويس."],
      explanation: "صحيح! البنزين والسولار من مشتقات البترول.",
    },
  },
  coal: {
    label: "الفحم",
    kind: "nonrenewable",
    image: null,
    say: "الفَحْم",
    watch: "الفحم مصدر طاقة غير متجدد، يُستخدم في صناعة الصلب ويدخل في صناعة بعض الأدوية. يُستخرج من جبل المغارة في شمال سيناء.",
    note: "هذا موقع استخراج.",
    sites: ["s6"],
    findPrompt: "أين يُستخرج الفحم؟ اضغط على الموقع الصحيح.",
    findHints: ["الفحم في شمال سيناء.", "ابحث في شمال سيناء، بعيدًا قليلًا عن الساحل."],
    use: {
      prompt: "أي مصدر طاقة يُستخدم في صناعة الصلب ويدخل في صناعة بعض الأدوية؟",
      options: ["الغاز الطبيعي", "الفحم", "الطاقة الشمسية"],
      answer: "الفحم",
      hints: ["مصدر صلب أسود يُستخرج من جبل.", "يُستخرج من جبل المغارة."],
      explanation: "رائع! الفحم يدخل في صناعة الصلب وبعض الأدوية، وهو طاقة غير متجددة.",
    },
  },
  gas: {
    label: "الغاز الطبيعي",
    kind: "nonrenewable",
    image: IMG + "lesson1_gas.jpg",
    say: "الغازُ الطبيعي",
    watch: "الغاز الطبيعي مصدر طاقة غير متجدد، يُستخدم في البيوت وتوليد الكهرباء ووقودًا لبعض وسائل النقل. من أشهر حقوله حقل ظُهر في البحر المتوسط شمال بورسعيد.",
    note: "هذا موقع استخراج في البحر.",
    sites: ["s7"],
    findPrompt: "أين يقع حقل ظُهر للغاز الطبيعي؟ اضغط على الموقع الصحيح.",
    findHints: ["حقل ظُهر داخل البحر، وليس على اليابسة.", "ابحث في البحر المتوسط شمال بورسعيد."],
    use: {
      prompt: "أسرة تطهو الطعام على موقد في المطبخ. أي مصدر طاقة يُستخدم في الأغراض المنزلية؟",
      options: ["الغاز الطبيعي", "الفحم", "طاقة الرياح"],
      answer: "الغاز الطبيعي",
      hints: ["يصل إلى البيوت في أنابيب.", "من أشهر حقوله حقل ظُهر."],
      explanation: "أحسنت! الغاز الطبيعي يُستخدم في الأغراض المنزلية وتوليد الكهرباء.",
    },
  },
  wind: {
    label: "طاقة الرياح",
    kind: "renewable",
    image: IMG + "lesson1_gabal_elzeit.jpg",
    say: "طاقةُ الرِّياح",
    watch: "طاقة الرياح مصدر متجدد ونظيف لا ينفد. تُستخدم الرياح في توليد الكهرباء، ومن أضخم محطاتها جبل الزيت والزعفرانة بمحافظة البحر الأحمر.",
    note: "هذه محطات لإنتاج الكهرباء، وليست مواقع استخراج.",
    sites: ["s8", "s9"],
    findPrompt: "أين توجد محطة رياح؟ اضغط على أحد الموقعين الصحيحين.",
    findHints: ["محطات الرياح على ساحل البحر الأحمر.", "ابحث على الساحل الغربي لخليج السويس والبحر الأحمر."],
    use: {
      prompt: "قارن بين موردين: أيهما متجدد لا ينفد ولا يلوث الهواء؟",
      options: ["البترول", "طاقة الرياح"],
      answer: "طاقة الرياح",
      hints: ["المتجدد يتجدد في الطبيعة باستمرار.", "البترول معرّض للنفاد ويلوث البيئة."],
      explanation: "صحيح! طاقة الرياح متجددة ونظيفة، أما البترول فغير متجدد وملوّث.",
    },
  },
  solar: {
    label: "الطاقة الشمسية",
    kind: "renewable",
    image: IMG + "lesson1_benban.jpg",
    say: "الطاقةُ الشَّمسيّة",
    watch: "الطاقة الشمسية مصدر متجدد ونظيف. مصر من أكثر الدول ملاءمة لها لأن الشمس تسطع على أرضها طوال العام. من مشروعاتها محطة بنبان بأسوان ومحطة الكريمات بالجيزة.",
    note: "هذه محطات لإنتاج الكهرباء، وليست مواقع استخراج.",
    sites: ["s10", "s11"],
    findPrompt: "أين توجد محطة طاقة شمسية؟ اضغط على أحد الموقعين الصحيحين.",
    findHints: ["محطة بنبان في محافظة أسوان جنوب مصر.", "ابحث بجوار نهر النيل في أقصى الجنوب، أو قرب الجيزة."],
    use: {
      prompt: "مدرسة في أسوان تريد كهرباء نظيفة من مصدر متوفر هناك طوال العام. ماذا تختار؟",
      options: ["الفحم", "الطاقة الشمسية", "البترول"],
      answer: "الطاقة الشمسية",
      hints: ["مصدر يأتي من السماء كل يوم.", "مصر من أكثر الدول ملاءمة لإنتاجه."],
      explanation: "ممتاز! الشمس تسطع على أسوان طوال العام، فالطاقة الشمسية نظيفة ومتجددة.",
    },
  },
};

const MISSIONS = [
  {
    id: "minerals",
    title: "كنوز المعادن",
    subtitle: "اكتشف الموارد الأربعة",
    image: IMG + "lesson1_iron.jpg",
    resources: ["iron", "manganese", "phosphate", "gold"],
    intro: "هيا نكتشف الخامات المعدنية ومصادر الطاقة في مصر!",
  },
  {
    id: "energy",
    title: "مصادر الطاقة",
    subtitle: "اكتشف خمسة مصادر للطاقة",
    image: IMG + "lesson1_gabal_elzeit.jpg",
    resources: ["oil", "coal", "gas", "wind", "solar"],
    intro: "فتحت مهمة مصادر الطاقة! منها ما يُستخرج من الأرض، ومنها ما يُنتج الكهرباء من الشمس والرياح.",
  },
];

// Map candidates: every site of the mission's resources, same look, shuffled
// deterministically so the order does not hint the answer.
function missionSites(mission) {
  const ids = mission.resources.flatMap((r) => RESOURCES[r].sites);
  return ids
    .map((id) => ({ id, lat: SITES[id].lat, lng: SITES[id].lng }))
    .sort((a, b) => a.lng - b.lng);
}

const FINAL = {
  prompt: "اختر موردًا يمكن استخدامه لتوليد الكهرباء، ثم حدّد على الخريطة أحد مواقعه.",
  options: ["البترول", "الفحم", "الغاز الطبيعي", "طاقة الرياح", "الطاقة الشمسية", "الفوسفات"],
  // The book names these three for generating electricity.
  accepted: { "الغاز الطبيعي": "gas", "طاقة الرياح": "wind", "الطاقة الشمسية": "solar" },
  hints: [
    "فكّر: أي المحطات رأيتها في الرحلة تنتج الكهرباء؟ تذكّر بطاقات مصادر الطاقة.",
    "مصدران متجددان ينتجان الكهرباء من الطبيعة، ومصدر غير متجدد يُستخدم في البيوت وتوليد الكهرباء.",
    "الكتاب يذكر لتوليد الكهرباء: الغاز الطبيعي، والرياح، والشمس.",
  ],
};

export function expeditionPublic(lessonId) {
  if (lessonId !== "lesson-1") return null;
  const strip = (id) => {
    const r = RESOURCES[id];
    return {
      id,
      label: r.label,
      kind: r.kind,
      image: r.image,
      imageCredit: r.image ? CREDIT : null,
      say: r.say,
      watch: r.watch,
      note: r.note || null,
      // Shown in «شاهد واكتشف» only: the place being taught.
      teach: r.sites.map((s) => ({
        lat: SITES[s].lat,
        lng: SITES[s].lng,
        name: SITES[s].name,
        say: SITES[s].say,
        approximate: !!SITES[s].approximate,
      })),
      findPrompt: r.findPrompt,
      findCount: r.sites.length,
      use: { prompt: r.use.prompt, options: r.use.options },
    };
  };
  return {
    id: "kunuz-misr",
    title: "رحلة كنوز مصر",
    subtitle: "اكتشف المعادن ومصادر الطاقة",
    lessonTitle: "الخامات المعدنية ومصادر الطاقة في مصر",
    approxNote: APPROX,
    missions: MISSIONS.map((m) => ({
      ...m,
      resources: m.resources.map(strip),
      sites: missionSites(m),
    })),
    final: {
      prompt: FINAL.prompt,
      options: FINAL.options,
      sites: missionSites({ resources: [...MISSIONS[0].resources, ...MISSIONS[1].resources] }),
    },
    badge: "مستكشف كنوز مصر",
    source: "كتاب الطالب — الدراسات الاجتماعية، الصف الخامس، الفصل الأول، الوحدة الثالثة (ص 68–75). مسودة تحتاج مراجعة المعلم.",
  };
}

// step: "find" | "use" | "final"; attempt: 1-based count of tries so far.
export function checkExpedition(lessonId, body = {}) {
  if (lessonId !== "lesson-1") return null;
  const attempt = Math.max(1, Math.min(10, Number(body.attempt) || 1));
  const hint = (list) => list[Math.min(attempt, list.length) - 1];
  if (body.step === "final") {
    const resourceId = FINAL.accepted[body.choice];
    if (!resourceId)
      return { correct: false, part: "choice", hint: hint(FINAL.hints) };
    const site = SITES[body.siteId];
    if (!RESOURCES[resourceId].sites.includes(body.siteId))
      return {
        correct: false,
        part: "site",
        hint: `اختيار ${body.choice} صحيح. الآن اضغط على موقع ${body.choice} نفسه على الخريطة.`,
      };
    return {
      correct: true,
      site: { name: site.name },
      explanation: `أحسنت! ${body.choice} يُستخدم لتوليد الكهرباء، و${site.name} من مواقعه.`,
    };
  }
  const r = RESOURCES[body.resourceId];
  if (!r) return null;
  if (body.step === "find") {
    if (r.sites.includes(body.siteId))
      return {
        correct: true,
        site: { name: SITES[body.siteId].name, approximate: !!SITES[body.siteId].approximate },
        explanation: `وجدتها! هذه ${SITES[body.siteId].name}.`,
      };
    return { correct: false, hint: hint(r.findHints) };
  }
  if (body.step === "use") {
    if (body.answer === r.use.answer)
      return { correct: true, explanation: r.use.explanation };
    return { correct: false, hint: hint(r.use.hints) };
  }
  return null;
}

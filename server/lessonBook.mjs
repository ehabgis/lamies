// «كتابي التفاعلي»: the lesson explained screen by screen, in the textbook's
// order, before the child moves to the map. Text comes from the textbook
// summary in textbook-unit3.mjs (a draft that needs teacher review); photos are
// the teacher's site files already attached to the lesson's places. No
// questions or answers are sent here.
import { TEXTBOOK_UNIT3 } from "./textbook-unit3.mjs";
import { demoLesson } from "./demo.mjs";

// "أ، وب، وج." → ["أ", "ب", "ج"]
const items = (text) =>
  String(text || "")
    .replace(/[.。]\s*$/, "")
    .split(/،\s*و(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean);
// "دور المواطنين: …. دور الدولة: …." → { citizens: [...], state: [...] }
function roles(text) {
  const part = (label) => text.match(new RegExp(`${label}:\\s*([^]*?)(?=دور |$)`))?.[1] || "";
  return { citizens: items(part("دور المواطنين")), state: items(part("دور الدولة")) };
}
const concept = (book, term) => book.concepts.find((c) => c.term === term)?.definition;

const LESSONS = {
  // Lesson 1 is an open book (2026-11-19 design): each screen has a text page
  // (right) and a page to choose from (left). `spread` names the layout.
  "lesson-1": (book) => {
    const r = roles(book.realLife);
    return [
      { ...goals(book), spread: "goals", cards: ["iron", "manganese", "phosphate", "gold", "oil", "coal", "gas", "hydro", "solar", "wind"] },
      {
        id: "minerals",
        title: "الثروة المعدنية",
        icon: "minerals",
        spread: "minerals",
        lead: "تتنوع الخامات المعدنية في مصر، ولكل معدن استخدامات مختلفة.",
        pickTitle: "اختر معدنًا",
        cards: ["iron", "manganese", "phosphate", "gold"],
      },
      {
        id: "energy",
        title: "مصادر الطاقة وأهميتها",
        icon: "energy",
        spread: "energy",
        lead: "تتنوع مصادر الطاقة في مصر بين متجددة وغير متجددة.",
        uses: [
          { id: "old", title: "قديمًا", text: "الطهي والتدفئة وتسيير المراكب الشراعية." },
          { id: "now", title: "حديثًا", text: "توليد الكهرباء وتشغيل المصانع ووسائل النقل." },
        ],
        kinds: [
          { to: "renewable", title: "الطاقة المتجددة", tone: "green", chips: ["الشمس", "الرياح", "المياه"] },
          { to: "non-renewable", title: "الطاقة غير المتجددة", tone: "amber", chips: ["البترول", "الفحم", "الغاز الطبيعي"] },
        ],
      },
      {
        id: "non-renewable",
        title: "الطاقة غير المتجددة",
        icon: "oil",
        spread: "sources",
        tone: "amber",
        lead: concept(book, "الطاقة غير المتجددة"),
        pickTitle: "اختر مصدرًا",
        cards: ["oil", "coal", "gas"],
      },
      {
        id: "renewable",
        title: "الطاقة المتجددة",
        icon: "wind",
        spread: "sources",
        tone: "green",
        lead: concept(book, "الطاقة المتجددة"),
        pickTitle: "اختر مصدرًا",
        cards: ["hydro", "solar", "wind"],
      },
      {
        id: "roles",
        title: "دور الدولة والمواطنين",
        icon: "people",
        spread: "roles",
        lead: "نحافظ معًا على الثروة المعدنية ومصادر الطاقة.",
        columns: [
          { title: "دور الدولة", tone: "blue", icon: "state", list: r.state },
          { title: "دور المواطنين", tone: "green", icon: "people", list: r.citizens },
        ],
      },
    ];
  },
  "lesson-2": (book) => {
    const r = roles(book.realLife);
    const uses = (i) => items(book.keyPoints[i].split(":")[1]);
    return [
      goals(book),
      {
        id: "fresh",
        title: "موارد المياه العذبة",
        icon: "drop",
        lead: `${book.intro} ${concept(book, "المياه العذبة")}`,
        cards: ["nile-river", "nile-delta", "groundwater", "lake-nasser", "rain-harvesting-matrouh"],
        layout: "rows",
        boxes: [{ tone: "value", title: "هل تعلم؟", text: book.funFacts[1], icon: "bulb" }],
      },
      {
        id: "salt",
        title: "موارد المياه المالحة",
        icon: "waves",
        lead: concept(book, "المياه المالحة"),
        cards: ["mediterranean-sea", "red-sea", "northern-lakes"],
        layout: "rows",
      },
      {
        id: "uses",
        title: "استخدامات المياه",
        icon: "drop",
        columns: [
          { title: "المياه العذبة", tone: "blue", list: uses(3) },
          { title: "المياه المالحة", tone: "sand", list: uses(2) },
        ],
      },
      {
        id: "problems",
        title: "مشكلات المياه وجهود الدولة",
        icon: "warning",
        lead: `${concept(book, "ندرة المياه العذبة")} ${book.funFacts[3]}`,
        columns: [{ title: "مشكلات المياه", tone: "amber", list: uses(4) }],
        cards: ["desalination", "bahr-el-baqar"],
        layout: "wide",
      },
      {
        id: "roles",
        title: "دور الدولة والمواطنين",
        icon: "people",
        lead: "نحافظ معًا على كل نقطة ماء.",
        columns: [
          { title: "دور الدولة", tone: "blue", icon: "state", list: r.state },
          { title: "دور المواطنين", tone: "green", icon: "people", list: [...r.citizens, ...book.examples] },
        ],
      },
    ];
  },
  "lesson-3": (book) => [
    goals(book),
    {
      id: "vision",
      title: "رؤية مصر 2030",
      icon: "target",
      lead: book.intro,
      columns: [{ title: "أهداف رؤية مصر 2030", tone: "blue", list: items(book.keyPoints[0].split(":")[1]) }],
      boxes: [{ tone: "value", title: "الإنسان محور التنمية", text: book.realLife, icon: "people" }],
    },
    { id: "food", title: "مشروعات الزراعة والغذاء", icon: "plant", cards: ["new-delta", "toshka-kheir", "east-owainat", "birket-ghalioun"], layout: "rows" },
    { id: "cities", title: "المدن الجديدة والحياة الكريمة", icon: "city", cards: ["new-administrative-capital", "galala-city", "slum-development"], layout: "rows", boxes: [{ tone: "value", title: "مبادرات", text: book.examples[1], icon: "plant" }] },
    { id: "transport", title: "النقل وقناة السويس", icon: "train", cards: ["high-speed-rail", "rod-el-farag", "new-suez-canal"], layout: "rows", boxes: [{ tone: "concept", title: "هل تعلم؟", text: book.funFacts[1], icon: "bulb" }] },
    { id: "energy", title: "مشروعات الطاقة", icon: "energy", cards: ["benban-solar", "wind-farms"], layout: "wide", note: "مشروعات الطاقة النظيفة تحمي البيئة وتوفر الكهرباء للمصانع والبيوت." },
  ],
};

// «من استخداماته» for each mineral: one short use taken from its textbook
// description in demo.mjs (iron's line is the owner's design text).
const USES = {
  iron: "صناعة الصلب",
  manganese: "صناعة الصلب والدهانات",
  phosphate: "صناعة الأسمدة والمبيدات الحشرية",
  gold: "صناعة الحلي وعلاج بعض الأمراض",
};

function goals(book) {
  return {
    id: "goals",
    title: "أهداف الدرس",
    icon: "target",
    lead: book.intro,
    columns: [{ title: "في نهاية الدرس أستطيع أن:", tone: "blue", list: book.objectives.map((o) => o.replace(/\.$/, "")) }],
    boxes: [{ tone: "concept", title: "ماذا سنتعلم؟", text: book.summary, icon: "book" }],
  };
}

export function lessonBook(lessonId) {
  const book = TEXTBOOK_UNIT3[lessonId];
  const content = demoLesson(lessonId)?.content;
  if (!book || !content) return null;
  const byId = Object.fromEntries((content.resources || []).map((r) => [r.id, r]));
  // Lesson 1's second sentence says where the resource is; elsewhere, why it matters.
  const moreIcon = lessonId === "lesson-1" ? "pin" : "star";
  const sections = LESSONS[lessonId](book).map((s) => ({
    ...s,
    moreIcon,
    cards: (s.cards || [])
      .map((id) => byId[id])
      .filter(Boolean)
      .map((r) => {
        const media = (r.locations || []).map((l) => l.media).filter(Boolean);
        return {
          resource: { id: r.id, label: r.label, kind: r.kind, color: r.color },
          text: r.description,
          place: r.importance,
          photo: media.flatMap((m) => m.images || [])[0] || null,
          video: media.find((m) => m.video)?.video || null,
          mappable: Boolean(r.locations?.length),
          // For the open book: where it is found and one short use.
          regions: (r.locations || []).map((l) => l.name).filter(Boolean),
          use: USES[r.id] || null,
        };
      }),
  }));
  return { id: lessonId, title: book.title, pages: book.pages, sections };
}

import test from "node:test";
import assert from "node:assert/strict";
import { lessonBook } from "../../server/lessonBook.mjs";

test("the lesson book has its screens, cards and no answers", () => {
  const one = lessonBook("lesson-1");
  assert.deepEqual(one.sections.map((s) => s.title), [
    "أهداف الدرس",
    "الثروة المعدنية",
    "مصادر الطاقة وأهميتها",
    "الطاقة غير المتجددة",
    "الطاقة المتجددة",
    "دور الدولة والمواطنين",
  ]);
  assert.deepEqual(one.sections[1].cards.map((c) => c.resource.id), ["iron", "copper", "gold", "phosphate", "manganese"]);
  assert.deepEqual(one.sections[3].cards.map((c) => c.resource.id), ["coal", "oil", "gas"]);
  assert.deepEqual(one.sections[4].cards.map((c) => c.resource.id), ["hydro", "solar", "wind"]);
  const roles = one.sections[5].columns;
  assert(roles[0].list.length >= 3 && roles[1].list.length >= 3, "state and citizens roles are listed");
  for (const id of ["lesson-2", "lesson-3"]) {
    const b = lessonBook(id);
    assert(b.sections.length >= 5);
    assert(b.sections.every((s) => s.title && (s.lead || s.columns?.length || s.cards.length)));
    assert(b.sections.flatMap((s) => s.cards).length >= 5);
  }
  const text = JSON.stringify([lessonBook("lesson-1"), lessonBook("lesson-2"), lessonBook("lesson-3")]);
  assert(!/"answer"|"explanation"|"questions"/.test(text), "no questions or answers in the book");
  // Photos only from files that exist (none are invented).
  for (const c of one.sections.flatMap((s) => s.cards)) if (c.photo) assert.match(c.photo, /^\/lesson-media\/sites\//);
  assert.equal(lessonBook("lesson-9"), null);
});

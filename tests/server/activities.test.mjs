import test from "node:test";
import assert from "node:assert/strict";
import { demoLesson, demoAnswer } from "../../server/demo.mjs";

test("lesson 1 hides duplicate questions but keeps them gradable", () => {
  const qs = demoLesson("lesson-1").content.questions;
  const ids = qs.map((q) => q.id);
  for (const gone of ["iron-where", "doc-choice-2", "lesson-1-gas-zohr-1"]) assert(!ids.includes(gone));
  assert(ids.includes("l1-life-1") && ids.includes("l1-compare-1"));
  assert.equal(new Set(qs.map((q) => q.type)).size, 8);
  assert.equal(new Set(qs.map((q) => q.prompt)).size, qs.length);
  assert(qs.every((q) => !("hints" in q) && !("answer" in q) && !("duplicateOf" in q)));
  assert.equal(demoAnswer("iron-where", "الواحات البحرية", "lesson-1").correct, true);
});

test("hints get more specific with attempts and never name the answer", () => {
  const q = "l1-compare-2";
  const hints = [1, 2, 3].map((n) => demoAnswer(q, "الذهب", "lesson-1", n).hint);
  assert.equal(new Set(hints).size, 3);
  assert(hints.every((h) => !h.includes("«الحديد»")));
  assert(!hints[2].includes("الذهب»"), "the last hint rules out an option the child did not pick");
  for (const id of ["book-l1-choice-1", "book-l1-choice-3", "doc-choice-4"]) {
    const third = demoAnswer(id, "x", "lesson-1", 3).hint;
    assert.match(third, /ليست الإجابة الصحيحة/);
  }
  assert.equal(demoAnswer(q, "الحديد", "lesson-1", 1).hint, null);
});

test("lesson 1 sorts the six energy sources and matches four metals", () => {
  const qs = demoLesson("lesson-1").content.questions;
  const drags = qs.filter((q) => q.type === "drag");
  assert.deepEqual(drags.map((q) => q.id), ["book-l1-drag-energy"]);
  assert.equal(drags[0].options.length, 6);
  assert(drags[0].options.every((o) => drags[0].optionResources[o]));
  const matches = qs.filter((q) => q.type === "match");
  assert.deepEqual(matches.map((q) => q.id), ["book-l1-match-uses"]);
  assert.equal(matches[0].pairs.length, 4);
  assert.equal(demoAnswer("book-l1-match-uses", {}, "lesson-1").correct, false);
  const right = { iron: "السكك الحديدية والآلات الثقيلة", copper: "أسلاك الكهرباء", phosphate: "الأسمدة والمبيدات", gold: "الحلي" };
  assert.equal(demoAnswer("book-l1-match-uses", right, "lesson-1").correct, true);
  // The older versions still grade for saved progress.
  assert.equal(demoAnswer("draft-drag", { "الحديد": "خامات معدنية", "الفوسفات": "خامات معدنية", "الطاقة الشمسية": "مصادر طاقة", "البترول": "مصادر طاقة" }, "lesson-1").correct, true);
});

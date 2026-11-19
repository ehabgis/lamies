import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftFromNode, isBundledLesson, unapprovedSources, revealEditor, bundledReview } from "../../src/platform/adminDraft.js";

// As /api/admin/nodes returns them (server/db.mjs unpack).
const unit = {
  id: "egypt-treasures", parentId: "grade-5-term-1-2026-social", kind: "unit", title: "كنوز مصر",
  status: "draft", disabled: false, order: 0, version: 1, content: {},
};
const lesson2 = {
  id: "lesson-2", parentId: "egypt-treasures", kind: "lesson", title: "موارد المياه", status: "draft",
  disabled: false, order: 2, version: 1,
  content: { bundled: true, reviewRequired: true, questions: [], sources: [
    { id: "a", title: "A", text: "t", approved: false },
    { id: "b", title: "B", text: "t", approved: true },
  ] },
};

test("choosing the unit opens the unit itself: kind, parent and title unchanged", () => {
  const d = draftFromNode(unit);
  assert.equal(d.id, "egypt-treasures");
  assert.equal(d.kind, "unit");
  assert.equal(d.parentId, "grade-5-term-1-2026-social");
  assert.equal(d.title, "كنوز مصر");
  assert.deepEqual(d.content, {});
  assert.equal(d.enabled, true);
  assert.equal(isBundledLesson(d), false);
});

test("choosing a lesson keeps its own parent, content and disabled state", () => {
  const d = draftFromNode({ ...lesson2, disabled: true });
  assert.equal(d.kind, "lesson");
  assert.equal(d.parentId, "egypt-treasures");
  assert.equal(d.enabled, false);
  assert.equal(d.content, lesson2.content);
  assert.equal(d.content.sources.length, 2);
});

test("a node without content gets an empty object, not the new-lesson defaults", () => {
  const d = draftFromNode({ ...unit, content: null });
  assert.deepEqual(d.content, {});
  assert.equal(d.content.objectives, undefined);
});

test("bundled lessons are recognised; units and ordinary lessons are not", () => {
  assert.equal(isBundledLesson(draftFromNode(lesson2)), true);
  assert.equal(isBundledLesson({ kind: "unit", content: { bundled: true } }), false);
  assert.equal(isBundledLesson({ kind: "lesson", content: { bundled: "true" } }), false);
  assert.equal(isBundledLesson({ kind: "lesson", content: {} }), false);
  assert.equal(isBundledLesson(null), false);
});

test("sample sources stay unapproved: only approved === true counts, nothing is changed", () => {
  const d = draftFromNode(lesson2);
  const before = JSON.stringify(d.content.sources);
  assert.deepEqual(unapprovedSources(d).map((s) => s.id), ["a"]);
  assert.equal(JSON.stringify(d.content.sources), before);
  assert.deepEqual(unapprovedSources({ content: { sources: [{ id: "x", approved: "true" }] } }).map((s) => s.id), ["x"]);
  assert.deepEqual(unapprovedSources({ content: {} }), []);
});

function fakeEditor(top) {
  const calls = { scroll: [], focus: 0 };
  return {
    calls,
    getBoundingClientRect: () => ({ top }),
    scrollIntoView: (o) => calls.scroll.push(o),
    focus: () => calls.focus++,
  };
}
const win = (reduced) => ({ innerHeight: 800, matchMedia: () => ({ matches: reduced }) });

test("an editor below the tree (phone) is scrolled into view and focused", () => {
  const el = fakeEditor(1065);
  assert.equal(revealEditor(el, win(false)), true);
  assert.deepEqual(el.calls.scroll, [{ behavior: "smooth", block: "start" }]);
  assert.equal(el.calls.focus, 1);
});

test("with reduced motion the editor jumps into view without smooth scrolling", () => {
  const el = fakeEditor(1065);
  revealEditor(el, win(true));
  assert.deepEqual(el.calls.scroll, [{ behavior: "auto", block: "start" }]);
});

test("an editor already on screen (desktop) is focused without scrolling", () => {
  const el = fakeEditor(120);
  assert.equal(revealEditor(el, win(false)), false);
  assert.deepEqual(el.calls.scroll, []);
  assert.equal(el.calls.focus, 1);
});

// The page must not open on the blank "new lesson" form, which looked like the
// chosen unit opened as a lesson with empty fields.
test("AdminPage opens with no form until a node or «إضافة محتوى» is chosen", () => {
  const src = readFileSync(new URL("../../src/platform/AdminPage.jsx", import.meta.url), "utf8");
  assert.match(src, /\[editorOpen, setEditorOpen\] = useState\(false\)/);
  assert.match(src, /editorOpen \? \(\s*<form/);
  assert.match(src, /اختر عنصرًا من هيكل المنهج/);
  assert.match(src, /draftFromNode\(n\)/);
  assert.match(src, /isBundledLesson\(draft\)/);
});

test("bundled summary counts sources as the server does and never approves anything", () => {
  const draft = draftFromNode(lesson2);
  const before = JSON.stringify(draft);
  assert.deepEqual(bundledReview(draft), {
    published: false, reviewed: false, total: 2, approved: 1, usesBundledSources: false, canPublish: false,
  });
  assert.equal(JSON.stringify(draft), before);
  // approved needs approved === true, an id and a text.
  const odd = { content: { reviewRequired: false, sources: [
    { id: "a", text: "", approved: true }, { id: "", text: "t", approved: true }, { id: "c", text: "t", approved: "true" },
  ] } };
  assert.equal(bundledReview(odd).approved, 0);
  assert.equal(bundledReview(odd).canPublish, false);
  assert.equal(bundledReview({ status: "published", content: { reviewRequired: false, sources: [{ id: "a", text: "t", approved: true }] } }).canPublish, true);
  assert.equal(bundledReview({ content: { sources: [] } }).usesBundledSources, true);
  assert.equal(bundledReview(null).total, 0);
});

// Bundled lessons: the fields students never see are read-only (data kept),
// the ones that reach the student stay editable in their own section.
test("AdminPage: bundled lesson content fields are read-only; sources and review stay editable", () => {
  const src = readFileSync(new URL("../../src/platform/AdminPage.jsx", import.meta.url), "utf8");
  assert.match(src, /<fieldset disabled className="cms-readonly"/);
  assert.match(src, /<ReadOnlyWhen bundled=\{bundledLesson\}>\s*<section>\s*<h3>بناء الدرس<\/h3>/);
  // The read-only wrapper closes after the questions section, so it covers
  // «بناء الدرس», «الموارد ومواقعها» and «الأسئلة والأنشطة».
  const wrapped = src.slice(src.indexOf("<ReadOnlyWhen bundled={bundledLesson}>"), src.indexOf("</ReadOnlyWhen>"));
  for (const h of ["بناء الدرس", "الموارد ومواقعها", "الأسئلة والأنشطة", "الحقائق التعليمية", "المراجع · مرجع"])
    assert(wrapped.includes(h), h);
  // Sources and the review checkbox are rendered once, outside the wrapper for bundled lessons.
  assert.equal(src.split("const renderSources = () =>").length, 2);
  assert(wrapped.includes("{!bundledLesson && renderSources()}"));
  const affects = src.slice(src.indexOf('<section className="cms-affects">'), src.indexOf("<ReadOnlyWhen bundled"));
  assert(affects.includes("renderSources()") && affects.includes("BundledSummary"));
  const sources = src.slice(src.indexOf("const renderSources = () =>"), src.indexOf("async function save("));
  assert(sources.includes('edit("reviewRequired"'), "review flag is with the sources");
  assert(sources.includes("approved: e.target.checked"), "approval is a deliberate checkbox");
  assert(!/approved:\s*true/.test(sources), "nothing approves a source automatically");
});

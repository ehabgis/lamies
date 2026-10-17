import test from "node:test";
import assert from "node:assert/strict";
import { expeditionPublic, checkExpedition } from "../../server/expedition.mjs";

test("expedition public view hides answers and site ownership", () => {
  const e = expeditionPublic("lesson-1");
  const text = JSON.stringify(e);
  for (const leak of ['"answer"', '"accepted"', '"hints"', '"findHints"', '"explanation"'])
    assert(!text.includes(leak), `public view must not include ${leak}`);
  assert.equal(e.missions.length, 2);
  assert.deepEqual(e.missions[0].resources.map((r) => r.id), ["iron", "manganese", "phosphate", "gold"]);
  assert.deepEqual(e.missions[1].resources.map((r) => r.id), ["oil", "coal", "gas", "wind", "solar"]);
  for (const m of e.missions)
    for (const s of m.sites) assert.deepEqual(Object.keys(s).sort(), ["id", "lat", "lng"]);
  assert.equal(expeditionPublic("lesson-2"), null);
});

test("expedition grading: map, use, graded hints and final challenge", () => {
  assert.equal(checkExpedition("lesson-1", { step: "find", resourceId: "iron", siteId: "s1" }).correct, true);
  const h1 = checkExpedition("lesson-1", { step: "find", resourceId: "iron", siteId: "s3", attempt: 1 });
  const h2 = checkExpedition("lesson-1", { step: "find", resourceId: "iron", siteId: "s3", attempt: 2 });
  assert.equal(h1.correct, false);
  assert.notEqual(h1.hint, h2.hint, "second wrong try gets a more specific hint");
  assert(!h1.hint.includes("الواحات البحرية"), "first hint must not name the answer");
  assert.equal(checkExpedition("lesson-1", { step: "find", resourceId: "wind", siteId: "s9" }).correct, true);
  assert.equal(checkExpedition("lesson-1", { step: "use", resourceId: "iron", answer: "الحديد" }).correct, true);
  assert.equal(checkExpedition("lesson-1", { step: "use", resourceId: "iron", answer: "الذهب" }).correct, false);
  // Several correct resources are accepted, each with its own site.
  assert.equal(checkExpedition("lesson-1", { step: "final", choice: "الطاقة الشمسية", siteId: "s10" }).correct, true);
  assert.equal(checkExpedition("lesson-1", { step: "final", choice: "الغاز الطبيعي", siteId: "s7" }).correct, true);
  assert.equal(checkExpedition("lesson-1", { step: "final", choice: "طاقة الرياح", siteId: "s8" }).correct, true);
  const wrongSite = checkExpedition("lesson-1", { step: "final", choice: "الطاقة الشمسية", siteId: "s7" });
  assert.equal(wrongSite.correct, false);
  assert.equal(wrongSite.part, "site");
  assert.equal(checkExpedition("lesson-1", { step: "final", choice: "الفوسفات", siteId: "s3" }).part, "choice");
});

test("final challenge first hint does not list the answers", () => {
  const r = checkExpedition("lesson-1", { step: "final", choice: "الفوسفات", siteId: "s3", attempt: 1 });
  for (const name of ["الغاز", "الرياح", "الشمس"]) assert(!r.hint.includes(name));
});

import test from "node:test";
import assert from "node:assert/strict";

// achievements.js reads the device's saved progress; give it a fake storage.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  clear: () => store.clear(),
};
const { readAchievements } = await import("../../src/platform/achievements.js");
const { jpegPdf } = await import("../../src/platform/certificatePdf.js").catch(() => ({}));
const put = (k, v) => store.set(k, JSON.stringify(v));

test("achievements start empty and point to the first journey", () => {
  store.clear();
  const a = readAchievements();
  assert.equal(a.stars, 0);
  assert.equal(a.started, false);
  assert.equal(a.next.href, "/demo/lesson-1/expedition");
  assert(a.badges.every((b) => !b.earned));
});

test("each journey earns its own certificate as soon as it is finished", () => {
  store.clear();
  put("lamis.expedition.lesson-1.v1", { view: "done", done: { iron: 1, manganese: 1, phosphate: 1, gold: 1 }, finalDone: false });
  put("lamis.water.lesson-2.v1", { view: "mission", done: { farm: true } });
  let a = readAchievements();
  assert.equal(a.badges.find((b) => b.id === "minerals").earned, true);
  assert.equal(a.badges.find((b) => b.id === "energy").earned, false);
  assert.deepEqual(a.journeys.map((j) => j.status), ["active", "active", "new"]);
  assert.equal(a.next.id, "lesson-1");

  put("lamis.expedition.lesson-1.v1", { view: "done", done: { iron: 1, manganese: 1, phosphate: 1, gold: 1, oil: 1, coal: 1, gas: 1, wind: 1, solar: 1 }, finalDone: true });
  a = readAchievements();
  assert.deepEqual(a.journeys.map((j) => j.done), [true, false, false], "only «كنوز مصر» is finished; its certificate is ready alone");
  put("lamis.water.lesson-2.v1", { done: { farm: true, oasis: true, coast: true } });
  put("lamis.projects.lesson-3.v1", { done: { "new-delta": true, "birket-ghalioun": true, "benban-solar": true } });
  a = readAchievements();
  assert.equal(a.journeysDone, 3);
  assert.equal(a.next.href, "/demo/lesson-1/build-map");
  for (const id of ["lesson-1", "lesson-2", "lesson-3"]) put(`lamis.buildmap.${id}.v1`, { finished: true, placed: { x: { state: "locked" } } });
  a = readAchievements();
  assert.equal(a.stars, 10 + 3 + 3 + 3);
});

test("the certificate PDF is one A4 landscape page", { skip: !jpegPdf }, () => {
  const pdf = new TextDecoder("latin1").decode(jpegPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 1200, 848));
  assert(pdf.startsWith("%PDF-1.4"));
  assert.match(pdf, /\/MediaBox \[0 0 842 595\]/);
  assert.match(pdf, /\/Count 1/);
  assert(pdf.trimEnd().endsWith("%%EOF"));
});

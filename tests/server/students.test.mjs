import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
const g = await import("../../src/platform/guestProfile.js");
const { readAchievements } = await import("../../src/platform/achievements.js");

test("each student on a shared device has their own progress", () => {
  // Played before profiles existed: goes to the first student.
  store.set("lamis.water.lesson-2.v1", JSON.stringify({ done: { farm: true, oasis: true, coast: true } }));
  const ahmed = g.chooseStudent("أحمد محمد");
  assert.equal(store.has("lamis.water.lesson-2.v1"), false);
  assert.equal(readAchievements().journeysDone, 1);

  const sara = g.chooseStudent("سارة");
  assert.notEqual(sara.id, ahmed.id);
  assert.equal(readAchievements().stars, 0, "Sara starts fresh");
  store.set(g.studentKey("lamis.projects.lesson-3.v1"), JSON.stringify({ done: { a: 1 } }));

  // The same name with another spelling is the same child.
  assert.equal(g.chooseStudent("  احمد   محمد ").id, ahmed.id);
  const a = readAchievements();
  assert.equal(a.journeysDone, 1);
  assert.equal(a.journeys[2].stars, 0, "Sara's lesson-3 star is not Ahmed's");
  assert.equal(g.currentStudent().name, "أحمد محمد");

  assert.equal(g.chooseAccount({ id: 7, name: "منى" }).id, "u7");
  assert.equal(readAchievements().stars, 0);
});

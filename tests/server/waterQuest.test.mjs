import test from "node:test";
import assert from "node:assert/strict";
import { waterQuestPublic, checkWaterQuest } from "../../server/waterQuest.mjs";

test("water journey public view hides answers, feedback and hints", () => {
  const pub = waterQuestPublic("lesson-2");
  assert.equal(waterQuestPublic("lesson-1"), null);
  const text = JSON.stringify(pub);
  for (const key of ['"answer"', '"accepted"', '"hints"', '"wrong"', '"success"', '"focus"', '"explanation"'])
    assert(!text.includes(key), `public view leaks ${key}`);
  assert.deepEqual(pub.missions.map((m) => m.id), ["farm", "oasis", "coast"]);
  assert(!text.includes("مياه النيل عذبة وتُستخدم"), "success text stays on the server");
});

test("farm mission: sea is explained, hints grow, the Nile is accepted", () => {
  const sea = checkWaterQuest("lesson-2", { missionId: "farm", step: "find", target: "red-sea", attempt: 1 });
  assert.equal(sea.correct, false);
  assert.match(sea.hint, /مالحة/);
  assert.equal(sea.focus, undefined, "no visual help on the first try");
  const h1 = checkWaterQuest("lesson-2", { missionId: "farm", step: "find", target: "__hint__", attempt: 1 });
  const h2 = checkWaterQuest("lesson-2", { missionId: "farm", step: "find", target: "__hint__", attempt: 2 });
  assert.notEqual(h1.hint, h2.hint);
  assert.equal(h1.focus, undefined);
  assert(h2.focus, "second hint points to the area");
  assert(!/نهر النيل|النيل/.test(h1.hint), "first hint does not name the river");
  const nile = checkWaterQuest("lesson-2", { missionId: "farm", step: "find", target: "nile", attempt: 2 });
  assert.equal(nile.correct, true);
  assert.equal(nile.found.draw, "nile");
  const salt = checkWaterQuest("lesson-2", { missionId: "farm", step: "use", answer: "مياه مالحة", attempt: 1 });
  assert.equal(salt.correct, false);
  const freshWater = checkWaterQuest("lesson-2", { missionId: "farm", step: "use", answer: "مياه عذبة", attempt: 2 });
  assert.equal(freshWater.correct, true);
  assert(freshWater.done);
});

test("oasis and coast missions accept their own sources only", () => {
  assert.equal(checkWaterQuest("lesson-2", { missionId: "oasis", step: "find", target: "nile" }).correct, false);
  const gw = checkWaterQuest("lesson-2", { missionId: "oasis", step: "find", target: "groundwater" });
  assert.equal(gw.correct, true);
  assert.equal(gw.found.points.length, 5);
  assert.equal(checkWaterQuest("lesson-2", { missionId: "coast", step: "find", target: "med-sea" }).correct, false);
  assert.equal(checkWaterQuest("lesson-2", { missionId: "coast", step: "find", target: "red-sea" }).correct, true);
  assert.equal(checkWaterQuest("lesson-2", { missionId: "coast", step: "find", target: "volcano" }), null);
  assert.equal(checkWaterQuest("lesson-2", { missionId: "coast", step: "use", answer: "شيء آخر" }), null);
});

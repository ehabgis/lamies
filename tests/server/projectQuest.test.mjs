import test from "node:test";
import assert from "node:assert/strict";
import { projectQuestPublic, checkProjectQuest } from "../../server/projectQuest.mjs";

test("lesson 3 journey hides answers and grades on the server", () => {
  const pub = projectQuestPublic("lesson-3");
  assert.equal(pub.missions.length, 3);
  const text = JSON.stringify(pub);
  for (const secret of ["answer", "hints", "wrong", "focus", "explanation"]) assert(!text.includes(`"${secret}"`), secret);
  assert.equal(projectQuestPublic("lesson-1"), null);

  const wrong = checkProjectQuest("lesson-3", { missionId: "new-delta", step: "find", target: "benban-solar", attempt: 1 });
  assert.equal(wrong.correct, false);
  assert.match(wrong.hint, /مشروع آخر/);
  assert(!("focus" in wrong), "a wrong press does not light the area");
  const hint = checkProjectQuest("lesson-3", { missionId: "new-delta", step: "find", target: "__hint__", attempt: 1 });
  assert(hint.focus && !hint.hint.includes("الدلتا الجديدة"));
  const found = checkProjectQuest("lesson-3", { missionId: "new-delta", step: "find", target: "new-delta", attempt: 2 });
  assert.equal(found.correct, true);
  assert.equal(found.found.label, "الدلتا الجديدة");

  const bad = checkProjectQuest("lesson-3", { missionId: "benban-solar", step: "use", answer: "لأنها كثيرة الأمطار" });
  assert.equal(bad.correct, false);
  const good = checkProjectQuest("lesson-3", { missionId: "benban-solar", step: "use", answer: "لأن الشمس تسطع فيها معظم العام" });
  assert.equal(good.correct, true);
  assert.equal(checkProjectQuest("lesson-3", { missionId: "benban-solar", step: "use", answer: "إجابة غير موجودة" }), null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildMapPublic, checkBuildMap } from "../../server/buildMap.mjs";

test("build-map public view has no places, zones, hints or answers", () => {
  for (const id of ["lesson-1", "lesson-2", "lesson-3"]) {
    const pub = buildMapPublic(id);
    const text = JSON.stringify(pub);
    for (const key of ['"zone"', '"points"', '"lat"', '"hints"', '"answer"', '"radiusKm"']) assert(!text.includes(key), `${id} leaks ${key}`);
    assert(pub.rounds.every((r) => r.items.length === 3), `${id}: three items per round`);
    assert(!text.includes("الواحات البحرية"), "place names stay hidden until a correct check");
  }
  assert.equal(buildMapPublic("lesson-9"), null);
  assert.deepEqual(buildMapPublic("lesson-2").rounds[0].items.map((i) => i.id)[0], "lake-nasser", "the guide's first item comes first");
});

test("iron near the Red Sea gets the lesson's hints in order, then a direction", () => {
  const wrong = (attempt) => checkBuildMap("lesson-1", { itemId: "iron", lat: 26.2, lng: 33.8, attempt });
  assert.equal(wrong(1).correct, false);
  assert.match(wrong(1).hint, /موقع الواحات البحرية بالنسبة لنهر النيل/);
  assert.match(wrong(2).hint, /غرب نهر النيل/);
  assert.match(wrong(3).hint, /الغرب/);
  assert(!("name" in wrong(1)), "no place name before a correct answer");
  const right = checkBuildMap("lesson-1", { itemId: "iron", lat: 28.2, lng: 28.6, attempt: 4 });
  assert.equal(right.correct, true);
  assert.equal(right.name, "الواحات البحرية");
  assert.equal(right.why.prompt, "كيف عرفت المكان؟");
});

test("the Nile is accepted along its course; groundwater at any oasis", () => {
  assert.equal(checkBuildMap("lesson-2", { itemId: "nile", lat: 27.18, lng: 31.19 }).correct, true);
  assert.equal(checkBuildMap("lesson-2", { itemId: "nile", lat: 30.05, lng: 31.23 }).correct, true);
  assert.equal(checkBuildMap("lesson-2", { itemId: "nile", lat: 27.2, lng: 29.5 }).correct, false);
  assert.equal(checkBuildMap("lesson-2", { itemId: "groundwater", lat: 29.2, lng: 25.6 }).name, "واحة سيوة");
  assert.equal(checkBuildMap("lesson-2", { itemId: "groundwater", lat: 25.5, lng: 30.5 }).name, "واحة الخارجة");
  assert.match(checkBuildMap("lesson-2", { itemId: "lake-nasser", hint: true, attempt: 1 }).hint, /قرب أسوان|بالقرب من أسوان/);
  assert.match(checkBuildMap("lesson-2", { reveal: "final", roundIndex: 0 }).answer, /الآبار/);
});

test("Benban asks why after a correct placement; bad input is refused", () => {
  const r = checkBuildMap("lesson-3", { itemId: "benban", lat: 24.5, lng: 32.7 });
  assert.equal(r.correct, true);
  assert.match(r.why.prompt, /لماذا اختيرت أسوان/);
  assert.equal(checkBuildMap("lesson-3", { itemId: "benban", lat: "x", lng: 3 }), null);
  assert.equal(checkBuildMap("lesson-3", { itemId: "nothing", lat: 25, lng: 30 }), null);
});

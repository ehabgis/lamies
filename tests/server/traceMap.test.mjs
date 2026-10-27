import test from "node:test";
import assert from "node:assert/strict";
import { traceMapPublic, checkTraceMap } from "../../server/traceMap.mjs";

test("trace activity compares drawings with the Nile and names the seas", () => {
  const pub = traceMapPublic("lesson-2");
  assert.equal(pub.stages.length, 3);
  assert(!JSON.stringify(pub).includes("toleranceKm"));
  assert(!("answer" in pub.question));
  assert.equal(traceMapPublic("lesson-1"), null);
  const { stem, rosetta, damietta } = pub.model;
  assert(stem[0][0] < 22.2 && stem.at(-1)[0] > 30, "south to north");

  const good = checkTraceMap("lesson-2", { step: "draw", stage: "trace", strokes: [stem, rosetta, damietta] });
  assert.equal(good.passed, true);
  const half = checkTraceMap("lesson-2", { step: "draw", stage: "trace", strokes: [stem.slice(0, 20)] });
  assert.equal(half.passed, false);
  assert.match(half.feedback, /أكمل/);
  const off = checkTraceMap("lesson-2", { step: "draw", stage: "alone", strokes: [[[25, 27], [28, 27]]] });
  assert.equal(off.passed, false);
  assert.equal(checkTraceMap("lesson-2", { step: "draw", stage: "nope", strokes: [] }), null);

  assert.equal(checkTraceMap("lesson-2", { step: "label", sea: "med", lat: 31.8, lng: 29 }).correct, true);
  assert.match(checkTraceMap("lesson-2", { step: "label", sea: "med", lat: 26.5, lng: 34.9 }).feedback, /البحر الأحمر/);
  assert.equal(checkTraceMap("lesson-2", { step: "question", answer: "البحر الأحمر" }).correct, false);
  assert.equal(checkTraceMap("lesson-2", { step: "question", answer: "البحر المتوسط" }).correct, true);
});

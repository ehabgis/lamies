import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/index.mjs";
import { blankMatches } from "../../server/answerCheck.mjs";
import { BLANK_SUPPORT } from "../../server/blankSupport.mjs";
import { fullContent } from "../../server/demo.mjs";

async function start(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "lamis-help-"));
  const app = createApp({ dbPath: join(dir, "t.sqlite"), uploadDir: join(dir, "up"), ...options });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, body, tab = "tab-aaaaaaaa") => {
    const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "x-help-session": tab }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  return { call, close: () => { server.closeAllConnections(); server.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const L1 = "/api/demo/lessons/lesson-1";

test("blank answers accept equivalent spellings and ignore small differences", () => {
  const accepted = ["النحاس", "نحاس"];
  for (const a of ["نحاس", "النحاس", "  النُّحاس  ", "النحاس."]) assert(blankMatches(accepted, a), a);
  assert(!blankMatches(accepted, "الحديد"));
  assert(!blankMatches(accepted, "   "));
  assert(blankMatches(["الكهرومائية"], "الكهرومائيه"));
});

test("every blank question in the three lessons has prepared support", () => {
  for (const id of ["lesson-1", "lesson-2", "lesson-3"]) {
    const ids = fullContent(id).questions.filter((q) => q.type === "blank").map((q) => q.id);
    assert(ids.length, id);
    for (const qid of ids) {
      const s = BLANK_SUPPORT[qid];
      assert(s, qid);
      assert(s.concept && s.review && s.explain && s.why && s.apply?.prompt && s.apply.answer.length, qid);
      // Levels one and two never contain the answer.
      const q = fullContent(id).questions.find((x) => x.id === qid);
      for (const a of [].concat(q.answer)) for (const t of [s.review, s.explain]) assert(!t.includes(a.replace(/^ال/, "")), `${qid} reveals «${a}»`);
    }
  }
});

test("blank: review, then explanation, then the answer with an application question", async () => {
  const { call, close } = await start({ aiKey: "" });
  try {
    const q = "book-l1-blank-1";
    // Correct at once: no help.
    const ok = await call(`${L1}/answers`, { questionId: q, answer: "نحاس" }, "tab-correct1");
    assert.equal(ok.data.correct, true);
    assert.equal(ok.data.due, null);

    // Empty is not a try.
    const empty = await call(`${L1}/answers`, { questionId: q, answer: "  " });
    assert.equal(empty.data.empty, true);
    assert.equal(empty.data.wrong, 0);

    const w1 = await call(`${L1}/answers`, { questionId: q, answer: "الحديد" });
    assert.equal(w1.data.correct, false);
    assert.equal(w1.data.wrong, 1);
    assert.equal(w1.data.due, "review");
    // The same answer again does not count and opens nothing.
    const again = await call(`${L1}/answers`, { questionId: q, answer: "حديد" });
    assert.equal(again.data.counted, false);
    assert.equal(again.data.wrong, 1);
    assert.equal(again.data.due, null);

    const review = await call(`${L1}/help`, { questionId: q, level: "review" });
    assert.equal(review.data.source, "prepared");
    assert.match(review.data.text, /يوصل التيار الكهربائي/);
    assert(!review.data.text.includes("نحاس"));

    // The answer is refused before the third distinct wrong answer.
    const early = await call(`${L1}/help`, { questionId: q, level: "solution" });
    assert.equal(early.status, 403);

    const w2 = await call(`${L1}/answers`, { questionId: q, answer: "الذهب" });
    assert.equal(w2.data.due, "explain");
    const explain = await call(`${L1}/help`, { questionId: q, level: "explain" });
    assert(explain.data.compare?.length, "a comparison comes with the explanation");
    assert(!explain.data.text.includes("نحاس"));

    const w3 = await call(`${L1}/answers`, { questionId: q, answer: "المنجنيز" });
    assert.equal(w3.data.due, "solution");
    const solution = await call(`${L1}/help`, { questionId: q, level: "solution" });
    assert.equal(solution.data.answer, "النحاس");
    assert(solution.data.apply.prompt);
    assert.equal(solution.data.apply.answer, undefined, "the application answer stays on the server");

    // After the answer is shown, the original is completed, not credited.
    const after = await call(`${L1}/answers`, { questionId: q, answer: "النحاس" });
    assert.equal(after.data.correct, true);
    assert.equal(after.data.credit, false);
    assert.equal(after.data.support.outcome, "after-solution");

    const applyWrong = await call(`${L1}/apply`, { questionId: q, answer: "أسوان" });
    assert.equal(applyWrong.data.correct, false);
    const apply = await call(`${L1}/apply`, { questionId: q, answer: "البحر الاحمر" });
    assert.equal(apply.data.correct, true);
  } finally {
    close();
  }
});

test("questions: note first, explanation once at the second wrong (first for true/false), counters per question", async () => {
  const { call, close } = await start({ aiKey: "" });
  try {
    const qs = fullContent("lesson-1").questions;
    const choice = qs.find((q) => q.type === "choice" && !q.kind && q.options.length > 2);
    const wrongs = choice.options.filter((o) => o !== choice.answer);
    const a = await call(`${L1}/answers`, { questionId: choice.id, answer: wrongs[0] }, "tab-choice01");
    assert.equal(a.data.due, null, "first wrong: a short note only");
    const b = await call(`${L1}/answers`, { questionId: choice.id, answer: wrongs[1] }, "tab-choice01");
    assert.equal(b.data.due, "explain");
    const help = await call(`${L1}/help`, { questionId: choice.id, level: "explain", answer: wrongs[1] }, "tab-choice01");
    assert(help.data.text);
    assert(!help.data.text.includes(choice.answer), "the prepared explanation does not give the answer");
    // No second automatic opening.
    const c = await call(`${L1}/answers`, { questionId: choice.id, answer: wrongs[2] || wrongs[0] }, "tab-choice01");
    assert.equal(c.data.due, null);

    const tf = qs.find((q) => q.type === "boolean");
    const t = await call(`${L1}/answers`, { questionId: tf.id, answer: !tf.answer }, "tab-choice01");
    assert.equal(t.data.due, "explain", "true/false explains after the first wrong");
    assert.equal(t.data.wrong, 1, "another question starts its own count");

    // «ساعدني» before any wrong answer works and is not a try.
    const other = qs.find((q) => q.type === "choice" && !q.kind && q.id !== choice.id);
    const asked = await call(`${L1}/help`, { questionId: other.id, trigger: "asked" }, "tab-choice01");
    assert.equal(asked.status, 200);
    const first = await call(`${L1}/answers`, { questionId: other.id, answer: other.options.find((o) => o !== other.answer) }, "tab-choice01");
    assert.equal(first.data.wrong, 1);
  } finally {
    close();
  }
});

test("the model writes the text only with consent; a failure falls back to the prepared text", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ message: "فكّر في المعدن الذي يوصل الكهرباء جيدًا، مثل الأسلاك في بيتك." }) }] }] }) };
  };
  const { call, close } = await start({ aiKey: "test-key", fetchImpl });
  try {
    const q = "book-l1-blank-1";
    await call(`${L1}/answers`, { questionId: q, answer: "الحديد" }, "tab-model01");
    const noConsent = await call(`${L1}/help`, { questionId: q, level: "review" }, "tab-model01");
    assert.equal(noConsent.data.source, "prepared");
    assert.equal(noConsent.data.canAsk, true);
    assert.equal(calls, 0);
    const withConsent = await call(`${L1}/help`, { questionId: q, level: "more", consent: true, message: "مش فاهم" }, "tab-model01");
    assert.equal(withConsent.data.source, "ai");
    assert.equal(calls, 1);
  } finally {
    close();
  }
  // A model that gives the answer away, or fails, is replaced by the prepared text.
  const leaky = async () => ({ ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ message: "الإجابة هي النحاس." }) }] }] }) });
  const s2 = await start({ aiKey: "k", fetchImpl: leaky });
  try {
    const r = await s2.call(`${L1}/help`, { questionId: "book-l1-blank-1", level: "review", consent: true }, "tab-model02");
    assert.equal(r.data.source, "prepared");
    assert(!r.data.text.includes("النحاس"));
  } finally {
    s2.close();
  }
  const down = async () => { throw Error("offline"); };
  const s3 = await start({ aiKey: "k", fetchImpl: down });
  try {
    const r = await s3.call(`${L1}/help`, { questionId: "book-l1-blank-1", level: "review", consent: true }, "tab-model03");
    assert.equal(r.status, 200);
    assert.equal(r.data.source, "prepared");
    assert(r.data.note);
  } finally {
    s3.close();
  }
});

test("the prepared explanation sets aside a choice the child has not tried", async () => {
  const { call, close } = await start({ aiKey: "" });
  try {
    const q = fullContent("lesson-1").questions.find((x) => x.type === "choice" && !x.kind && x.options.length >= 4);
    const wrongs = q.options.filter((o) => o !== q.answer);
    await call(`${L1}/answers`, { questionId: q.id, answer: wrongs[0] }, "tab-aside001");
    await call(`${L1}/answers`, { questionId: q.id, answer: wrongs[1] }, "tab-aside001");
    const r = await call(`${L1}/help`, { questionId: q.id, level: "explain" }, "tab-aside001");
    assert(!r.data.text.includes(`«${wrongs[0]}»`) && !r.data.text.includes(`«${wrongs[1]}»`), r.data.text);
  } finally {
    close();
  }
});

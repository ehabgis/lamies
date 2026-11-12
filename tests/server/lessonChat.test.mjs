import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/index.mjs";

async function start(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "lamis-chat-"));
  const app = createApp({ dbPath: join(dir, "t.sqlite"), uploadDir: join(dir, "up"), aiKey: "", aiProvider: "openai", cloudflareAccountId: "", cloudflareToken: "", ...options });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const ask = async (lesson, body) => {
    const r = await fetch(`${base}/api/demo/lessons/${lesson}/ask`, { method: "POST", headers: { "Content-Type": "application/json", "x-help-session": "tab-chat0001" }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  return { ask, close: () => { server.closeAllConnections(); server.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test("a lesson question needs no resource; the answer uses the lesson text of both resources", async () => {
  const { ask, close } = await start();
  try {
    const r = await ask("lesson-2", { message: "إيه الفرق بين مياه النيل والمياه الجوفية؟" });
    assert.equal(r.status, 200);
    assert.equal(r.data.source, "prepared");
    assert.match(r.data.answer, /نهر النيل/);
    assert.match(r.data.answer, /المياه الجوفية/);
    const off = await ask("lesson-2", { message: "مين كسب الماتش امبارح؟" });
    assert.match(off.data.answer, /توضّح سؤالك|درس/);
    const empty = await ask("lesson-2", { message: "  " });
    assert.equal(empty.status, 400);
  } finally {
    close();
  }
});

test("with consent, Cloudflare Workers AI gets the question, the conversation and the approved parts", async () => {
  let sent;
  const fetchImpl = async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ success: true, result: { response: "مياه النيل تجري على سطح الأرض، والمياه الجوفية توجد في باطن الأرض." } }) };
  };
  const { ask, close } = await start({ aiProvider: "cloudflare", cloudflareAccountId: "acc", cloudflareToken: "tok", aiStudentEnabled: true, fetchImpl });
  try {
    const first = await ask("lesson-2", { message: "إيه الفرق بين مياه النيل والمياه الجوفية؟", consent: true });
    assert.equal(first.data.source, "ai");
    assert.match(sent.url, /\/accounts\/acc\/ai\/run\//);
    const follow = await ask("lesson-2", {
      message: "طيب بنوصل لها إزاي؟",
      consent: true,
      history: [
        { role: "user", text: "إيه الفرق بين مياه النيل والمياه الجوفية؟" },
        { role: "assistant", text: first.data.answer },
      ],
    });
    assert.equal(follow.data.source, "ai");
    const msgs = sent.body.messages;
    assert.equal(msgs[0].role, "system");
    assert.match(msgs[0].content, /غير متاحة في الدرس/);
    assert.deepEqual(msgs.slice(1, 3).map((m) => m.role), ["user", "assistant"], "the conversation so far is sent");
    const last = JSON.parse(msgs.at(-1).content);
    assert.equal(last.question, "طيب بنوصل لها إزاي؟");
    // The follow-up keeps the groundwater lesson text in view.
    assert(last.approvedLesson.resources.some((r) => r.name === "المياه الجوفية"));
  } finally {
    close();
  }
  // Without consent, or when the service fails: the lesson's own text.
  const down = async () => { throw Error("offline"); };
  const s2 = await start({ aiProvider: "cloudflare", cloudflareAccountId: "a", cloudflareToken: "t", aiStudentEnabled: true, fetchImpl: down });
  try {
    const noConsent = await s2.ask("lesson-2", { message: "ما المياه الجوفية؟" });
    assert.equal(noConsent.data.source, "prepared");
    assert.equal(noConsent.data.canAsk, true);
    const failed = await s2.ask("lesson-2", { message: "ما المياه الجوفية؟", consent: true });
    assert.equal(failed.data.source, "prepared");
    assert(failed.data.note);
  } finally {
    s2.close();
  }
});

test("without the model, a follow-up is answered about the last thing named, and repeats say so", async () => {
  const { ask, close } = await start();
  try {
    const first = await ask("lesson-2", { message: "إيه الفرق بين مياه النيل والمياه الجوفية؟" });
    const follow = await ask("lesson-2", {
      message: "طيب بنوصل لها إزاي؟",
      history: [
        { role: "user", text: "إيه الفرق بين مياه النيل والمياه الجوفية؟" },
        { role: "assistant", text: first.data.answer },
      ],
    });
    // «لها» is the groundwater named last in the question before it.
    assert.match(follow.data.answer, /المياه الجوفية/);
    assert.match(follow.data.answer, /الآبار/);
    assert.doesNotMatch(follow.data.answer, /نهر النيل/);
    // Asked again with that answer already given: say the detail is not in the lesson.
    const again = await ask("lesson-2", {
      message: "طيب بنوصل لها إزاي؟",
      history: [
        { role: "user", text: "إيه الفرق بين مياه النيل والمياه الجوفية؟" },
        { role: "assistant", text: follow.data.answer },
      ],
    });
    assert.match(again.data.answer, /مش لاقي التفصيلة دي في نص الدرس/);
  } finally {
    close();
  }
});

test("with AI_STUDENT_ENABLED off, visitors get the lesson text and no model call", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: true, json: async () => ({ success: true, result: { response: "رد" } }) }; };
  const { ask, close } = await start({ aiProvider: "cloudflare", cloudflareAccountId: "a", cloudflareToken: "t", aiStudentEnabled: false, fetchImpl });
  try {
    const r = await ask("lesson-2", { message: "ما المياه الجوفية؟", consent: true });
    assert.equal(r.data.source, "prepared");
    assert.equal(r.data.canAsk, false);
    assert.equal(calls, 0);
  } finally {
    close();
  }
});

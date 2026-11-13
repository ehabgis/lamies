import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";
import { createAiProvider } from "../../server/aiProvider.mjs";
import { limitsFromEnv, estimateNeurons } from "../../server/aiGuard.mjs";

// M6 (2026-11-13): every model call needs a ticket from aiGuard.mjs; limits
// per account, for visitors as one pool, for concurrency and per day in
// SQLite (survives a restart). A refused request never reaches the provider.
const PASSWORD = "test-password-only";
const ACCOUNT = "a".repeat(32);
const LIMITS = { ...limitsFromEnv({}), perMinute: 100, visitorPerMinute: 100, visitorTabPerMinute: 100, studentDaily: 100, staffDaily: 100, dailyNeurons: 1e9, visitorDailyNeurons: 1e9, maxConcurrent: 10, userConcurrent: 10 };

async function start({ limits = {}, delay = 0, usage = { prompt_tokens: 400, completion_tokens: 60 }, dir, visitorEnabled = true } = {}) {
  dir ||= mkdtempSync(join(tmpdir(), "lamis-guard-"));
  const counter = { calls: 0, sent: [] };
  const logs = [];
  const make = () =>
    createApp({
      dbPath: join(dir, "t.sqlite"),
      uploadDir: join(dir, "up"),
      aiProvider: "cloudflare",
      cloudflareAccountId: ACCOUNT,
      cloudflareToken: "tok",
      aiStudentEnabled: true,
      aiVisitorEnabled: visitorEnabled,
      aiLimits: { ...LIMITS, ...limits },
      aiLog: (line) => logs.push(line),
      fetchImpl: async (_url, init) => {
        counter.calls += 1;
        counter.sent.push(String(init.body));
        if (delay) await new Promise((r, j) => { const t = setTimeout(r, delay); init.signal?.addEventListener("abort", () => { clearTimeout(t); j(init.signal.reason); }); });
        const payload = { success: true, result: { response: JSON.stringify({ message: "الحديد خام معدني.", sourceIds: ["iron"], questionId: null }), usage } };
        // lesson chat / help read result.response as text; the tutor parses JSON.
        return { ok: true, status: 200, json: async () => payload };
      },
    });
  let app = make();
  const seed = app.db.prepare("INSERT OR IGNORE INTO users(id,name,email,password,role,enrollment) VALUES(?,?,?,?,?,?)");
  const enr = JSON.stringify({ yearId: "grade-5-term-1-2026" });
  for (const id of ["a", "b", "c"]) seed.run(id, "Pupil " + id, `${id}@example.test`, hashPassword(PASSWORD), "student", enr);
  seed.run("t", "Teacher", "t@example.test", hashPassword(PASSWORD), "teacher", null);
  seed.run("adm", "Admin", "adm@example.test", hashPassword(PASSWORD), "content_admin", null);
  app.db.prepare("UPDATE nodes SET status='published' WHERE id IN ('egypt-treasures','lesson-1')").run();
  app.db.prepare("UPDATE nodes SET content=json_set(content,'$.reviewRequired',json('false'),'$.sources',json(?)) WHERE id='lesson-1'").run(JSON.stringify([{ id: "iron", title: "الحديد", text: "الحديد خام معدني يستخدم في الصناعة.", approved: true }]));
  let server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body, c = {}) => {
    const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(c.cookie ? { Cookie: c.cookie, "X-CSRF-Token": c.csrf } : {}), ...(c.tab ? { "x-help-session": c.tab } : {}) }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  const get = async (path, c = {}) => { const r = await fetch(base + path, { headers: c.cookie ? { Cookie: c.cookie } : {} }); return { status: r.status, data: await r.json() }; };
  const login = async (email) => {
    const r = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: email, password: PASSWORD }) });
    const d = await r.json();
    const c = { cookie: r.headers.get("set-cookie").split(";")[0], csrf: d.csrfToken };
    await post("/api/ai/consent", { consent: true }, c);
    return c;
  };
  const visitor = async (tab) => { await post("/api/ai/consent", { consent: true }, { tab }); return { tab }; };
  const ask = (c, msg = "ما الحديد؟") => post(c.cookie ? "/api/lessons/lesson-1/ask" : "/api/demo/lessons/lesson-1/ask", { message: msg, consent: true }, c);
  const close = async () => { server.closeAllConnections(); await new Promise((r) => server.close(r)); app.close(); };
  return {
    dir, counter, logs, post, get, login, visitor, ask,
    restart: async () => { await close(); app = make(); server = http.createServer(app.handler); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`; },
    close: async (keep = false) => { await close(); if (!keep) rmSync(dir, { recursive: true, force: true }); },
  };
}

test("the provider refuses to call the model without a guard ticket", async () => {
  let calls = 0;
  const ai = createAiProvider({ cfAccount: ACCOUNT, cfToken: "tok", fetchImpl: async () => { calls++; return { ok: true, json: async () => ({}) }; } });
  await assert.rejects(ai.chat([{ role: "system", content: "x" }, { role: "user", content: "y" }]), /no AI ticket/);
  assert.equal(calls, 0);
});

test("per account: requests per minute and per day; refused requests keep the lesson text and make no call", async () => {
  const s = await start({ limits: { perMinute: 3, studentDaily: 4 } });
  try {
    const a = await s.login("a@example.test");
    for (let i = 0; i < 3; i++) assert.equal((await s.ask(a)).data.source, "ai");
    const fourth = await s.ask(a);
    assert.equal(fourth.status, 200, "the lesson keeps working");
    assert.equal(fourth.data.source, "prepared");
    assert.equal(fourth.data.limited, true);
    assert.match(fourth.data.note, /دقيقة/);
    assert.match(fourth.data.answer, /الحديد/, "lesson text answer");
    assert.equal(s.counter.calls, 3);
    // Another account has its own allowance; a new session of A does not reset A's.
    const b = await s.login("b@example.test");
    assert.equal((await s.ask(b)).data.source, "ai");
    const a2 = await s.login("a@example.test");
    assert.equal((await s.ask(a2)).data.limited, true);
    assert.equal(s.counter.calls, 4);
  } finally {
    await s.close();
  }
});

test("per day per account survives a server restart", async () => {
  const s = await start({ limits: { studentDaily: 2 } });
  try {
    const a = await s.login("a@example.test");
    assert.equal((await s.ask(a)).data.source, "ai");
    assert.equal((await s.ask(a)).data.source, "ai");
    const third = await s.ask(a);
    assert.equal(third.data.limited, true);
    assert.match(third.data.note, /اليوم/);
    await s.restart();
    const again = await s.login("a@example.test");
    assert.equal((await s.ask(again)).data.limited, true, "the daily count is in SQLite");
    assert.equal(s.counter.calls, 2);
  } finally {
    await s.close();
  }
});

test("visitors: a new x-help-session gives no new allowance (one shared pool)", async () => {
  const s = await start({ limits: { visitorPerMinute: 4, visitorTabPerMinute: 2 } });
  try {
    let ai = 0;
    for (let i = 0; i < 12; i++) {
      const v = await s.visitor(`tab-rotating-${String(i).padStart(4, "0")}`);
      const r = await s.ask(v);
      if (r.data.source === "ai") ai++;
      else assert.equal(r.data.limited, true);
    }
    assert.equal(ai, 4);
    assert.equal(s.counter.calls, 4);
    // Per tab as well.
    const t = await start({ limits: { visitorPerMinute: 100, visitorTabPerMinute: 2 } });
    try {
      const v = await t.visitor("tab-same-tab-001");
      const results = [];
      for (let i = 0; i < 4; i++) results.push((await t.ask(v)).data.source);
      assert.deepEqual(results, ["ai", "ai", "prepared", "prepared"]);
    } finally {
      await t.close();
    }
  } finally {
    await s.close();
  }
});

test("visitors: a daily pool in neurons, and AI_VISITOR_ENABLED=false keeps them on lesson text", async () => {
  // One call reports 3000+300 tokens ≈ 141 neurons, more than the 130 pool;
  // its reservation (estimate ≈ 100) fits, the next one does not.
  const s = await start({ usage: { prompt_tokens: 3000, completion_tokens: 300 }, limits: { visitorDailyNeurons: 130 } });
  try {
    const v = await s.visitor("tab-visitor-pool1");
    const first = await s.ask(v);
    assert.equal(first.data.source, "ai");
    const second = await s.ask(await s.visitor("tab-visitor-pool2"));
    assert.equal(second.data.limited, true, "another tab, same pool");
    assert.match(second.data.note, /سجّل الدخول/);
    // Signed-in students are not in the visitor pool.
    const a = await s.login("a@example.test");
    assert.equal((await s.ask(a)).data.source, "ai");
    assert.equal(s.counter.calls, 2);
  } finally {
    await s.close();
  }
  const off = await start({ visitorEnabled: false });
  try {
    const r = await off.ask(await off.visitor("tab-visitor-off01"));
    assert.equal(r.data.source, "prepared");
    assert.equal(r.data.canAsk, false);
    assert.equal(off.counter.calls, 0);
    const a = await off.login("a@example.test");
    assert.equal((await off.ask(a)).data.source, "ai", "accounts unaffected");
  } finally {
    await off.close();
  }
});

test("concurrency: one request at a time per account, and a ceiling for all", async () => {
  const s = await start({ limits: { userConcurrent: 1, maxConcurrent: 2 }, delay: 300 });
  try {
    const a = await s.login("a@example.test");
    const burst = await Promise.all(Array.from({ length: 6 }, () => s.ask(a)));
    assert.equal(burst.filter((r) => r.data.source === "ai").length, 1);
    assert.equal(burst.filter((r) => r.data.limited).length, 5);
    assert.equal(s.counter.calls, 1);
    const [b, c, t] = [await s.login("b@example.test"), await s.login("c@example.test"), await s.login("t@example.test")];
    s.counter.calls = 0;
    const three = await Promise.all([b, c, t].map((x) => s.ask(x)));
    assert.equal(three.filter((r) => r.data.source === "ai").length, 2, "at most 2 at once");
    assert.equal(s.counter.calls, 2);
  } finally {
    await s.close();
  }
});

test("project-wide daily ceiling: reserved before the call, so parallel requests cannot pass it; settled with reported usage", async () => {
  const usage = { prompt_tokens: 300, completion_tokens: 50 };
  const actual = (300 * 26668 + 50 * 204805) / 1e6;
  const estimate = estimateNeurons({ model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", inputChars: 3000, maxTokens: 300 });
  assert.ok(estimate > actual, "the estimate is conservative");
  const s = await start({ usage, limits: { dailyNeurons: actual * 2 + estimate * 0.9 }, delay: 200 });
  try {
    const users = [await s.login("a@example.test"), await s.login("b@example.test"), await s.login("c@example.test"), await s.login("t@example.test")];
    // Four at once: the reservations (estimates) leave room for fewer.
    const parallel = await Promise.all(users.map((u) => s.ask(u)));
    const passed = parallel.filter((r) => r.data.source === "ai").length;
    assert.ok(passed >= 1 && passed <= 2, `passed ${passed}`);
    assert.equal(s.counter.calls, passed);
    for (const r of parallel.filter((x) => x.data.limited)) assert.match(r.data.note, /حده اليومي|دقيقة|الآن/);
    // After settling, today's total equals the reported usage, not the estimate.
    const adm = await s.login("adm@example.test");
    const today = (await s.get("/api/admin/ai-usage", adm)).data;
    assert.equal(today.global.requests, passed);
    assert.ok(Math.abs(today.global.neurons - passed * actual) < 0.01, `${today.global.neurons} vs ${passed * actual}`);
    assert.equal(typeof today.accounts, "number");
    assert.doesNotMatch(JSON.stringify(today), /"a"|"b"|@example/, "no account ids or emails");
    // Students cannot read it.
    assert.equal((await s.get("/api/admin/ai-usage", users[0])).status, 403);
  } finally {
    await s.close();
  }
});

test("help cards and the /api/ai tutor share the same limits (no way around them by changing route)", async () => {
  const s = await start({ limits: { perMinute: 2 } });
  try {
    const t = await s.login("t@example.test");
    assert.equal((await s.ask(t)).data.source, "ai");
    const help = await s.post("/api/lessons/lesson-1/help", { questionId: (await s.get("/api/lessons/lesson-1", t)).data.lesson.content.questions[0].id, level: "more", message: "مش فاهم", consent: true }, t);
    assert.equal(help.status, 200);
    assert.notEqual(help.data.source, undefined);
    const callsAfterTwo = s.counter.calls;
    assert.equal(callsAfterTwo, 2);
    const tutor = await s.post("/api/ai", { lessonId: "lesson-1", message: "اشرح الحديد", consent: true }, t);
    assert.equal(tutor.status, 429);
    assert.equal(tutor.data.reason, "limit");
    assert.equal(s.counter.calls, 2, "refused before the provider");
  } finally {
    await s.close();
  }
});

test("usage logs carry counts only: no question text, name or email", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    await s.ask(a, "SECRET_PRIVATE_QUESTION_TEXT");
    assert.ok(s.logs.some((l) => /route=ask outcome=ok/.test(l)));
    assert.doesNotMatch(s.logs.join("\n"), /SECRET_PRIVATE_QUESTION_TEXT|Pupil|example\.test/);
    const rows = JSON.stringify(s.counter.sent.length ? (await s.login("adm@example.test"), (await s.get("/api/admin/ai-usage", await s.login("adm@example.test"))).data) : {});
    assert.doesNotMatch(rows, /SECRET_PRIVATE_QUESTION_TEXT/);
  } finally {
    await s.close();
  }
});

test("a model call that times out is counted as an error and the lesson text is shown", async () => {
  const s = await start({ limits: { timeoutMs: 100 }, delay: 1000 });
  try {
    const a = await s.login("a@example.test");
    const r = await s.ask(a);
    assert.equal(r.data.source, "prepared");
    assert.ok(r.data.note);
    assert.ok(s.logs.some((l) => /outcome=timeout/.test(l)));
  } finally {
    await s.close();
  }
});

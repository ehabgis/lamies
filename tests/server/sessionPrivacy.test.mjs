import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";

// M5 (2026-11-13): consent to use the model belongs to one session (or one
// visitor tab) on the server. Another account, an ended session, a withdrawn
// consent or a restarted server never reaches the model with an old consent.
const PASSWORD = "test-password-only";
const ACCOUNT = "a".repeat(32);

function makeApp(dbPath, uploadDir, counter, options = {}) {
  return createApp({
    dbPath,
    uploadDir,
    aiProvider: "cloudflare",
    cloudflareAccountId: ACCOUNT,
    cloudflareToken: "tok",
    aiStudentEnabled: true,
    fetchImpl: async () => {
      counter.calls += 1;
      return { ok: true, json: async () => ({ success: true, result: { response: "رد المعلم المتصل" } }) };
    },
    ...options,
  });
}

async function start(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "lamis-privacy-"));
  const dbPath = join(dir, "t.sqlite");
  const uploadDir = join(dir, "up");
  const counter = { calls: 0 };
  let app = makeApp(dbPath, uploadDir, counter, options);
  const seed = app.db;
  const insert = seed.prepare("INSERT INTO users(id,name,email,password,role,enrollment) VALUES(?,?,?,?,?,?)");
  const enrolled = JSON.stringify({ yearId: "grade-5-term-1-2026" });
  insert.run("a", "Pupil A", "a@example.test", hashPassword(PASSWORD), "student", enrolled);
  insert.run("b", "Pupil B", "b@example.test", hashPassword(PASSWORD), "student", enrolled);
  insert.run("t", "Teacher", "t@example.test", hashPassword(PASSWORD), "teacher", null);
  seed.prepare("UPDATE nodes SET status='published' WHERE id IN ('egypt-treasures','lesson-1')").run();
  let server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let base = `http://127.0.0.1:${server.address().port}`;

  const call = async (path, { method = "GET", body, client = {}, csrf = true, extra = {} } = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(client.cookie ? { Cookie: client.cookie } : {}),
        ...(client.cookie && csrf ? { "X-CSRF-Token": client.csrf } : {}),
        ...(client.tab ? { "x-help-session": client.tab } : {}),
        ...extra,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  const login = async (email) => {
    const r = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password: PASSWORD }),
    });
    assert.equal(r.status, 200);
    const { csrfToken } = await r.json();
    return { cookie: r.headers.get("set-cookie").split(";")[0], csrf: csrfToken };
  };
  const consent = (client, value = true, opts = {}) => call("/api/ai/consent", { method: "POST", body: { consent: value }, client, ...opts });
  const askClass = (client) =>
    call("/api/lessons/lesson-1/ask", { method: "POST", body: { message: "ما الحديد؟", consent: true }, client });
  const askDemo = (client) =>
    call("/api/demo/lessons/lesson-1/ask", { method: "POST", body: { message: "ما الحديد؟", consent: true }, client });
  const restart = async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    app.close();
    app = makeApp(dbPath, uploadDir, counter, options);
    server = http.createServer(app.handler);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  return {
    call,
    login,
    consent,
    askClass,
    askDemo,
    restart,
    counter,
    db: () => app.db,
    close: async () => {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("student A's consent and session do not carry over to student B on the same browser", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    assert.deepEqual((await s.consent(a)).data, { consent: true });
    const first = await s.askClass(a);
    assert.equal(first.status, 200);
    assert.equal(first.data.source, "ai");
    assert.equal(s.counter.calls, 1);

    assert.equal((await s.call("/api/auth/logout", { method: "POST", body: {}, client: a })).status, 200);
    // A's old cookie no longer opens the lesson or reaches the model.
    assert.equal((await s.askClass(a)).status, 401);
    assert.equal(s.counter.calls, 1);

    const b = await s.login("b@example.test");
    assert.deepEqual((await s.call("/api/ai/chat-status", { client: b })).data, { canAsk: true, consent: false });
    const bFirst = await s.askClass(b);
    assert.equal(bFirst.data.source, "prepared", "B sent consent:true but gave no consent of their own");
    assert.equal(bFirst.data.consent, false);
    assert.equal(s.counter.calls, 1);

    // B's own consent, then withdrawn.
    await s.consent(b);
    assert.equal((await s.askClass(b)).data.source, "ai");
    assert.equal(s.counter.calls, 2);
    assert.deepEqual((await s.consent(b, false)).data, { consent: false });
    assert.equal((await s.askClass(b)).data.source, "prepared");
    assert.equal(s.counter.calls, 2);
  } finally {
    await s.close();
  }
});

test("changing consent needs the session's CSRF token and the site's own origin", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    assert.equal((await s.consent(a, true, { csrf: false })).status, 403);
    assert.equal((await s.consent({ ...a, csrf: "forged" })).status, 403);
    assert.equal((await s.consent(a, true, { extra: { Origin: "https://attacker.test" } })).status, 403);
    assert.equal((await s.call("/api/ai/consent", { method: "POST", body: { consent: "yes" }, client: a })).status, 400);
    assert.deepEqual((await s.call("/api/ai/chat-status", { client: a })).data.consent, false);
  } finally {
    await s.close();
  }
});

test("an ended session loses its consent; signing out with it is not an error", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    await s.consent(a);
    // The session ends (time passed) while A is chatting.
    s.db().prepare("UPDATE sessions SET expires=? WHERE user_id='a'").run(Date.now() - 1000);
    assert.equal((await s.askClass(a)).status, 401);
    // The open demo does not quietly handle it as a visitor's request: the
    // ended session is refused (reason "session"), no call is made.
    const demo = await s.askDemo(a);
    assert.equal(demo.status, 401);
    assert.equal(demo.data.reason, "session");
    assert.equal(s.counter.calls, 0);
    const out = await s.call("/api/auth/logout", { method: "POST", body: {}, client: a });
    assert.equal(out.status, 200);

    // A session row made by hand that has already expired behaves the same.
    const raw = randomBytes(32).toString("hex");
    s.db()
      .prepare("INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)")
      .run(createHash("sha256").update(raw).digest("hex"), "b", "csrf-old", Date.now() - 1);
    const stale = { cookie: `lamis_session=${raw}`, csrf: "csrf-old" };
    assert.equal((await s.askClass(stale)).status, 401);
    assert.equal((await s.consent(stale)).status, 401, "an ended session cannot give consent as a visitor");
    assert.equal((await s.consent({})).status, 400, "no session and no tab: nothing to hold consent");
  } finally {
    await s.close();
  }
});

test("teacher then student on one device: the student starts without consent", async () => {
  const s = await start({ aiStudentEnabled: false });
  try {
    const t = await s.login("t@example.test");
    await s.consent(t);
    assert.equal((await s.askDemo(t)).data.source, "ai");
    assert.equal(s.counter.calls, 1);
    await s.call("/api/auth/logout", { method: "POST", body: {}, client: t });

    const a = await s.login("a@example.test");
    assert.deepEqual((await s.call("/api/ai/chat-status", { client: a })).data, { canAsk: false, consent: false });
    // Even with their own consent, a student may not use the model while
    // AI_STUDENT_ENABLED is off.
    await s.consent(a);
    const r = await s.askClass(a);
    assert.equal(r.data.source, "prepared");
    assert.equal(r.data.canAsk, false);
    assert.equal(s.counter.calls, 1);
  } finally {
    await s.close();
  }
});

test("visitor tabs keep separate consent, and a restart asks again", async () => {
  const s = await start();
  try {
    const tabX = { tab: "tab-visitor-x1" };
    const tabY = { tab: "tab-visitor-y1" };
    assert.deepEqual((await s.consent(tabX)).data, { consent: true });
    assert.equal((await s.askDemo(tabX)).data.source, "ai");
    assert.equal((await s.askDemo(tabY)).data.source, "prepared");
    // Without a tab id a visitor cannot hold consent (an address may be a school).
    assert.equal((await s.consent({})).status, 400);
    assert.equal(s.counter.calls, 1);

    const a = await s.login("a@example.test");
    await s.consent(a);
    await s.restart();
    // Sessions survive a restart; consent (memory only) does not.
    assert.deepEqual((await s.call("/api/ai/chat-status", { client: a })).data, { canAsk: true, consent: false });
    assert.equal((await s.askClass(a)).data.source, "prepared");
    assert.equal((await s.askDemo(tabX)).data.source, "prepared");
    assert.equal(s.counter.calls, 1);
  } finally {
    await s.close();
  }
});

test("help counters belong to each account: B does not inherit A's wrong tries", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    const q = "book-l1-blank-1";
    const wrong = (client, answer) =>
      s.call("/api/demo/lessons/lesson-1/answers", { method: "POST", body: { questionId: q, answer }, client });
    assert.equal((await wrong(a, "الحديد")).data.wrong, 1);
    assert.equal((await wrong(a, "الذهب")).data.wrong, 2);
    await s.call("/api/auth/logout", { method: "POST", body: {}, client: a });
    const b = await s.login("b@example.test");
    assert.equal((await wrong(b, "الحديد")).data.wrong, 1);
    // B never sees the answer card A was close to.
    const solution = await s.call("/api/demo/lessons/lesson-1/help", { method: "POST", body: { questionId: q, level: "solution" }, client: b });
    assert.equal(solution.status, 403);
  } finally {
    await s.close();
  }
});

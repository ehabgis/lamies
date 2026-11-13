import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";

// The open demo routes (2026-11-13): no CSRF token for real visitors (no
// session cookie); a signed-in session needs its own token; a cookie that is
// not a valid session is refused, never handled as a visitor's request.
const PASSWORD = "test-password-only";
const ROUTES = [
  ["lesson-1", "answers", { questionId: "book-l1-blank-1", answer: "الحديد" }],
  ["lesson-1", "help", { questionId: "book-l1-blank-1", level: "review" }],
  ["lesson-1", "apply", { questionId: "book-l1-blank-1", answer: "النحاس" }],
  ["lesson-1", "ask", { message: "ما الحديد؟" }],
  ["lesson-1", "expedition/check", { step: "final" }],
  ["lesson-1", "build-map/check", {}],
  ["lesson-2", "trace/check", {}],
];
const sha = (x) => createHash("sha256").update(x).digest("hex");

async function start() {
  const dir = mkdtempSync(join(tmpdir(), "lamis-demo-csrf-"));
  const sent = [];
  const app = createApp({
    dbPath: join(dir, "t.sqlite"),
    uploadDir: join(dir, "up"),
    aiProvider: "cloudflare",
    cloudflareAccountId: "a".repeat(32),
    cloudflareToken: "tok",
    aiStudentEnabled: true,
    fetchImpl: async (_url, init) => {
      sent.push(String(init.body));
      return { ok: true, json: async () => ({ success: true, result: { response: "رد المعلم المتصل" } }) };
    },
  });
  const enrolled = JSON.stringify({ yearId: "grade-5-term-1-2026" });
  const add = app.db.prepare("INSERT INTO users(id,name,email,password,role,enrollment,disabled) VALUES(?,?,?,?,?,?,?)");
  add.run("a", "Pupil A", "a@example.test", hashPassword(PASSWORD), "student", enrolled, 0);
  add.run("b", "Pupil B", "b@example.test", hashPassword(PASSWORD), "student", enrolled, 0);
  add.run("off", "Disabled", "off@example.test", hashPassword(PASSWORD), "student", enrolled, 0);
  app.db.prepare("UPDATE nodes SET status='published' WHERE id IN ('egypt-treasures','lesson-1')").run();
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body, { cookie, csrf, tab } = {}) => {
    const r = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf !== undefined ? { "X-CSRF-Token": csrf } : {}),
        ...(tab ? { "x-help-session": tab } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: await r.json(), setCookie: r.headers.get("set-cookie") };
  };
  const login = async (email) => {
    const r = await post("/api/auth/login", { username: email, password: PASSWORD });
    assert.equal(r.status, 200);
    return { cookie: r.setCookie.split(";")[0], csrf: r.data.csrfToken };
  };
  const demo = (lesson, route, body, client) => post(`/api/demo/lessons/${lesson}/${route}`, body, client);
  return {
    app, base, post, login, demo, sent,
    close: async () => {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
// Passed the CSRF/session gate: the route itself answered (its own 200/400/403).
const passedGate = (r) => r.status !== 401 && r.data.reason === undefined;

test("real visitors (no session cookie) use all seven demo routes without a token", async () => {
  const s = await start();
  try {
    for (const [lesson, route, body] of ROUTES) {
      const r = await s.demo(lesson, route, body, { tab: "tab-visitor-01" });
      assert.ok(passedGate(r), `${route}: ${r.status} ${JSON.stringify(r.data)}`);
    }
    assert.equal((await s.demo("lesson-1", "answers", ROUTES[0][2], { tab: "tab-visitor-01" })).status, 200);
    const ask = await s.demo("lesson-1", "ask", { message: "ما الحديد؟" }, { tab: "tab-visitor-01" });
    assert.equal(ask.status, 200);
    assert.match(ask.data.answer, /الحديد/);
    const help = await s.demo("lesson-1", "help", { questionId: "book-l1-blank-1", level: "review" }, { tab: "tab-visitor-01" });
    assert.equal(help.status, 200);
    assert.ok(help.data.text);
  } finally {
    await s.close();
  }
});

test("a signed-in session uses the demo routes with its CSRF token, and is refused without it", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    for (const [lesson, route, body] of ROUTES) {
      const ok = await s.demo(lesson, route, body, a);
      assert.ok(passedGate(ok), `${route} with token: ${ok.status} ${JSON.stringify(ok.data)}`);
      for (const csrf of [undefined, "", "forged-token"]) {
        const bad = await s.demo(lesson, route, body, { cookie: a.cookie, csrf });
        assert.equal(bad.status, 403, `${route} csrf=${csrf}`);
        // Only a short reason: nothing about the session.
        assert.deepEqual(Object.keys(bad.data).sort(), ["error", "reason"]);
        assert.equal(bad.data.reason, "csrf");
      }
    }
    // The published lesson keeps working with the token.
    const cls = await s.post("/api/lessons/lesson-1/ask", { message: "ما الحديد؟" }, a);
    assert.equal(cls.status, 200);
  } finally {
    await s.close();
  }
});

test("a stale tab of A, after the cookie became B's, is refused (403) and never reaches the model", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test"); // tab 1 keeps A's token
    await s.post("/api/auth/logout", {}, a); // tab 2: A signs out
    const b = await s.login("b@example.test"); // tab 2: B signs in; the cookie is now B's
    assert.deepEqual((await s.post("/api/ai/consent", { consent: true }, b)).data, { consent: true });
    const historyOfA = [{ role: "user", text: "A_PRIVATE_QUESTION" }, { role: "assistant", text: "A_PRIVATE_ANSWER" }];
    const stale = { cookie: b.cookie, csrf: a.csrf };
    const ask = await s.demo("lesson-1", "ask", { message: "طيب؟", history: historyOfA, consent: true }, stale);
    assert.equal(ask.status, 403);
    assert.equal(ask.data.reason, "csrf");
    const help = await s.demo("lesson-1", "help", { questionId: "book-l1-blank-1", level: "more", consent: true, message: "A_PRIVATE_HELP" }, stale);
    assert.equal(help.status, 403);
    const cls = await s.post("/api/lessons/lesson-1/ask", { message: "طيب؟", history: historyOfA, consent: true }, stale);
    assert.equal(cls.status, 403);
    assert.equal(cls.data.reason, "csrf");
    assert.equal(s.sent.length, 0, "no model call for refused requests");
    // B's own tab, with B's token and B's (empty) conversation, works.
    const own = await s.demo("lesson-1", "ask", { message: "ما الحديد؟", consent: true }, b);
    assert.equal(own.status, 200);
    assert.equal(own.data.source, "ai");
    assert.equal(s.sent.length, 1);
    assert.doesNotMatch(s.sent.join("\n"), /A_PRIVATE/);
  } finally {
    await s.close();
  }
});

test("a cookie that is not a valid session is refused and cleared, never treated as a visitor", async () => {
  const s = await start();
  try {
    // 1) A random cookie value.
    const fake = { cookie: `lamis_session=${randomBytes(32).toString("hex")}` };
    // 2) An expired session.
    const rawOld = randomBytes(32).toString("hex");
    s.app.db.prepare("INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)").run(sha(rawOld), "a", "csrf-old", Date.now() - 1);
    const expired = { cookie: `lamis_session=${rawOld}`, csrf: "csrf-old" };
    // 3) A session of an account that was disabled.
    const off = await s.login("off@example.test");
    s.app.db.prepare("UPDATE users SET disabled=1 WHERE id='off'").run();
    for (const [name, client] of [["random", fake], ["expired", expired], ["disabled", off]]) {
      for (const [lesson, route, body] of ROUTES) {
        const r = await s.demo(lesson, route, body, { ...client, tab: "tab-visitor-02" });
        assert.equal(r.status, 401, `${name} ${route}`);
        assert.equal(r.data.reason, "session");
        assert.match(r.setCookie || "", /lamis_session=;.*Max-Age=0/);
      }
      assert.equal((await s.post("/api/ai/consent", { consent: true }, { ...client, tab: "tab-visitor-02" })).status, 401);
    }
    assert.equal(s.sent.length, 0);
    // After the cookie is cleared, the same browser is a visitor again.
    const again = await s.demo("lesson-1", "ask", { message: "ما الحديد؟" }, { tab: "tab-visitor-02" });
    assert.equal(again.status, 200);
    // /auth/me clears such a cookie too, and gives no token.
    const me = await fetch(s.base + "/api/auth/me", { headers: { Cookie: expired.cookie } });
    assert.deepEqual(await me.json(), { user: null, csrfToken: null });
    assert.match(me.headers.get("set-cookie") || "", /Max-Age=0/);
    // Signing out with it is still fine.
    assert.equal((await s.post("/api/auth/logout", {}, expired)).status, 200);
  } finally {
    await s.close();
  }
});

test("the visitor/signed-in decision ignores client headers", async () => {
  const s = await start();
  try {
    const a = await s.login("a@example.test");
    // A tab id (or any header) does not turn a signed-in request into a visitor's.
    const r = await s.demo("lesson-1", "ask", { message: "ما الحديد؟" }, { cookie: a.cookie, tab: "tab-visitor-03" });
    assert.equal(r.status, 403);
    assert.equal(r.data.reason, "csrf");
  } finally {
    await s.close();
  }
});

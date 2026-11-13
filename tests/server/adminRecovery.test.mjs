import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";
import { recoveryConfig, MAX_FAILURES } from "../../server/adminRecovery.mjs";

// One-time administrator recovery without a shell (Render Free): proven with
// a secret from a private environment variable, used once, nothing leaked.
const EMAIL = "admin@example.test";
const SECRET = randomBytes(32).toString("base64url");
const NEW_PASSWORD = "Recovered-pass-2026!";
const env = (over = {}) => ({
  ADMIN_RECOVERY_SECRET: SECRET,
  ADMIN_RECOVERY_EMAIL: EMAIL,
  ADMIN_RECOVERY_UNTIL: new Date(Date.now() + 3600000).toISOString(),
  ...over,
});

async function start(dir, config, logs) {
  const app = createApp({
    dbPath: join(dir, "t.sqlite"),
    uploadDir: join(dir, "up"),
    aiKey: "",
    cloudflareAccountId: "",
    cloudflareToken: "",
    adminRecovery: config,
    recoveryLog: (line) => logs.push(line),
  });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const raw = [];
  const call = async (path, method = "GET", body, headers = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    raw.push(text);
    let value = {};
    try { value = JSON.parse(text); } catch {}
    return { status: r.status, value, cookie: r.headers.get("set-cookie")?.split(";")[0] };
  };
  const recover = (body, query = "") => call("/api/auth/recover-admin" + query, "POST", body);
  const login = (email, password) => call("/api/auth/login", "POST", { username: email, password });
  return { app, call, recover, login, raw, close: () => { server.close(); app.close(); } };
}
const users = (db) => db.prepare("SELECT id,email,role,password,enrollment FROM users ORDER BY id").all();

test("configuration: off without variables; weak, past or far windows stay off", () => {
  assert.equal(recoveryConfig({}).enabled, false);
  assert.equal(recoveryConfig(env()).enabled, true);
  assert.match(recoveryConfig(env({ ADMIN_RECOVERY_SECRET: "short-secret" })).problems.join(), /43–200/);
  assert.match(recoveryConfig(env({ ADMIN_RECOVERY_UNTIL: new Date(Date.now() - 1000).toISOString() })).problems.join(), /passed/);
  assert.match(recoveryConfig(env({ ADMIN_RECOVERY_UNTIL: new Date(Date.now() + 49 * 3600000).toISOString() })).problems.join(), /48 hours/);
  assert.match(recoveryConfig(env({ ADMIN_RECOVERY_EMAIL: "not-an-email" })).problems.join(), /email/);
  assert.equal(recoveryConfig(env()).mode, "create", "create-only unless asked otherwise");
  assert.match(recoveryConfig(env({ ADMIN_RECOVERY_MODE: "reset" })).problems.join(), /create or reset-or-create/);
  // A problem report never contains the secret.
  assert(!JSON.stringify(recoveryConfig(env({ ADMIN_RECOVERY_UNTIL: "x" }))).includes(SECRET));
});

test("reset-or-create, existing account: password reset once, sessions ended, role and others unchanged; reuse and restart refused", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-recovery-"));
  const logs = [];
  const resetEnv = () => env({ ADMIN_RECOVERY_MODE: "reset-or-create" });
  let s = await start(dir, recoveryConfig(resetEnv()), logs);
  try {
    const add = s.app.db.prepare("INSERT INTO users(id,name,email,password,role,enrollment) VALUES(?,?,?,?,?,?)");
    add.run("a1", "Admin", EMAIL, hashPassword("Old-admin-pass-2026"), "content_admin", null);
    add.run("s1", "Student", "student@example.test", hashPassword("Student-pass-2026"), "student", '{"gradeId":"grade-5"}');
    const oldSession = (await s.login(EMAIL, "Old-admin-pass-2026")).cookie;
    const student = (await s.login("student@example.test", "Student-pass-2026")).cookie;
    const before = users(s.app.db);

    // Wrong method and a secret in the URL do nothing.
    assert.equal((await s.call("/api/auth/recover-admin")).status, 404);
    assert.equal((await s.recover({ secret: SECRET, password: NEW_PASSWORD }, `?secret=${SECRET}`)).status, 400);
    // A short password does not use the secret.
    assert.equal((await s.recover({ secret: SECRET, password: "short" })).status, 400);
    assert.deepEqual(users(s.app.db), before);

    const ok = await s.recover({ secret: SECRET, password: NEW_PASSWORD });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.value, { ok: true, action: "reset" });
    assert.equal((await s.login(EMAIL, "Old-admin-pass-2026")).status, 401);
    assert.equal((await s.login(EMAIL, NEW_PASSWORD)).status, 200);
    // The old session is gone; the student's is not.
    assert.equal((await s.call("/api/auth/me", "GET", undefined, { Cookie: oldSession })).value.user, null);
    assert.equal((await s.call("/api/auth/me", "GET", undefined, { Cookie: student })).value.user.email, "student@example.test");
    const after = users(s.app.db);
    assert.equal(after.length, before.length, "no account created");
    assert.equal(after.find((u) => u.id === "a1").role, "content_admin", "role unchanged");
    assert.deepEqual(after.find((u) => u.id === "s1"), before.find((u) => u.id === "s1"), "student untouched");

    // Used once: the same secret is refused now and after a restart.
    assert.equal((await s.recover({ secret: SECRET, password: "Another-pass-2026!" })).status, 404);
    s.close();
    s = await start(dir, recoveryConfig(resetEnv()), logs);
    assert.equal((await s.recover({ secret: SECRET, password: "Another-pass-2026!" })).status, 404);
    assert.equal((await s.login(EMAIL, NEW_PASSWORD)).status, 200);

    // Nothing secret in any response or log line.
    const out = [...s.raw, ...logs].join("\n");
    for (const secret of [SECRET, NEW_PASSWORD, "Old-admin-pass-2026", s.app.db.prepare("SELECT password FROM users WHERE id='a1'").get().password])
      assert(!out.includes(secret), "leaked a secret");
    assert(logs.some((l) => /password reset, sessions ended/.test(l)));
    assert(logs.some((l) => /already used/.test(l)), "restart says it is closed");
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing account: exactly one super_admin is created; nothing else changes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-recovery-"));
  const logs = [];
  const s = await start(dir, recoveryConfig(env({ ADMIN_RECOVERY_EMAIL: "  Admin@Example.TEST " })), logs);
  try {
    s.app.db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)").run("s1", "Student", "student@example.test", hashPassword("Student-pass-2026"), "student");
    const before = users(s.app.db);
    const ok = await s.recover({ secret: SECRET, password: NEW_PASSWORD });
    assert.deepEqual(ok.value, { ok: true, action: "created" });
    const after = users(s.app.db);
    assert.equal(after.length, before.length + 1);
    const admin = after.find((u) => u.email === EMAIL);
    assert.equal(admin.role, "super_admin");
    assert.deepEqual(after.filter((u) => u.email !== EMAIL), before);
    const session = await s.login(EMAIL, NEW_PASSWORD);
    assert.equal(session.status, 200);
    assert.equal(session.value.user.role, "super_admin");
    // A second use creates nothing more.
    assert.equal((await s.recover({ secret: SECRET, password: NEW_PASSWORD })).status, 404);
    assert.equal(users(s.app.db).length, before.length + 1);
    assert(![...s.raw, ...logs].join("\n").includes(SECRET));
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("wrong secrets: refused, counted across restarts, then the route closes; the right one cannot reopen it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-recovery-"));
  const logs = [];
  let s = await start(dir, recoveryConfig(env()), logs);
  try {
    s.app.db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)").run("a1", "Admin", EMAIL, hashPassword("Old-admin-pass-2026"), "super_admin");
    const before = users(s.app.db);
    for (const secret of [undefined, "", "x".repeat(43), SECRET.slice(0, -1) + (SECRET.endsWith("A") ? "B" : "A")]) {
      const r = await s.recover({ secret, password: NEW_PASSWORD });
      assert.equal(r.status, 403);
      assert.equal(r.value.error, "رمز الاستعادة غير صالح");
    }
    // Restart: the count is kept in the database.
    s.close();
    s = await start(dir, recoveryConfig(env()), logs);
    assert.equal((await s.recover({ secret: "guess", password: NEW_PASSWORD })).status, 403);
    assert(logs.some((l) => /closed after repeated wrong secrets/.test(l)));
    // Closed: even the right secret now meets an unknown route.
    assert.equal((await s.recover({ secret: SECRET, password: NEW_PASSWORD })).status, 404);
    assert.deepEqual(users(s.app.db), before);
    assert.equal((await s.login(EMAIL, "Old-admin-pass-2026")).status, 200);
    assert.equal(MAX_FAILURES, 5);
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("off, expired or misconfigured: the route is an unknown route and changes nothing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-recovery-"));
  const logs = [];
  const base = Date.now();
  // Open for 1.5 s, then past its window.
  let s = await start(dir, { ...recoveryConfig(env()), until: base + 1500 }, logs);
  try {
    s.app.db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)").run("a1", "Admin", EMAIL, hashPassword("Old-admin-pass-2026"), "super_admin");
    await new Promise((r) => setTimeout(r, 1700));
    assert.equal((await s.recover({ secret: SECRET, password: NEW_PASSWORD })).status, 404);
    s.close();
    for (const config of [recoveryConfig({}), recoveryConfig(env({ ADMIN_RECOVERY_SECRET: "too-short" }))]) {
      s = await start(dir, config, logs);
      const r = await s.recover({ secret: SECRET, password: NEW_PASSWORD });
      assert.equal(r.status, 404);
      assert.equal(r.value.error, "المسار غير موجود");
      s.close();
    }
    s = await start(dir, recoveryConfig({}), logs);
    assert.equal((await s.login(EMAIL, "Old-admin-pass-2026")).status, 200);
    assert(logs.some((l) => /Admin recovery is off: ADMIN_RECOVERY_SECRET/.test(l)));
    assert(!logs.join("\n").includes(SECRET));
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CSRF and sessions elsewhere are unchanged while recovery is open", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-recovery-"));
  const s = await start(dir, recoveryConfig(env()), []);
  try {
    s.app.db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)").run("s1", "Student", "student@example.test", hashPassword("Student-pass-2026"), "student");
    const login = await s.login("student@example.test", "Student-pass-2026");
    // A signed-in write without its CSRF token is still refused.
    const r = await s.call("/api/enrollment", "PUT", { stageId: "primary" }, { Cookie: login.cookie });
    assert.equal(r.status, 403);
    assert.equal(r.value.reason, "csrf");
    // A foreign Origin is refused before the recovery is looked at.
    const foreign = await s.call("/api/auth/recover-admin", "POST", { secret: SECRET, password: NEW_PASSWORD }, { Origin: "https://evil.example" });
    assert.equal(foreign.status, 403);
    assert.equal(s.app.db.prepare("SELECT count(*) n FROM users").get().n, 1);
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("create (default): a separate test admin; an existing email is refused and the old admin is untouched; it can manage content", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-recovery-"));
  const logs = [];
  const OLD = "old-admin@example.test", TEST = "test-admin@example.test";
  let s = await start(dir, recoveryConfig(env({ ADMIN_RECOVERY_EMAIL: OLD })), logs);
  try {
    const add = s.app.db.prepare("INSERT INTO users(id,name,email,password,role,enrollment) VALUES(?,?,?,?,?,?)");
    add.run("old", "Old admin", OLD, hashPassword("Old-admin-pass-2026"), "super_admin", null);
    add.run("s1", "Student", "student@example.test", hashPassword("Student-pass-2026"), "student", '{"gradeId":"grade-5"}');
    const oldSession = (await s.login(OLD, "Old-admin-pass-2026")).cookie;
    const before = users(s.app.db);
    // The old admin's email in "create" mode: refused, nothing changed, secret not used.
    const refused = await s.recover({ secret: SECRET, password: NEW_PASSWORD });
    assert.equal(refused.status, 409);
    assert.deepEqual(users(s.app.db), before);
    assert.equal((await s.call("/api/auth/me", "GET", undefined, { Cookie: oldSession })).value.user.email, OLD, "old session kept");
    assert.equal((await s.login(OLD, NEW_PASSWORD)).status, 401);
    assert(s.app.db.prepare("SELECT used_at FROM admin_recovery").get()?.used_at == null, "secret not consumed");
    s.close();

    // A separate test email: one new super_admin.
    s = await start(dir, recoveryConfig(env({ ADMIN_RECOVERY_EMAIL: TEST })), logs);
    const created = await s.recover({ secret: SECRET, password: NEW_PASSWORD });
    assert.deepEqual(created.value, { ok: true, action: "created" });
    const after = users(s.app.db);
    assert.equal(after.length, before.length + 1);
    assert.deepEqual(after.filter((u) => u.email !== TEST), before, "old admin and student unchanged");
    assert.equal((await s.login(OLD, "Old-admin-pass-2026")).status, 200, "old admin still signs in");

    // The test admin manages content (drafts stay drafts; nothing is published).
    const t = await s.login(TEST, NEW_PASSWORD);
    assert.equal(t.value.user.role, "super_admin");
    const who = { Cookie: t.cookie, "X-CSRF-Token": t.value.csrfToken };
    const nodes = await s.call("/api/admin/nodes", "GET", undefined, who);
    assert.equal(nodes.status, 200);
    assert(nodes.value.nodes.some((n) => n.id === "lesson-2" && n.status === "draft"));
    assert.equal((await s.call("/api/admin/users", "GET", undefined, who)).status, 200);
    const unit = nodes.value.nodes.find((n) => n.id === "egypt-treasures");
    const edit = await s.call("/api/admin/nodes/egypt-treasures", "PUT", { ...unit, title: "كنوز مصر (مراجعة)" }, who);
    assert.equal(edit.status, 200);
    assert.equal(edit.value.node.status, "draft");
    // Its writes still need the CSRF token.
    const noToken = await s.call("/api/admin/nodes/egypt-treasures", "PUT", { ...unit, title: "x" }, { Cookie: t.cookie });
    assert.equal(noToken.status, 403);
    assert.equal(noToken.value.reason, "csrf");
    assert.equal(s.app.db.prepare("SELECT count(*) n FROM nodes WHERE kind='lesson' AND status='published'").get().n, 0, "nothing published");
    assert.equal(s.app.db.prepare("SELECT enrollment FROM users WHERE id='s1'").get().enrollment, '{"gradeId":"grade-5"}');
    // Used once.
    assert.equal((await s.recover({ secret: SECRET, password: NEW_PASSWORD })).status, 404);
    const out = [...s.raw, ...logs].join("\n");
    assert(!out.includes(SECRET) && !out.includes(NEW_PASSWORD), "nothing secret in responses or logs");
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";

// The map teacher asks /api/ai/chat-status before the first question, so the
// consent box shows up front when the model may be used for this viewer.
async function start(options) {
  const dir = mkdtempSync(join(tmpdir(), "lamis-chat-status-"));
  let calls = 0;
  const app = createApp({
    dbPath: join(dir, "t.sqlite"),
    uploadDir: join(dir, "up"),
    aiKey: "",
    cloudflareAccountId: "",
    cloudflareToken: "",
    fetchImpl: async () => {
      calls += 1;
      throw Error("no model call expected");
    },
    ...options,
  });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const password = "test-password-only";
  const insert = app.db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)");
  insert.run("t1", "Teacher", "teacher@example.test", hashPassword(password), "teacher");
  insert.run("s1", "Pupil", "pupil@example.test", hashPassword(password), "student");
  const login = async (username) => {
    const r = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    assert.equal(r.status, 200);
    return { Cookie: r.headers.get("set-cookie").split(";")[0] };
  };
  const status = (headers = {}) => fetch(`${base}/api/ai/chat-status`, { headers }).then((r) => r.json());
  const health = () => fetch(`${base}/api/health`).then((r) => r.json());
  return {
    status,
    health,
    login,
    calls: () => calls,
    close: async () => {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("chat status: no model configured means no consent box for anyone", async () => {
  const s = await start({ aiProvider: "openai" });
  try {
    assert.deepEqual(await s.status(), { canAsk: false, consent: false });
    assert.deepEqual(await s.status(await s.login("teacher@example.test")), { canAsk: false, consent: false });
  } finally {
    await s.close();
  }
});

test("chat status: with Cloudflare and AI_STUDENT_ENABLED off, only staff may ask", async () => {
  const s = await start({ aiProvider: "cloudflare", cloudflareAccountId: "a".repeat(32), cloudflareToken: "tok", aiStudentEnabled: false });
  try {
    assert.deepEqual(await s.status(), { canAsk: false, consent: false }, "visitor");
    assert.deepEqual(await s.status(await s.login("pupil@example.test")), { canAsk: false, consent: false }, "student");
    assert.deepEqual(await s.status(await s.login("teacher@example.test")), { canAsk: true, consent: false }, "teacher");
    // The Render health check keeps its plain answer.
    assert.deepEqual(await s.health(), { ok: true });
    assert.equal(s.calls(), 0, "checking the status never calls the model");
  } finally {
    await s.close();
  }
});

test("chat status: with AI_STUDENT_ENABLED on, students and visitors may ask", async () => {
  const s = await start({ aiProvider: "cloudflare", cloudflareAccountId: "a".repeat(32), cloudflareToken: "tok", aiStudentEnabled: true });
  try {
    assert.deepEqual(await s.status(), { canAsk: true, consent: false }, "visitor");
    assert.deepEqual(await s.status(await s.login("pupil@example.test")), { canAsk: true, consent: false }, "student");
    assert.equal(s.calls(), 0);
  } finally {
    await s.close();
  }
});

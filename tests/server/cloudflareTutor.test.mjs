import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp, hashPassword } from "../../server/index.mjs";

test("Cloudflare tutor is staff-only by default and answers from reviewed, published lessons", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-cloudflare-"));
  let sent;
  let calls = 0;
  let upstreamStatus = 200;
  let output = { message: "الحديد خام معدني.", sourceIds: ["iron"], questionId: null };
  const account = "a".repeat(32);
  const app = createApp({
    dbPath: join(dir, "db.sqlite"),
    uploadDir: join(dir, "uploads"),
    aiProvider: "cloudflare",
    aiStudentEnabled: false,
    cloudflareAccountId: account,
    cloudflareToken: "test-token",
    allowedOrigin: undefined,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`);
      assert.equal(options.headers.Authorization, "Bearer test-token");
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({ success: true, result: { response: output } }), { status: upstreamStatus });
    },
  });
  const server = createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const insert = app.db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)");
    const password = "test-password-only";
    const hash = hashPassword(password);
    insert.run("admin", "STAFF_PRIVATE_NAME", "admin@example.test", hash, "content_admin");
    insert.run("pupil", "PUPIL_PRIVATE_NAME", "pupil@example.test", hash, "student");
    const content = {
      reviewRequired: false,
      sources: [
        { id: "iron", title: "الحديد", text: "الحديد خام معدني يستخدم في الصناعة.", approved: true },
        { id: "draft", title: "الحديد", text: "UNREVIEWED_PRIVATE", approved: false },
      ],
      questions: [{ id: "q1", type: "choice", prompt: "ما استخدام الحديد؟", answer: "ANSWER_PRIVATE" }],
    };
    const lesson = app.db.prepare("UPDATE nodes SET status=?,content=? WHERE id='lesson-1'");
    lesson.run("draft", JSON.stringify(content));
    async function login(username) {
      const res = await fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      assert.equal(res.status, 200);
      const { csrfToken } = await res.json();
      return { Cookie: res.headers.get("set-cookie").split(";")[0], "X-CSRF-Token": csrfToken };
    }
    const admin = await login("admin@example.test");
    const pupil = await login("pupil@example.test");
    const status = (headers) => fetch(base + "/api/ai/status", { headers }).then((r) => r.json());
    const ask = (headers, overrides = {}) => fetch(base + "/api/ai", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: "lesson-1", message: "اشرح الحديد", consent: true, ...overrides }),
    });
    assert.deepEqual(await status(admin), { configured: true, available: true, provider: "cloudflare" });
    assert.equal((await status(pupil)).available, false);
    assert.equal((await status({})).available, false);
    assert.equal((await ask(pupil)).status, 403);
    assert.equal((await ask(admin, { consent: false })).status, 400);
    assert.equal((await ask(admin)).status, 409);
    assert.equal(calls, 0);
    app.db.prepare("UPDATE nodes SET status='published' WHERE id='egypt-treasures'").run();
    lesson.run("published", JSON.stringify(content));
    const response = await ask(admin, { questionId: "q1", attempt: "ATTEMPT_PRIVATE", previousResponse: "PREVIOUS_PRIVATE" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: output.message, sourceIds: ["iron"], question: null });
    assert.equal(sent.response_format.type, "json_schema");
    assert.doesNotMatch(JSON.stringify(sent), /STAFF_PRIVATE_NAME|admin@example.test|UNREVIEWED_PRIVATE|ANSWER_PRIVATE|ATTEMPT_PRIVATE|PREVIOUS_PRIVATE/);
    output = { ...output, sourceIds: ["draft"] };
    assert.equal((await ask(admin)).status, 502);
    upstreamStatus = 429;
    assert.equal((await ask(admin)).status, 429);
  } finally {
    await new Promise((r) => server.close(r));
    app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

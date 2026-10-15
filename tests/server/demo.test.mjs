import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/index.mjs";
test("guest demo grades all eight types without publishing, answer leakage or durable results", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-demo-"));
  const app = createApp({
    dbPath: join(dir, "test.sqlite"),
    uploadDir: join(dir, "uploads"),
  });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = "GET", body, headers = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const demo = await request("/api/demo/lessons/lesson-1");
    assert.equal(demo.status, 200);
    assert.equal(demo.data.lesson.demo, true);
    assert.equal(demo.data.lesson.status, "draft");
    assert.equal(demo.data.lesson.content.reviewRequired, true);
    assert(demo.data.lesson.content.sources.every((s) => s.approved === false));
    assert(
      demo.data.lesson.content.questions.every(
        (q) => !("answer" in q) && !("explanation" in q),
      ),
    );
    assert.equal((await request("/api/demo/lessons/other")).status, 404);
    assert.equal((await request("/api/lessons/lesson-1")).status, 401);
    const seed = JSON.parse(
      readFileSync(
        new URL("../../server/seed-content.json", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(new Set(seed.questions.map((q) => q.type)).size, 8);
    for (const q of seed.questions) {
      const wrong = await request(
        "/api/demo/lessons/lesson-1/answers",
        "POST",
        { questionId: q.id, answer: "wrong" },
      );
      assert.equal(wrong.data.correct, false);
      assert.equal(wrong.data.explanation, "");
      const right = await request(
        "/api/demo/lessons/lesson-1/answers",
        "POST",
        { questionId: q.id, answer: q.answer },
      );
      assert.equal(right.status, 200);
      assert.equal(right.data.correct, true);
      assert.equal(right.data.awarded, 0);
      assert.equal(right.data.demo, true);
    }
    assert.equal(
      (
        await request("/api/demo/lessons/lesson-1/answers", "POST", {
          questionId: "missing",
          answer: "x",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/api/demo/lessons/lesson-1/answers", "POST", {
          questionId: seed.questions[0].id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          "/api/demo/lessons/lesson-1/answers",
          "POST",
          { questionId: seed.questions[0].id, answer: "x" },
          { Origin: "https://other.invalid" },
        )
      ).status,
      403,
    );
    for (const table of ["users", "answers", "rewards", "learning_state"])
      assert.equal(
        app.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
        0,
      );
    assert.equal(
      app.db.prepare("SELECT status FROM nodes WHERE id='lesson-1'").get()
        .status,
      "draft",
    );
    assert.equal((await request("/api/admin/nodes")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

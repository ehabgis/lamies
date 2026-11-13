import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";
import { fullContent } from "../../server/demo.mjs";
import { bundledReview } from "../../src/platform/adminDraft.js";

// What the content editor says about a bundled lesson must stay true:
// - its own objectives, intro, summary, concepts, facts, references,
//   resources and questions do not reach the student (read-only in the editor);
// - its title, smart-teacher sources and their approval, the review flag and
//   publication do;
// - "ready to publish" in the editor is the server's own publish rule.
const GRADE5 = { stageId: "primary", gradeId: "grade-5", termId: "grade-5-term-1", yearId: "grade-5-term-1-2026" };

async function start(dir) {
  const app = createApp({ dbPath: join(dir, "t.sqlite"), uploadDir: join(dir, "up"), aiKey: "", cloudflareAccountId: "", cloudflareToken: "" });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, method = "GET", body, who) => {
    const r = await fetch(base + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(who ? { Cookie: who.cookie, "X-CSRF-Token": who.csrf } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, value: await r.json().catch(() => ({})) };
  };
  const login = async (email) => {
    const r = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: email, password: "pw-test-only" }) });
    return { cookie: r.headers.get("set-cookie").split(";")[0], csrf: (await r.json()).csrfToken };
  };
  return { app, call, login, close: () => { server.close(); app.close?.(); } };
}

test("bundled lesson: ignored fields never reach the student; title, sources, review and publication do", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-bundled-fields-"));
  const s = await start(dir);
  try {
    const db = s.app.db;
    const add = db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)");
    add.run("adm", "Admin", "adm@t.test", hashPassword("pw-test-only"), "super_admin");
    add.run("stu", "Student", "stu@t.test", hashPassword("pw-test-only"), "student");
    const admin = await s.login("adm@t.test"), stu = await s.login("stu@t.test");
    assert.equal((await s.call("/api/enrollment", "PUT", GRADE5, stu)).status, 200);
    // The unit is published in this test database only, so the lesson is visible once published.
    db.prepare("UPDATE nodes SET status='published' WHERE id='egypt-treasures'").run();

    const nodes = (await s.call("/api/admin/nodes", "GET", null, admin)).value.nodes;
    const node = nodes.find((n) => n.id === "lesson-2");
    assert.equal(node.content.bundled, true);
    // Sample sources arrive unapproved; the editor's summary agrees with the server.
    assert(node.content.sources.length > 0 && node.content.sources.every((x) => x.approved === false));
    assert.deepEqual(
      { ...bundledReview(node), total: undefined },
      { published: false, reviewed: false, approved: 0, usesBundledSources: false, canPublish: false, total: undefined },
    );

    // An admin edits the fields the editor shows read-only, plus the title.
    const edited = {
      ...node,
      title: "موارد المياه · عنوان معدّل",
      content: {
        ...node.content,
        objectives: ["هدف كتبه المدير"],
        intro: "مقدمة كتبها المدير",
        summary: "ملخص كتبه المدير",
        facts: ["حقيقة كتبها المدير"],
        references: ["مرجع كتبه المدير"],
        resources: [],
        questions: [],
      },
    };
    const put = await s.call("/api/admin/nodes/lesson-2", "PUT", edited, admin);
    assert.equal(put.status, 200);
    // Saved as sent (no data is dropped)...
    assert.deepEqual(put.value.node.content.objectives, ["هدف كتبه المدير"]);
    assert.deepEqual(put.value.node.content.facts, ["حقيقة كتبها المدير"]);

    // ...but the student's lesson (admin preview uses the same content) is the bundled one.
    const full = fullContent("lesson-2");
    const seen = (await s.call("/api/lessons/lesson-2", "GET", null, admin)).value.lesson;
    assert.equal(seen.title, "موارد المياه · عنوان معدّل", "the title does reach the student");
    assert.deepEqual(seen.content.objectives, full.objectives);
    assert.equal(seen.content.intro, full.intro);
    assert.equal(seen.content.summary, full.summary);
    assert.equal(seen.content.facts, full.facts);
    assert.equal(seen.content.references, full.references);
    assert.equal(seen.content.resources.length, full.resources.length);
    assert(seen.content.questions.length > 0, "bundled questions, not the emptied list");

    // Publishing needs the review flag and one approved source: exactly the editor's "ready to publish".
    const pub = (content) => s.call("/api/admin/nodes/lesson-2", "PUT", { ...edited, status: "published", content }, admin);
    const reviewedOnly = { ...edited.content, reviewRequired: false };
    assert.equal(bundledReview({ status: "draft", content: reviewedOnly }).canPublish, false);
    assert.equal((await pub(reviewedOnly)).status, 400);
    assert.equal((await s.call("/api/lessons/lesson-2", "GET", null, stu)).status, 403, "still a draft for students");

    const approvedOne = {
      ...reviewedOnly,
      sources: reviewedOnly.sources.map((x, i) => (i === 0 ? { ...x, approved: true } : x)),
    };
    assert.equal(bundledReview({ status: "draft", content: approvedOne }).canPublish, true);
    assert.equal((await pub(approvedOne)).status, 200);

    // Now the student sees it, with the source approval as the CMS decided.
    const student = await s.call("/api/lessons/lesson-2", "GET", null, stu);
    assert.equal(student.status, 200);
    assert.deepEqual(student.value.lesson.content.objectives, full.objectives);
    assert.deepEqual(
      student.value.lesson.content.sources.map((x) => x.approved),
      approvedOne.sources.map((x) => x.approved),
    );
    assert(student.value.lesson.content.questions.every((q) => q.answer === undefined));
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a lesson without saved sources falls back to bundled ones, always unapproved", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-bundled-fields-"));
  const s = await start(dir);
  try {
    const db = s.app.db;
    db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)").run("adm", "Admin", "adm@t.test", hashPassword("pw-test-only"), "super_admin");
    const admin = await s.login("adm@t.test");
    const node = (await s.call("/api/admin/nodes", "GET", null, admin)).value.nodes.find((n) => n.id === "lesson-3");
    const noSources = { ...node, content: { ...node.content, sources: [] } };
    assert.equal((await s.call("/api/admin/nodes/lesson-3", "PUT", noSources, admin)).status, 200);
    assert.equal(bundledReview(noSources).usesBundledSources, true);
    const seen = (await s.call("/api/lessons/lesson-3", "GET", null, admin)).value.lesson;
    assert(seen.content.sources.length > 0);
    assert(seen.content.sources.every((x) => x.approved === false));
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

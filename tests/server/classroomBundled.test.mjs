import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";
import { fullContent } from "../../server/demo.mjs";

// The three lessons of «كنوز مصر» open in a signed-in student's /classroom
// with the same bundled content and activities as the visitor's sample, once
// an admin has published them. The sample (/demo) keeps nothing in an account.
const GRADE5 = { stageId: "primary", gradeId: "grade-5", termId: "grade-5-term-1", yearId: "grade-5-term-1-2026" };
const GRADE4 = { stageId: "primary", gradeId: "grade-4", termId: "grade-4-term-1", yearId: "grade-4-term-1-2026" };

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

test("bundled lessons: drafts until published, then full content and recorded progress in /classroom", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-bundled-"));
  let s = await start(dir);
  try {
    const db = s.app.db;
    const row = (id) => db.prepare("SELECT status,parent_id,content,version FROM nodes WHERE id=?").get(id);
    // Lessons 2 and 3 exist as bundled drafts under «كنوز مصر»; lesson 1 (untouched seed) is bundled; nothing published.
    for (const id of ["lesson-1", "lesson-2", "lesson-3"]) {
      assert.equal(row(id).status, "draft", id);
      assert.equal(row(id).parent_id, "egypt-treasures");
      assert.equal(JSON.parse(row(id).content).bundled, true, id);
    }
    assert.equal(row("egypt-treasures").status, "draft");
    const add = db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)");
    add.run("s5", "Five", "five@t.test", hashPassword("pw-test-only"), "student");
    add.run("s4", "Four", "four@t.test", hashPassword("pw-test-only"), "student");
    add.run("s5b", "Other", "other@t.test", hashPassword("pw-test-only"), "student");
    const five = await s.login("five@t.test"), four = await s.login("four@t.test"), other = await s.login("other@t.test");
    assert.equal((await s.call("/api/enrollment", "PUT", GRADE5, five)).status, 200);
    assert.equal((await s.call("/api/enrollment", "PUT", GRADE4, four)).status, 200);
    assert.equal((await s.call("/api/enrollment", "PUT", GRADE5, other)).status, 200);

    // Drafts: absent from the catalog, refused in the classroom and its activities.
    assert(!(await s.call("/api/catalog", "GET", null, five)).value.nodes.some((n) => n.kind === "lesson"));
    assert.equal((await s.call("/api/lessons/lesson-2", "GET", null, five)).status, 403);
    assert.equal((await s.call("/api/lessons/lesson-2/expedition", "GET", null, five)).status, 403);

    // Published (in this test database only).
    db.prepare("UPDATE nodes SET status='published' WHERE id IN ('egypt-treasures','lesson-1','lesson-2','lesson-3')").run();
    const cat = (await s.call("/api/catalog", "GET", null, five)).value.nodes.filter((n) => n.kind === "lesson");
    assert.deepEqual(cat.map((n) => n.id), ["lesson-1", "lesson-2", "lesson-3"]);
    assert(cat.every((n) => n.bundled === true && !n.demo && !n.demoLessonId), "classroom lessons, not sample links");

    // Full bundled content (textbook source, resources, activities), answers hidden.
    const l2 = await s.call("/api/lessons/lesson-2", "GET", null, five);
    assert.equal(l2.status, 200);
    assert.equal(l2.value.lesson.bundled, true);
    const full2 = fullContent("lesson-2");
    assert.equal(l2.value.lesson.content.resources.length, full2.resources.length);
    assert(l2.value.lesson.content.sources.some((src) => src.id === "textbook-unit3" && src.approved === false));
    assert(l2.value.lesson.content.questions.length > 0);
    assert(l2.value.lesson.content.questions.every((q) => q.answer === undefined && q.explanation === undefined && q.hints === undefined));
    for (const a of ["expedition", "book", "build-map", "trace"])
      assert.equal((await s.call(`/api/lessons/lesson-2/${a}`, "GET", null, five)).status, 200, a);

    // Who may not: a visitor, another grade, a stale CSRF token.
    assert.equal((await s.call("/api/lessons/lesson-3/expedition")).status, 401);
    assert.equal((await s.call("/api/lessons/lesson-3/expedition", "GET", null, four)).status, 403);
    assert.equal((await s.call("/api/lessons/lesson-3", "GET", null, four)).status, 403);
    const stale = await s.call("/api/lessons/lesson-3/expedition/check", "POST", { missionId: "new-delta", step: "use", answer: "نشتري قمحًا أقل من الخارج" }, { ...five, csrf: "wrong" });
    assert.equal(stale.status, 403);
    assert.equal(stale.value.reason, "csrf");

    // Lesson 3 in the classroom: journey, main activity, five short questions.
    const events = () => db.prepare("SELECT lesson_id,kind,item_id FROM activity_events WHERE user_id='s5' ORDER BY id").all();
    const early = await s.call("/api/lessons/lesson-3/complete", "POST", {}, five);
    assert.equal(early.status, 409, "not complete before its requirements");
    for (const [missionId, answer] of [["new-delta", "نشتري قمحًا أقل من الخارج"], ["birket-ghalioun", "يوفّر الأسماك وفرص العمل"], ["benban-solar", "لأن الشمس تسطع فيها معظم العام"]]) {
      const r = await s.call("/api/lessons/lesson-3/expedition/check", "POST", { missionId, step: "use", answer, attempt: 1 }, five);
      assert.equal(r.value.correct, true, missionId);
    }
    const full3 = fullContent("lesson-3");
    const act = full3.questions.find((q) => q.id === "book-l3-match-goals");
    assert.equal((await s.call("/api/lessons/lesson-3/answers", "POST", { questionId: act.id, answer: act.answer }, five)).value.correct, true);
    for (const q of full3.questions.filter((x) => ["choice", "boolean"].includes(x.type) && !x.kind && !x.duplicateOf).slice(0, 5))
      assert.equal((await s.call("/api/lessons/lesson-3/answers", "POST", { questionId: q.id, answer: q.answer }, five)).value.correct, true, q.id);
    const done = await s.call("/api/lessons/lesson-3/complete", "POST", {}, five);
    assert.equal(done.status, 200, JSON.stringify(done.value));
    assert.equal(done.value.awarded, 30);
    // Saved: answers, journey events, reward; restored when reopened.
    const again = await s.call("/api/lessons/lesson-3", "GET", null, five);
    assert(again.value.progress.completed);
    assert.equal(again.value.progress.answers.filter((a) => a.correct).length, 6);
    assert.equal(events().filter((e) => e.kind === "journey").length, 3);
    const progress = (await s.call("/api/progress", "GET", null, five)).value;
    assert.equal(progress.xp, 30);
    // Another student sees none of it.
    const theirs = await s.call("/api/lessons/lesson-3", "GET", null, other);
    assert.equal(theirs.value.progress.answers.length, 0);
    assert(!theirs.value.progress.completed);

    // The sample keeps nothing in an account, signed in or not.
    const before = { answers: db.prepare("SELECT count(*) c FROM answers").get().c, events: events().length };
    const q1 = fullContent("lesson-1").questions.find((q) => q.type === "choice" && !q.duplicateOf);
    assert.equal((await s.call("/api/demo/lessons/lesson-1/answers", "POST", { questionId: q1.id, answer: q1.answer }, five)).value.correct, true);
    await s.call("/api/demo/lessons/lesson-2/expedition/check", "POST", { missionId: "farm", step: "use", answer: "x" }, five);
    await s.call("/api/demo/lessons/lesson-1/answers", "POST", { questionId: q1.id, answer: q1.answer });
    assert.equal(db.prepare("SELECT count(*) c FROM answers").get().c, before.answers);
    assert.equal(events().length, before.events);
    // Visitors keep the sample.
    assert.equal((await s.call("/api/demo/lessons/lesson-2")).status, 200);
    assert.equal((await s.call("/api/demo/lessons/lesson-3/expedition")).status, 200);
    assert.equal((await s.call("/api/demo/lessons/lesson-9/expedition")).status, 404);

    // A restart neither duplicates nor changes the lessons; an admin's later
    // edit of lesson 1 is kept and it is no longer bundled.
    db.prepare("UPDATE nodes SET title='عنوان المسؤول', version=version+1, content=? WHERE id='lesson-1'").run(JSON.stringify({ questions: [] }));
    db.prepare("UPDATE nodes SET title='درس المياه' WHERE id='lesson-2'").run();
    s.close();
    s = await start(dir);
    assert.equal(s.app.db.prepare("SELECT count(*) c FROM nodes WHERE id IN ('lesson-1','lesson-2','lesson-3')").get().c, 3);
    assert.equal(s.app.db.prepare("SELECT title FROM nodes WHERE id='lesson-2'").get().title, "درس المياه");
    assert.equal(JSON.parse(s.app.db.prepare("SELECT content FROM nodes WHERE id='lesson-1'").get().content).bundled, undefined);
    const five2 = await s.login("five@t.test");
    assert.equal((await s.call("/api/lessons/lesson-1/expedition", "GET", null, five2)).status, 404);
    const l1 = await s.call("/api/lessons/lesson-1", "GET", null, five2);
    assert.equal(l1.value.lesson.bundled, undefined);
    assert.equal(l1.value.lesson.title, "عنوان المسؤول");
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

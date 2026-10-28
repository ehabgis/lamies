import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/index.mjs";
import { demoLesson } from "../../server/demo.mjs";

test("a linked parent sees only their child's graded progress", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-parent-"));
  const app = createApp({ dbPath: join(dir, "t.sqlite"), uploadDir: join(dir, "up") });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (path, method = "GET", data, who = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(who.cookie ? { Cookie: who.cookie, "X-CSRF-Token": who.csrf } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { status: r.status, value: await r.json(), cookie: r.headers.get("set-cookie")?.split(";")[0] };
  };
  const signUp = async (name, email, role) => {
    const r = await api("/api/auth/register", "POST", { name, email, password: "long-password-123", ...(role ? { role } : {}) });
    assert.equal(r.status, 201, JSON.stringify(r.value));
    return { cookie: r.cookie, csrf: r.value.csrfToken, id: r.value.user.id, role: r.value.user.role };
  };
  try {
    assert.equal((await api("/api/auth/register", "POST", { name: "معلم", email: "t@e.st", password: "long-password-123", role: "teacher" })).status, 403);
    const ahmed = await signUp("أحمد محمد", "ahmed@example.test");
    const mona = await signUp("منى علي", "mona@example.test");
    const parent = await signUp("محمد علي", "parent@example.test", "parent");
    const stranger = await signUp("ولي أمر آخر", "other@example.test", "parent");
    assert.equal(parent.role, "parent");

    // Ahmed: lesson 1 journey final, the classify activity, 5 questions (3 right first time).
    const qs = demoLesson("lesson-1").content.questions.filter((q) => ["choice", "boolean"].includes(q.type) && !q.kind).slice(0, 5);
    for (const [i, q] of qs.entries()) {
      const wrong = q.type === "boolean" ? "nope" : "إجابة خاطئة";
      await api("/api/demo/lessons/lesson-1/answers", "POST", { questionId: q.id, answer: i < 2 ? wrong : "x", attempt: 1 }, ahmed);
    }
    await api("/api/demo/lessons/lesson-1/answers", "POST", {
      questionId: "book-l1-drag-energy",
      answer: { "البترول": "مصادر غير متجددة", "الفحم": "مصادر غير متجددة", "الغاز الطبيعي": "مصادر غير متجددة", "الطاقة الشمسية": "مصادر متجددة", "طاقة الرياح": "مصادر متجددة", "الطاقة الكهرومائية": "مصادر متجددة" },
    }, ahmed);
    await api("/api/demo/lessons/lesson-3/expedition/check", "POST", { missionId: "new-delta", step: "use", answer: "نشتري قمحًا أقل من الخارج", attempt: 1 }, ahmed);
    // Anonymous demo use records nothing.
    await api("/api/demo/lessons/lesson-3/expedition/check", "POST", { missionId: "birket-ghalioun", step: "use", answer: "يوفّر الأسماك وفرص العمل" });

    // Only a student can make a code; it works once.
    assert.equal((await api("/api/parent/link-code", "POST", {}, parent)).status, 403);
    const code = (await api("/api/parent/link-code", "POST", {}, ahmed)).value.code;
    assert.match(code, /^[A-Z2-9]{6}$/);
    assert.equal((await api("/api/parent/children", "GET", null, ahmed)).status, 403);
    assert.equal((await api("/api/parent/link", "POST", { code: "WRONG1" }, parent)).status, 400);
    assert.equal((await api("/api/parent/link/preview", "POST", { code: "WRONG1" }, parent)).status, 400);
    assert.equal((await api("/api/parent/link/preview", "POST", { code }, ahmed)).status, 403);
    const preview = await api("/api/parent/link/preview", "POST", { code }, parent);
    assert.equal(preview.value.child.name, "أحمد محمد", "the parent checks the name before linking");
    assert.deepEqual(Object.keys(preview.value.child).sort(), ["grade", "name"]);
    assert.equal((await api("/api/parent/link", "POST", { code: code.toLowerCase() }, parent)).status, 200);
    assert.equal((await api("/api/parent/link", "POST", { code }, stranger)).status, 400, "used codes do not work again");

    const kids = (await api("/api/parent/children", "GET", null, parent)).value.children;
    assert.deepEqual(kids.map((k) => k.name), ["أحمد محمد"]);
    const r = kids[0];
    assert.equal(r.totals.answered, 5);
    assert.equal(r.lessons[0].questions.answered, 5);
    assert(r.lessons[0].steps[1].done, "classify activity done");
    assert.equal(r.lessons[0].steps[0].done, false, "journey not finished");
    assert.equal(r.lessons[0].status, "active");
    assert.equal(r.lessons[2].status, "active");
    assert.equal(r.lessons[1].status, "new");
    assert.match(r.summary, /^أحمد يتعلّم الآن/);
    assert(r.recent.some((x) => /أجاب عن 5 أسئلة/.test(x.text)));
    assert.equal(r.period, "all");
    const week = (await api("/api/parent/children?period=week", "GET", null, parent)).value.children[0];
    assert.equal(week.period, "week");
    assert.equal(week.totals.answered, 5, "today's answers are inside this week");
    assert(Array.isArray(r.lessons[0].wrong) && r.lessons[0].wrong.length === 5, "missed prompts are listed (prompts only)");
    assert(!("firstTries" in r.lessons[0]));
    assert.deepEqual((await api("/api/parent/children", "GET", null, stranger)).value.children, []);
    assert(!JSON.stringify(kids).includes("mona"), "other students stay private");

    assert.equal((await api(`/api/parent/children/${ahmed.id}`, "DELETE", null, parent)).status, 200);
    assert.deepEqual((await api("/api/parent/children", "GET", null, parent)).value.children, []);
  } finally {
    await new Promise((r) => server.close(r));
    app.close?.();
    rmSync(dir, { recursive: true, force: true });
  }
});

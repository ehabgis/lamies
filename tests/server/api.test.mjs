import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, hashPassword } from "../../server/index.mjs";
test("durable server auth, authorization, curriculum, grading and transactional CMS", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-api-"));
  const dbPath = join(dir, "test.sqlite");
  let app = createApp({ dbPath, uploadDir: join(dir, "uploads") });
  let server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let base = `http://127.0.0.1:${server.address().port}`;
  const api = async (path, method = "GET", data, client = {}, extra = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(client.cookie
          ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf }
          : {}),
        ...extra,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const value = await response.json();
    return {
      status: response.status,
      value,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    assert.equal((await api("/api/admin/nodes")).status, 401);
    const registration = await api("/api/auth/register", "POST", {
      name: "طالب تجريبي",
      email: "student@example.test",
      password: "long-password-123",
      role: "super_admin",
    });
    assert.equal(registration.status, 403);
    const reg = await api("/api/auth/register", "POST", {
      name: "طالب تجريبي",
      email: "student@example.test",
      password: "long-password-123",
    });
    assert.equal(reg.status, 201);
    const student = { cookie: reg.cookie, csrf: reg.value.csrfToken };
    const studentId = reg.value.user.id;
    assert.equal(
      (
        await api(
          "/api/enrollment",
          "PUT",
          {},
          { cookie: student.cookie, csrf: "bad" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api("/api/auth/logout", "POST", {}, student, {
          Origin: "https://attacker.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await api("/api/admin/nodes", "GET", undefined, student)).status,
      403,
    );
    assert.equal(
      (
        await api(
          "/api/enrollment",
          "PUT",
          {
            stageId: "primary",
            gradeId: "grade-4",
            termId: "grade-5-term-1",
            yearId: "grade-5-term-1-2026",
          },
          student,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await api(
          "/api/enrollment",
          "PUT",
          {
            stageId: "primary",
            gradeId: "grade-5",
            termId: "grade-5-term-1",
            yearId: "grade-5-term-1-2026",
          },
          student,
        )
      ).status,
      200,
    );
    assert.equal(
      (await api("/api/lessons/lesson-1", "GET", undefined, student)).status,
      403,
    );
    app.db
      .prepare(
        "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
      )
      .run(
        "admin",
        "مدير",
        "admin@example.test",
        hashPassword("secure-admin-123"),
        "super_admin",
      );
    const login = await api("/api/auth/login", "POST", {
      email: "admin@example.test",
      password: "secure-admin-123",
    });
    const admin = { cookie: login.cookie, csrf: login.value.csrfToken };
    assert.equal(login.status, 200);
    assert.match(login.cookie, /lamis_session=/);
    const photo = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9N8AAAAASUVORK5CYII=",
      "base64",
    );
    const uploadPhoto = (client) =>
      fetch(base + "/api/admin/media", {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          Cookie: client.cookie,
          "X-CSRF-Token": client.csrf,
        },
        body: photo,
      });
    assert.equal((await uploadPhoto(student)).status, 403);
    const uploaded = await uploadPhoto(admin);
    assert.equal(uploaded.status, 201);
    const imageUrl = (await uploaded.json()).media.url;
    assert.equal((await fetch(base + imageUrl)).status, 401);
    assert.equal(
      (await fetch(base + imageUrl, { headers: { Cookie: student.cookie } }))
        .status,
      403,
    );

    assert.equal(
      (
        await api(
          "/api/admin/nodes/lesson-1",
          "PUT",
          { status: "published" },
          admin,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await api(
          "/api/admin/nodes/egypt-treasures",
          "PUT",
          { status: "published" },
          admin,
        )
      ).status,
      200,
    );
    const content = {
      resources: [
        {
          id: "iron",
          label: "الحديد",
          kind: "mineral",
          locations: [],
          media: { image: imageUrl },
        },
      ],
      reviewRequired: false,
      sources: [{ id: "source", text: "مصدر مراجع للمعلم", approved: true }],
      questions: [
        {
          id: "q1",
          type: "choice",
          prompt: "سؤال",
          options: ["أ", "ب"],
          answer: "أ",
          hint: "فكر في المصدر",
          explanation: "تفسير الإجابة",
        },
      ],
      completionXp: 30,
    };
    assert.equal(
      (
        await api(
          "/api/admin/nodes/lesson-1",
          "PUT",
          { status: "published", content },
          admin,
        )
      ).status,
      200,
    );
    const lesson = await api(
      "/api/lessons/lesson-1",
      "GET",
      undefined,
      student,
    );
    assert.equal(lesson.status, 200);
    assert.equal(
      lesson.value.lesson.content.resources[0].media.image,
      imageUrl,
    );
    const studentPhoto = await fetch(base + imageUrl, {
      headers: { Cookie: student.cookie },
    });
    assert.equal(studentPhoto.status, 200);
    assert.equal(studentPhoto.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await studentPhoto.arrayBuffer()), photo);

    assert.equal(
      (
        await api(
          "/api/lessons/lesson-1/state",
          "PUT",
          { mode: "quiz", questionId: "q1" },
          student,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await api(
          "/api/lessons/lesson-1/state",
          "PUT",
          { resourceId: "invented" },
          student,
        )
      ).status,
      400,
    );
    assert.equal(
      (await api("/api/lessons/lesson-1/state", "PUT", { xp: 1000 }, student))
        .status,
      400,
    );
    assert.equal(lesson.value.lesson.content.questions[0].answer, undefined);
    assert.equal(
      lesson.value.lesson.content.questions[0].explanation,
      undefined,
    );
    assert.equal(
      (
        await api(
          "/api/lessons/lesson-1/answers",
          "POST",
          { questionId: "q1" },
          student,
        )
      ).status,
      400,
    );
    assert.equal(
      (await api("/api/lessons/lesson-1/complete", "POST", {}, student)).status,
      409,
    );
    const wrong = await api(
      "/api/lessons/lesson-1/answers",
      "POST",
      { questionId: "q1", answer: "ب" },
      student,
    );
    assert.equal(wrong.value.correct, false);
    assert.equal(wrong.value.explanation, "");
    assert.equal(
      (
        await api(
          "/api/lessons/lesson-1/answers",
          "POST",
          { questionId: "q1", answer: "أ" },
          student,
        )
      ).value.correct,
      true,
    );
    assert.equal(
      (await api("/api/lessons/lesson-1/complete", "POST", {}, student)).value
        .awarded,
      30,
    );
    assert.equal(
      (await api("/api/lessons/lesson-1/complete", "POST", {}, student)).value
        .awarded,
      0,
    );
    const badImport = await api(
      "/api/admin/import",
      "POST",
      {
        nodes: [
          { id: "new-stage", kind: "stage", title: "مرحلة" },
          { id: "bad", kind: "lesson", parentId: "new-stage", title: "خطأ" },
        ],
      },
      admin,
    );
    assert.equal(badImport.status, 400);
    assert.equal(
      app.db.prepare("SELECT id FROM nodes WHERE id=?").get("new-stage"),
      undefined,
    );
    assert.equal(
      (await api("/api/admin/nodes/lesson-1/history", "GET", undefined, admin))
        .value.history.length,
      1,
    );
    assert.equal(
      (
        await api(
          "/api/ai",
          "POST",
          { lessonId: "lesson-1", message: "اشرح مصدر المعلم", consent: true },
          student,
        )
      ).status,
      503,
    );
    const teacherCreated = await api(
      "/api/admin/users",
      "POST",
      {
        name: "معلم",
        email: "teacher@example.test",
        password: "teacher-pass-123",
        role: "teacher",
      },
      admin,
    );
    assert.equal(teacherCreated.status, 201);
    const teacherId = teacherCreated.value.user.id;
    await api(`/api/admin/users/${studentId}`, "PUT", { teacherId }, admin);
    const tl = await api("/api/auth/login", "POST", {
      email: "teacher@example.test",
      password: "teacher-pass-123",
    });
    const teacher = { cookie: tl.cookie, csrf: tl.value.csrfToken };
    assert.equal(
      (await api("/api/reports", "GET", undefined, teacher)).value.students
        .length,
      1,
    );
    assert.equal(
      (await api("/api/admin/users", "GET", undefined, teacher)).status,
      403,
    );
    await new Promise((r) => server.close(r));
    app.close();
    app = createApp({ dbPath, uploadDir: join(dir, "uploads") });
    server = http.createServer(app.handler);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}`;
    const again = await api("/api/auth/login", "POST", {
      email: "student@example.test",
      password: "long-password-123",
    });
    const restored = { cookie: again.cookie, csrf: again.value.csrfToken };
    const durableProgress = (
      await api("/api/progress", "GET", undefined, restored)
    ).value;
    assert.equal(durableProgress.xp, 30);
    assert.equal(durableProgress.lastLessonId, "lesson-1");
    assert.equal(durableProgress.lessons[0].percent, 100);
    assert.deepEqual(durableProgress.lessons[0].state, {
      mode: "quiz",
      questionId: "q1",
    });
    assert.deepEqual(
      (await api("/api/lessons/lesson-1", "GET", undefined, restored)).value
        .progress.state,
      { mode: "quiz", questionId: "q1" },
    );
    await api(
      `/api/admin/users/${studentId}`,
      "PUT",
      { enabled: false },
      admin,
    );
    assert.equal(
      (await api("/api/auth/me", "GET", undefined, restored)).value.user,
      null,
    );
  } finally {
    await new Promise((r) => server.close(r));
    app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AI uses only ranked approved context without identity and rejects ungrounded results", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-ai-"));
  let sent;
  let output = {
    message: "الحديد مورد معدني.",
    sourceIds: ["iron-source"],
    questionId: "q1",
  };
  let calls = 0;
  const app = createApp({
    dbPath: join(dir, "db.sqlite"),
    uploadDir: join(dir, "up"),
    aiKey: "test-not-real",
    fetchImpl: async (_url, options) => {
      calls++;
      sent = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(output) }],
            },
          ],
        }),
      };
    },
  });
  const db = app.db;
  db.prepare(
    "INSERT INTO users(id,name,email,password,role,enrollment) VALUES(?,?,?,?,?,?)",
  ).run(
    "s",
    "PRIVATE CHILD NAME",
    "private@example.test",
    hashPassword("long-test-pass"),
    "student",
    JSON.stringify({ yearId: "grade-5-term-1-2026" }),
  );
  db.prepare(
    "UPDATE nodes SET status='published' WHERE id='egypt-treasures'",
  ).run();
  db.prepare(
    "UPDATE nodes SET status='published',content=? WHERE id='lesson-1'",
  ).run(
    JSON.stringify({
      reviewRequired: false,
      sources: [
        {
          id: "iron-source",
          title: "الحديد",
          text: "الحديد مورد معدني يستخدم في صناعة الصلب.",
          approved: true,
        },
        {
          id: "secret-draft",
          text: "الحديد معلومة غير مراجعة",
          approved: false,
        },
        { id: "water", text: "المياه في نهر النيل", approved: true },
      ],
      questions: [
        {
          id: "q1",
          type: "choice",
          prompt: "ما المورد؟",
          options: ["الحديد"],
          answer: "الحديد",
        },
      ],
    }),
  );
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "PRIVATE@EXAMPLE.TEST",
        password: "long-test-pass",
      }),
    });
    const auth = await login.json();
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const ask = async (message, extra = {}) =>
      fetch(base + "/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          "X-CSRF-Token": auth.csrfToken,
        },
        body: JSON.stringify({
          lessonId: "lesson-1",
          message,
          mode: "question",
          consent: true,
          ...extra,
        }),
      });
    // Email matching normalizes lowercase, so seed account consistently.
    if (login.status !== 200) assert.fail(JSON.stringify(auth));
    assert.equal((await ask("اشرح الحديد")).status, 200);
    assert.equal(calls, 1);
    const context = JSON.stringify(sent);
    assert.ok(!context.includes("PRIVATE"));
    assert.ok(!context.includes("secret-draft"));
    assert.ok(!context.includes("water"));
    assert.equal(
      JSON.parse(sent.input).context.questionBank[0].answer,
      undefined,
    );
    assert.equal(sent.store, false);
    assert.equal(sent.text.format.type, "json_schema");
    const guided = await ask("ساعدني في سؤال الحديد", {
      questionId: "q1",
      attempt: "النحاس",
      previousResponse: "فكر في خام الحديد",
    });
    assert.equal(guided.status, 200);
    const guidedPayload = await guided.json();
    const assessment = JSON.parse(sent.input).context.assessment;
    assert.equal(assessment.questionId, "q1");
    assert.equal(assessment.approvedAnswer, "الحديد");
    assert.equal(assessment.studentAttempt, "النحاس");
    assert.equal(
      JSON.parse(sent.input).context.previousResponse,
      "فكر في خام الحديد",
    );
    assert.equal(guidedPayload.approvedAnswer, undefined);
    assert.equal(guidedPayload.question.answer, undefined);
    assert.equal((await ask("الحديد", { questionId: "fake" })).status, 400);
    assert.equal(
      (await ask("الحديد", { previousResponse: "x".repeat(1001) })).status,
      400,
    );
    output = { message: "إجابة", sourceIds: ["invented"], questionId: null };
    assert.equal((await ask("الحديد")).status, 502);
    output = {
      message: "إجابة",
      sourceIds: ["iron-source"],
      questionId: "not-in-bank",
    };
    assert.equal((await ask("الحديد")).status, 502);
    const prior = calls;
    assert.equal((await ask("الديناصورات والمجرات")).status, 409);
    assert.equal(calls, prior);
  } finally {
    await new Promise((r) => server.close(r));
    app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("all eight question shapes, Arabic blanks, malformed requests and Vite proxy origin", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-types-"));
  const app = createApp({
    dbPath: join(dir, "db"),
    uploadDir: join(dir, "up"),
  });
  const questions = [
    { id: "choice", type: "choice", answer: "iron" },
    { id: "boolean", type: "boolean", answer: false },
    { id: "order", type: "order", answer: ["first", "second"] },
    { id: "match", type: "match", answer: { a: "one", b: "two" } },
    { id: "drag", type: "drag", answer: { solar: "renewable" } },
    { id: "map", type: "map", answer: "bahariya" },
    { id: "blank", type: "blank", answer: "الطاقة الشمسية" },
    { id: "image", type: "image-match", answer: { sun: "solar" } },
  ].map((q) => ({
    ...q,
    prompt: q.id,
    hint: "تلميح",
    explanation: "لا يظهر قبل الحل",
  }));
  app.db
    .prepare(
      "INSERT INTO users(id,name,email,password,role,enrollment) VALUES(?,?,?,?,?,?)",
    )
    .run(
      "s",
      "طالب",
      "student",
      hashPassword("long-pass-123"),
      "student",
      JSON.stringify({ yearId: "grade-5-term-1-2026" }),
    );
  app.db
    .prepare("UPDATE nodes SET status='published' WHERE id='egypt-treasures'")
    .run();
  app.db
    .prepare(
      "UPDATE nodes SET status='published',content=? WHERE id='lesson-1'",
    )
    .run(JSON.stringify({ questions, completionXp: 30 }));
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "student", password: "long-pass-123" }),
    });
    const login = await response.json();
    const cookie = response.headers.get("set-cookie").split(";")[0];
    const headers = {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": login.csrfToken,
      Origin: base,
    };
    const proxied = await new Promise((resolve, reject) => {
      const request = http.request(
        base + "/api/auth/me",
        {
          headers: {
            Host: "localhost:3000",
            Origin: "http://localhost:3000",
            Cookie: cookie,
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        },
      );
      request.on("error", reject);
      request.end();
    });
    assert.equal(proxied, 200);
    for (const q of questions) {
      const answer =
        q.type === "blank"
          ? "  الطَاقة   الشمسية  "
          : q.type === "match"
            ? { b: "two", a: "one" }
            : q.answer;
      response = await fetch(base + "/api/lessons/lesson-1/answers", {
        method: "POST",
        headers,
        body: JSON.stringify({ questionId: q.id, answer }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).correct, true, q.id);
    }
    for (const body of ["null", "[]"]) {
      response = await fetch(base + "/api/lessons/lesson-1/answers", {
        method: "POST",
        headers,
        body,
      });
      assert.equal(response.status, 400);
    }
    response = await fetch(base + "/api/lessons/lesson-1/complete", {
      method: "POST",
      headers,
      body: "{}",
    });
    assert.equal((await response.json()).awarded, 30);
    response = await fetch(base + "/api/lessons/lesson-1/complete", {
      method: "POST",
      headers,
      body: "{}",
    });
    assert.equal((await response.json()).awarded, 0);
  } finally {
    await new Promise((r) => server.close(r));
    app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

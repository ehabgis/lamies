import test from "node:test";
import assert from "node:assert/strict";
import { api, onSessionMismatch, onUnauthorized } from "../../src/platform/api.js";

// A fake server: each call returns the next queued response.
function serve(...responses) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const [status, body] = responses.shift() || [500, {}];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return calls;
}

test("a CSRF refusal tells the session to check the account, and is not sent again", async () => {
  const calls = serve([403, { error: "رمز حماية الطلب غير صالح", reason: "csrf" }]);
  let mismatch = 0, unauthorized = 0;
  const offA = onSessionMismatch(() => mismatch++);
  const offB = onUnauthorized(() => unauthorized++);
  await assert.rejects(api("/demo/lessons/lesson-1/ask", { method: "POST", body: { message: "x" } }), (e) => e.status === 403 && e.reason === "csrf");
  assert.equal(mismatch, 1);
  assert.equal(unauthorized, 0);
  assert.equal(calls.length, 1, "no automatic retry");
  offA();
  offB();
});

test("an ended session (401) is reported; a wrong password on sign-in is not", async () => {
  serve([401, { error: "انتهت جلستك", reason: "session" }], [401, { error: "البريد أو كلمة المرور غير صحيحة" }]);
  let unauthorized = 0, mismatch = 0;
  const offA = onUnauthorized(() => unauthorized++);
  const offB = onSessionMismatch(() => mismatch++);
  await assert.rejects(api("/demo/lessons/lesson-1/help", { method: "POST", body: {} }), (e) => e.status === 401 && e.reason === "session");
  await assert.rejects(api("/auth/login", { method: "POST", body: {} }));
  assert.equal(unauthorized, 1);
  assert.equal(mismatch, 0);
  offA();
  offB();
});

test("other 403 answers (a rule of the lesson) do not touch the session", async () => {
  serve([403, { error: "سؤال التطبيق يظهر بعد عرض الإجابة." }]);
  let mismatch = 0;
  const off = onSessionMismatch(() => mismatch++);
  await assert.rejects(api("/demo/lessons/lesson-1/apply", { method: "POST", body: {} }));
  assert.equal(mismatch, 0);
  off();
});

test("the CSRF token from the server is sent on the next write", async () => {
  const calls = serve([200, { user: { id: "u1" }, csrfToken: "tok-123" }], [200, { ok: true }]);
  await api("/auth/me");
  await api("/demo/lessons/lesson-1/ask", { method: "POST", body: { message: "x" } });
  assert.equal(calls[1].init.headers.get("X-CSRF-Token"), "tok-123");
});

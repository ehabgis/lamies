import test from "node:test";
import assert from "node:assert/strict";
import * as ps from "../../src/platform/privateState.js";

// A small stand-in for the browser's sessionStorage.
function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    keys: () => [...m.keys()].sort(),
  };
}
function fresh(initial) {
  ps._resetForTests();
  globalThis.sessionStorage = fakeStorage(initial);
  return globalThis.sessionStorage;
}
const A = { id: "user-a" };
const B = { id: "user-b" };
// Progress and achievements live in localStorage and are never cleared here;
// a sessionStorage key outside the private prefixes must survive too.
const KEEP = { "lamis.basemap.v1": "esri", "lamis.students.v1": "{}" };

test("signing out clears chats, consent and the help tab id, and keeps everything else", () => {
  const s = fresh(KEEP);
  ps.setIdentity(A);
  s.setItem(ps.privateKey("lamis.chat", "class", "lesson-1"), "[A's chat]");
  s.setItem("lamis.tutor.v2.u:user-a.general", "[A]");
  s.setItem("lamis.helpTab", "tab-of-a");
  ps.setConsent(true);
  let cleared = 0;
  ps.registerReset(() => (cleared += 1));
  assert.equal(ps.setIdentity(null), true, "A → visitor is a change");
  assert.equal(cleared, 1);
  assert.equal(ps.getConsent(), false);
  assert.deepEqual(s.keys(), ["lamis.basemap.v1", "lamis.private.owner", "lamis.students.v1"]);
  assert.equal(s.getItem("lamis.private.owner"), "guest");
});

test("student B never reads student A's chat: keys belong to the person and the kind of lesson", () => {
  fresh();
  ps.setIdentity(A);
  const aClass = ps.privateKey("lamis.chat", "class", "lesson-1");
  const aDemo = ps.privateKey("lamis.chat", "demo", "lesson-1");
  assert.notEqual(aClass, aDemo, "the demo lesson-1 and the published lesson-1 are separate");
  ps.setIdentity(B);
  const bClass = ps.privateKey("lamis.chat", "class", "lesson-1");
  assert.notEqual(aClass, bClass);
  assert.match(bClass, /u:user-b/);
});

test("the same person again (a refresh, a role re-read) clears nothing", () => {
  const s = fresh();
  ps.setIdentity(A);
  const g = ps.generation();
  s.setItem(ps.privateKey("lamis.chat", "class", "lesson-1"), "[A]");
  ps.setConsent(true);
  assert.equal(ps.setIdentity({ ...A, role: "student" }), false);
  assert.equal(ps.generation(), g);
  assert.equal(ps.getConsent(), true);
  assert.equal(s.length, 2);
});

test("a reload by someone else clears what the previous person left in the tab", () => {
  // A's chat and old (pre-M5) unscoped keys stay in sessionStorage across a reload.
  const s = fresh({ "lamis.private.owner": "u:user-a", "lamis.chat.v2.u:user-a.class.lesson-1": "[A]", "lamis.chat.lesson-2": "[old]", "lamis.helpTab": "tab-a", ...KEEP });
  assert.equal(ps.setIdentity(B), false, "the first identity is not a change in this page");
  assert.deepEqual(s.keys(), ["lamis.basemap.v1", "lamis.private.owner", "lamis.students.v1"]);
  assert.equal(s.getItem("lamis.private.owner"), "u:user-b");
});

test("the same person reloading keeps their chat", () => {
  const key = "lamis.chat.v2.u:user-a.class.lesson-1";
  const s = fresh({ "lamis.private.owner": "u:user-a", [key]: "[A]" });
  ps.setIdentity(A);
  assert.equal(s.getItem(key), "[A]");
});

test("a request still running when the account changes is aborted and its answer dropped", async () => {
  fresh();
  ps.setIdentity(A);
  const request = ps.track();
  let shown = null;
  // What MapTeacher/QuestionHelp do with an answer: keep it only if current.
  const answer = new Promise((resolve) => setTimeout(() => resolve("A's answer"), 5));
  ps.setIdentity(B);
  assert.equal(request.signal.aborted, true, "the request was aborted");
  const text = await answer;
  if (ps.isCurrent(request.generation)) shown = text;
  request.done();
  assert.equal(shown, null, "B does not see A's answer");
  // A request B starts now is current.
  const next = ps.track();
  assert.equal(ps.isCurrent(next.generation), true);
  assert.equal(next.signal.aborted, false);
  next.done();
});

test("an ended session (account → visitor) and teacher → student both clear", () => {
  fresh();
  const T = { id: "teacher-1", role: "teacher" };
  ps.setIdentity(T);
  ps.setConsent(true);
  let resets = 0;
  ps.registerReset(() => (resets += 1));
  assert.equal(ps.setIdentity({ id: "student-1", role: "student" }), true);
  assert.equal(ps.getConsent(), false, "the student does not inherit the teacher's consent");
  ps.setConsent(true);
  assert.equal(ps.setIdentity(null), true, "the session ended");
  assert.equal(ps.getConsent(), false);
  assert.equal(resets, 2);
});

test("consent listeners hear the change; a failing reset handler does not stop the others", () => {
  fresh();
  ps.setIdentity(A);
  const heard = [];
  const off = ps.onConsent((v) => heard.push(v));
  ps.setConsent(true);
  ps.setConsent(true);
  let ran = false;
  ps.registerReset(() => {
    throw Error("broken component");
  });
  ps.registerReset(() => (ran = true));
  ps.resetPrivateState();
  off();
  ps.setConsent(true);
  assert.deepEqual(heard, [true, false]);
  assert.equal(ran, true);
});

test("without sessionStorage (private mode, blocked) nothing throws", () => {
  ps._resetForTests();
  globalThis.sessionStorage = undefined;
  ps.setIdentity(A);
  ps.setConsent(true);
  assert.equal(ps.setIdentity(B), true);
  assert.equal(ps.getConsent(), false);
});

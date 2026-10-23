// Guest explorer profile (name, grade, term). Kept on this device only; real
// accounts keep using the server session.
const KEY = "lamis.guest.v1";
export function loadGuest() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveGuest(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
  if (profile?.name?.trim()) chooseStudent(profile.name);
}

// ---- one progress per student on a shared device (2026-10-23)
// Journeys, «ابنِ خريطتك» and the certificate are saved under the student
// who is using the device: the name typed on the start page, or the signed-in
// account. Each student sees only their own stars, badges and certificate.
const STUDENTS = "lamis.students.v1"; // {current, list: [{id, name, key}]}
const PROGRESS = /^lamis\.(expedition|water|projects|buildmap|certificate)\./;

const readStudents = () => {
  try {
    return JSON.parse(localStorage.getItem(STUDENTS) || "null") || { current: null, list: [] };
  } catch {
    return { current: null, list: [] };
  }
};
const writeStudents = (s) => {
  try {
    localStorage.setItem(STUDENTS, JSON.stringify(s));
  } catch {}
};
// «أحمد» and «احمد» are the same child.
export const nameKey = (name) =>
  String(name || "")
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

export function currentStudent() {
  const s = readStudents();
  return s.list.find((x) => x.id === s.current) || null;
}

// The storage key of a progress item for the current student.
export function studentKey(key) {
  const id = readStudents().current;
  return id ? `${key}~${id}` : key;
}

function setCurrent(match, make) {
  const s = readStudents();
  let student = s.list.find(match);
  if (!student) {
    student = make();
    // The first student keeps whatever was played on this device before.
    if (!s.list.length) moveLegacyProgress(student.id);
    s.list.push(student);
  }
  s.current = student.id;
  writeStudents(s);
  return student;
}
export function chooseStudent(name) {
  const key = nameKey(name);
  if (!key) return null;
  return setCurrent(
    (x) => x.key === key,
    () => ({ id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), key }),
  );
}
export function chooseAccount(user) {
  if (!user?.id) return null;
  return setCurrent(
    (x) => x.id === `u${user.id}`,
    () => ({ id: `u${user.id}`, name: user.name || user.username || "", key: `account:${user.id}` }),
  );
}

function moveLegacyProgress(id) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !PROGRESS.test(k) || k.includes("~")) continue;
      if (localStorage.getItem(`${k}~${id}`) == null) localStorage.setItem(`${k}~${id}`, localStorage.getItem(k));
      localStorage.removeItem(k);
    }
  } catch {}
}

// Progress worth resuming: the exploration activity or the last demo lesson.
export function savedProgress() {
  try {
    const e = JSON.parse(localStorage.getItem(studentKey("lamis.expedition.lesson-1.v1")) || "null");
    if (e && (Object.keys(e.done || {}).length || e.view !== "start"))
      return { href: "/demo/lesson-1/expedition", label: "رحلة كنوز مصر", done: Object.keys(e.done || {}).length };
  } catch {}
  return null;
}

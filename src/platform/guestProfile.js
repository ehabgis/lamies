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
}
// Progress worth resuming: the exploration activity or the last demo lesson.
export function savedProgress() {
  try {
    const e = JSON.parse(localStorage.getItem("lamis.expedition.lesson-1.v1") || "null");
    if (e && (Object.keys(e.done || {}).length || e.view !== "start"))
      return { href: "/demo/lesson-1/expedition", label: "رحلة كنوز مصر", done: Object.keys(e.done || {}).length };
  } catch {}
  return null;
}

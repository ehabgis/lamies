let csrfToken = "";
// Told when the server says the session is gone (401) on a request that needs
// one, so the page stops showing the old account (Session.jsx).
const unauthorized = new Set();
export function onUnauthorized(fn) {
  unauthorized.add(fn);
  return () => unauthorized.delete(fn);
}
// Told when the server refuses this tab's CSRF token (reason "csrf"): another
// account may have signed in elsewhere. Session.jsx checks who is signed in
// now. The refused request is never sent again by itself.
const mismatch = new Set();
export function onSessionMismatch(fn) {
  mismatch.add(fn);
  return () => mismatch.delete(fn);
}
export function clearCsrf() {
  csrfToken = "";
}
const AUTH_PATHS = /^\/api\/auth\/(login|register|logout|me)$/;
export async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers);
  if (!["GET", "HEAD"].includes(method)) headers.set("X-CSRF-Token", csrfToken);
  let body = options.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {}
  }
  if (
    body !== undefined &&
    !(body instanceof Blob) &&
    !(body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  const url = path.startsWith("/api/") ? path : `/api${path}`;
  const response = await fetch(url, { ...options, method, headers, body, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !AUTH_PATHS.test(url))
      for (const fn of unauthorized) fn();
    if (response.status === 403 && data.reason === "csrf")
      for (const fn of mismatch) fn();
    throw Object.assign(
      new Error(data.error || "تعذر الاتصال بالخادم. حاول مرة أخرى."),
      { status: response.status, reason: data.reason },
    );
  }
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}

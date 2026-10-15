let csrfToken = "";
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
  const response = await fetch(
    path.startsWith("/api/") ? path : `/api${path}`,
    { ...options, method, headers, body, credentials: "same-origin" },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "تعذر الاتصال بالخادم. حاول مرة أخرى."),
      { status: response.status },
    );
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}

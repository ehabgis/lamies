import { createReadStream, realpathSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
  ".wav": "audio/wav", ".ogg": "audio/ogg", ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

// Serve only the built client. Never expose the repository or runtime data.
export function serveClient(req, res, pathname, clientDir) {
  if (!clientDir || !["GET", "HEAD"].includes(req.method)) return false;
  if (pathname === "/api" || pathname.startsWith("/api/")) return false;
  let path;
  try { path = decodeURIComponent(pathname); } catch { return false; }
  if (path.includes("\\") || path.includes("\0") ||
      path.split("/").some((part) => part.startsWith("."))) return false;
  try {
    const root = realpathSync(clientDir);
    const candidate = resolve(root, "." + path);
    if (candidate !== root && !candidate.startsWith(root + sep)) return false;
    let file = candidate;
    let info;
    try { info = statSync(file); } catch {}
    if (!info?.isFile()) {
      // BrowserRouter deep links use index.html; missing assets must stay 404.
      if (extname(path) || path.startsWith("/assets/") ||
          !(req.headers.accept || "").includes("text/html")) return false;
      file = resolve(root, "index.html");
      info = statSync(file);
    }
    const actual = realpathSync(file);
    if (!actual.startsWith(root + sep)) return false;
    const type = types[extname(actual).toLowerCase()];
    if (!type || !info.isFile()) return false;
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": info.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(actual).on("error", () => res.destroy()).pipe(res);
    return true;
  } catch { return false; }
}

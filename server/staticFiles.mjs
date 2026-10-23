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
    const headers = {
      "Content-Type": type,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "Accept-Ranges": "bytes",
    };
    // Video and audio are asked for in pieces (Range); Safari and iPad will
    // not play a video at all without 206 replies.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range && (range[1] || range[2])) {
      const size = info.size;
      let start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      let end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` });
        res.end();
        return true;
      }
      res.writeHead(206, { ...headers, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${size}` });
      if (req.method === "HEAD") res.end();
      else createReadStream(actual, { start, end }).on("error", () => res.destroy()).pipe(res);
      return true;
    }
    res.writeHead(200, { ...headers, "Content-Length": info.size });
    if (req.method === "HEAD") res.end();
    else createReadStream(actual).on("error", () => res.destroy()).pipe(res);
    return true;
  } catch { return false; }
}

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/index.mjs";

test("deployment serves built pages and assets while keeping API and private files isolated", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-deploy-"));
  const clientDir = join(dir, "dist");
  mkdirSync(join(clientDir, "assets"), { recursive: true });
  writeFileSync(join(clientDir, "index.html"), "<!doctype html><title>Lamis</title>");
  writeFileSync(join(clientDir, "assets/app.js"), "console.log('Lamis')");
  writeFileSync(join(dir, "private.sqlite"), "private-data");
  symlinkSync(join(dir, "private.sqlite"), join(clientDir, "leaked.txt"));
  const app = createApp({ dbPath: join(dir, "test.sqlite"), uploadDir: join(dir, "uploads"), clientDir, allowedOrigin: " https://lamies.onrender.com/ " });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ["/", "/explore", "/demo/lesson-1", "/classroom/lesson-1"]) {
      const response = await fetch(base + path, { headers: { Accept: "text/html" } });
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(await response.text(), /<title>Lamis/);
    }
    const asset = await fetch(base + "/assets/app.js");
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type"), /javascript/);
    const moduleAsset = await fetch(base + "/assets/app.js", { headers: { Origin: "https://lamies.onrender.com" } });
    assert.equal(moduleAsset.status, 200);
    const head = await fetch(base + "/assets/app.js", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    for (const path of ["/api/missing", "/assets/missing.js", "/assets/missing", "/.env", "/%2eenv", "/server/index.mjs", "/private.sqlite", "/leaked.txt", "/%2e%2e%2fprivate.sqlite"]) {
      const response = await fetch(base + path, { headers: { Accept: "text/html" } });
      assert.equal(response.status, 404, path);
      assert.doesNotMatch(await response.text(), /private-data|<title>Lamis/);
    }
    const health = await fetch(base + "/api/health");
    assert.deepEqual(await health.json(), { ok: true });
    const demo = await fetch(base + "/api/demo/lessons/lesson-1");
    assert.equal(demo.status, 200);
    const foreign = await fetch(base + "/api/demo/catalog", { headers: { Origin: "https://other.example" } });
    assert.equal(foreign.status, 403);
    const sameSite = await fetch(base + "/api/auth/me", { headers: { Origin: "https://lamies.onrender.com" } });
    assert.equal(sameSite.status, 200);
  } finally {
    await new Promise((r) => server.close(r));
    app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("videos are served in pieces so Safari and iPad can play them", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lamis-range-"));
  const clientDir = join(dir, "dist");
  mkdirSync(join(clientDir, "lesson-media"), { recursive: true });
  writeFileSync(join(clientDir, "index.html"), "<!doctype html>");
  writeFileSync(join(clientDir, "lesson-media/clip.mp4"), Buffer.from("0123456789"));
  const app = createApp({ dbPath: join(dir, "t.sqlite"), uploadDir: join(dir, "up"), clientDir });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/lesson-media/clip.mp4`;
  try {
    const part = await fetch(url, { headers: { Range: "bytes=2-5" } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get("content-range"), "bytes 2-5/10");
    assert.equal(await part.text(), "2345");
    const tail = await fetch(url, { headers: { Range: "bytes=-3" } });
    assert.equal(await tail.text(), "789");
    assert.equal((await fetch(url, { headers: { Range: "bytes=20-" } })).status, 416);
    const whole = await fetch(url);
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get("accept-ranges"), "bytes");
  } finally {
    await new Promise((r) => server.close(r));
    app.close?.();
    rmSync(dir, { recursive: true, force: true });
  }
});

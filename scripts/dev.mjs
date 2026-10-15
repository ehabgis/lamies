import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("../", import.meta.url));
let web,
  closing = false;
const api = spawn(
  process.execPath,
  ["--env-file-if-exists=.env", "server/index.mjs"],
  { cwd, stdio: ["inherit", "pipe", "inherit"] },
);
const stop = (code) => {
  if (closing) return;
  closing = true;
  web?.kill("SIGTERM");
  api.kill("SIGTERM");
  process.exitCode = code;
};
api.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!web && String(chunk).includes("Lamis API listening")) {
    web = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        ...process.argv.slice(2).filter((v) => v !== "--"),
      ],
      { cwd, stdio: "inherit" },
    );
    web.on("exit", (code) => stop(code || 0));
    web.on("error", () => stop(1));
  }
});
api.on("exit", (code) => stop(code || 0));
api.on("error", () => stop(1));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

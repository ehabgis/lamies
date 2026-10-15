import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { database } from "./db.mjs";
import { hashPassword } from "./index.mjs";
const email = String(process.env.ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Set ADMIN_EMAIL to your administrator email.");
  process.exit(1);
}
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  if (stdin.isTTY) {
    console.error(
      "For a private password prompt use: read -s ADMIN_PASSWORD; export ADMIN_PASSWORD (Bash), then run this command. Or pipe the password through stdin.",
    );
    process.exit(1);
  }
  const rl = createInterface({ input: stdin, output: stdout, terminal: false });
  password = await rl.question("");
  rl.close();
}
if (!password || password.length < 12 || password.length > 200) {
  console.error("Administrator password must contain 12–200 characters.");
  process.exit(1);
}
const db = database(
  process.env.LAMIS_DB || resolve("server/data/lamis.sqlite"),
);
if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) {
  console.error("Account already exists. Bootstrap does not overwrite users.");
  db.close();
  process.exit(1);
}
db.prepare(
  "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
).run(
  randomBytes(12).toString("hex"),
  process.env.ADMIN_NAME || "مدير المنصة",
  email,
  hashPassword(password),
  "super_admin",
);
db.close();
console.log(
  "Administrator created. Sign in using the configured email and password.",
);

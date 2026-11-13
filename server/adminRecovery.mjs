// One-time administrator recovery for a host without a shell (Render Free).
//
// It exists only while the operator sets three private environment variables:
//   ADMIN_RECOVERY_SECRET  at least 43 characters (32 random bytes, base64url)
//   ADMIN_RECOVERY_EMAIL   the one account it may reset, or create
//   ADMIN_RECOVERY_UNTIL   an ISO date-time, at most 48 hours ahead
// and, optionally, what it may do:
//   ADMIN_RECOVERY_MODE    create (default): create a new super_admin only; an
//                          email that already has an account is refused and
//                          its password is never replaced.
//                          reset-or-create: reset that account's password,
//                          or create it if missing.
// Otherwise POST /api/auth/recover-admin answers like any unknown route.
//
// - Proof: the request carries the secret; its SHA-256 is compared in constant
//   time with the configured one. 256 random bits cannot be guessed, and the
//   route also closes after 5 wrong secrets (counted in the database) and is
//   rate-limited per address by the server.
// - Once: a successful use is recorded (hash of the secret, never the secret)
//   in the same transaction as the change; the route then stays closed, after
//   a restart too, for as long as the database lasts. Remove the variables
//   afterwards: on a host whose disk is not persistent the record goes with
//   the database, and only the time window and removal still close the route.
// - What it changes: in "create", one new super_admin and nothing else. In
//   "reset-or-create", an existing account gets a new password (the project's
//   hashPassword) and loses its sessions, its role and everything else stay;
//   a missing one is created as super_admin. No other row.
// - Never in a response or a log: the secret, the password or its hash.
import { createHash, timingSafeEqual } from "node:crypto";

export const RECOVERY_PATH = "/api/auth/recover-admin";
export const MAX_FAILURES = 5;
export const MODES = ["create", "reset-or-create"];
const MAX_WINDOW_MS = 48 * 3600000;
const sha256 = (s) => createHash("sha256").update(String(s), "utf8").digest();

export function recoveryConfig(env = process.env, now = Date.now()) {
  const raw = {
    secret: String(env.ADMIN_RECOVERY_SECRET || ""),
    email: String(env.ADMIN_RECOVERY_EMAIL || "").trim().toLowerCase(),
    until: String(env.ADMIN_RECOVERY_UNTIL || "").trim(),
    mode: String(env.ADMIN_RECOVERY_MODE || "create").trim(),
  };
  if (!raw.secret && !raw.email && !raw.until) return { enabled: false, problems: [] };
  const until = Date.parse(raw.until);
  const problems = [];
  if (raw.secret.length < 43 || raw.secret.length > 200) problems.push("ADMIN_RECOVERY_SECRET must be 43–200 characters (32 random bytes)");
  if (!/^\S+@\S+\.\S+$/.test(raw.email)) problems.push("ADMIN_RECOVERY_EMAIL is not an email");
  if (!Number.isFinite(until)) problems.push("ADMIN_RECOVERY_UNTIL is not a date-time");
  else if (until <= now) problems.push("ADMIN_RECOVERY_UNTIL has passed");
  else if (until - now > MAX_WINDOW_MS) problems.push("ADMIN_RECOVERY_UNTIL is more than 48 hours ahead");
  if (!MODES.includes(raw.mode)) problems.push("ADMIN_RECOVERY_MODE must be create or reset-or-create");
  return problems.length
    ? { enabled: false, problems }
    : { enabled: true, problems, secretHash: sha256(raw.secret), email: raw.email, until, mode: raw.mode };
}

export function createAdminRecovery({ db, config, hashPassword, newId, now = Date.now, log = console.log }) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS admin_recovery(secret_hash TEXT PRIMARY KEY,failures INTEGER NOT NULL DEFAULT 0,used_at INTEGER,action TEXT)",
  );
  const key = config.enabled ? config.secretHash.toString("hex") : null;
  const row = () => (key ? db.prepare("SELECT failures,used_at FROM admin_recovery WHERE secret_hash=?").get(key) : null);
  if (config.enabled) {
    const r = row();
    if (r?.used_at) log("Admin recovery: this secret was already used; the route stays closed. Remove the ADMIN_RECOVERY_* variables.");
    else log(`Admin recovery is open until ${new Date(config.until).toISOString()} for one account (${config.mode}).`);
  } else if (config.problems?.length) log(`Admin recovery is off: ${config.problems.join("; ")}.`);

  function active() {
    if (!config.enabled || now() >= config.until) return false;
    const r = row();
    return !r?.used_at && (r?.failures || 0) < MAX_FAILURES;
  }

  // Returns { status, body } for the route; only generic words, no details.
  function attempt(input = {}) {
    if (!active()) return { status: 404 };
    const given = sha256(typeof input.secret === "string" ? input.secret : "");
    if (!timingSafeEqual(given, config.secretHash)) {
      db.prepare(
        "INSERT INTO admin_recovery(secret_hash,failures) VALUES(?,1) ON CONFLICT(secret_hash) DO UPDATE SET failures=failures+1",
      ).run(key);
      if ((row()?.failures || 0) >= MAX_FAILURES) log("Admin recovery closed after repeated wrong secrets.");
      return { status: 403, error: "رمز الاستعادة غير صالح" };
    }
    const password = typeof input.password === "string" ? input.password : "";
    if (password.length < 12 || password.length > 200)
      return { status: 400, error: "كلمة المرور يجب أن تكون من 12 إلى 200 حرف" };
    const hash = hashPassword(password);
    let action;
    db.exec("BEGIN IMMEDIATE");
    try {
      if (db.prepare("SELECT used_at FROM admin_recovery WHERE secret_hash=?").get(key)?.used_at) {
        db.exec("ROLLBACK");
        return { status: 404 };
      }
      const u = db.prepare("SELECT id FROM users WHERE email=?").get(config.email);
      // "create" never touches an existing account; the secret stays unused.
      if (u && config.mode !== "reset-or-create") {
        db.exec("ROLLBACK");
        return { status: 409, error: "يوجد حساب بهذا البريد؛ لم يتغير شيء. اختر بريدًا آخر" };
      }
      if (u) {
        if (db.prepare("UPDATE users SET password=? WHERE id=?").run(hash, u.id).changes !== 1) throw Error("update");
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(u.id);
        action = "reset";
      } else {
        db.prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,'super_admin')").run(
          newId(),
          "مدير المنصة",
          config.email,
          hash,
        );
        action = "created";
      }
      db.prepare(
        "INSERT INTO admin_recovery(secret_hash,used_at,action) VALUES(?,?,?) ON CONFLICT(secret_hash) DO UPDATE SET used_at=excluded.used_at,action=excluded.action",
      ).run(key, now(), action);
      db.exec("COMMIT");
    } catch {
      try { db.exec("ROLLBACK"); } catch {}
      return { status: 500, error: "تعذر إتمام الاستعادة؛ لم يتغير شيء" };
    }
    log(`Admin recovery used (${action === "reset" ? "password reset, sessions ended" : "administrator created"}); the route is closed. Remove the ADMIN_RECOVERY_* variables.`);
    return { status: 200, body: { ok: true, action } };
  }
  return { active, attempt };
}

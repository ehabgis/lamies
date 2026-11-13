// One gate for every call to the language model (M6, 2026-11-13).
//
// The providers (aiProvider.mjs, tutorProvider.mjs) refuse to call Cloudflare
// or OpenAI without a ticket from here, so no route — today's or a future one —
// can reach the model around these limits:
//   - per account: requests per minute (memory) and per day (SQLite);
//   - visitors: one shared pool per minute and per day, so a new tab id
//     (x-help-session) gives no new allowance; plus a small per-tab limit;
//   - concurrency: one request at a time per account / tab, a few in all;
//   - the whole project: a daily ceiling in Cloudflare «neurons», reserved
//     before the call (conservative estimate) and settled with the usage the
//     provider reports, inside one SQLite transaction, so parallel requests
//     cannot pass it together.
// Only counts are stored (ai_usage): never questions, answers or keys.
// The daily counts survive a restart when the SQLite file does (Render needs
// its persistent disk); several server instances would need a shared store.

const DAY_MS = 86400000;
const intEnv = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

// Cloudflare Workers AI prices models in neurons per million tokens
// (developers.cloudflare.com/workers-ai/platform/pricing). Unknown models use
// the 70B prices, the highest of these, so the estimate stays on the safe side.
export const NEURONS_PER_M = {
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { in: 26668, out: 204805 },
};
const FALLBACK_RATE = { in: 26668, out: 204805 };

export function limitsFromEnv(env = process.env) {
  return {
    dailyNeurons: intEnv(env.AI_DAILY_NEURONS, 8000),
    visitorDailyNeurons: intEnv(env.AI_VISITOR_DAILY_NEURONS, 1000),
    studentDaily: intEnv(env.AI_STUDENT_DAILY, 15),
    staffDaily: intEnv(env.AI_STAFF_DAILY, 60),
    perMinute: intEnv(env.AI_PER_MINUTE, 5),
    visitorPerMinute: intEnv(env.AI_VISITOR_PER_MINUTE, 20),
    visitorTabPerMinute: intEnv(env.AI_VISITOR_TAB_PER_MINUTE, 3),
    maxConcurrent: intEnv(env.AI_MAX_CONCURRENT, 4),
    userConcurrent: intEnv(env.AI_USER_CONCURRENT, 1),
    timeoutMs: intEnv(env.AI_TIMEOUT_MS, 15000),
  };
}

/** Conservative neuron estimate: ~2 characters per token, all output tokens used. */
export function estimateNeurons({ model, inputChars, maxTokens }) {
  const rate = NEURONS_PER_M[model] || FALLBACK_RATE;
  return (Math.ceil(inputChars / 2) * rate.in + maxTokens * rate.out) / 1e6;
}
export function neuronsOf({ model, promptTokens, completionTokens }) {
  const rate = NEURONS_PER_M[model] || FALLBACK_RATE;
  return (promptTokens * rate.in + completionTokens * rate.out) / 1e6;
}

const MESSAGES = {
  minute: "المعلم المتصل يحتاج دقيقة قبل السؤال التالي. هذه معلومات من الدرس، ويمكنك متابعة الأسئلة والأنشطة.",
  busy: "المعلم المتصل يجيب سؤالًا آخر الآن. هذه معلومات من الدرس، وجرّب بعد لحظات.",
  account: "وصلت لعدد أسئلة المعلم المتصل اليوم. هذه معلومات من الدرس، ويمكنك متابعة الأسئلة والأنشطة، والعودة غدًا.",
  visitors: "المعلم المتصل للزوار وصل لحده اليوم. هذه معلومات من الدرس؛ سجّل الدخول بحسابك أو جرّب لاحقًا.",
  global: "المعلم المتصل وصل لحده اليومي. هذه معلومات من الدرس، ويمكنك متابعة الأسئلة والأنشطة.",
};
export const LIMIT_MESSAGES = MESSAGES;

export function createAiGuard({ db, limits = limitsFromEnv(), now = () => Date.now(), log = console.log } = {}) {
  if (db)
    db.exec(
      "CREATE TABLE IF NOT EXISTS ai_usage(day TEXT NOT NULL,scope TEXT NOT NULL,key TEXT NOT NULL,requests INTEGER NOT NULL DEFAULT 0,neurons REAL NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,scope,key))",
    );
  const day = () => new Date(now()).toISOString().slice(0, 10);
  const get = db && db.prepare("SELECT requests, neurons FROM ai_usage WHERE day=? AND scope=? AND key=?");
  const add = db && db.prepare(
    "INSERT INTO ai_usage(day,scope,key,requests,neurons,errors) VALUES(?,?,?,?,?,?) ON CONFLICT(day,scope,key) DO UPDATE SET requests=requests+excluded.requests,neurons=neurons+excluded.neurons,errors=errors+excluded.errors",
  );
  const memDaily = new Map(); // without a database (tests of single modules)
  const read = (scope, key) => {
    if (get) return get.get(day(), scope, key) || { requests: 0, neurons: 0 };
    return memDaily.get(`${day()}|${scope}|${key}`) || { requests: 0, neurons: 0 };
  };
  const write = (scope, key, requests, neurons, errors = 0) => {
    if (add) return add.run(day(), scope, key, requests, neurons, errors);
    const k = `${day()}|${scope}|${key}`;
    const o = memDaily.get(k) || { requests: 0, neurons: 0 };
    memDaily.set(k, { requests: o.requests + requests, neurons: o.neurons + neurons });
  };
  // Old days are removed once a day (counts only; nothing personal).
  let pruned = "";
  const prune = () => {
    if (!db || pruned === day()) return;
    pruned = day();
    db.prepare("DELETE FROM ai_usage WHERE day < ?").run(new Date(now() - 14 * DAY_MS).toISOString().slice(0, 10));
  };

  // Per-minute windows and in-flight counts (memory; bounded).
  const windows = new Map();
  const hit = (key, max) => {
    const t = now();
    let w = windows.get(key);
    if (!w || w.until <= t) {
      if (windows.size > 50000) for (const [k, v] of windows) if (v.until <= t) windows.delete(k);
      while (windows.size > 50000) windows.delete(windows.keys().next().value);
      w = { count: 0, until: t + 60000 };
      windows.set(key, w);
    }
    if (w.count >= max) return false;
    w.count += 1;
    return true;
  };
  const inFlight = new Map();
  let total = 0;

  /**
   * Ask to call the model. who: { user } (signed in) or { visitorTab }.
   * Returns { ok: true, ticket } or { ok: false, status: 429, reason, message }.
   */
  function admit({ route, user, visitorTab, model, inputChars, maxTokens, clientSignal }) {
    prune();
    const visitor = !user;
    const actor = visitor ? `t:${visitorTab || "none"}` : `u:${user.id}`;
    const staff = !visitor && ["super_admin", "content_admin", "teacher"].includes(user.role);
    const refuse = (reason) => {
      log(`[ai] route=${route} outcome=limited reason=${reason} who=${visitor ? "visitor" : staff ? "staff" : "student"}`);
      return { ok: false, status: 429, reason, message: MESSAGES[reason] };
    };
    // Concurrency first (nothing to undo).
    if (total >= limits.maxConcurrent || (inFlight.get(actor) || 0) >= limits.userConcurrent) return refuse("busy");
    // Per minute.
    if (visitor) {
      if (!hit(`vt:${actor}`, limits.visitorTabPerMinute) || !hit("vp:pool", limits.visitorPerMinute)) return refuse("minute");
    } else if (!hit(`m:${actor}`, limits.perMinute)) return refuse("minute");
    // Daily, reserved atomically.
    const estimate = estimateNeurons({ model, inputChars, maxTokens });
    let refused = null;
    try {
      db?.exec("BEGIN IMMEDIATE");
      const all = read("global", "");
      if (all.neurons + estimate > limits.dailyNeurons) refused = "global";
      else if (visitor && read("visitors", "").neurons + estimate > limits.visitorDailyNeurons) refused = "visitors";
      else if (!visitor && read("account", actor).requests >= (staff ? limits.staffDaily : limits.studentDaily)) refused = "account";
      if (!refused) {
        write("global", "", 1, estimate);
        if (visitor) write("visitors", "", 1, estimate);
        else write("account", actor, 1, estimate);
      }
      db?.exec("COMMIT");
    } catch (e) {
      try {
        db?.exec("ROLLBACK");
      } catch {}
      throw e;
    }
    if (refused) return refuse(refused);

    total += 1;
    inFlight.set(actor, (inFlight.get(actor) || 0) + 1);
    const started = now();
    const signals = [AbortSignal.timeout(limits.timeoutMs)];
    if (clientSignal) signals.push(clientSignal);
    let done = false;
    const ticket = {
      signal: AbortSignal.any(signals),
      model,
      /** usage: { promptTokens, completionTokens } from the provider, or null. */
      finish(usage, outcome = "ok") {
        if (done) return;
        done = true;
        total -= 1;
        const left = (inFlight.get(actor) || 1) - 1;
        if (left) inFlight.set(actor, left);
        else inFlight.delete(actor);
        // Settle the reservation with the reported usage (never below 0).
        const actual = usage && Number.isFinite(usage.promptTokens) && Number.isFinite(usage.completionTokens)
          ? neuronsOf({ model, ...usage })
          : estimate;
        const diff = actual - estimate;
        const errors = outcome === "ok" ? 0 : 1;
        if (diff || errors) {
          write("global", "", 0, diff, errors);
          if (visitor) write("visitors", "", 0, diff, errors);
          else write("account", actor, 0, diff, errors);
        }
        log(`[ai] route=${route} outcome=${outcome} who=${visitor ? "visitor" : staff ? "staff" : "student"} tokens=${usage ? `${usage.promptTokens}+${usage.completionTokens}` : "n/a"} neurons=${actual.toFixed(1)} ms=${now() - started}`);
      },
    };
    return { ok: true, ticket };
  }

  /** Today's totals for the admin page (no account ids). */
  function today() {
    const d = day();
    const row = (scope) => (db ? db.prepare("SELECT COALESCE(SUM(requests),0) AS requests, COALESCE(SUM(neurons),0) AS neurons, COALESCE(SUM(errors),0) AS errors FROM ai_usage WHERE day=? AND scope=?").get(d, scope) : read(scope, ""));
    const accounts = db ? db.prepare("SELECT COUNT(*) AS n FROM ai_usage WHERE day=? AND scope='account'").get(d).n : null;
    return { day: d, global: row("global"), visitors: row("visitors"), accounts, inFlight: total, limits };
  }

  return { admit, today, limits };
}

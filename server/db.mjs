import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
export const roles = [
  "super_admin",
  "content_admin",
  "teacher",
  "student",
  "parent",
];
export const kinds = [
  "stage",
  "grade",
  "term",
  "year",
  "subject",
  "unit",
  "lesson",
];
export function database(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student',teacher_id TEXT REFERENCES users(id),enrollment TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY,parent_id TEXT REFERENCES nodes(id),kind TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',disabled INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,content TEXT NOT NULL DEFAULT '{}',updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,node_id TEXT NOT NULL,snapshot TEXT NOT NULL,actor_id TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS answers(user_id TEXT REFERENCES users(id),lesson_id TEXT REFERENCES nodes(id),question_id TEXT NOT NULL,correct INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(user_id,lesson_id,question_id));
 CREATE TABLE IF NOT EXISTS rewards(user_id TEXT REFERENCES users(id),lesson_id TEXT REFERENCES nodes(id),xp INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,lesson_id));
 CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,filename TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,owner_id TEXT REFERENCES users(id),created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY,applied_at TEXT DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO schema_versions(version) VALUES(1);`);
  if (
    !db
      .prepare("PRAGMA table_info(users)")
      .all()
      .some((c) => c.name === "disabled")
  )
    db.exec("ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0");
  db.exec(
    "CREATE TABLE IF NOT EXISTS learning_state(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,lesson_id TEXT REFERENCES nodes(id),state TEXT NOT NULL DEFAULT '{}',updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,lesson_id));INSERT OR IGNORE INTO schema_versions(version) VALUES(2)",
  );
  if (!db.prepare("SELECT id FROM nodes LIMIT 1").get()) seed(db);
  return db;
}
export function unpack(n) {
  return n
    ? {
        id: n.id,
        parentId: n.parent_id,
        kind: n.kind,
        title: n.title,
        status: n.status,
        disabled: !!n.disabled,
        order: n.sort_order,
        version: n.version,
        content: JSON.parse(n.content),
        updatedAt: n.updated_at,
      }
    : null;
}
export function seed(db) {
  const insert = db.prepare(
    "INSERT INTO nodes(id,parent_id,kind,title,status,content) VALUES(?,?,?,?,?,?)",
  );
  const add = (id, parent, kind, title, content = {}, status = "published") =>
    insert.run(id, parent, kind, title, status, JSON.stringify(content));
  add("primary", null, "stage", "المرحلة الابتدائية");
  add("preparatory", null, "stage", "المرحلة الإعدادية");
  add("secondary", null, "stage", "المرحلة الثانوية");
  for (const g of [4, 5, 6]) {
    add(`grade-${g}`, "primary", "grade", `الصف ${g} الابتدائي`);
    for (const t of [1, 2]) {
      let term = `grade-${g}-term-${t}`,
        year = `${term}-2026`;
      add(
        term,
        `grade-${g}`,
        "term",
        t === 1 ? "الفصل الدراسي الأول" : "الفصل الدراسي الثاني",
      );
      add(year, term, "year", "2026 / 2027");
      add(`${year}-social`, year, "subject", "الدراسات الاجتماعية");
    }
  }
  add(
    "egypt-treasures",
    "grade-5-term-1-2026-social",
    "unit",
    "كنوز مصر",
    {},
    "draft",
  );
  add(
    "lesson-1",
    "egypt-treasures",
    "lesson",
    "الخامات المعدنية ومصادر الطاقة في مصر",
    {
      reviewRequired: true,
      objectives: [
        "تمييز الخامات المعدنية ومصادر الطاقة",
        "ربط المورد بموقعه الجغرافي",
      ],
      sources: [],
      resources: [],
      questions: [],
      completionXp: 30,
      notice:
        "مسودة تجريبية تحتاج مراجعة المعلم وإضافة مصادر معتمدة قبل النشر.",
    },
    "draft",
  );
  const seedFile = new URL("./seed-content.json", import.meta.url);
  if (existsSync(seedFile)) {
    const content = JSON.parse(readFileSync(seedFile, "utf8"));
    db.prepare("UPDATE nodes SET content=? WHERE id=?").run(
      JSON.stringify({ ...(content.content || content), reviewRequired: true }),
      "lesson-1",
    );
  }
}

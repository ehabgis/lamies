import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  FloppyDisk,
  Books,
  Users,
  ChartBar,
  UploadSimple,
  DownloadSimple,
  ArrowSquareOut,
  ClockCounterClockwise,
  ListBullets,
} from "phosphor-react";
import { api } from "./api";
import "./admin.css";

const KINDS = {
  stage: "مرحلة",
  grade: "صف",
  term: "فصل دراسي",
  year: "عام دراسي",
  subject: "مادة",
  unit: "وحدة",
  lesson: "درس",
};
const TYPES = {
  choice: "اختيار من متعدد",
  boolean: "صح وخطأ",
  match: "مطابقة",
  order: "ترتيب",
  drag: "سحب وإفلات",
  map: "اختيار موقع",
  blank: "إكمال الفراغ",
  "image-match": "مطابقة مصورة",
};
const blank = () => ({
  kind: "lesson",
  parentId: null,
  title: "",
  order: 0,
  enabled: true,
  status: "draft",
  source: "",
  content: {
    objectives: [],
    intro: "",
    summary: "",
    concepts: [],
    facts: [],
    references: [],
    resources: [],
    questions: [],
    reviewRequired: true,
  },
});
const split = (v) =>
  v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
function Field({ label, children }) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function JsonField({ label, value, onChange }) {
  const [text, setText] = useState(JSON.stringify(value ?? [], null, 2));
  const [error, setError] = useState("");
  useEffect(() => {
    setText(JSON.stringify(value ?? [], null, 2));
    setError("");
  }, [value]);
  return (
    <Field label={label}>
      <textarea
        dir="ltr"
        className="cms-code"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const data = JSON.parse(e.target.value);
            if (!Array.isArray(data)) throw Error();
            setError("");
            e.target.setCustomValidity("");
            onChange(data);
          } catch {
            e.target.setCustomValidity("أدخل مصفوفة JSON صحيحة قبل الحفظ.");
            setError("أدخل مصفوفة JSON صحيحة قبل الحفظ.");
          }
        }}
      />
      {error && <small role="alert">{error}</small>}
    </Field>
  );
}
function QuestionDetails({ q, update }) {
  const getLabel = (o) => (typeof o === "object" ? o.label : o);
  const getId = (o) => (typeof o === "object" ? o.id : o);
  const answers =
    q.answer && typeof q.answer === "object" && !Array.isArray(q.answer)
      ? q.answer
      : {};
  const rows = q.type === "map" ? q.options || [] : q.pairs || [];
  const setRows = (value) =>
    update(q.type === "map" ? "options" : "pairs", value);
  const correct = (id, value) => update("answer", { ...answers, [id]: value });
  return (
    <>
      {q.type === "order" && (
        <>
          <Field label="عناصر الترتيب · عنصر في كل سطر">
            <textarea
              value={(q.options || []).map(getLabel).join("\n")}
              onChange={(e) => {
                const items = e.target.value.split("\n");
                update("options", items);
                update("answer", items);
              }}
            />
          </Field>
          <p className="cms-help">رتّب الإجابة الصحيحة بالأزرار التالية.</p>
          {(Array.isArray(q.answer) ? q.answer : q.options || []).map(
            (item, index, array) => (
              <div className="cms-pair-row" key={index}>
                <span>{getLabel(item)}</span>
                {[-1, 1].map((delta) => (
                  <button
                    type="button"
                    key={delta}
                    disabled={
                      index + delta < 0 || index + delta >= array.length
                    }
                    onClick={() => {
                      const next = [...array];
                      [next[index], next[index + delta]] = [
                        next[index + delta],
                        next[index],
                      ];
                      update("answer", next);
                    }}
                  >
                    {delta === -1 ? "↑ لأعلى" : "↓ لأسفل"}
                  </button>
                ))}
              </div>
            ),
          )}
        </>
      )}
      {["map", "match", "image-match"].includes(q.type) && (
        <>
          <button
            type="button"
            onClick={() =>
              setRows([
                ...rows,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  ...(q.type === "map"
                    ? { lat: 26, lng: 30 }
                    : { choices: ["", ""] }),
                },
              ])
            }
          >
            إضافة {q.type === "map" ? "موقع" : "زوج مطابقة"}
          </button>
          {rows.map((item, index) => (
            <fieldset key={item.id}>
              <legend>
                {q.type === "map" ? "موقع" : "زوج"} {index + 1}
              </legend>
              <Field label="الاسم">
                <input
                  value={item.label || ""}
                  onChange={(e) =>
                    setRows(
                      rows.map((v, j) =>
                        j === index ? { ...v, label: e.target.value } : v,
                      ),
                    )
                  }
                />
              </Field>
              {q.type === "map" ? (
                <div className="cms-grid">
                  {["lat", "lng"].map((key) => (
                    <Field
                      label={key === "lat" ? "خط العرض" : "خط الطول"}
                      key={key}
                    >
                      <input
                        type="number"
                        step="any"
                        min={key === "lat" ? -90 : -180}
                        max={key === "lat" ? 90 : 180}
                        value={item[key] ?? ""}
                        onChange={(e) =>
                          setRows(
                            rows.map((v, j) =>
                              j === index
                                ? { ...v, [key]: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      />
                    </Field>
                  ))}
                </div>
              ) : (
                <>
                  <Field label="الاختيارات · اختيار في كل سطر">
                    <textarea
                      value={(item.choices || []).map(getLabel).join("\n")}
                      onChange={(e) =>
                        setRows(
                          rows.map((v, j) =>
                            j === index
                              ? { ...v, choices: e.target.value.split("\n") }
                              : v,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="المطابقة الصحيحة">
                    <select
                      value={answers[item.id] || ""}
                      onChange={(e) => correct(item.id, e.target.value)}
                    >
                      <option value="">حدد المطابقة</option>
                      {(item.choices || []).map((v, j) => (
                        <option key={j} value={getId(v)}>
                          {getLabel(v)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {q.type === "image-match" && (
                    <>
                      <Field label="رابط الصورة">
                        <input
                          dir="ltr"
                          value={item.image || ""}
                          onChange={(e) =>
                            setRows(
                              rows.map((v, j) =>
                                j === index
                                  ? { ...v, image: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="وصف الصورة البديل">
                        <input
                          value={item.alt || ""}
                          onChange={(e) =>
                            setRows(
                              rows.map((v, j) =>
                                j === index ? { ...v, alt: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              <button
                type="button"
                className="cms-danger"
                onClick={() => setRows(rows.filter((_, j) => j !== index))}
              >
                إزالة الصف
              </button>
            </fieldset>
          ))}
          {q.type === "map" && (
            <Field label="الموقع الصحيح">
              <select
                value={typeof q.answer === "string" ? q.answer : ""}
                onChange={(e) => update("answer", e.target.value)}
              >
                <option value="">حدد الموقع الصحيح</option>
                {rows.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </>
      )}
      {q.type === "drag" && (
        <>
          <Field label="المجموعات · مجموعة في كل سطر">
            <textarea
              value={(q.groups || []).join("\n")}
              onChange={(e) => update("groups", e.target.value.split("\n"))}
            />
          </Field>
          <Field label="العناصر · عنصر في كل سطر">
            <textarea
              value={(q.options || []).map(getLabel).join("\n")}
              onChange={(e) => update("options", e.target.value.split("\n"))}
            />
          </Field>
          {(q.options || []).map((item, index) => (
            <Field key={index} label={`المجموعة الصحيحة: ${getLabel(item)}`}>
              <select
                value={answers[getId(item)] || ""}
                onChange={(e) => correct(getId(item), e.target.value)}
              >
                <option value="">حدد المجموعة</option>
                {(q.groups || []).map((g, j) => (
                  <option key={j}>{g}</option>
                ))}
              </select>
            </Field>
          ))}
        </>
      )}
    </>
  );
}
export default function AdminPage({ user }) {
  const [nodes, setNodes] = useState([]),
    [draft, setDraft] = useState(blank),
    [tab, setTab] = useState(user?.role === "teacher" ? "reports" : "content"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState(""),
    [accounts, setAccounts] = useState([]),
    [reports, setReports] = useState(null),
    [history, setHistory] = useState([]),
    [confirm, setConfirm] = useState(null),
    [newUser, setNewUser] = useState({
      email: "",
      password: "",
      displayName: "",
      role: "student",
      teacherId: "",
    });
  const dialog = useRef(null),
    importInput = useRef(null);
  const content = draft.content || {};
  const superadmin = user?.role === "super_admin";
  const run = async (fn) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message || "تعذر تنفيذ الطلب. أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  };
  const load = async () => {
    const data = await api("/api/admin/nodes");
    setNodes(data.nodes || []);
  };
  useEffect(() => {
    if (user?.role === "teacher")
      run(async () => setReports(await api("/api/reports")));
    else run(load);
  }, []);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);
  const patch = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const edit = (key, value) =>
    setDraft((d) => ({ ...d, content: { ...d.content, [key]: value } }));
  const resources = content.resources || [],
    questions = content.questions || [];
  const changeResource = (i, key, value) =>
    edit(
      "resources",
      resources.map((r, j) => (j === i ? { ...r, [key]: value } : r)),
    );
  const changeQuestion = (i, key, value) =>
    setDraft((d) => ({
      ...d,
      content: {
        ...d.content,
        questions: (d.content.questions || []).map((r, j) =>
          j === i ? { ...r, [key]: value } : r,
        ),
      },
    }));
  async function save(e) {
    e.preventDefault();
    await run(async () => {
      const data = await api(
        `/api/admin/nodes${draft.id ? `/${encodeURIComponent(draft.id)}` : ""}`,
        {
          method: draft.id ? "PUT" : "POST",
          body: JSON.stringify({
            ...draft,
            id: draft.id || crypto.randomUUID(),
          }),
        },
      );
      await load();
      setDraft({
        ...(data.node || data),
        enabled: (data.node || data).enabled ?? !(data.node || data).disabled,
      });
      setNotice("تم حفظ المحتوى. لا يظهر للطلاب إلا بعد النشر.");
    });
  }
  async function switchTab(value) {
    setTab(value);
    if (value === "users")
      await run(async () => {
        const d = await api("/api/admin/users");
        setAccounts(d.users || []);
      });
    if (value === "reports")
      await run(async () => setReports(await api("/api/reports")));
  }
  async function exportData() {
    await run(async () => {
      const data = await api("/api/admin/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "lamies-content.json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice("تم تجهيز ملف التصدير.");
    });
  }
  async function importData(file) {
    if (!file) return;
    await run(async () => {
      const data = JSON.parse(await file.text());
      await api("/api/admin/import", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await load();
      setNotice("تم استيراد المحتوى. راجع المسودات قبل النشر.");
    });
    if (importInput.current) importInput.current.value = "";
  }
  async function upload(file, i, kind) {
    if (!file) return;
    await run(async () => {
      const data = await api("/api/admin/media", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "X-Filename": encodeURIComponent(file.name),
        },
        body: file,
      });
      changeResource(i, "media", {
        ...resources[i].media,
        [kind]: data.media.url,
      });
      setNotice("تم رفع الملف. احفظ الدرس لتثبيت الرابط.");
    });
  }
  return (
    <main className="cms" dir="rtl">
      <header className="cms-header">
        <div>
          <h1>محتوى يصنع رحلة تعلم أفضل</h1>
          <p>نظّم المنهج، راجع الدروس، ثم انشر المحتوى المعتمد.</p>
        </div>
        <Link className="cms-button" to="/">
          العودة للمنصة <ArrowSquareOut size={18} />
        </Link>
      </header>
      <nav className="cms-tabs" aria-label="أقسام الإدارة">
        {[
          ...(user?.role === "teacher" ? [] : [["content", "المحتوى", Books]]),
          ...(superadmin ? [["users", "المستخدمون", Users]] : []),
          ["reports", "تقارير التعلم", ChartBar],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => switchTab(id)}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="cms-alert">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="cms-notice">
          {notice}
        </div>
      )}
      {busy && <p role="status">جارٍ تنفيذ الطلب…</p>}
      {tab === "content" && (
        <>
          <div className="cms-toolbar">
            <button
              className="cms-primary"
              disabled={busy}
              onClick={() => {
                setDraft(blank());
                setHistory([]);
              }}
            >
              <Plus size={18} />
              إضافة محتوى
            </button>
            <button disabled={busy} onClick={exportData}>
              <DownloadSimple size={18} />
              تصدير JSON
            </button>
            <button
              disabled={busy}
              onClick={() => importInput.current?.click()}
            >
              <UploadSimple size={18} />
              استيراد JSON
            </button>
            <input
              ref={importInput}
              hidden
              type="file"
              accept=".json,application/json"
              onChange={(e) => importData(e.target.files[0])}
            />
          </div>
          <div className="cms-workspace">
            <aside className="cms-panel cms-tree">
              <h2>
                <ListBullets size={22} />
                هيكل المنهج
              </h2>
              <Field label="بحث في المحتوى">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="اسم درس أو وحدة…"
                />
              </Field>
              <div className="cms-node-list">
                {nodes
                  .filter((n) => n.title.includes(filter))
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((n) => (
                    <button
                      key={n.id}
                      className={draft.id === n.id ? "selected" : ""}
                      onClick={() => {
                        setDraft({
                          ...n,
                          enabled: n.enabled ?? !n.disabled,
                          content: n.content || {},
                        });
                        setHistory([]);
                      }}
                    >
                      <span>
                        <small>{KINDS[n.kind] || n.kind}</small>
                        <strong>{n.title}</strong>
                        <small>
                          {nodes.find((p) => p.id === n.parentId)?.title ||
                            "مستوى رئيسي"}
                        </small>
                      </span>
                      <span className="cms-status">
                        {n.enabled === false || n.disabled
                          ? "معطّل"
                          : n.status === "published"
                            ? "منشور"
                            : "مسودة"}
                      </span>
                    </button>
                  ))}
                {!nodes.length && !busy && (
                  <p>لا يوجد محتوى بعد. ابدأ بإضافة المرحلة الدراسية.</p>
                )}
              </div>
            </aside>
            <form className="cms-panel cms-editor" onSubmit={save}>
              <div className="cms-section-title">
                <h2>{draft.id ? "تحرير المحتوى" : "محتوى جديد"}</h2>
                {draft.id && <small dir="ltr">{draft.id}</small>}
              </div>
              <div className="cms-grid">
                <Field label="النوع">
                  <select
                    value={draft.kind}
                    onChange={(e) => patch("kind", e.target.value)}
                  >
                    {Object.entries(KINDS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="يتبع">
                  <select
                    value={draft.parentId || ""}
                    onChange={(e) => patch("parentId", e.target.value || null)}
                  >
                    <option value="">مستوى رئيسي</option>
                    {nodes
                      .filter((n) => n.id !== draft.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {KINDS[n.kind]} · {n.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="العنوان">
                  <input
                    required
                    value={draft.title}
                    onChange={(e) => patch("title", e.target.value)}
                  />
                </Field>
                <Field label="ترتيب العرض">
                  <input
                    type="number"
                    min="0"
                    value={draft.order ?? 0}
                    onChange={(e) => patch("order", Number(e.target.value))}
                  />
                </Field>
                <Field label="حالة النشر">
                  <select
                    value={draft.status}
                    onChange={(e) => patch("status", e.target.value)}
                  >
                    <option value="draft">مسودة</option>
                    <option value="published">منشور للطلاب</option>
                  </select>
                </Field>
                <Field label="مصدر المحتوى">
                  <input
                    value={content.source || ""}
                    onChange={(e) => edit("source", e.target.value)}
                    placeholder="الكتاب / المرجع / رابط المصدر"
                  />
                </Field>
                <Field label="العام الدراسي">
                  <input
                    value={content.schoolYear || ""}
                    onChange={(e) => edit("schoolYear", e.target.value)}
                    placeholder="2026 / 2027"
                  />
                </Field>
                <Field label="إصدار المنهج">
                  <input
                    value={content.edition || ""}
                    onChange={(e) => edit("edition", e.target.value)}
                  />
                </Field>
              </div>
              <label className="cms-check">
                <input
                  type="checkbox"
                  checked={draft.enabled !== false}
                  onChange={(e) => patch("enabled", e.target.checked)}
                />
                المحتوى مفعّل
              </label>
              {draft.kind === "lesson" && (
                <>
                  <section>
                    <h3>بناء الدرس</h3>
                    <Field label="الأهداف · هدف في كل سطر">
                      <textarea
                        value={(content.objectives || []).join("\n")}
                        onChange={(e) =>
                          edit("objectives", split(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="مقدمة الدرس">
                      <textarea
                        value={content.intro || ""}
                        onChange={(e) => edit("intro", e.target.value)}
                      />
                    </Field>
                    <Field label="ملخص الدرس">
                      <textarea
                        value={content.summary || ""}
                        onChange={(e) => edit("summary", e.target.value)}
                      />
                    </Field>
                    <h3>المفاهيم</h3>
                    {(content.concepts || []).map((item, index) => {
                      const concept =
                        typeof item === "string"
                          ? { term: item, definition: "", image: "" }
                          : item;
                      return (
                        <fieldset key={index}>
                          <legend>المفهوم {index + 1}</legend>
                          {[
                            ["term", "المصطلح"],
                            ["definition", "التعريف"],
                            ["image", "رابط صورة توضيحية"],
                          ].map(([key, label]) => (
                            <Field key={key} label={label}>
                              <input
                                value={concept[key] || ""}
                                onChange={(e) =>
                                  edit(
                                    "concepts",
                                    content.concepts.map((v, j) =>
                                      j === index
                                        ? { ...concept, [key]: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              />
                            </Field>
                          ))}
                          <button
                            type="button"
                            className="cms-danger"
                            onClick={() =>
                              edit(
                                "concepts",
                                content.concepts.filter((_, j) => j !== index),
                              )
                            }
                          >
                            إزالة المفهوم
                          </button>
                        </fieldset>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        edit("concepts", [
                          ...(content.concepts || []),
                          { term: "", definition: "", image: "" },
                        ])
                      }
                    >
                      إضافة مفهوم
                    </button>
                    <Field label="الحقائق التعليمية · حقيقة في كل سطر">
                      <textarea
                        value={(content.facts || []).join("\n")}
                        onChange={(e) => edit("facts", split(e.target.value))}
                      />
                    </Field>
                    <Field label="المراجع · مرجع في كل سطر">
                      <textarea
                        value={(content.references || []).join("\n")}
                        onChange={(e) =>
                          edit("references", split(e.target.value))
                        }
                      />
                    </Field>
                    {(content.sources || []).map((source, index) => (
                      <fieldset key={source.id || index}>
                        <legend>المصدر المعرفي {index + 1}</legend>
                        <Field label="عنوان المصدر">
                          <input
                            value={source.title || ""}
                            onChange={(e) =>
                              edit(
                                "sources",
                                content.sources.map((v, j) =>
                                  j === index
                                    ? { ...v, title: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="النص المعتمد الذي يستند إليه المعلم الذكي">
                          <textarea
                            value={source.text || ""}
                            onChange={(e) =>
                              edit(
                                "sources",
                                content.sources.map((v, j) =>
                                  j === index
                                    ? { ...v, text: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </Field>
                        <label className="cms-check">
                          <input
                            type="checkbox"
                            checked={source.approved === true}
                            onChange={(e) =>
                              edit(
                                "sources",
                                content.sources.map((v, j) =>
                                  j === index
                                    ? { ...v, approved: e.target.checked }
                                    : v,
                                ),
                              )
                            }
                          />
                          مصدر مُراجع ومعتمد
                        </label>
                      </fieldset>
                    ))}
                    <JsonField
                      label="مصادر المعلم الذكي · بيانات متقدمة: id، title، text، approved"
                      value={content.sources || []}
                      onChange={(v) => edit("sources", v)}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        edit("sources", [
                          ...(content.sources || []),
                          {
                            id: crypto.randomUUID(),
                            title: "مصدر جديد",
                            text: "",
                            approved: false,
                          },
                        ])
                      }
                    >
                      إضافة مصدر معرفي
                    </button>
                    <label className="cms-check">
                      <input
                        type="checkbox"
                        checked={content.reviewRequired === false}
                        onChange={(e) =>
                          edit("reviewRequired", !e.target.checked)
                        }
                      />
                      تمت مراجعة الحقائق والمواقع والوسائط تربويًا
                    </label>
                    <p className="cms-help">
                      النشر قرار مستقل. تأكد من صحة المراجع وحقوق الصور والفيديو
                      قبل إتاحة الدرس.
                    </p>
                  </section>
                  <section>
                    <div className="cms-section-title">
                      <h3>الموارد ومواقعها</h3>
                      <button
                        type="button"
                        onClick={() =>
                          edit("resources", [
                            ...resources,
                            {
                              id: crypto.randomUUID(),
                              label: "مورد جديد",
                              kind: "mineral",
                              description: "",
                              importance: "",
                              locations: [],
                              media: {},
                            },
                          ])
                        }
                      >
                        <Plus size={17} />
                        إضافة مورد
                      </button>
                    </div>
                    {resources.map((r, i) => (
                      <fieldset key={r.id || i}>
                        <legend>{r.label || `المورد ${i + 1}`}</legend>
                        <div className="cms-grid">
                          <Field label="اسم المورد">
                            <input
                              value={r.label || ""}
                              onChange={(e) =>
                                changeResource(i, "label", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="الفئة">
                            <select
                              value={r.kind || "mineral"}
                              onChange={(e) =>
                                changeResource(i, "kind", e.target.value)
                              }
                            >
                              <option value="mineral">خامات معدنية</option>
                              <option value="renewable">طاقة متجددة</option>
                              <option value="nonrenewable">
                                طاقة غير متجددة
                              </option>
                              <option value="other">موارد أخرى</option>
                            </select>
                          </Field>
                        </div>
                        <Field label="أماكن الوجود والوصف">
                          <textarea
                            value={r.description || ""}
                            onChange={(e) =>
                              changeResource(i, "description", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="أهمية المورد">
                          <textarea
                            value={r.importance || ""}
                            onChange={(e) =>
                              changeResource(i, "importance", e.target.value)
                            }
                          />
                        </Field>
                        <div className="cms-grid">
                          {["image", "video"].map((kind) => (
                            <Field
                              key={kind}
                              label={
                                kind === "image"
                                  ? "رابط صورة المورد"
                                  : "رابط فيديو مباشر"
                              }
                            >
                              <input
                                dir="ltr"
                                value={r.media?.[kind] || ""}
                                onChange={(e) =>
                                  changeResource(i, "media", {
                                    ...r.media,
                                    [kind]: e.target.value,
                                  })
                                }
                              />
                              <input
                                aria-label={
                                  kind === "image" ? "رفع صورة" : "رفع فيديو"
                                }
                                type="file"
                                accept={
                                  kind === "image" ? "image/*" : "video/*"
                                }
                                disabled={busy}
                                onChange={(e) =>
                                  upload(e.target.files[0], i, kind)
                                }
                              />
                            </Field>
                          ))}
                        </div>
                        <h3>المواقع الجغرافية</h3>
                        {(r.locations || []).map((location, index) => (
                          <fieldset key={location.id || index}>
                            <legend>الموقع {index + 1}</legend>
                            {[
                              ["name", "اسم الموقع"],
                              ["lat", "خط العرض"],
                              ["lng", "خط الطول"],
                            ].map(([key, label]) => (
                              <Field label={label} key={key}>
                                <input
                                  type={key === "name" ? "text" : "number"}
                                  step={key === "name" ? undefined : "any"}
                                  min={
                                    key === "lat"
                                      ? -90
                                      : key === "lng"
                                        ? -180
                                        : undefined
                                  }
                                  max={
                                    key === "lat"
                                      ? 90
                                      : key === "lng"
                                        ? 180
                                        : undefined
                                  }
                                  value={location[key] ?? ""}
                                  onChange={(e) =>
                                    changeResource(
                                      i,
                                      "locations",
                                      r.locations.map((v, j) =>
                                        j === index
                                          ? {
                                              ...v,
                                              [key]:
                                                key === "name"
                                                  ? e.target.value
                                                  : Number(e.target.value),
                                            }
                                          : v,
                                      ),
                                    )
                                  }
                                />
                              </Field>
                            ))}
                            <button
                              type="button"
                              className="cms-danger"
                              onClick={() =>
                                changeResource(
                                  i,
                                  "locations",
                                  r.locations.filter((_, j) => j !== index),
                                )
                              }
                            >
                              إزالة الموقع
                            </button>
                          </fieldset>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            changeResource(i, "locations", [
                              ...(r.locations || []),
                              {
                                id: crypto.randomUUID(),
                                name: "",
                                lat: 26,
                                lng: 30,
                              },
                            ])
                          }
                        >
                          إضافة موقع جغرافي
                        </button>
                        <JsonField
                          label="المواقع الجغرافية · بيانات متقدمة: id، name، lat، lng"
                          value={r.locations || []}
                          onChange={(v) => changeResource(i, "locations", v)}
                        />
                        <button
                          type="button"
                          className="cms-danger"
                          onClick={() =>
                            setConfirm({
                              label: `حذف المورد «${r.label}» من المسودة؟`,
                              action: () =>
                                edit(
                                  "resources",
                                  resources.filter((_, j) => j !== i),
                                ),
                            })
                          }
                        >
                          حذف المورد
                        </button>
                      </fieldset>
                    ))}
                  </section>
                  <section>
                    <div className="cms-section-title">
                      <h3>الأسئلة والأنشطة</h3>
                      <button
                        type="button"
                        onClick={() =>
                          edit("questions", [
                            ...questions,
                            {
                              id: crypto.randomUUID(),
                              type: "choice",
                              prompt: "",
                              options: ["", ""],
                              answer: "",
                              explanation: "",
                            },
                          ])
                        }
                      >
                        <Plus size={17} />
                        إضافة سؤال
                      </button>
                    </div>
                    {questions.map((q, i) => (
                      <fieldset key={q.id || i}>
                        <legend>السؤال {i + 1}</legend>
                        <Field label="نوع السؤال">
                          <select
                            value={q.type}
                            onChange={(e) =>
                              changeQuestion(i, "type", e.target.value)
                            }
                          >
                            {Object.entries(TYPES).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="نص السؤال">
                          <textarea
                            value={q.prompt || ""}
                            onChange={(e) =>
                              changeQuestion(i, "prompt", e.target.value)
                            }
                          />
                        </Field>
                        {q.type === "choice" && (
                          <>
                            <Field label="الاختيارات · اختيار في كل سطر">
                              <textarea
                                value={(q.options || []).join("\n")}
                                onChange={(e) =>
                                  changeQuestion(
                                    i,
                                    "options",
                                    e.target.value.split("\n"),
                                  )
                                }
                              />
                            </Field>
                            <Field label="الإجابة الصحيحة">
                              <select
                                value={
                                  typeof q.answer === "string" ? q.answer : ""
                                }
                                onChange={(e) =>
                                  changeQuestion(i, "answer", e.target.value)
                                }
                              >
                                <option value="">حدد الإجابة</option>
                                {(q.options || []).map((o, j) => (
                                  <option key={j} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </>
                        )}
                        {q.type === "blank" && (
                          <Field label="الكلمة الصحيحة للفراغ">
                            <input
                              value={
                                typeof q.answer === "string" ? q.answer : ""
                              }
                              onChange={(e) =>
                                changeQuestion(i, "answer", e.target.value)
                              }
                            />
                          </Field>
                        )}
                        {q.type === "boolean" && (
                          <Field label="الإجابة الصحيحة">
                            <select
                              value={String(q.answer)}
                              onChange={(e) =>
                                changeQuestion(
                                  i,
                                  "answer",
                                  e.target.value === "true",
                                )
                              }
                            >
                              <option value="">حدد الإجابة</option>
                              <option value="true">صحيح</option>
                              <option value="false">خطأ</option>
                            </select>
                          </Field>
                        )}
                        <QuestionDetails
                          q={q}
                          update={(key, value) => changeQuestion(i, key, value)}
                        />
                        <Field label="تلميح عند الخطأ">
                          <input
                            value={q.hint || ""}
                            onChange={(e) =>
                              changeQuestion(i, "hint", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="مستوى الصعوبة">
                          <select
                            value={q.difficulty || "easy"}
                            onChange={(e) =>
                              changeQuestion(i, "difficulty", e.target.value)
                            }
                          >
                            <option value="easy">سهل</option>
                            <option value="medium">متوسط</option>
                            <option value="hard">صعب</option>
                          </select>
                        </Field>
                        <Field label="تفسير الإجابة والتغذية الراجعة">
                          <textarea
                            value={q.explanation || ""}
                            onChange={(e) =>
                              changeQuestion(i, "explanation", e.target.value)
                            }
                          />
                        </Field>
                        <button
                          type="button"
                          className="cms-danger"
                          onClick={() =>
                            setConfirm({
                              label: "حذف هذا السؤال من المسودة؟",
                              action: () =>
                                edit(
                                  "questions",
                                  questions.filter((_, j) => j !== i),
                                ),
                            })
                          }
                        >
                          حذف السؤال
                        </button>
                      </fieldset>
                    ))}
                    <details>
                      <summary>
                        محرر بيانات الأسئلة المتقدم · الأنواع الثمانية
                      </summary>
                      <p className="cms-help">
                        الأنواع: choice، boolean، order، match، drag، map،
                        blank، image-match. استخدم items للمطابقة والترتيب،
                        وlocations لسؤال الخريطة، وimage للصورة. حدد answer
                        وexplanation لكل سؤال.
                      </p>
                      <JsonField
                        label="بيانات الأسئلة JSON"
                        value={questions}
                        onChange={(v) => edit("questions", v)}
                      />
                    </details>
                  </section>
                </>
              )}
              <footer className="cms-save">
                <button className="cms-primary" disabled={busy}>
                  <FloppyDisk size={18} />
                  حفظ{" "}
                  {draft.status === "published" ? "ونشر المحتوى" : "المسودة"}
                </button>
                {draft.id && draft.kind === "lesson" && (
                  <Link
                    className="cms-button"
                    target="_blank"
                    to={`/classroom/${draft.id}?preview=1`}
                  >
                    معاينة المسودة <ArrowSquareOut size={17} />
                  </Link>
                )}
                {draft.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const d = await api(
                          `/api/admin/nodes/${draft.id}/history`,
                        );
                        setHistory(d.history || []);
                      })
                    }
                  >
                    <ClockCounterClockwise size={18} />
                    سجل الإصدارات
                  </button>
                )}
              </footer>
              {history.length > 0 && (
                <section>
                  <h3>الإصدارات المحفوظة</h3>
                  {history.map((v) => (
                    <div className="cms-version" key={v.id}>
                      <span>
                        إصدار {v.version || v.id} ·{" "}
                        {v.createdAt
                          ? new Date(v.createdAt).toLocaleString("ar")
                          : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            label:
                              "استعادة هذا الإصدار؟ سيحفظ الخادم نسخة من التغيير الحالي.",
                            action: () =>
                              run(async () => {
                                const d = await api(
                                  `/api/admin/nodes/${draft.id}/restore`,
                                  {
                                    method: "POST",
                                    body: JSON.stringify({ historyId: v.id }),
                                  },
                                );
                                setDraft({
                                  ...d.node,
                                  enabled: d.node.enabled ?? !d.node.disabled,
                                });
                                await load();
                                setNotice("تمت استعادة الإصدار.");
                              }),
                          })
                        }
                      >
                        استعادة
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </form>
          </div>
        </>
      )}
      {tab === "users" && (
        <section className="cms-panel">
          <h2>إدارة المستخدمين</h2>
          <p className="cms-help">
            يعرض الخادم الحسابات التي تسمح بها صلاحياتك فقط.
          </p>
          {superadmin && (
            <form
              className="cms-grid"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await api("/api/admin/users", {
                    method: "POST",
                    body: JSON.stringify(newUser),
                  });
                  const d = await api("/api/admin/users");
                  setAccounts(d.users || []);
                  setNewUser({
                    ...newUser,
                    email: "",
                    password: "",
                    displayName: "",
                  });
                  setNotice("تم إنشاء الحساب.");
                });
              }}
            >
              <Field label="البريد الإلكتروني للدخول">
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </Field>
              <Field label="الاسم المعروض">
                <input
                  required
                  value={newUser.displayName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, displayName: e.target.value })
                  }
                />
              </Field>
              <Field label="كلمة مرور مؤقتة · 12 حرفًا على الأقل">
                <input
                  required
                  minLength="12"
                  type="password"
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </Field>
              <Field label="نوع الحساب">
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <option value="student">طالب</option>
                  {superadmin && (
                    <>
                      <option value="teacher">معلم</option>
                      <option value="content_admin">مدير المحتوى</option>
                      <option value="parent">ولي أمر</option>
                      <option value="super_admin">مشرف رئيسي</option>
                    </>
                  )}
                </select>
              </Field>
              {superadmin && newUser.role === "student" && (
                <Field label="المعلم المسؤول">
                  <select
                    value={newUser.teacherId}
                    onChange={(e) =>
                      setNewUser({ ...newUser, teacherId: e.target.value })
                    }
                  >
                    <option value="">بدون تعيين</option>
                    {accounts
                      .filter((a) => a.role === "teacher")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.displayName || a.name || a.email}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
              <button className="cms-primary" disabled={busy}>
                إنشاء الحساب
              </button>
            </form>
          )}
          <div className="cms-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الدور</th>
                  <th>المعلم المسؤول</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.displayName || a.name || a.email}
                      <small className="cms-block" dir="ltr">
                        {a.email}
                      </small>
                    </td>
                    <td>
                      {superadmin && a.id !== user?.id ? (
                        <select
                          aria-label={`دور ${a.name || a.email}`}
                          value={a.role}
                          onChange={(e) =>
                            run(async () => {
                              await api(`/api/admin/users/${a.id}`, {
                                method: "PUT",
                                body: JSON.stringify({ role: e.target.value }),
                              });
                              const d = await api("/api/admin/users");
                              setAccounts(d.users || []);
                            })
                          }
                        >
                          {[
                            ["student", "طالب"],
                            ["teacher", "معلم"],
                            ["content_admin", "مدير المحتوى"],
                            ["parent", "ولي أمر"],
                            ["super_admin", "مشرف رئيسي"],
                          ].map(([role, label]) => (
                            <option key={role} value={role}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        {
                          super_admin: "مشرف رئيسي",
                          content_admin: "مدير المحتوى",
                          teacher: "معلم",
                          parent: "ولي أمر",
                          student: "طالب",
                        }[a.role] || a.role
                      )}
                    </td>
                    <td>
                      {superadmin && a.role === "student" ? (
                        <select
                          aria-label={`المعلم المسؤول عن ${a.displayName || a.name || a.email}`}
                          value={a.teacherId || ""}
                          onChange={(e) =>
                            run(async () => {
                              await api(`/api/admin/users/${a.id}`, {
                                method: "PUT",
                                body: JSON.stringify({
                                  teacherId: e.target.value || null,
                                }),
                              });
                              const d = await api("/api/admin/users");
                              setAccounts(d.users || []);
                            })
                          }
                        >
                          <option value="">بدون تعيين</option>
                          {accounts
                            .filter((u) => u.role === "teacher")
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.displayName || t.name || t.email}
                              </option>
                            ))}
                        </select>
                      ) : (
                        accounts.find((t) => t.id === a.teacherId)?.name || "—"
                      )}
                    </td>
                    <td>{a.enabled === false ? "معطّل" : "مفعّل"}</td>
                    <td>
                      {superadmin &&
                        a.id !== user?.id &&
                        a.role !== "super_admin" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                label: `${a.enabled === false ? "تفعيل" : "تعطيل"} حساب ${a.displayName || a.name || a.email}؟`,
                                action: () =>
                                  run(async () => {
                                    await api(`/api/admin/users/${a.id}`, {
                                      method: "PUT",
                                      body: JSON.stringify({
                                        enabled: a.enabled === false,
                                      }),
                                    });
                                    const d = await api("/api/admin/users");
                                    setAccounts(d.users || []);
                                  }),
                              })
                            }
                          >
                            {a.enabled === false ? "تفعيل" : "تعطيل"}
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "reports" && (
        <section className="cms-panel">
          <h2>تقارير التعلم</h2>
          <p>
            بيانات فعلية من محاولات الطلاب؛ تقتصر النتائج على نطاق صلاحياتك.
          </p>
          {reports ? (
            <>
              <div className="cms-report-list">
                {(reports.students || reports.reports || []).map((r, i) => (
                  <article key={r.id || r.userId || i}>
                    <h3>{r.displayName || r.username || r.name || r.userId}</h3>
                    <p>
                      الدروس المكتملة:{" "}
                      {r.completedLessons ??
                        (Array.isArray(r.completed)
                          ? r.completed.length
                          : 0)}{" "}
                      · المحاولات:{" "}
                      {r.attempts ??
                        (r.answers || []).reduce(
                          (n, a) => n + (a.attempts || 0),
                          0,
                        )}
                    </p>
                    {r.score != null && <p>النتيجة: {r.score}</p>}
                  </article>
                ))}
              </div>
              {!(reports.students || reports.reports || []).length && (
                <p>لا توجد محاولات مسجلة حتى الآن.</p>
              )}
              <details>
                <summary>عرض التقرير التفصيلي</summary>
                <pre className="cms-report-json" dir="ltr">
                  {JSON.stringify(reports, null, 2)}
                </pre>
              </details>
            </>
          ) : (
            <p>لم يتم تحميل التقرير بعد.</p>
          )}
        </section>
      )}
      <dialog
        ref={dialog}
        className="cms-dialog"
        onCancel={() => setConfirm(null)}
        onClose={() => setConfirm(null)}
      >
        <h2>تأكيد الإجراء</h2>
        <p>{confirm?.label}</p>
        <div className="cms-toolbar">
          <button autoFocus onClick={() => setConfirm(null)}>
            إلغاء
          </button>
          <button
            className="cms-primary"
            onClick={() => {
              const action = confirm?.action;
              setConfirm(null);
              action?.();
            }}
          >
            تأكيد
          </button>
        </div>
      </dialog>
    </main>
  );
}

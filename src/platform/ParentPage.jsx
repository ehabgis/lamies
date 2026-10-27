import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardText,
  CheckCircle,
  PuzzlePiece,
  ChartBar,
  Lightbulb,
  Clock,
  Info,
  Drop,
  Diamond,
  Buildings,
  CircleNotch,
  MinusCircle,
  Medal,
  SignOut,
  UserPlus,
  CaretLeft,
  X,
} from "phosphor-react";
import { api } from "./api";
import { useSession } from "./Session";
import BrandMark from "./BrandMark";
import RobotGuide from "../components/Map/RobotGuide";
import "./parent.css";

const LESSON_ICON = { "lesson-1": Diamond, "lesson-2": Drop, "lesson-3": Buildings };
const STATUS = {
  done: { label: "مكتمل", Icon: CheckCircle },
  active: { label: "قيد التعلم", Icon: CircleNotch },
  new: { label: "لم يبدأ بعد", Icon: MinusCircle },
};
const when = (t) => {
  if (!t) return "لا يوجد نشاط بعد";
  const d = new Date(t);
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
};
const time = (t) => new Date(t).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });

// «متابعة تقدم طفلك»: what a linked parent sees, from the server's record of
// graded work only. Finishing a lesson means meeting its requirements.
export default function ParentPage() {
  const { user, loading, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [childId, setChildId] = useState(null);
  const [tab, setTab] = useState("summary");
  const [open, setOpen] = useState(null);
  const [linking, setLinking] = useState(false);

  const load = () =>
    api("/parent/children")
      .then((d) => {
        setData(d);
        setChildId((id) => (d.children.some((c) => c.id === id) ? id : d.children[0]?.id || null));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (user?.role === "parent") load();
  }, [user?.id]);

  if (loading) return <p className="platform-loading">جارٍ الفتح…</p>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "parent")
    return (
      <div className="pr-page" dir="rtl">
        <p className="pr-empty">هذه الصفحة لحسابات أولياء الأمور.</p>
      </div>
    );

  const child = data?.children.find((c) => c.id === childId);
  const header = (
    <header className="pr-top">
      <span className="pr-brand">
        <BrandMark size={38} /> الخرائط التعليمية الذكية
      </span>
      <span className="pr-who">
        <b>{user.name}</b>
        <small>{child ? `ولي أمر ${child.name.split(/\s+/)[0]}` : "ولي أمر"}</small>
      </span>
      <button
        type="button"
        className="pr-icon"
        aria-label="تسجيل الخروج"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
      >
        <SignOut size={22} />
      </button>
    </header>
  );

  if (error)
    return (
      <div className="pr-page" dir="rtl">
        {header}
        <p className="pr-empty" role="alert">
          تعذر تحميل التقدم. {error}
        </p>
      </div>
    );
  if (!data)
    return (
      <div className="pr-page" dir="rtl">
        {header}
        <p className="pr-empty" role="status">
          نجمع تقدم طفلك…
        </p>
      </div>
    );

  if (!data.children.length || linking)
    return (
      <div className="pr-page" dir="rtl">
        {header}
        <main className="pr-main">
          <LinkChild
            first={!data.children.length}
            onCancel={data.children.length ? () => setLinking(false) : null}
            onLinked={() => {
              setLinking(false);
              load();
            }}
          />
        </main>
      </div>
    );

  const t = child.totals;
  const lesson = child.lessons.find((l) => l.id === open);
  return (
    <div className="pr-page" dir="rtl">
      {header}
      <main className="pr-main">
        <section className="pr-hero">
          <div>
            <h1>متابعة تقدم طفلك</h1>
            <p>اطمئن على خطواته في التعلم</p>
          </div>
          <div className="pr-child">
            <span className="pr-avatar" aria-hidden="true">
              {child.name.trim()[0]}
            </span>
            <div>
              <b>{child.name}</b>
              <span>{child.grade}</span>
              <small>
                <i className={child.lastActive ? "is-on" : ""} /> آخر نشاط: {when(child.lastActive)}
              </small>
            </div>
            {data.children.length > 1 && (
              <select aria-label="اختر الطالب" value={childId} onChange={(e) => setChildId(e.target.value)}>
                {data.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="pr-summary">{child.summary}</p>
        </section>

        <section className="pr-stats" aria-label="ملخص الأرقام">
          <Stat Icon={BookOpen} label="الدروس المكتملة" value={`${t.lessons.done} من ${t.lessons.total}`} tone="blue" />
          <Stat Icon={ClipboardText} label="الأسئلة المُجابة" value={t.answered} tone="blue" />
          <Stat Icon={CheckCircle} label="الإجابات الصحيحة" value={t.right} hint="من المحاولة الأولى" tone="green" />
          <Stat Icon={PuzzlePiece} label="الأنشطة المكتملة" value={`${t.activities.done} من ${t.activities.total}`} tone="amber" />
        </section>

        {tab === "summary" && (
          <div className="pr-grid">
            <section className="pr-card pr-lessons" aria-labelledby="pr-lessons">
              <h2 id="pr-lessons">
                <ChartBar size={24} weight="fill" aria-hidden="true" /> تقدم الدروس
              </h2>
              <ul>
                {child.lessons.map((l) => {
                  const Icon = LESSON_ICON[l.id];
                  const s = STATUS[l.status];
                  return (
                    <li key={l.id} className={open === l.id ? "is-open" : ""}>
                      <button type="button" aria-expanded={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
                        <span className="pr-lesson-icon" aria-hidden="true">
                          <Icon weight="duotone" />
                        </span>
                        <span className="pr-lesson-main">
                          <b>{l.title}</b>
                          <span className="pr-bar" role="progressbar" aria-label={`تقدم ${l.title}`} aria-valuenow={l.percent} aria-valuemin={0} aria-valuemax={100}>
                            <i className={`is-${l.status}`} style={{ width: `${l.percent}%` }} />
                          </span>
                          <small>{progressLine(l)}</small>
                        </span>
                        <span className={`pr-status is-${l.status}`}>
                          <s.Icon size={18} weight="fill" aria-hidden="true" /> {s.label}
                        </span>
                        <bdi className="pr-percent">{l.percent}٪</bdi>
                      </button>
                      {open === l.id && <LessonDetail lesson={l} />}
                    </li>
                  );
                })}
              </ul>
              <p className="pr-note">
                <Info size={18} aria-hidden="true" /> فتح الدرس وحده لا يعني إتمام تعلمه؛ يكتمل الدرس عند إتمام متطلباته.
              </p>
            </section>
            <div className="pr-side">
              <section className={`pr-card pr-review ${child.review ? "" : "is-calm"}`}>
                <div>
                  <h2>
                    <Lightbulb size={26} weight="fill" aria-hidden="true" /> {child.review ? "يحتاج إلى مراجعة" : "أداء مطمئن"}
                  </h2>
                  <p>
                    {child.review
                      ? `يُنصح بمراجعة ${child.review.topic} في درس ${child.review.lesson}.`
                      : t.answered
                        ? "لا توجد موضوعات تحتاج مراجعة الآن."
                        : "ستظهر هنا اقتراحات المراجعة بعد أن يجيب عن أسئلة الدروس."}
                  </p>
                  {child.review && (
                    <button
                      type="button"
                      className="pr-dark"
                      onClick={() => setOpen(child.lessons.find((l) => l.review)?.id)}
                    >
                      عرض التفاصيل <CaretLeft size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <span className="pr-robot" aria-hidden="true">
                  <RobotGuide />
                </span>
              </section>
              <section className="pr-card pr-recent" aria-labelledby="pr-recent">
                <h2 id="pr-recent">
                  <Clock size={24} aria-hidden="true" /> آخر الأنشطة
                </h2>
                {child.recent.length ? (
                  <ol>
                    {child.recent.slice(0, 4).map((r, i) => (
                      <li key={i}>
                        <span className="pr-recent-icon" aria-hidden="true">
                          {r.kind === "question" ? <ClipboardText size={20} /> : <PuzzlePiece size={20} />}
                        </span>
                        <span>{r.text}</span>
                        <time>
                          {when(r.at)}
                          <small>{time(r.at)}</small>
                        </time>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="pr-muted">لا توجد أنشطة بعد.</p>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === "results" && (
          <section className="pr-card pr-results" aria-label="نتائج الأنشطة">
            <h2>
              <ClipboardText size={24} aria-hidden="true" /> نتائج الأنشطة
            </h2>
            <table>
              <thead>
                <tr>
                  <th>الدرس</th>
                  <th>رحلة الاستكشاف</th>
                  <th>النشاط الرئيسي</th>
                  <th>ابنِ خريطتك</th>
                  <th>الأسئلة</th>
                </tr>
              </thead>
              <tbody>
                {child.lessons.map((l) => (
                  <tr key={l.id}>
                    <th scope="row">{l.title}</th>
                    <td>{l.activities.journey ? "✓ مكتملة" : "—"}</td>
                    <td>{l.activities.activity ? "✓ مكتمل" : "—"}</td>
                    <td>{l.activities.buildMap ? "✓ مكتمل" : "—"}</td>
                    <td>
                      {l.questions.answered ? (
                        <>
                          <bdi>{l.questions.right}</bdi> صحيحة من <bdi>{l.questions.answered}</bdi>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === "certificates" && (
          <section className={`pr-card pr-cert ${child.certificate ? "is-ready" : ""}`}>
            <Medal size={56} weight="duotone" aria-hidden="true" />
            <div>
              <h2>شهادة المستكشف الصغير</h2>
              <p>
                {child.certificate
                  ? `أكمل ${child.name.split(/\s+/)[0]} رحلات الوحدة الثلاث وأنشطة «ابنِ خريطتك»؛ يمكنه عرض شهادته وطباعتها من صفحة «إنجازاتي».`
                  : "تصبح جاهزة بعد إكمال رحلات الوحدة الثلاث ونشاط «ابنِ خريطتك» في كل درس."}
              </p>
            </div>
          </section>
        )}

        <button type="button" className="pr-link" onClick={() => setLinking(true)}>
          <UserPlus size={18} aria-hidden="true" /> ربط طفل آخر
        </button>
      </main>
      <nav className="pr-tabs" aria-label="أقسام المتابعة">
        {[
          ["summary", "ملخص التقدم", ChartBar],
          ["results", "نتائج الأنشطة", ClipboardText],
          ["certificates", "الشهادات", Medal],
        ].map(([id, label, Icon]) => (
          <button key={id} type="button" className={tab === id ? "is-current" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            <Icon size={22} weight={tab === id ? "fill" : "regular"} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>
      {lesson && <span className="sr-only" aria-live="polite">تفاصيل {lesson.title}</span>}
    </div>
  );
}

function Stat({ Icon, label, value, hint, tone }) {
  return (
    <div className="pr-stat">
      <span>
        <small>{label}</small>
        <b>{value}</b>
        {hint && <em>{hint}</em>}
      </span>
      <i className={`tone-${tone}`} aria-hidden="true">
        <Icon size={30} weight="duotone" />
      </i>
    </div>
  );
}

function LessonDetail({ lesson }) {
  const q = lesson.questions;
  return (
    <div className="pr-detail">
      <h3>متطلبات إتمام الدرس</h3>
      <ul>
        {lesson.steps.map((s) => (
          <li key={s.label} className={s.done ? "is-done" : ""}>
            {s.done ? <CheckCircle size={20} weight="fill" aria-label="مكتمل" /> : <MinusCircle size={20} aria-label="لم يكتمل" />}
            {s.label}
            {s.detail && !s.done && <small> ({s.detail})</small>}
          </li>
        ))}
      </ul>
      <p>
        {q.answered
          ? `أجاب عن ${q.answered} أسئلة؛ منها ${q.right} إجابات صحيحة من المحاولة الأولى.`
          : "لم يُجب عن أسئلة هذا الدرس بعد."}{" "}
        {lesson.review ? <b>يُنصح بمراجعة {lesson.review}.</b> : q.answered >= 3 ? "مستوى الفهم جيد." : ""}
      </p>
    </div>
  );
}

function LinkChild({ first, onLinked, onCancel }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="pr-card pr-linkcard">
      {onCancel && (
        <button type="button" className="pr-icon pr-close" aria-label="إلغاء" onClick={onCancel}>
          <X size={20} />
        </button>
      )}
      <span className="pr-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <h1>{first ? "اربط حساب طفلك" : "ربط طفل آخر"}</h1>
      <ol>
        <li>يدخل طفلك إلى حسابه، ويفتح صفحة «إنجازاتي».</li>
        <li>يضغط «اربط ولي الأمر» فيظهر له كود من 6 حروف وأرقام.</li>
        <li>اكتب الكود هنا. الكود صالح 7 أيام ولمرة واحدة.</li>
      </ol>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!code.trim()) return setError("اكتب الكود أولًا");
          setBusy(true);
          setError("");
          try {
            await api("/parent/link", { method: "POST", body: { code } });
            onLinked();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          كود الربط
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? "pr-code-error" : undefined}
          />
        </label>
        {error && (
          <p id="pr-code-error" className="pr-error" role="alert">
            {error}
          </p>
        )}
        <button className="pr-primary" disabled={busy}>
          {busy ? "جارٍ الربط…" : "اربط الحساب"}
        </button>
      </form>
    </section>
  );
}

// «أكمل الاستكشاف والنشاط • لم يكمل الأسئلة»
const join = (list) => (list.length > 1 ? `${list.slice(0, -1).join("، ")} و${list[list.length - 1]}` : list[0]);
function progressLine(l) {
  if (l.status === "new") return "لم يبدأ أنشطة هذا الدرس";
  const done = l.steps.filter((s) => s.done).map((s) => s.short);
  const left = l.steps.filter((s) => !s.done).map((s) => s.short);
  return [done.length && `أكمل ${join(done)}`, left.length && `لم يكمل ${join(left)}`].filter(Boolean).join(" • ");
}

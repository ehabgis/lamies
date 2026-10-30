import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardText,
  CheckCircle,
  PuzzlePiece,
  ChartBar,
  Clock,
  Info,
  Drop,
  Diamond,
  Buildings,
  CircleNotch,
  Medal,
  SignOut,
  UserPlus,
  Users,
  User,
  Eye,
  EyeSlash,
  ArrowRight,
  LinkSimple,
  WarningCircle,
  Trophy,
  CalendarBlank,
  ListBullets,
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
  new: { label: "لم يبدأ بعد", Icon: Clock },
};
const PERIODS = [
  ["week", "هذا الأسبوع"],
  ["month", "هذا الشهر"],
  ["all", "منذ البداية"],
];
const first = (name) => String(name || "").trim().split(/\s+/)[0];
const when = (t) => {
  if (!t) return "لا يوجد بعد";
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  return new Date(t).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
};

// Parent area, all inside the app: the portal (sign in / create account),
// «إضافة ابني» with a check of the child's name, then «متابعة تقدم طفلك».
export default function ParentPage() {
  const { user, loading, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [childId, setChildId] = useState(null);
  const [period, setPeriod] = useState("week");
  const [adding, setAdding] = useState(false);

  const load = (p = period) =>
    api(`/parent/children?period=${p}`)
      .then((d) => {
        setData(d);
        setChildId((id) => (d.children.some((c) => c.id === id) ? id : d.children[0]?.id || null));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (user?.role === "parent") load();
  }, [user?.id]);

  if (loading) return <Shell />;
  // «متابعة ولي الأمر» always opens the portal; signing in as a parent here
  // replaces a student's session on a shared device.
  if (!user || user.role !== "parent")
    return (
      <Shell back>
        <Portal other={user} />
      </Shell>
    );

  const signOut = async () => {
    await logout();
    navigate("/");
  };
  if (error)
    return (
      <Shell user={user} onSignOut={signOut}>
        <p className="pr-empty" role="alert">
          تعذر تحميل التقدم. {error}
        </p>
      </Shell>
    );
  if (!data)
    return (
      <Shell user={user} onSignOut={signOut}>
        <p className="pr-empty" role="status">
          نجمع تقدم طفلك…
        </p>
      </Shell>
    );
  if (!data.children.length || adding)
    return (
      <Shell user={user} onSignOut={signOut}>
        <AddChild
          canGoBack={data.children.length > 0}
          onBack={() => setAdding(false)}
          onLinked={() => {
            setAdding(false);
            load();
          }}
        />
      </Shell>
    );
  const child = data.children.find((c) => c.id === childId) || data.children[0];
  return (
    <Shell user={user} onSignOut={signOut}>
      <Dashboard
        child={child}
        all={data.children}
        onChild={setChildId}
        period={period}
        onPeriod={(p) => {
          setPeriod(p);
          load(p);
        }}
        onAdd={() => setAdding(true)}
      />
    </Shell>
  );
}

function Shell({ user, onSignOut, back, children }) {
  return (
    <div className="pr-page" dir="rtl">
      <span className="pr-globe" aria-hidden="true" />
      <header className="pr-top">
        <Link to="/" className="pr-brand">
          <BrandMark size={44} /> الخرائط التعليمية الذكية
        </Link>
        {user && (
          <>
            <span className="pr-hello">
              <User size={22} weight="fill" aria-hidden="true" /> مرحبًا، {first(user.name)}
            </span>
            <button type="button" className="pr-out" onClick={onSignOut}>
              <SignOut size={20} aria-hidden="true" /> خروج
            </button>
          </>
        )}
        {back && (
          <Link to="/" className="pr-out">
            العودة إلى البداية <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </header>
      <main className="pr-main">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------- portal
function Portal({ other }) {
  const { setUser } = useSession();
  const [mode, setMode] = useState("login");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const email = String(f.get("email") || "").trim();
      const r = await api(`/auth/${mode}`, {
        method: "POST",
        body:
          mode === "login"
            ? { email, username: email, password: f.get("password") }
            : { name: f.get("name"), email, password: f.get("password"), role: "parent" },
      });
      setUser(r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pr-portal">
      <span className="pr-peek-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <div className="pr-sheet">
        <span className="pr-sheet-icon" aria-hidden="true">
          <Users size={44} />
        </span>
        <h1>بوابة ولي الأمر</h1>
        <p>{mode === "login" ? "سجّل الدخول لمتابعة تقدم طفلك" : "أنشئ حسابًا لمتابعة تقدم طفلك"}</p>
        {other && (
          <p className="pr-other" role="note">
            هذا الجهاز مسجّل الآن باسم «{other.name || other.username}». دخول ولي الأمر هنا يُنهي تلك الجلسة.
          </p>
        )}
        <div className="pr-seg" role="tablist" aria-label="الدخول أو إنشاء حساب">
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => (setMode("login"), setError(""))}>
            تسجيل الدخول
          </button>
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => (setMode("register"), setError(""))}>
            إنشاء حساب
          </button>
        </div>
        <form onSubmit={submit} className="pr-form" aria-busy={busy}>
          {mode === "register" && (
            <label>
              اسم ولي الأمر
              <input name="name" required minLength={2} maxLength={60} autoComplete="name" />
            </label>
          )}
          <label>
            البريد الإلكتروني
            <input name="email" type={mode === "register" ? "email" : "text"} required dir="ltr" autoComplete="email" placeholder="example@email.com" />
          </label>
          <label>
            كلمة المرور
            <span className="pr-pass">
              <input
                name="password"
                type={show ? "text" : "password"}
                required
                minLength={mode === "register" ? 10 : 1}
                maxLength={128}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                dir="ltr"
              />
              <button type="button" aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShow(!show)}>
                {show ? <EyeSlash size={22} /> : <Eye size={22} />}
              </button>
            </span>
            {mode === "register" && <small>10 أحرف على الأقل</small>}
          </label>
          {error && (
            <p className="pr-error" role="alert">
              {error}
            </p>
          )}
          <button className="pr-dark-btn" disabled={busy}>
            {busy ? "لحظة…" : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
          </button>
        </form>
        <p className="pr-switch">
          <span>{mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}</span>
          <button type="button" onClick={() => (setMode(mode === "login" ? "register" : "login"), setError(""))}>
            {mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
          </button>
        </p>
      </div>
      <ul className="pr-features" aria-label="ما الذي تتابعه">
        <li>
          <i className="tone-blue">
            <BookOpen size={30} />
          </i>
          تقدم الدروس
        </li>
        <li>
          <i className="tone-green">
            <ChartBar size={30} weight="fill" />
          </i>
          نتائج الأنشطة
        </li>
        <li>
          <i className="tone-amber">
            <Trophy size={30} weight="fill" />
          </i>
          الإنجازات
        </li>
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- add a child
function AddChild({ canGoBack, onBack, onLinked }) {
  const [code, setCode] = useState("");
  const [child, setChild] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(path, then) {
    if (!code.trim()) return setError("اكتب رمز الربط أولًا");
    setBusy(true);
    setError("");
    try {
      then(await api(path, { method: "POST", body: { code } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pr-portal">
      <span className="pr-peek-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <div className="pr-sheet pr-add">
        <span className="pr-sheet-icon" aria-hidden="true">
          <LinkSimple size={42} />
        </span>
        <h1>إضافة ابني</h1>
        <p>اربط حساب طفلك لبدء متابعة تقدمه</p>
        <div className="pr-howto">
          <b>من حساب الطالب:</b>
          <span>افتح «إنجازاتي» ثم اختر «اعرض كود الربط»</span>
        </div>
        <label className="pr-form">
          رمز ربط الطالب
          <input
            className="pr-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setChild(null);
              setError("");
            }}
            maxLength={8}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? "pr-code-error" : undefined}
          />
        </label>
        {!child && (
          <button type="button" className="pr-outline-btn" disabled={busy} onClick={() => run("/parent/link/preview", (r) => setChild(r.child))}>
            {busy ? "لحظة…" : "التحقق من الرمز"}
          </button>
        )}
        {error && (
          <p id="pr-code-error" className="pr-error" role="alert">
            {error}
          </p>
        )}
        {child && (
          <>
            <div className="pr-found" role="status">
              <span className="pr-avatar" aria-hidden="true">
                {child.name.trim()[0]}
              </span>
              <span>
                <b>{child.name}</b>
                <span>{child.grade}</span>
                <small>تأكد من اسم الطالب قبل تأكيد الربط</small>
              </span>
            </div>
            <button type="button" className="pr-dark-btn" disabled={busy} onClick={() => run("/parent/link", onLinked)}>
              {busy ? "لحظة…" : "تأكيد الربط"}
            </button>
          </>
        )}
        {canGoBack && (
          <button type="button" className="pr-text-btn" onClick={onBack}>
            العودة إلى حسابي
          </button>
        )}
        <small className="pr-once">الربط يتم مرة واحدة فقط</small>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- dashboard
function Dashboard({ child, all, onChild, period, onPeriod, onAdd }) {
  const [tab, setTab] = useState("summary");
  const [open, setOpen] = useState(null);
  const [mistakes, setMistakes] = useState(false);
  const [picking, setPicking] = useState(false);
  const t = child.totals;
  const reviewLesson = child.lessons.find((l) => l.review);
  const last = child.recent[0];
  return (
    <section className="pr-board">
      <div className="pr-board-head">
        <div>
          <h1>متابعة تقدم طفلك</h1>
          <p>خطوات واضحة لمتابعة التعلم</p>
          <div className="pr-childpick">
            <button type="button" className="pr-child" aria-expanded={picking} onClick={() => setPicking(!picking)}>
              <span className="pr-avatar" aria-hidden="true">
                {child.name.trim()[0]}
              </span>
              <span>
                <b>{child.name}</b>
                <small>{child.grade}</small>
              </span>
              <CaretMark />
            </button>
            {picking && (
              <ul className="pr-menu">
                {all.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={c.id === child.id}
                      onClick={() => {
                        onChild(c.id);
                        setPicking(false);
                        setOpen(null);
                      }}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={onAdd}>
                    <UserPlus size={18} aria-hidden="true" /> إضافة ابن آخر
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
        <div className="pr-when">
          <span>
            <i className={child.lastActive ? "is-on" : ""} /> آخر نشاط: {when(child.lastActive)}
          </span>
          <label className="pr-period">
            <CalendarBlank size={20} aria-hidden="true" />
            <span className="sr-only">الفترة</span>
            <select value={period} onChange={(e) => onPeriod(e.target.value)}>
              {PERIODS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="pr-stats">
        <Stat Icon={BookOpen} label="الدروس المكتملة" value={`${t.lessons.done} من ${t.lessons.total}`} tone="blue" />
        <Stat Icon={PuzzlePiece} label="الأنشطة المكتملة" value={`${t.activities.done} من ${t.activities.total}`} tone="green" />
        <Stat Icon={ClipboardText} label="الأسئلة المجاب عليها" value={t.answered} tone="blue" />
        <Stat Icon={CheckCircle} label="الإجابات الصحيحة" value={`${t.right} من ${t.answered}`} tone="green" />
      </div>

      {tab === "summary" && (
        <div className="pr-grid">
          <section className="pr-panel" aria-labelledby="pr-lessons">
            <h2 id="pr-lessons">
              <span className="pr-h-icon">
                <BookOpen size={22} aria-hidden="true" />
              </span>
              تقدم الدروس
            </h2>
            <ul className="pr-lessons">
              {child.lessons.map((l) => {
                const Icon = LESSON_ICON[l.id];
                const s = STATUS[l.status];
                return (
                  <li key={l.id} className={open === l.id ? "is-open" : ""}>
                    <div className="pr-lesson">
                      <span className="pr-thumb" aria-hidden="true">
                        {l.image ? <img src={l.image} alt="" loading="lazy" /> : <Icon weight="duotone" />}
                      </span>
                      <span className="pr-lesson-text">
                        <b>{l.title}</b>
                        <small>{progressLine(l)}</small>
                      </span>
                      <span className={`pr-status is-${l.status}`}>
                        <s.Icon size={18} weight="fill" aria-hidden="true" /> {s.label}
                      </span>
                      <button type="button" className="pr-small-btn" aria-expanded={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
                        التفاصيل
                      </button>
                    </div>
                    {open === l.id && <LessonDetail lesson={l} />}
                  </li>
                );
              })}
            </ul>
            <p className="pr-note">
              <Info size={20} aria-hidden="true" /> إتمام الدرس ونتيجة التقييم يظهران بشكل منفصل
            </p>
          </section>
          <div className="pr-side">
            <section className={`pr-panel pr-review ${child.review ? "" : "is-calm"}`}>
              <div>
                <h2>
                  {child.review ? <WarningCircle size={26} weight="fill" aria-hidden="true" /> : <CheckCircle size={26} weight="fill" aria-hidden="true" />}
                  {child.review ? "يحتاج إلى مراجعة" : "أداء مطمئن"}
                </h2>
                <p>
                  {child.review
                    ? child.review.topic
                    : t.answered
                      ? "لا توجد موضوعات تحتاج مراجعة الآن."
                      : "تظهر هنا اقتراحات المراجعة بعد أن يجيب عن أسئلة الدروس."}
                </p>
                {child.review && <small>بناءً على إجاباته في درس {child.review.lesson}</small>}
                {reviewLesson?.wrong.length > 0 && (
                  <button type="button" className="pr-amber-btn" aria-expanded={mistakes} onClick={() => setMistakes(!mistakes)}>
                    عرض الأخطاء
                  </button>
                )}
                {mistakes && reviewLesson && (
                  <ul className="pr-mistakes">
                    {reviewLesson.wrong.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="pr-robot" aria-hidden="true">
                <RobotGuide />
              </span>
            </section>
            <section className="pr-panel pr-last" aria-labelledby="pr-last">
              <div>
                <h2 id="pr-last">
                  <Clock size={22} aria-hidden="true" /> آخر نشاط
                </h2>
                <p>{last ? last.text : "لا يوجد نشاط في هذه الفترة."}</p>
                {last && <small>{when(last.at)}</small>}
              </div>
              <span className="pr-last-icon" aria-hidden="true">
                <ClipboardText size={30} weight="fill" />
              </span>
            </section>
          </div>
        </div>
      )}

      {tab === "results" && (
        <section className="pr-panel pr-results" aria-label="نتائج الأنشطة">
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
        <section className="pr-panel" aria-label="الشهادات">
          <ul className="pr-certs">
            {child.certificates.map((c, i) => (
              <li key={c.id} className={c.earned ? "is-ready" : ""}>
                <Medal size={44} weight={c.earned ? "fill" : "duotone"} aria-hidden="true" />
                <b>شهادة {["الدرس الأول", "الدرس الثاني", "الدرس الثالث"][i]}</b>
                <span>{c.title}</span>
                <small>
                  {c.earned
                    ? `حصل عليها ${first(child.name)}؛ يعرضها ويطبعها من صفحة «إنجازاتي».`
                    : "تصبح جاهزة بعد إتمام رحلة الاستكشاف في هذا الدرس."}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="pr-tabs" aria-label="أقسام المتابعة">
        {[
          ["summary", "ملخص التقدم", ChartBar],
          ["results", "نتائج الأنشطة", ListBullets],
          ["certificates", "الشهادات", Trophy],
        ].map(([id, label, Icon]) => (
          <button key={id} type="button" className={tab === id ? "is-current" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            <Icon size={26} weight={tab === id ? "fill" : "regular"} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>
    </section>
  );
}

function CaretMark() {
  return (
    <svg className="pr-caret" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ Icon, label, value, tone }) {
  return (
    <div className={`pr-stat tone-${tone}`}>
      <span>
        <small>{label}</small>
        <b>{value}</b>
      </span>
      <i aria-hidden="true">
        <Icon size={34} weight="duotone" />
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
            {s.done ? <CheckCircle size={20} weight="fill" aria-label="مكتمل" /> : <X size={18} aria-label="لم يكتمل" />}
            {s.label}
            {s.detail && !s.done && <small> ({s.detail})</small>}
          </li>
        ))}
      </ul>
      <p>
        {q.answered ? `أجاب عن ${q.answered} أسئلة؛ منها ${q.right} إجابات صحيحة من المحاولة الأولى.` : "لم يُجب عن أسئلة هذا الدرس بعد."}{" "}
        {lesson.review ? <b>يُنصح بمراجعة {lesson.review}.</b> : q.answered >= 3 ? "مستوى الفهم جيد." : ""}
      </p>
    </div>
  );
}

// «أكمل المحتوى والنشاط • التقييم لم يكتمل»
const join = (list) => (list.length > 1 ? `${list.slice(0, -1).join("، ")} و${list[list.length - 1]}` : list[0]);
function progressLine(l) {
  if (l.status === "new") return "لم يبدأ أنشطة هذا الدرس";
  const done = l.steps.filter((s) => s.done).map((s) => s.short);
  const left = l.steps.filter((s) => !s.done).map((s) => s.short);
  return [done.length && `أكمل ${join(done)}`, left.length && `${join(left)} لم يكتمل`].filter(Boolean).join(" • ");
}

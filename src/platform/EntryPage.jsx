import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Compass,
  ArrowLeft,
  User,
  Lock,
  Play,
  Pause,
  Sparkle,
} from "phosphor-react";
import "./entry-experience.css";
import "./platform-polish.css";
import "./entry-v2.css";
import RobotGuide from "../components/Map/RobotGuide";
import { api } from "./api";
import { useSession } from "./Session";
import BrandMark from "./BrandMark";
import { play } from "./sfx";
import NarrationControls from "./NarrationControls";
import { loadGuest, saveGuest, savedProgress } from "./guestProfile";
export default function EntryPage() {
  const { setUser, user } = useSession(),
    navigate = useNavigate();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [motion, setMotion] = useState(true);
  const [guest, setGuest] = useState(loadGuest);
  const [catalog, setCatalog] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const resume = savedProgress();
  useEffect(() => {
    api("/demo/catalog")
      .then((r) => setCatalog(r.nodes))
      .catch(() => setCatalog([]));
  }, []);
  // Grades and terms come from the catalog, so new ones appear without code changes.
  const grades = catalog.filter((n) => n.kind === "grade");
  const terms = catalog.filter((n) => n.kind === "term" && n.parentId === guest.gradeId);
  const welcome = "أهلًا يا مستكشف! اكتب اسمك، واختر صفك وفصلك، ثم اضغط ابدأ المغامرة.";
  function startAdventure() {
    saveGuest(guest);
    play("project");
    const q = new URLSearchParams();
    if (guest.gradeId) q.set("grade", guest.gradeId);
    if (guest.termId) q.set("term", guest.termId);
    navigate(`/explore${q.toString() ? `?${q}` : ""}`);
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await api(`/auth/${mode}`, {
        method: "POST",
        body: {
          ...(String(f.get("username")).includes("@")
            ? { email: f.get("username") }
            : { username: f.get("username") }),
          password: f.get("password"),
          name: f.get("name") || f.get("username"),
        },
      });
      setUser(result.user);
      navigate(result.user.role === "student" ? "/journey" : "/admin");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`lamis-platform entry-platform entry-experience ${motion ? "" : "entry-still"}`}
      dir="rtl"
    >
      <header className="entry-platform-brand">
        <BrandMark size={52} />
        <div>الخرائط التعليمية الذكية</div>
        <button
          className="entry-motion-control"
          aria-pressed={!motion}
          onClick={() => setMotion(!motion)}
        >
          {motion ? <Pause size={18} /> : <Play size={18} />}
          {motion ? "إيقاف الحركة" : "تشغيل الحركة"}
        </button>
      </header>
      <main className="entry-platform-grid">
        <section
          className="platform-welcome-art"
          aria-label="رحلتك لاكتشاف مصر"
        >
          <div className="entry-art-heading">
            <h2>مغامرتك تبدأ من هنا.</h2>
            <p>اكتشف مصر… موردًا، ومكانًا، وحكاية.</p>
          </div>
          <img
            src="/welcome/hero.webp"
            alt="طفل مستكشف مع كرة أرضية يشير إلى مصر"
          />
          <div className="entry-robot-companion">
            <RobotGuide />
            <div className="entry-robot-say">
              <p>{welcome}</p>
              <NarrationControls text={welcome} compact />
            </div>
          </div>
          <div className="entry-journey-steps" aria-label="مراحل الرحلة">
            <span className="step-blue">
              <Compass size={23} /> استكشف الخريطة
            </span>
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="step-green">
              <BookOpen size={23} /> تعلّم الحكاية
            </span>
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="step-orange">
              <Sparkle size={23} /> اختبر معلوماتك
            </span>
          </div>
        </section>
        <section className="platform-signin">
          <h1>مرحبًا يا مستكشف!</h1>
          <p className="entry-tagline">مصر مليئة بالكنوز… هل أنت مستعد لاكتشافها؟</p>
          {!user && (
            <div className="entry-guest">
              <label className="entry-name">
                <span>ما اسمك؟</span>
                <input
                  value={guest.name || ""}
                  maxLength={30}
                  autoComplete="nickname"
                  placeholder="اسمك أو اسم مستعار"
                  onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                />
              </label>
              <fieldset className="entry-chips">
                <legend>صفّك</legend>
                {grades.length ? (
                  grades.map((g) => (
                    <button
                      type="button"
                      key={g.id}
                      aria-pressed={guest.gradeId === g.id}
                      onClick={() => {
                        play("select");
                        const t = catalog.filter((n) => n.kind === "term" && n.parentId === g.id);
                        setGuest({ ...guest, gradeId: g.id, termId: t[0]?.id });
                      }}
                    >
                      {g.title.replace("الصف ", "").replace(" الابتدائي", "")}
                    </button>
                  ))
                ) : (
                  <small>جارٍ تحميل الصفوف…</small>
                )}
              </fieldset>
              <fieldset className="entry-chips">
                <legend>الفصل الدراسي</legend>
                {terms.length ? (
                  terms.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      aria-pressed={guest.termId === t.id}
                      onClick={() => {
                        play("select");
                        setGuest({ ...guest, termId: t.id });
                      }}
                    >
                      {t.title.replace("الفصل الدراسي ", "")}
                    </button>
                  ))
                ) : (
                  <small>اختر صفّك أولًا.</small>
                )}
              </fieldset>
            </div>
          )}
          <button type="button" className="p-button demo-entry-link" onClick={startAdventure}>
            <Play size={23} weight="fill" /> ابدأ المغامرة
          </button>
          {resume && (
            <Link to={resume.href} className="entry-resume" onClick={() => play("open")}>
              أكمل رحلتك: {resume.label} ({resume.done} موارد مكتشفة) <ArrowLeft size={18} />
            </Link>
          )}
          <p className="p-muted">دون حساب · يُحفظ تقدمك على هذا الجهاز فقط · تجربة غير معتمدة</p>
          {user ? (
            <div>
              <p>أهلًا {user.name || user.username}، حسابك جاهز.</p>
              <Link
                className="p-button"
                to={user.role === "student" ? "/journey" : "/admin"}
              >
                تابع رحلتك <ArrowLeft />
              </Link>
            </div>
          ) : (
            <details className="entry-account" open={accountOpen} onToggle={(e) => setAccountOpen(e.currentTarget.open)}>
              <summary>لديّ حساب أو أريد حسابًا لحفظ نتائجي</summary>
              <div className="p-tabs" role="group" aria-label="نوع الدخول">
                <button
                  aria-pressed={mode === "login"}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  لديّ حساب
                </button>
                <button
                  aria-pressed={mode === "register"}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  مستكشف جديد
                </button>
              </div>
              <form onSubmit={submit} aria-busy={busy}>
                {mode === "register" && (
                  <label>
                    اسم مستعار
                    <input
                      name="name"
                      required
                      maxLength={40}
                      autoComplete="nickname"
                      placeholder="مثل: مستكشف النيل"
                    />
                  </label>
                )}
                <label>
                  <span>
                    <User size={19} />
                    اسم المستخدم
                  </span>
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={mode === "login" ? 254 : 40}
                    dir="ltr"
                    placeholder="explorer_25"
                  />
                  <small>حروف إنجليزية وأرقام؛ للإدارة: البريد المسجّل.</small>
                </label>
                <label>
                  <span>
                    <Lock size={19} />
                    كلمة المرور
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <small>10 أحرف على الأقل؛ استعن بولي أمرك.</small>
                </label>
                {error && (
                  <p className="p-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="p-button" disabled={busy}>
                  {busy
                    ? "جارٍ فتح رحلتك…"
                    : mode === "login"
                      ? "سجّل الدخول وابدأ"
                      : "أنشئ حسابك وابدأ"}
                  <ArrowLeft size={22} />
                </button>
              </form>
              <p className="entry-privacy">
                الحساب يحفظ التقدم والنتائج على الخادم. لا نطلب بريدًا أو هاتفًا.
              </p>
            </details>
          )}
          <Link to="/legacy" className="p-text-link">
            فتح النسخة السابقة
          </Link>
        </section>
      </main>
    </div>
  );
}

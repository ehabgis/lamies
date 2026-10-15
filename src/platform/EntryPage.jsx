import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Compass,
  ArrowLeft,
  User,
  Lock,
  Robot,
  Play,
  Pause,
  MapPin,
  Sparkle,
} from "phosphor-react";
import "./entry-experience.css";
import { api } from "./api";
import { useSession } from "./Session";
export default function EntryPage() {
  const { setUser, user } = useSession(),
    navigate = useNavigate();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [motion, setMotion] = useState(true);
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
        <BookOpen size={40} weight="duotone" />
        <div>
          الخرائط التعليمية الزكية<small>لميس · رحلة صغيرة… اكتشاف كبير</small>
        </div>
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
          <span className="entry-map-label" aria-hidden="true">
            <MapPin size={20} weight="fill" /> هنا مصر!
          </span>
          <img
            src="/welcome/explorer-globe.webp"
            alt="طفل مستكشف مع كرة أرضية يشير إلى مصر"
          />
          <div className="explorer-note">
            <Compass size={28} />
            <span>
              مصر مليانة حكايات<strong>افتح خريطتك، وابدأ بالاكتشاف.</strong>
            </span>
          </div>
          <div className="entry-journey-steps" aria-label="مراحل الرحلة">
            <span>
              <Compass size={23} /> استكشف الخريطة
            </span>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>
              <BookOpen size={23} /> تعلّم الحكاية
            </span>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>
              <Sparkle size={23} /> اختبر معلوماتك
            </span>
          </div>
        </section>
        <section className="platform-signin">
          <span className="welcome-robot">
            <Robot size={44} weight="duotone" />
          </span>
          <h1>مرحبًا يا مستكشف!</h1>
          <p>سجّل دخولك لنحفظ اكتشافاتك.</p>
          <Link to="/explore" className="p-button demo-entry-link">
            <Play size={23} weight="fill" /> اختر رحلتك دون حساب
          </Link>
          <p className="p-muted">تجربة غير معتمدة · لا تُحفظ نتائج رسمية</p>
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
            <>
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
                      ? "ابدأ المغامرة"
                      : "أنشئ حسابك وابدأ"}
                  <ArrowLeft size={22} />
                </button>
              </form>
            </>
          )}
          <p className="entry-privacy">
            نحفظ التقدم والنتائج في حساب خاص. لا نطلب بريدًا أو هاتفًا.
          </p>
          <Link to="/legacy" className="p-text-link">
            فتح النسخة السابقة
          </Link>
        </section>
      </main>
    </div>
  );
}

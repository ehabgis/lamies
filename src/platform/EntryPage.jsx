import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Compass,
  ArrowLeft,
  User,
  Lock,
  Robot,
} from "phosphor-react";
import { api } from "./api";
import { useSession } from "./Session";
export default function EntryPage() {
  const { setUser, user } = useSession(),
    navigate = useNavigate();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
    <div className="lamis-platform entry-platform" dir="rtl">
      <header className="entry-platform-brand">
        <BookOpen size={40} weight="duotone" />
        <div>
          الخريطة التعليمية الذكية<small>لميس · رحلة صغيرة… اكتشاف كبير</small>
        </div>
      </header>
      <main className="entry-platform-grid">
        <section className="platform-welcome-art">
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
        </section>
        <section className="platform-signin">
          <span className="welcome-robot">
            <Robot size={44} weight="duotone" />
          </span>
          <h1>مرحبًا يا بطل!</h1>
          <p>
            خريطة، سؤال، واكتشاف جديد.
            <br />
            سجّل دخولك لنحفظ رحلتك.
          </p>
          {user ? (
            <div>
              <p>أهلًا {user.name || user.username}، حسابك جاهز.</p>
              <Link className="p-button" to="/journey">
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
              <form onSubmit={submit}>
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
                  <small>
                    للطلاب: حروف إنجليزية وأرقام دون اسم حقيقي. للإدارة: البريد
                    المسجل.
                  </small>
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
                  <small>
                    10 أحرف على الأقل. اطلب مساعدة ولي أمرك عند الحاجة.
                  </small>
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

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Compass,
  ArrowLeft,
  User,
  Lock,
  Play,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  ArrowCounterClockwise,
  Users,
} from "phosphor-react";
import "./entry-experience.css";
import "./platform-polish.css";
import "./entry-v2.css";
import "./entry-motion.css";
import { api } from "./api";
import { useSession } from "./Session";
import BrandMark from "./BrandMark";
import { play } from "./sfx";
import * as narrator from "./narrator";
import { loadGuest, saveGuest, savedProgress } from "./guestProfile";
import WelcomeArt from "./WelcomeArt";
export default function EntryPage() {
  const { setUser, user } = useSession(),
    navigate = useNavigate();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [guest, setGuest] = useState(loadGuest);
  const [accountOpen, setAccountOpen] = useState(false);
  const [asParent, setAsParent] = useState(false);
  const resume = savedProgress();
  const welcome = "أهلًا يا مستكشف، اكتب اسمك ثم اضغط ابدأ المغامرة.";
  const [voice, setVoice] = useState(narrator.getSettings());
  // The robot's welcome: its bubble shows while it speaks, then fades; the
  // three stages follow one by one. If the browser blocks speech, the bubble
  // offers a clear play button and the stages go on anyway.
  const [greeting, setGreeting] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [stagesGo, setStagesGo] = useState(false);
  const [typed, setTyped] = useState(Boolean(loadGuest().name)); // the globe rests once a name is typed
  const [pulse, setPulse] = useState(0);
  const [nameError, setNameError] = useState("");
  const spoke = useRef(false);
  useEffect(() => narrator.subscribe(setVoice), []);
  useEffect(() => {
    const s = narrator.getSettings();
    if (!s.available || s.muted) {
      setStagesGo(true);
      const t = setTimeout(() => setGreeting(false), 5000);
      return () => clearTimeout(t);
    }
    narrator.speak(welcome);
    const check = setTimeout(() => {
      if (!spoke.current) {
        setBlocked(true);
        setStagesGo(true);
      }
    }, 1500);
    return () => {
      clearTimeout(check);
      narrator.stop();
    };
  }, []);
  useEffect(() => {
    if (voice.state === "speaking") {
      spoke.current = true;
      setBlocked(false);
    } else if (spoke.current && voice.state === "idle") {
      // A short pause between lines is not the end of the welcome.
      const t = setTimeout(() => {
        if (narrator.getSettings().state !== "idle") return;
        setGreeting(false);
        setStagesGo(true);
      }, 500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [voice.state]);
  useEffect(() => {
    if (!blocked) return undefined;
    const t = setTimeout(() => setGreeting(false), 9000);
    return () => clearTimeout(t);
  }, [blocked]);
  const replay = () => {
    setBlocked(false);
    setGreeting(true);
    narrator.speak(welcome);
  };
  // Grade and term are chosen on the next page (/explore).
  function startAdventure() {
    if (!user && !String(guest.name || "").trim()) {
      setNameError("اكتب اسمك أولًا يا مستكشف");
      return;
    }
    narrator.stop();
    saveGuest(guest);
    play("project");
    navigate("/explore");
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
          ...(mode === "register" && asParent ? { role: "parent" } : {}),
        },
      });
      setUser(result.user);
      navigate(result.user.role === "student" ? "/journey" : result.user.role === "parent" ? "/parent" : "/admin");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="lamis-platform entry-platform entry-experience"
      dir="rtl"
    >
      <header className="entry-platform-brand">
        <BrandMark size={40} round />
        <div>الخرائط التعليمية الذكية</div>
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
          <div className="entry-hero-wrap">
            <WelcomeArt resting={typed} greeting={greeting && !blocked} />
            <div className={`entry-robot-say ${greeting ? "is-on" : ""}`} role="status" aria-live="polite">
              <p>{welcome}</p>
              {blocked && voice.available && !voice.muted && (
                <button type="button" className="entry-say-play" onClick={replay}>
                  <Play size={18} weight="fill" aria-hidden="true" /> استمع للترحيب
                </button>
              )}
            </div>
            {voice.available && (
              <div className="entry-voice" role="group" aria-label="صوت الروبوت">
                <button type="button" disabled={voice.muted} aria-label="أعد الاستماع" title="أعد الاستماع" onClick={replay}>
                  <ArrowCounterClockwise size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  aria-pressed={voice.muted}
                  aria-label={voice.muted ? "تشغيل الصوت" : "كتم الصوت"}
                  title={voice.muted ? "تشغيل الصوت" : "كتم الصوت"}
                  onClick={() => narrator.update({ muted: !voice.muted })}
                >
                  {voice.muted ? <SpeakerSlash size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
                </button>
              </div>
            )}
          </div>
          <div className={`entry-journey-steps is-sequence ${stagesGo ? "is-go" : ""}`} aria-label="مراحل الرحلة">
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
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "entry-name-error" : undefined}
                  onChange={(e) => {
                    setGuest({ ...guest, name: e.target.value });
                    setNameError("");
                    if (!typed && e.target.value.trim()) {
                      setTyped(true);
                      setPulse((n) => n + 1);
                    }
                  }}
                />
              </label>
            </div>
          )}
          {nameError && (
            <p id="entry-name-error" className="entry-name-error" role="alert">
              {nameError}
            </p>
          )}
          <button
            type="button"
            key={pulse}
            className={`p-button demo-entry-link ${pulse ? "is-pulse" : ""}`}
            onClick={startAdventure}
          >
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
                to={user.role === "student" ? "/journey" : user.role === "parent" ? "/parent" : "/admin"}
              >
                تابع رحلتك <ArrowLeft />
              </Link>
            </div>
          ) : (
            <>
            <button type="button" className="entry-account-open" onClick={() => setAccountOpen(true)}>
              <User size={20} aria-hidden="true" /> لديّ حساب أو أريد حسابًا لحفظ نتائجي
            </button>
            <Link to="/parent" className="entry-parent-open">
              <Users size={26} weight="duotone" aria-hidden="true" />
              <span>
                <b>متابعة ولي الأمر</b>
                <small>تابع تقدم طفلك ونتائج أنشطته</small>
              </span>
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            {/* Its own window over the page, so it is visible on any screen height. */}
            {accountOpen && (
            <div
              className="entry-account-backdrop"
              onMouseDown={(e) => e.target === e.currentTarget && setAccountOpen(false)}
            >
            <div
              className="entry-account"
              role="dialog"
              aria-modal="true"
              aria-labelledby="entry-account-title"
              onKeyDown={(e) => e.key === "Escape" && setAccountOpen(false)}
            >
              <header className="entry-account-head">
                <h2 id="entry-account-title">{mode === "login" ? "تسجيل الدخول" : "حساب مستكشف جديد"}</h2>
                <button type="button" className="entry-account-close" aria-label="إغلاق" onClick={() => setAccountOpen(false)}>
                  ×
                </button>
              </header>
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
                  <fieldset className="entry-who">
                    <legend>من يسجّل؟</legend>
                    <label>
                      <input type="radio" name="who" checked={!asParent} onChange={() => setAsParent(false)} /> طالب
                    </label>
                    <label>
                      <input type="radio" name="who" checked={asParent} onChange={() => setAsParent(true)} /> ولي أمر
                    </label>
                  </fieldset>
                )}
                {mode === "register" && (
                  <label>
                    {asParent ? "اسمك" : "اسم مستعار"}
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
                    autoFocus
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
            </div>
            </div>
            )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ArrowLeft,
  User,
  Lock,
  Play,
  GameController,
  SpeakerHigh,
  SpeakerSlash,
  ArrowCounterClockwise,
  Users,
  House,
  MapTrifold,
  Path,
  Check,
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
import { loadGuest, saveGuest } from "./guestProfile";
import WelcomeArt from "./WelcomeArt";
import { readAchievements } from "./achievements";
import { LESSONS_HREF } from "./links";
import "./home-v3.css";
export default function EntryPage() {
  const { setUser, user } = useSession(),
    navigate = useNavigate();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [guest, setGuest] = useState(loadGuest);
  const [accountOpen, setAccountOpen] = useState(false);
  const [asParent, setAsParent] = useState(false);
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
      let go;
      const t = setTimeout(() => {
        if (narrator.getSettings().state !== "idle") return;
        setGreeting(false);
        // A breath after the welcome before the stages start.
        go = setTimeout(() => setStagesGo(true), 700);
      }, 500);
      return () => {
        clearTimeout(t);
        clearTimeout(go);
      };
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
  // Real progress kept on this device for the current explorer (stars,
  // badges, journeys and maps from «إنجازاتي»); nothing is made up here.
  const [a] = useState(readAchievements);
  const savedName = user ? user.name || user.username : loadGuest().name || "";
  const nameRef = useRef(null);
  // Places the child can open from here. A guest says their name first, so
  // their progress is kept under it, as «ابدأ المغامرة» always did.
  const enter = (href) => (e) => {
    if (user) return;
    if (!String(guest.name || "").trim()) {
      e.preventDefault();
      setNameError("اكتب اسمك أولًا يا مستكشف");
      nameRef.current?.focus();
      return;
    }
    saveGuest(guest);
    play("open");
  };
  const next = a.next;
  // One yellow button: «ابدأ المغامرة» before the first journey, then
  // «أكمل رحلتي», which opens the part the explorer stopped at (each journey
  // resumes from its own saved place).
  const resumeHref = next ? next.href : "/achievements";
  function continueJourney() {
    if (!user && !String(guest.name || "").trim()) {
      setNameError("اكتب اسمك أولًا يا مستكشف");
      nameRef.current?.focus();
      return;
    }
    narrator.stop();
    if (!user) saveGuest(guest);
    play("open");
    navigate(resumeHref);
  }
  const total = a.journeys.length;
  const done = a.journeysDone;
  const first = savedName.trim().split(/\s+/)[0];
  return (
    <div className="lamis-platform home-v3" dir="rtl">
      <header className="hv-top">
        <Link to="/" className="hv-brand" aria-label="الخرائط التعليمية الذكية: الرئيسية">
          <BrandMark size={46} round />
          <span>الخرائط التعليمية الذكية</span>
        </Link>
        <nav className="hv-nav" aria-label="التنقل الرئيسي">
          <Link to="/" aria-current="page">
            <House size={22} weight="duotone" aria-hidden="true" /> <span>الرئيسية</span>
          </Link>
          <Link to={LESSONS_HREF} onClick={enter(LESSONS_HREF)}>
            <BookOpen size={22} weight="duotone" aria-hidden="true" /> <span>كتابي التفاعلي</span>
          </Link>
          <Link to="/demo/lesson-1" onClick={enter("/demo/lesson-1")}>
            <MapTrifold size={22} weight="duotone" aria-hidden="true" /> <span>الخريطة التفاعلية</span>
          </Link>
          <Link to="/demo/trips" onClick={enter("/demo/trips")}>
            <GameController size={22} weight="duotone" aria-hidden="true" /> <span>الأنشطة التفاعلية</span>
          </Link>
        </nav>
        <div className="hv-tools">
          {voice.available && (
            <button
              type="button"
              className="hv-chip is-round"
              aria-pressed={voice.muted}
              aria-label={voice.muted ? "تشغيل الصوت" : "كتم الصوت"}
              title={voice.muted ? "تشغيل الصوت" : "كتم الصوت"}
              onClick={() => narrator.update({ muted: !voice.muted })}
            >
              {voice.muted ? <SpeakerSlash size={22} weight="bold" /> : <SpeakerHigh size={22} weight="bold" />}
            </button>
          )}
        </div>
      </header>

      <main className="hv-main">
        <section className="hv-hero" aria-labelledby="hv-title" onPointerMove={parallax} onPointerLeave={still}>
          <HeroScenery />
          <div className="hv-hero-text">
            <h1 id="hv-title" className="hv-cloud">
              <span>مرحبًا بك في عالم</span>
              <strong>الخرائط التعليمية الذكية</strong>
            </h1>
            <p className="hv-lead">هل أنت مستعد لاكتشاف كنوز مصر؟</p>
          </div>
          <div className="hv-hero-art">
            <WelcomeArt resting={typed} greeting={greeting && !blocked} />
            <div className={`entry-robot-say hv-say ${greeting ? "is-on" : ""}`} role="status" aria-live="polite">
              <p>{welcome}</p>
              {blocked && voice.available && !voice.muted && (
                <button type="button" className="entry-say-play" onClick={replay}>
                  <Play size={18} weight="fill" aria-hidden="true" /> استمع للترحيب
                </button>
              )}
            </div>
            {voice.available && !voice.muted && (
              <button type="button" className="hv-replay" aria-label="أعد الاستماع للترحيب" title="أعد الاستماع" onClick={replay}>
                <ArrowCounterClockwise size={18} weight="bold" />
              </button>
            )}
          </div>
        </section>

        <aside className="hv-me" aria-labelledby="hv-me-title">
          <div className="hv-me-head">
            <img src="/welcome/kid-explorer.webp" alt="" width="84" height="84" loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} />
            <h2 id="hv-me-title">{first ? `مرحبًا يا ${first}!` : "مرحبًا يا بطل!"}</h2>
          </div>
          {user ? (
            <div className="hv-me-box">
              <p className="hv-me-name">{user.name || user.username}</p>
              <Link
                className="hv-go"
                to={user.role === "student" ? "/journey" : user.role === "parent" ? "/parent" : "/admin"}
              >
                <Play size={22} weight="fill" aria-hidden="true" /> أكمل رحلتي
              </Link>
            </div>
          ) : (
            <div className="hv-me-box">
              <label className="hv-name">
                <span>اسم الطالب</span>
                <input
                  ref={nameRef}
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
                  onKeyDown={(e) => e.key === "Enter" && (a.started ? continueJourney() : startAdventure())}
                />
              </label>
              {nameError && (
                <p id="entry-name-error" className="hv-error" role="alert">
                  {nameError}
                </p>
              )}
              <button
                type="button"
                key={pulse}
                className={`hv-go ${pulse ? "is-pulse" : ""}`}
                onClick={a.started ? continueJourney : startAdventure}
              >
                <Play size={22} weight="fill" aria-hidden="true" /> {a.started ? "أكمل رحلتي" : "ابدأ المغامرة"}
              </button>
            </div>
          )}
          <div className="hv-count">
            <span
              className={`hv-bar ${done ? "" : "is-empty"}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label="الرحلات المكتملة"
            >
              <span style={{ width: `${(done / total) * 100}%` }} />
            </span>
            <p>
              <b>{ar(done)}</b> من {ar(total)} رحلات مكتملة
            </p>
          </div>
          <div className="hv-more">
            {user ? (
              <Link
                to={user.role === "student" ? "/journey" : user.role === "parent" ? "/parent" : "/admin"}
                className="hv-link"
              >
                <User size={22} aria-hidden="true" /> حسابي
              </Link>
            ) : (
              <button type="button" className="hv-link" onClick={() => setAccountOpen(true)}>
                <User size={22} aria-hidden="true" /> حسابي
              </button>
            )}
            <Link to="/parent" className="hv-link">
              <Users size={22} aria-hidden="true" /> حساب ولي الأمر
            </Link>
            {!user && <p className="hv-note">دون حساب يُحفظ تقدمك على هذا الجهاز فقط · تجربة غير معتمدة</p>}
          </div>
        </aside>

        <nav className="hv-cards" aria-label="ابدأ من هنا">
          {CARDS.map((c) => (
            <Link key={c.id} to={c.href} className={`hv-card is-${c.id}`} title={c.text} onClick={enter(c.href)}>
              <span className="hv-card-art" aria-hidden="true">
                <c.Art />
              </span>
              <strong className="hv-card-title">{c.title}</strong>
            </Link>
          ))}
        </nav>

        <section className="hv-path" aria-labelledby="hv-path-title">
          <header>
            <h2 id="hv-path-title">
              <Path size={28} weight="duotone" aria-hidden="true" /> رحلتي التعليمية
            </h2>
          </header>
          <ol className="hv-road">
            {a.journeys.map((j, i) => {
              const now = next?.id === j.id && next.href === j.href;
              return (
                <li key={j.id} className={`is-${j.status} ${now ? "is-now" : ""}`} style={{ "--i": i }}>
                  <Link to={j.href} onClick={enter(j.href)} aria-current={now ? "step" : undefined}>
                    <span className="hv-stop" aria-hidden="true">
                      {j.done && <Check size={16} weight="bold" />}
                    </span>
                    <span className="hv-stop-text">
                      <b>{STOP_NAMES[i]}</b>
                      <span className="hv-sr">
                        {j.lesson}: {now && j.status === "new" ? "محطتك التالية" : STATUS[j.status]}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className={`is-flag ${done === total ? "is-done" : ""}`} style={{ "--i": 3 }}>
              <Link to="/achievements" onClick={enter("/achievements")}>
                <span className="hv-stop" aria-hidden="true">
                  {done === total && <Check size={16} weight="bold" />}
                </span>
                <span className="hv-stop-text">
                  <b>شهاداتي</b>
                  <span className="hv-sr">نهاية الوحدة: {done === total ? "مكتملة" : "شهادة لكل رحلة تكملها"}</span>
                </span>
              </Link>
            </li>
          </ol>
        </section>
      </main>

      {!user && (
        <>
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
    </div>
  );
}

// ------------------------------------------------------------ home pieces
const STATUS = { new: "لم تبدأ", active: "قيد الاستكشاف", done: "مكتملة" };

// The pointer moves the hero's scenery a little (fine pointers only, never
// under reduced motion); cards lean slightly toward it.
const calm = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !window.matchMedia?.("(pointer: fine)").matches;
function parallax(e) {
  if (calm()) return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
  e.currentTarget.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
}
function still(e) {
  e.currentTarget.style.setProperty("--px", 0);
  e.currentTarget.style.setProperty("--py", 0);
}
const ar = (n) => Number(n).toLocaleString("ar-EG");

// Egypt behind the welcome: a light-blue sky, sand and the pyramids
// (bottom right).
function HeroScenery() {
  return (
    <svg className="hv-scene" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="hv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe2ff" />
          <stop offset="1" stopColor="#eef7ff" />
        </linearGradient>
      </defs>
      <rect width="1200" height="360" fill="url(#hv-sky)" />
      <g className="hv-mid">
        <path d="M860 280 L960 150 L1060 280z" fill="#e9c27a" />
        <path d="M960 150 L1060 280 H990z" fill="#d4a55a" />
        <path d="M1010 280 L1090 180 L1170 280z" fill="#e2b66b" />
        <path d="M1090 180 L1170 280 H1110z" fill="#c9974c" />
        <path d="M790 280 L840 222 L890 280z" fill="#efcf90" />
      </g>
      <path d="M0 290 Q300 262 600 286 T1200 282 V360 H0z" fill="#f3dfb4" />
    </svg>
  );
}

// Card pictures, drawn for the four real places they open.
const MapArt = () => (
  <svg viewBox="0 0 120 100">
    <path d="M12 26 L42 16 L78 26 L108 16 V78 L78 88 L42 78 L12 88z" fill="#fff" />
    <path d="M42 16 V78 M78 26 V88" stroke="#c9e7cf" strokeWidth="2" />
    <path d="M20 70 Q40 50 56 60 T96 40" stroke="#4aa3e8" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M24 34 q10 -6 18 2 q-4 10 -18 -2z M84 62 q10 -4 14 4 q-8 6 -14 -4z" fill="#7ccb7c" />
    <g className="hv-pin">
      <path d="M66 14 a14 14 0 0 1 14 14 c0 12 -14 26 -14 26 s-14 -14 -14 -26 a14 14 0 0 1 14 -14z" fill="#ef3e4a" />
      <circle cx="66" cy="28" r="5.5" fill="#fff" />
    </g>
  </svg>
);
const BookArt = () => (
  <svg viewBox="0 0 120 100">
    <path d="M10 30 Q36 20 60 32 Q84 20 110 30 V84 Q84 74 60 86 Q36 74 10 84z" fill="#1d3a8a" />
    <path d="M16 28 Q38 20 58 30 V80 Q38 70 16 78z" fill="#fff" />
    <path d="M24 38 h26 M24 46 h28 M24 54 h22 M24 62 h26" stroke="#9cbcf0" strokeWidth="3" strokeLinecap="round" />
    <g className="hv-page">
      <path d="M62 30 Q82 20 104 28 V78 Q82 70 62 80z" fill="#fff" />
      <path d="M70 40 h26 M70 48 h22 M70 56 h26" stroke="#9cbcf0" strokeWidth="3" strokeLinecap="round" />
    </g>
    <path className="hv-spark" d="M92 8 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#ffd34d" />
  </svg>
);
const PlayArt = () => (
  <svg viewBox="0 0 120 100">
    <circle cx="60" cy="52" r="36" fill="#fff" />
    <circle cx="60" cy="52" r="28" fill="none" stroke="#ffd1e6" strokeWidth="6" />
    <g className="hv-needle">
      <path d="M60 26 L68 52 L60 78 L52 52z" fill="#ef3e74" />
      <path d="M60 52 L68 52 L60 78 L52 52z" fill="#1d3a8a" />
      <circle cx="60" cy="52" r="4" fill="#fff" />
    </g>
    <path className="hv-spark" d="M100 14 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#ffd34d" />
    <path className="hv-spark is-b" d="M16 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" />
  </svg>
);
const TrophyArt = () => (
  <svg viewBox="0 0 120 100">
    <path d="M38 16 h44 v22 a22 22 0 0 1 -44 0z" fill="#ffc83d" />
    <path d="M38 22 h-12 a12 12 0 0 0 14 16 M82 22 h12 a12 12 0 0 1 -14 16" stroke="#ffc83d" strokeWidth="5" fill="none" />
    <rect x="54" y="58" width="12" height="12" fill="#e0a21a" />
    <rect x="42" y="70" width="36" height="12" rx="3" fill="#6b3fd1" />
    <path className="hv-star" d="M60 22 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#fff" />
    <path className="hv-spark" d="M100 50 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#fff" />
  </svg>
);
const CARDS = [
  { id: "map", title: "الخريطة التفاعلية", text: "استكشف موارد مصر على الخريطة", href: "/demo/lesson-1", Art: MapArt },
  { id: "book", title: "كتابي التفاعلي", text: "اقرأ الدرس صفحة صفحة", href: LESSONS_HREF, Art: BookArt },
  { id: "play", title: "الأنشطة التفاعلية", text: "رحلات استكشاف ومهام ممتعة", href: "/demo/trips", Art: PlayArt },
  { id: "awards", title: "جوائزي وإنجازاتي", text: "نجومك وشاراتك وشهاداتك", href: "/achievements", Art: TrophyArt },
];
// The journey's stops as the start page names them, right to left.
const STOP_NAMES = ["الخامات المعدنية ومصادر الطاقة", "المياه في مصر", "المشروعات القومية"];

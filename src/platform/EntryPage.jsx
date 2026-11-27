import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Lock,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  ArrowCounterClockwise,
  Users,
  Path,
  Check,
  GraduationCap,
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
import { loadGuest, saveGuest, nameKey } from "./guestProfile";
import WelcomeArt from "./WelcomeArt";
import { readAchievements } from "./achievements";
import { LESSONS_HREF } from "./links";
import "./home-v3.css";
import "./home-v4.css";
export default function EntryPage() {
  const { setUser, user } = useSession(),
    navigate = useNavigate();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [guest, setGuest] = useState(loadGuest);
  const [accountOpen, setAccountOpen] = useState(false);
  const [teacherLogin, setTeacherLogin] = useState(false);
  const openAccount = (who) => {
    setTeacherLogin(who === "teacher");
    setMode("login");
    setError("");
    setAccountOpen(true);
  };
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
    rememberAvatar(guest.name, guest.avatar === "girl" ? "girl" : "boy");
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
    if (!user) {
      saveGuest(guest);
      rememberAvatar(guest.name, guest.avatar === "girl" ? "girl" : "boy");
    }
    play("open");
    navigate(resumeHref);
  }
  const total = a.journeys.length;
  const done = a.journeysDone;
  const shownName = user ? user.name || user.username || "" : guest.name || "";
  const first = shownName.trim().split(/\s+/)[0];
  const avatar = guest.avatar === "girl" ? "girl" : "boy";
  const chooseAvatar = (kind) => {
    play("select");
    const nextGuest = { ...guest, avatar: kind };
    setGuest(nextGuest);
    rememberAvatar(nextGuest.name, kind);
    if (String(nextGuest.name || "").trim()) saveGuest(nextGuest);
  };
  // Where the journey line reaches: the current stop (blue), the rest grey.
  const nowIndex = (() => {
    const k = a.journeys.findIndex((j) => next?.id === j.id && next.href === j.href);
    if (k >= 0) return k;
    return done === total ? total : 0;
  })();
  return (
    <div className="lamis-platform home-v3 home-v4" dir="rtl">
      <header className="h4-top">
        <Link to="/" className="h4-brand" aria-label="الخرائط التعليمية الذكية: الرئيسية">
          <BrandMark size={64} round />
          <span>الخرائط التعليمية الذكية</span>
        </Link>
        {voice.available && (
          <button
            type="button"
            className="h4-mute"
            aria-pressed={voice.muted}
            aria-label={voice.muted ? "تشغيل الصوت" : "كتم الصوت"}
            title={voice.muted ? "تشغيل الصوت" : "كتم الصوت"}
            onClick={() => narrator.update({ muted: !voice.muted })}
          >
            {voice.muted ? <SpeakerSlash size={22} weight="bold" /> : <SpeakerHigh size={22} weight="bold" />}
          </button>
        )}
      </header>

      <main className="h4-main">
        <section className="h4-scene" aria-label="مرحبًا بك في عالم الخرائط التعليمية الذكية">
          <h1 className="h4-sr">مرحبًا بك في عالم الخرائط التعليمية الذكية</h1>
          <AtlasBook />
          <div className="h4-art">
            <WelcomeArt resting={typed} greeting={greeting && !blocked} />
            <div className={`entry-robot-say hv-say ${greeting ? "is-on" : ""}`} role="status" aria-live="polite">
              <p>{welcome}</p>
              {blocked && voice.available && !voice.muted && (
                <button type="button" className="entry-say-play" onClick={replay}>
                  <Play size={18} weight="fill" aria-hidden="true" /> استمع للترحيب
                </button>
              )}
            </div>
          </div>
          {voice.available && !voice.muted && (
            <button type="button" className="hv-replay" aria-label="أعد الاستماع للترحيب" title="أعد الاستماع" onClick={replay}>
              <ArrowCounterClockwise size={18} weight="bold" />
            </button>
          )}
        </section>

        <aside className="h4-me" aria-labelledby="hv-me-title">
          <div className="h4-me-head">
            <Avatar kind={avatar} />
            <h2 id="hv-me-title">{first ? `مرحبًا يا ${first}!` : "مرحبًا يا بطل!"}</h2>
          </div>
          {user ? (
            <>
              <p className="h4-me-name">{user.name || user.username}</p>
              <Link
                className="hv-go"
                to={user.role === "student" ? "/journey" : user.role === "parent" ? "/parent" : "/admin"}
              >
                <Play size={22} weight="fill" aria-hidden="true" /> أكمل رحلتي
              </Link>
            </>
          ) : (
            <>
              <label className="h4-name">
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
                    const name = e.target.value;
                    const known = avatarFor(name);
                    setGuest({ ...guest, name, ...(known ? { avatar: known } : {}) });
                    setNameError("");
                    if (!typed && name.trim()) {
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
              <fieldset className="h4-avatars">
                <legend>اختر صورتك</legend>
                {[
                  ["boy", "ولد"],
                  ["girl", "بنت"],
                ].map(([kind, label]) => (
                  <label key={kind} className={avatar === kind ? "is-on" : ""}>
                    <input type="radio" name="avatar" value={kind} checked={avatar === kind} onChange={() => chooseAvatar(kind)} />
                    <Avatar kind={kind} small />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              <button
                type="button"
                key={pulse}
                className={`hv-go ${pulse ? "is-pulse" : ""}`}
                onClick={a.started ? continueJourney : startAdventure}
              >
                <Play size={22} weight="fill" aria-hidden="true" /> {a.started ? "أكمل رحلتي" : "ابدأ المغامرة"}
              </button>
            </>
          )}
          <nav className="h4-links" aria-label="الحسابات">
            {user ? (
              <Link to={user.role === "student" ? "/journey" : user.role === "parent" ? "/parent" : "/admin"}>
                <User size={20} aria-hidden="true" /> حسابي
              </Link>
            ) : (
              <button type="button" onClick={() => openAccount("student")}>
                <User size={20} aria-hidden="true" /> حسابي
              </button>
            )}
            <Link to="/parent">
              <Users size={20} aria-hidden="true" /> حساب ولي الأمر
            </Link>
            {user ? (
              <Link to="/admin">
                <GraduationCap size={20} aria-hidden="true" /> حساب المعلم
              </Link>
            ) : (
              <button type="button" onClick={() => openAccount("teacher")}>
                <GraduationCap size={20} aria-hidden="true" /> حساب المعلم
              </button>
            )}
          </nav>
        </aside>

        <nav className="h4-cards" aria-label="ابدأ من هنا">
          {CARDS.map((c) => (
            <Link key={c.id} to={c.href} className={`h4-card is-${c.id}`} title={c.text} onClick={enter(c.href)}>
              <span className="h4-card-art" aria-hidden="true">
                <c.Art />
              </span>
              <strong>{c.title}</strong>
            </Link>
          ))}
        </nav>

        <section className="h4-path" aria-labelledby="hv-path-title" style={{ "--reach": nowIndex / total }}>
          <h2 id="hv-path-title">
            <Path size={24} weight="duotone" aria-hidden="true" /> رحلتي التعليمية
          </h2>
          <ol className="h4-road">
            {a.journeys.map((j, i) => {
              const now = i === nowIndex;
              return (
                <li key={j.id} className={`is-${j.status} ${now ? "is-now" : ""} ${i < nowIndex ? "is-passed" : ""}`}>
                  <Link to={j.href} onClick={enter(j.href)} aria-current={now ? "step" : undefined}>
                    <span className="h4-stop" aria-hidden="true">
                      {j.done && <Check size={12} weight="bold" />}
                    </span>
                    <b>{STOP_NAMES[i]}</b>
                    <span className="hv-sr">
                      {j.lesson}: {now && j.status === "new" ? "محطتك التالية" : STATUS[j.status]}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className={`is-flag ${done === total ? "is-now is-done" : ""}`}>
              <Link to="/achievements" onClick={enter("/achievements")}>
                <span className="h4-stop" aria-hidden="true">
                  {done === total && <Check size={12} weight="bold" />}
                </span>
                <b>شهاداتي</b>
                <span className="hv-sr">نهاية الوحدة: {done === total ? "مكتملة" : "شهادة لكل رحلة تكملها"}</span>
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
                <h2 id="entry-account-title">{teacherLogin ? "دخول المعلم" : mode === "login" ? "تسجيل الدخول" : "حساب مستكشف جديد"}</h2>
                <button type="button" className="entry-account-close" aria-label="إغلاق" onClick={() => setAccountOpen(false)}>
                  ×
                </button>
              </header>
              {teacherLogin && <p className="entry-privacy">حسابات المعلمين ينشئها مسؤول المنصة؛ ادخل باسم المستخدم أو البريد المسجّل.</p>}
              <div className="p-tabs" role="group" aria-label="نوع الدخول" hidden={teacherLogin}>
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


// The picture beside «مرحبًا يا …!»: the child picks a boy or a girl (a
// name alone can be either: نور، ملك). The choice is kept on this device
// with the name, so it comes back next time.
const AVATARS = "lamis.avatars.v1";
function rememberAvatar(name, kind) {
  const key = nameKey(name);
  if (!key) return;
  try {
    const all = JSON.parse(localStorage.getItem(AVATARS) || "{}");
    all[key] = kind;
    localStorage.setItem(AVATARS, JSON.stringify(all));
  } catch {}
}
function avatarFor(name) {
  const key = nameKey(name);
  if (!key) return null;
  try {
    return JSON.parse(localStorage.getItem(AVATARS) || "{}")[key] || null;
  } catch {
    return null;
  }
}
// The boy is the painted explorer. The girl uses /welcome/kid-girl.webp when
// that painting is added; until then a simple drawing stands in for it.
function Avatar({ kind, small }) {
  const [painted, setPainted] = useState(true);
  const cls = `h4-avatar ${small ? "is-small" : ""}`;
  if (kind === "boy")
    return <img className={cls} src="/welcome/kid-explorer.webp" alt="" width="84" height="84" loading="lazy" />;
  return painted ? (
    <img className={cls} src="/welcome/kid-girl.webp" alt="" width="84" height="84" loading="lazy" onError={() => setPainted(false)} />
  ) : (
    <span className={cls} aria-hidden="true">
      <GirlDrawing />
    </span>
  );
}
const GirlDrawing = () => (
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" fill="#ffe7a3" />
    <path d="M22 58 Q18 22 50 18 Q82 22 78 58 Q80 80 70 92 L30 92 Q20 80 22 58z" fill="#4a2a17" />
    <path d="M26 100 Q28 78 50 76 Q72 78 74 100z" fill="#2c63c9" />
    <path d="M44 70 h12 v8 h-12z" fill="#f2c29b" />
    <ellipse cx="50" cy="52" rx="20" ry="22" fill="#f6cfaa" />
    <path d="M30 46 Q34 26 52 28 Q68 30 70 46 Q60 36 46 38 Q36 40 30 46z" fill="#4a2a17" />
    <circle cx="42" cy="53" r="3.2" fill="#2b1a10" />
    <circle cx="58" cy="53" r="3.2" fill="#2b1a10" />
    <circle cx="43" cy="52" r="1" fill="#fff" />
    <circle cx="59" cy="52" r="1" fill="#fff" />
    <path d="M43 63 Q50 69 57 63" stroke="#b5523b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <circle cx="36" cy="60" r="3.5" fill="#f4a3a3" opacity="0.6" />
    <circle cx="64" cy="60" r="3.5" fill="#f4a3a3" opacity="0.6" />
    <circle cx="70" cy="34" r="5" fill="#ffc83d" />
  </svg>
);

// An open atlas lying under the globe: two printed map pages with paper
// edges and a soft fold, drawn here (no photograph).
function AtlasBook() {
  return (
    <div className="h4-atlas" aria-hidden="true">
      <div className="h4-atlas-book">
        <div className="h4-page is-right">
          <img src="/lesson-media/atlas-geography.svg" alt="" />
        </div>
        <div className="h4-page is-left">
          <img src="/lesson-media/textbook-egypt-map.png" alt="" />
        </div>
      </div>
    </div>
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

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Star,
  Diamond,
  Lightbulb,
  Drop,
  Buildings,
  MapTrifold,
  CheckCircle,
  Lock,
  Medal,
  ArrowRight,
  X,
  Printer,
  DownloadSimple,
  PencilSimple,
  Trophy,
  CaretLeft,
} from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import BrandMark from "./BrandMark";
import { Frame } from "./ExpeditionPage";
import { loadGuest, currentStudent } from "./guestProfile";
import { readAchievements, loadCertificate, saveCertificate } from "./achievements";
import { play } from "./sfx";
import ParentLinkButton from "./ParentLinkButton";
import { useSession } from "./Session";
import "./expedition.css";
import TripPhoto, { TRIP_PHOTO } from "./TripPhoto";
import "./achievements.css";

const ICONS = { Diamond, Lightbulb, Drop, Buildings, MapTrifold };
const JOURNEY_ICON = { "lesson-1": Diamond, "lesson-2": Drop, "lesson-3": Buildings };
const STATUS = { new: "لم تبدأ", active: "قيد الاستكشاف", done: "مكتملة" };
const today = () => new Date().toISOString().slice(0, 10);
const arabicDate = (iso) => {
  try {
    return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// «إنجازاتي»: stars, badges and journeys, with the Little Explorer
// certificate always in view as the goal.
export default function AchievementsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [a] = useState(readAchievements);
  const [cert, setCert] = useState(loadCertificate);
  const [badge, setBadge] = useState(null);
  const [asking, setAsking] = useState(false);
  const guestName = currentStudent()?.name || loadGuest().name || "";
  const firstName = (cert.name || guestName).trim().split(/\s+/)[0];
  const showing = pathname.endsWith("/certificate") && a.eligible && cert.name;

  // The date the certificate became ready is kept, so it does not change.
  useEffect(() => {
    if (a.eligible && !cert.earnedAt) {
      saveCertificate({ earnedAt: today() });
      setCert(loadCertificate());
    }
  }, [a.eligible]);

  if (showing)
    return (
      <Frame title="شهادتي" lessonPath="/explore" current="achievements" className="achievements">
        <CertificateView
          name={cert.name}
          date={cert.earnedAt || today()}
          onEdit={() => setAsking(true)}
          onBack={() => navigate("/achievements")}
        />
        {asking && (
          <NameDialog
            initial={cert.name}
            onClose={() => setAsking(false)}
            onSave={(name) => {
              saveCertificate({ name });
              setCert(loadCertificate());
              setAsking(false);
            }}
          />
        )}
      </Frame>
    );

  const chosen = a.badges.find((b) => b.id === badge);
  return (
    <Frame title="إنجازاتي" lessonPath="/explore" current="achievements" className="achievements">
      <header className="ach-hero">
        <div className="ach-hero-title">
          <h1>
            <Star size={44} weight="fill" aria-hidden="true" /> إنجازاتي
          </h1>
          <p>
            {a.started
              ? `أحسنت يا ${firstName || "مستكشف"}! كل رحلة تقربك من إنجاز جديد`
              : `مرحبًا يا ${firstName || "مستكشف"}! رحلتك تبدأ بخطوة`}
          </p>
        </div>
        <Landmarks />
        <div className="ach-robot">
          <p>هنا تجد نجومك وشاراتك، وتتابع رحلاتك للحصول على شهادة المستكشف الصغير.</p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      </header>

      <div className="ach-row ach-row-top">
        <section className="ach-card ach-stars" aria-labelledby="ach-stars">
          <h2 id="ach-stars">
            <Star size={30} weight="fill" aria-hidden="true" /> نجومي
          </h2>
          <div className="ach-stars-box">
            <p>
              <span className="ach-big-star" aria-hidden="true">
                <Star weight="fill" />
              </span>
              <span>
                <b>{a.stars}</b>
                <span>نجمة</span>
              </span>
            </p>
            <small>من الرحلات والأنشطة اللي أتممتها في رحلتك التعليمية.</small>
          </div>
        </section>

        <section className="ach-card ach-badges" aria-labelledby="ach-badges">
          <h2 id="ach-badges">
            <Trophy size={30} weight="fill" aria-hidden="true" /> شاراتي
          </h2>
          <p className="ach-sub">احصل على الشارات من خلال إكمال الرحلات والأنشطة.</p>
          <ul>
            {a.badges.map((b) => {
              const Icon = ICONS[b.Icon];
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    className={`ach-badge ${b.earned ? "is-earned" : ""} ${badge === b.id ? "is-open" : ""}`}
                    aria-pressed={badge === b.id}
                    aria-label={`${b.title}: ${b.earned ? "مكتسبة" : "لم تُكتسب بعد"}`}
                    onClick={() => setBadge(badge === b.id ? null : b.id)}
                  >
                    <span className="ach-badge-hex" aria-hidden="true">
                      <Icon weight="duotone" />
                      {!b.earned && <Lock className="ach-badge-lock" weight="fill" />}
                    </span>
                    <b>{b.title}</b>
                    <small>{b.earned ? b.short : "أكمل متطلبات الشارة"}</small>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="ach-badge-info" aria-live="polite">
            {chosen ? (chosen.earned ? chosen.why : chosen.how) : "اضغط على شارة لتعرف كيف تحصل عليها."}
          </p>
        </section>
      </div>

      <div className="ach-row ach-row-bottom">
        <section className="ach-card ach-journeys" aria-labelledby="ach-journeys">
          <h2 id="ach-journeys">
            <MapTrifold size={30} aria-hidden="true" /> رحلاتي
          </h2>
          <p className="ach-sub">تابع رحلاتك في وحدات الخرائط التعليمية الذكية.</p>
          <ul>
            {a.journeys.map((j) => (
              <li key={j.id}>
                <Link to={j.href}>
                  <TripPhoto name={TRIP_PHOTO[j.id]} Icon={JOURNEY_ICON[j.id]} className="ach-thumb" iconClass="ach-thumb is-icon" />
                  <span className="ach-journey-text">
                    <b>{j.name}</b>
                    <small>{j.text}</small>
                  </span>
                  <span className={`ach-status is-${j.status}`}>
                    {j.status === "done" && <CheckCircle size={20} weight="fill" aria-hidden="true" />}
                    {STATUS[j.status]}
                  </span>
                  <CaretLeft size={20} className="ach-caret" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={`ach-card ach-cert ${a.eligible ? "is-ready" : ""}`} aria-labelledby="ach-cert">
          <div className="ach-cert-body">
            <h2 id="ach-cert">
              <Medal size={30} weight="duotone" aria-hidden="true" /> شهادة المستكشف الصغير
            </h2>
            <p className="ach-sub">
              {a.eligible
                ? `أحسنت يا ${firstName || "مستكشف"}! أصبحت شهادتك جاهزة.`
                : "أكمل رحلات الوحدة والأنشطة المطلوبة لتحصل على شهادتك."}
            </p>
            <Progress label="الرحلات المكتملة" done={a.journeysDone} total={a.journeys.length} />
            <Progress label="أنشطة ابنِ خريطتك" done={a.mapsDone} total={a.maps.length} />
            {a.eligible ? (
              <button
                type="button"
                className="ach-go"
                onClick={() => {
                  play("open");
                  setAsking(true);
                }}
              >
                اعرض شهادتي <CaretLeft size={22} weight="bold" aria-hidden="true" />
              </button>
            ) : (
              a.next && (
                <Link className="ach-go" to={a.next.href}>
                  أكمل {a.next.title} <CaretLeft size={22} weight="bold" aria-hidden="true" />
                </Link>
              )
            )}
            {!a.eligible && (
              <small className="ach-lock-note">
                <Lock size={18} weight="fill" aria-hidden="true" /> أكمل المتطلبات لفتح الشهادة.
              </small>
            )}
          </div>
          <div className="ach-cert-art" aria-hidden="true">
            <span className="ach-cert-paper">
              <BrandMark size={40} />
              <i />
              <i />
              <i />
            </span>
            {a.eligible ? <Medal className="ach-cert-medal" weight="fill" /> : <Lock className="ach-cert-lock" weight="fill" />}
          </div>
        </section>
      </div>

      <small className="ach-note">
        {guestName ? `هذا تقدم ${guestName} على هذا الجهاز. ` : "التقدم محفوظ على هذا الجهاز. "}
        <Link to="/">طالب آخر؟ اكتب اسمك</Link>
      </small>

      <LinkParent />

      {asking && (
        <NameDialog
          initial={cert.name || guestName}
          onClose={() => setAsking(false)}
          onSave={(name) => {
            saveCertificate({ name });
            setCert(loadCertificate());
            setAsking(false);
            navigate("/achievements/certificate");
          }}
        />
      )}
    </Frame>
  );
}

function Progress({ label, done, total }) {
  return (
    <div className="ach-progress">
      <span>
        {label}: <bdi>{done}</bdi> من <bdi>{total}</bdi>
      </span>
      <span className="ach-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </span>
    </div>
  );
}

// The landmarks behind the title: pyramids, sun, palms and the Nile (drawn, no photo).
function Landmarks() {
  return (
    <svg className="ach-landmarks" viewBox="0 0 360 120" aria-hidden="true">
      <circle cx="300" cy="34" r="16" fill="#ffd36b" opacity=".9" />
      <path d="M0 104q90-14 180 0t180 0v16H0z" fill="#7cc4ef" opacity=".55" />
      <path d="M40 100 105 30l65 70z" fill="#e8b765" />
      <path d="M105 30l65 70h-30z" fill="#c98f3e" />
      <path d="M150 100l45-48 45 48z" fill="#efc77c" />
      <path d="M195 52l45 48h-20z" fill="#d29c4c" />
      <path d="M232 100l26-28 26 28z" fill="#f1cf8e" />
      <g fill="#3f9b5a">
        <path d="M22 100v-34" stroke="#8a6232" strokeWidth="3" />
        <path d="M22 66q-14-2-20 6 10-4 20-6zm0 0q14-2 20 6-10-4-20-6zm0 0q-8-10-18-8 10 2 18 8zm0 0q8-10 18-8-10 2-18 8z" />
        <path d="M318 100v-30" stroke="#8a6232" strokeWidth="3" />
        <path d="M318 70q-12-2-18 5 9-3 18-5zm0 0q12-2 18 5-9-3-18-5zm0 0q-7-9-16-7 9 2 16 7zm0 0q7-9 16-7-9 2-16 7z" />
      </g>
    </svg>
  );
}

function NameDialog({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial || "");
  const [error, setError] = useState("");
  const input = useRef(null);
  useEffect(() => {
    input.current?.focus();
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  return (
    <div className="ach-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="ach-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ach-name-title"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = name.replace(/\s+/g, " ").trim();
          if (!clean) return setError("اكتب اسمك أولًا");
          onSave(clean);
        }}
      >
        <button type="button" className="ach-x" aria-label="إغلاق" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>
        <span className="ach-dialog-robot" aria-hidden="true">
          <RobotGuide />
        </span>
        <h2 id="ach-name-title">اسمك على الشهادة</h2>
        <p>تأكد من كتابة اسمك كما تحب أن يظهر على الشهادة.</p>
        <label>
          اسم الطالب
          <input
            ref={input}
            value={name}
            maxLength={60}
            aria-invalid={!!error}
            aria-describedby={error ? "ach-name-error" : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
        </label>
        {error && (
          <p className="ach-error" id="ach-name-error" role="alert">
            {error}
          </p>
        )}
        <div className="ach-dialog-actions">
          <button type="submit" className="exp-primary">
            اعرض الشهادة
          </button>
          <button type="button" className="exp-secondary" onClick={() => input.current?.select()}>
            <PencilSimple size={18} aria-hidden="true" /> تعديل الاسم
          </button>
        </div>
      </form>
    </div>
  );
}

function CertificateView({ name, date, onEdit, onBack }) {
  const sheet = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pdf() {
    setBusy(true);
    setError("");
    try {
      const { downloadCertificatePdf } = await import("./certificatePdf");
      await downloadCertificatePdf(sheet.current, `شهادة-${name.replace(/\s+/g, "-")}.pdf`);
    } catch {
      setError("تعذّر تجهيز ملف PDF الآن. جرّب «طباعة الشهادة» ثم اختر الحفظ كملف PDF.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cert-page">
      <button type="button" className="cert-back" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" /> العودة إلى إنجازاتي
      </button>
      <article ref={sheet} className="cert-sheet" aria-label={`شهادة إنجاز باسم ${name}`}>
        <div className="cert-frame">
          <span className="cert-corner tl" />
          <span className="cert-corner tr" />
          <span className="cert-corner bl" />
          <span className="cert-corner br" />
          <span className="cert-logo" aria-hidden="true">
            <BrandMark size={58} />
          </span>
          <Medal className="cert-medal" weight="fill" aria-hidden="true" />
          <h1>شهادة إنجاز</h1>
          <p className="cert-to">تُمنح للمستكشف الصغير</p>
          <p className="cert-name">{name}</p>
          <p className="cert-for">تقديرًا لإتمام رحلات وأنشطة الوحدة الثالثة: «كنوز مصر»</p>
          <p className="cert-grade">الصف الخامس الابتدائي — الفصل الدراسي الأول</p>
          <footer>
            <b>الخرائط التعليمية الذكية</b>
            <span>
              تاريخ الإنجاز: <bdi>{arabicDate(date)}</bdi>
            </span>
          </footer>
        </div>
      </article>
      <div className="cert-actions">
        <button type="button" className="exp-primary" onClick={pdf} disabled={busy}>
          <DownloadSimple size={20} aria-hidden="true" /> {busy ? "جارٍ التجهيز…" : "تحميل PDF"}
        </button>
        <button type="button" className="exp-primary" onClick={() => window.print()}>
          <Printer size={20} aria-hidden="true" /> طباعة الشهادة
        </button>
        <button type="button" className="exp-secondary" onClick={onEdit}>
          <PencilSimple size={18} aria-hidden="true" /> تعديل الاسم
        </button>
      </div>
      {error && (
        <p className="ach-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// A signed-in student can let a parent follow their progress: «ربط ولي الأمر»
// opens the one-time code the parent types in their own account.
function LinkParent() {
  const session = useSession();
  if (session?.user?.role !== "student") return null;
  return (
    <section className="ach-card ach-parent" aria-labelledby="ach-parent">
      <h2 id="ach-parent">اربط ولي الأمر</h2>
      <p>يتابع ولي أمرك تقدمك من حسابه: انسخ رمز الربط وأعطه له ليكتبه في شاشة «إضافة ابني».</p>
      <ParentLinkButton />
    </section>
  );
}

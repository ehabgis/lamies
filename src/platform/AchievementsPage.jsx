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

// «إنجازاتي»: stars, badges, journeys and one certificate per journey.
export default function AchievementsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [a] = useState(readAchievements);
  const [cert, setCert] = useState(loadCertificate);
  const [badge, setBadge] = useState(null);
  const [asking, setAsking] = useState(false);
  const guestName = currentStudent()?.name || loadGuest().name || "";
  const firstName = (cert.name || guestName).trim().split(/\s+/)[0];
  // One certificate per journey: finishing «كنوز مصر» alone earns its certificate.
  const [viewing, setViewing] = useState(() =>
    pathname.endsWith("/certificate") ? a.journeys.find((j) => j.done)?.id || null : null,
  );
  const [pendingView, setPendingView] = useState(null);
  const earned = cert.earned || {};

  // The day each journey's certificate was earned is kept, so it does not change.
  useEffect(() => {
    const fresh = a.journeys.filter((j) => j.done && !earned[j.id]);
    if (fresh.length) {
      saveCertificate({ earned: { ...earned, ...Object.fromEntries(fresh.map((j) => [j.id, today()])) } });
      setCert(loadCertificate());
    }
  }, []);
  const open = (id) => {
    play("open");
    if (cert.name) setViewing(id);
    else {
      setPendingView(id);
      setAsking(true);
    }
  };
  const shown = a.journeys.find((j) => j.id === viewing && j.done);

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
          <ParentLinkButton className="ach-parent-link" />
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
            {chosen ? (chosen.earned ? chosen.why : chosen.how) : ""}
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

        <section className="ach-card ach-certs" aria-labelledby="ach-certs">
          <h2 id="ach-certs">
            <Medal size={30} weight="duotone" aria-hidden="true" /> شهاداتي
          </h2>
          <p className="ach-sub">لكل رحلة شهادة: أكمل الرحلة لتحصل على شهادتها.</p>
          <ul>
            {a.journeys.map((j) => (
              <li key={j.id} className={j.done ? "is-earned" : ""}>
                <span className="ach-cert-art" aria-hidden="true">
                  <span className="ach-cert-paper">
                    <Medal weight="fill" />
                    <i />
                    <i />
                  </span>
                  {j.done ? <CheckCircle className="ach-cert-ok" weight="fill" /> : <Lock className="ach-cert-lock" weight="fill" />}
                </span>
                <b>شهادة {j.lesson}</b>
                <span>رحلة {j.name}</span>
                {j.done ? (
                  <>
                    <em className="ach-cert-got">تم الحصول عليها</em>
                    <button type="button" className="ach-cert-btn" onClick={() => open(j.id)}>
                      اعرض شهادتك
                    </button>
                  </>
                ) : (
                  <>
                    <small>أكمل الرحلة للحصول على الشهادة.</small>
                    <Link className="ach-cert-btn is-soft" to={j.href}>
                      أكمل رحلة {j.name}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <small className="ach-note">
        {guestName ? `هذا تقدم ${guestName} على هذا الجهاز. ` : "التقدم محفوظ على هذا الجهاز. "}
        <Link to="/">طالب آخر؟ اكتب اسمك</Link>
      </small>

      {asking && (
        <NameDialog
          initial={cert.name || guestName}
          onClose={() => {
            setAsking(false);
            setPendingView(null);
          }}
          onSave={(name) => {
            saveCertificate({ name });
            setCert(loadCertificate());
            setAsking(false);
            if (pendingView) setViewing(pendingView);
            setPendingView(null);
          }}
        />
      )}
      {shown && !asking && (
        <CertificateDialog
          journey={shown}
          name={cert.name}
          date={earned[shown.id] || today()}
          onEdit={() => setAsking(true)}
          onClose={() => {
            setViewing(null);
            if (pathname.endsWith("/certificate")) navigate("/achievements", { replace: true });
          }}
        />
      )}
    </Frame>
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

// The certificate of one journey, large, over «إنجازاتي», with download and print.
function CertificateDialog({ journey, name, date, onEdit, onClose }) {
  const sheet = useRef(null);
  const closeButton = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    closeButton.current?.focus();
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  async function pdf() {
    setBusy(true);
    setError("");
    try {
      const { downloadCertificatePdf } = await import("./certificatePdf");
      await downloadCertificatePdf(sheet.current, `شهادة-${journey.name.replace(/\s+/g, "-")}-${name.replace(/\s+/g, "-")}.pdf`);
    } catch {
      setError("تعذّر تجهيز ملف PDF الآن. جرّب «طباعة» ثم اختر الحفظ كملف PDF.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cert-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cert-dialog" role="dialog" aria-modal="true" aria-labelledby="cert-dialog-title">
        <header>
          <h2 id="cert-dialog-title">
            <Medal size={30} weight="duotone" aria-hidden="true" /> شهادة {journey.lesson}
          </h2>
          <button ref={closeButton} type="button" className="ach-x" aria-label="إغلاق" onClick={onClose}>
            <X size={22} weight="bold" />
          </button>
        </header>
        <article ref={sheet} className="cert-sheet" aria-label={`شهادة إتمام رحلة ${journey.name} باسم ${name}`}>
          <div className="cert-frame">
            <span className="cert-corner tl" />
            <span className="cert-corner tr" />
            <span className="cert-corner bl" />
            <span className="cert-corner br" />
            <p className="cert-brand">
              <BrandMark size={44} /> الخرائط التعليمية الذكية
            </p>
            <h1>شهادة إنجاز</h1>
            <p className="cert-to">تُمنح هذه الشهادة إلى</p>
            <p className="cert-name">{name}</p>
            <p className="cert-for">تقديرًا لإتمامه رحلة {journey.name}</p>
            <p className="cert-lesson">{journey.lessonTitle}</p>
            <p className="cert-grade">{journey.lesson} — الصف الخامس الابتدائي</p>
            <p className="cert-date">
              تاريخ الإتمام: <bdi>{arabicDate(date)}</bdi>
            </p>
            <span className="cert-robot" aria-hidden="true">
              <RobotGuide />
            </span>
            <Medal className="cert-medal" weight="fill" aria-hidden="true" />
          </div>
        </article>
        <div className="cert-actions">
          <button type="button" className="cert-act is-main" onClick={pdf} disabled={busy}>
            <DownloadSimple size={22} aria-hidden="true" /> {busy ? "جارٍ التجهيز…" : "تحميل الشهادة"}
          </button>
          <button type="button" className="cert-act" onClick={() => window.print()}>
            <Printer size={22} aria-hidden="true" /> طباعة
          </button>
          <button type="button" className="cert-act is-soft" onClick={onClose}>
            العودة إلى إنجازاتي
          </button>
        </div>
        <button type="button" className="cert-rename" onClick={onEdit}>
          <PencilSimple size={16} aria-hidden="true" /> تعديل الاسم
        </button>
        {error && (
          <p className="ach-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

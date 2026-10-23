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
  ArrowLeft,
  ArrowRight,
  X,
  Printer,
  DownloadSimple,
  PencilSimple,
} from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import BrandMark from "./BrandMark";
import { Frame } from "./ExpeditionPage";
import { loadGuest, currentStudent } from "./guestProfile";
import { readAchievements, loadCertificate, saveCertificate } from "./achievements";
import { play } from "./sfx";
import "./expedition.css";
import "./achievements.css";

const ICONS = { Diamond, Lightbulb, Drop, Buildings, MapTrifold };
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
      <header className="ach-head">
        <div>
          <h1>
            <Star size={34} weight="fill" aria-hidden="true" /> إنجازاتي
          </h1>
          <p className="ach-hello">{a.started ? `أحسنت يا ${firstName || "مستكشف"}!` : `مرحبًا يا ${firstName || "مستكشف"}!`}</p>
        </div>
        <div className="ach-robot">
          <p>هنا تجد نجومك وشاراتك، وتتابع رحلتك للحصول على شهادة المستكشف الصغير.</p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      </header>

      {!a.started && (
        <section className="ach-empty" role="status">
          <p>رحلتك تبدأ بخطوة! انطلق واكتشف أول كنز من كنوز مصر.</p>
          <Link className="exp-primary" to={a.journeys[0].href}>
            ابدأ رحلتي <ArrowLeft size={22} aria-hidden="true" />
          </Link>
        </section>
      )}

      <div className="ach-grid">
        <section className="ach-card ach-stars" aria-labelledby="ach-stars">
          <h2 id="ach-stars">نجومي</h2>
          <p>
            <Star size={40} weight="fill" aria-hidden="true" />
            <b>{a.stars}</b>
            <span>نجمة</span>
          </p>
          <small>من الرحلات وأنشطة «ابنِ خريطتك»</small>
        </section>

        <section className="ach-card ach-badges" aria-labelledby="ach-badges">
          <h2 id="ach-badges">شاراتي</h2>
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
                    {b.title}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="ach-badge-info" aria-live="polite">
            {chosen ? (chosen.earned ? chosen.why : chosen.how) : "اضغط على شارة لتعرف كيف تحصل عليها."}
          </p>
        </section>

        <section className="ach-card ach-journeys" aria-labelledby="ach-journeys">
          <h2 id="ach-journeys">رحلاتي</h2>
          <ul>
            {a.journeys.map((j) => (
              <li key={j.id}>
                <Link to={j.href}>
                  {j.status === "done" ? <CheckCircle size={26} weight="fill" aria-hidden="true" /> : <span className={`ach-dot is-${j.status}`} aria-hidden="true" />}
                  <b>{j.title}</b>
                  <span className={`ach-status is-${j.status}`}>{STATUS[j.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={`ach-card ach-cert ${a.eligible ? "is-ready" : ""}`} aria-labelledby="ach-cert">
        <div className="ach-cert-art" aria-hidden="true">
          <span className="ach-cert-paper">
            <BrandMark size={34} />
            <i />
            <i />
            <i />
          </span>
          {a.eligible ? <Medal className="ach-cert-medal" weight="fill" /> : <Lock className="ach-cert-lock" weight="fill" />}
        </div>
        <div className="ach-cert-body">
          <h2 id="ach-cert">شهادة المستكشف الصغير</h2>
          {a.eligible ? (
            <p className="ach-cert-ready">أحسنت يا {firstName || "مستكشف"}! أصبحت شهادتك جاهزة.</p>
          ) : (
            <p>أكمل رحلات الوحدة والأنشطة المطلوبة لتحصل على شهادتك.</p>
          )}
          <Progress label="الرحلات المكتملة" done={a.journeysDone} total={a.journeys.length} />
          <Progress label="الأنشطة المطلوبة (ابنِ خريطتك)" done={a.mapsDone} total={a.maps.length} />
          {a.eligible ? (
            <button
              type="button"
              className="exp-primary"
              onClick={() => {
                play("open");
                setAsking(true);
              }}
            >
              اعرض شهادتي <ArrowLeft size={22} aria-hidden="true" />
            </button>
          ) : (
            a.next && (
              <Link className="exp-primary" to={a.next.href}>
                أكمل رحلتي: {a.next.title} <ArrowLeft size={22} aria-hidden="true" />
              </Link>
            )
          )}
          <small className="ach-note">
            {guestName ? `هذا تقدم ${guestName} على هذا الجهاز. ` : "التقدم محفوظ على هذا الجهاز. "}
            <Link to="/">طالب آخر؟ اكتب اسمك</Link>
          </small>
        </div>
      </section>

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
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < done ? "is-done" : ""} />
        ))}
      </span>
    </div>
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

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bank,
  BookOpen,
  Buildings,
  Diamond,
  Drop,
  GasPump,
  House,
  Leaf,
  Lightbulb,
  Lightning,
  MapPin,
  MapTrifold,
  SpeakerHigh,
  Star,
  Stop,
  Target,
  Train,
  Tree,
  UsersThree,
  Warning,
  Waves,
  Wind,
  ListBullets,
  X,
} from "phosphor-react";
import { api } from "./api";
import BrandMark from "./BrandMark";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./book.css";
import { LESSONS_HREF } from "./links";

const LESSONS = [
  ["lesson-1", "الدرس الأول", "الثروة المعدنية ومصادر الطاقة"],
  ["lesson-2", "الدرس الثاني", "موارد المياه"],
  ["lesson-3", "الدرس الثالث", "المشروعات القومية"],
];

const ICON = {
  target: Target,
  minerals: Diamond,
  energy: Lightning,
  oil: GasPump,
  wind: Wind,
  people: UsersThree,
  state: Bank,
  drop: Drop,
  waves: Waves,
  warning: Warning,
  plant: Tree,
  city: Buildings,
  train: Train,
  book: BookOpen,
  cart: Diamond,
  bulb: Lightbulb,
  pin: MapPin,
  star: Star,
};

// «كتابي التفاعلي»: the lesson explained screen by screen. «التالي» goes on,
// the index jumps to any part, «استمع للشرح» reads the screen aloud, and the
// last screen leads to the lesson map and activities.
export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const heading = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    setBook(null);
    setError("");
    api(`/demo/lessons/${encodeURIComponent(id)}/book`)
      .then((d) => setBook(d.book))
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => narrator.subscribe((s) => setSpeaking(s.state === "speaking")), []);
  useEffect(() => () => narrator.stop(), []);

  const sections = book?.sections || [];
  const at = Math.min(Math.max(Number(search.get("s")) || 0, 0), Math.max(sections.length - 1, 0));
  const section = sections[at];
  const next = sections[at + 1];
  const prev = sections[at - 1];

  useEffect(() => {
    if (!section) return;
    narrator.stop();
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    heading.current?.focus({ preventScroll: true });
  }, [at, section?.id]);

  const go = (i) => {
    play("select");
    setIndexOpen(false);
    setSearch(i ? { s: String(i) } : {});
  };
  const mapHref = (rid) => `/demo/${id}${rid ? `?resource=${encodeURIComponent(rid)}` : ""}`;

  if (error)
    return (
      <Frame id={id}>
        <p className="bk-empty" role="alert">
          تعذر فتح شرح الدرس. {error}
        </p>
      </Frame>
    );
  if (!book)
    return (
      <Frame id={id}>
        <p className="bk-empty" role="status">
          نفتح كتابك…
        </p>
      </Frame>
    );

  return (
    <Frame id={id}>
      <div className="bk-layout">
        <nav id="bk-index" className={`bk-index ${indexOpen ? "is-open" : ""}`} aria-label="محتويات الدرس">
          <h2>
            <BookOpen size={26} aria-hidden="true" /> محتويات الدرس
            <button type="button" className="bk-index-close" aria-label="إغلاق المحتويات" onClick={() => setIndexOpen(false)}>
              <X size={20} weight="bold" />
            </button>
          </h2>
          <p className="bk-lesson-name">{book.title}</p>
          <ol>
            {sections.map((s, i) => {
              const Icon = ICON[s.icon] || BookOpen;
              return (
                <li key={s.id}>
                  <button type="button" aria-current={i === at ? "step" : undefined} onClick={() => go(i)}>
                    <Icon size={28} weight="duotone" aria-hidden="true" />
                    <span>{s.title}</span>
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="bk-page" aria-labelledby="bk-title">
          <button
            type="button"
            className="bk-index-open"
            aria-expanded={indexOpen}
            aria-controls="bk-index"
            onClick={() => setIndexOpen(true)}
          >
            <ListBullets size={20} aria-hidden="true" /> محتويات الدرس · {at + 1} من {sections.length}
          </button>
          <h1 id="bk-title" ref={heading} tabIndex={-1} className="bk-title">
            {section.title}
          </h1>
          <Section section={section} mapHref={mapHref} />
        </main>
      </div>

      <footer className="bk-bar">
        {prev ? (
          <button type="button" className="bk-side-btn" onClick={() => go(at - 1)}>
            <ArrowRight size={20} aria-hidden="true" /> السابق
          </button>
        ) : (
          <Link className="bk-side-btn" to={LESSONS_HREF}>
            <ArrowRight size={20} aria-hidden="true" /> دروس الوحدة
          </Link>
        )}
        <button
          type="button"
          className="bk-listen"
          aria-pressed={speaking}
          onClick={() => (speaking ? narrator.stop() : narrator.speak(spokenText(section)))}
          disabled={!narrator.available()}
        >
          {speaking ? <Stop size={22} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={22} aria-hidden="true" />}
          {speaking ? "إيقاف الشرح" : "استمع للشرح"}
        </button>
        {next ? (
          <button type="button" className="bk-side-btn is-next" onClick={() => go(at + 1)}>
            التالي: {next.title} <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="bk-side-btn is-next is-map"
            onClick={() => {
              play("project");
              navigate(mapHref());
            }}
          >
            <MapTrifold size={22} aria-hidden="true" /> إلى الخريطة والأنشطة
          </button>
        )}
      </footer>
    </Frame>
  );
}

function Frame({ id, children }) {
  const navigate = useNavigate();
  return (
    <div className="bk-shell" dir="rtl">
      <header className="bk-top">
        <Link to="/" className="bk-brand">
          <BrandMark size={42} /> <span>الخرائط التعليمية الذكية</span>
        </Link>
        <nav aria-label="التنقل">
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(LESSONS_HREF))}>
            <ArrowRight size={22} aria-hidden="true" /> <span>رجوع</span>
          </button>
          <Link to="/">
            <House size={22} aria-hidden="true" /> <span>الرئيسية</span>
          </Link>
          <Link to={LESSONS_HREF} className="is-current" title="العودة إلى دروس الوحدة">
            <BookOpen size={22} aria-hidden="true" /> <span>كتابي التفاعلي</span>
          </Link>
          <Link to={`/demo/${id}`}>
            <MapTrifold size={22} aria-hidden="true" /> <span>الخريطة التعليمية</span>
          </Link>
        </nav>
      </header>
      <nav className="bk-lessons" aria-label="دروس الوحدة الثالثة: كنوز مصر">
        {LESSONS.map(([lid, n, name], i) => (
          <Link key={lid} to={`/demo/${lid}/book`} aria-current={lid === id ? "page" : undefined} onClick={() => play("select")}>
            <b aria-hidden="true">{i + 1}</b>
            <span>
              <strong>{n}</strong>
              <small>{name}</small>
            </span>
          </Link>
        ))}
      </nav>
      {children}
      <span className="bk-ground" aria-hidden="true" />
    </div>
  );
}

function Section({ section, mapHref }) {
  return (
    <div className="bk-body">
      {section.lead && (
        <p className="bk-lead">
          <BookOpen size={34} aria-hidden="true" />
          <span>{section.lead}</span>
        </p>
      )}
      {section.columns?.length > 0 && (
        <div className={`bk-columns count-${section.columns.length}`}>
          {section.columns.map((c) => {
            const Icon = ICON[c.icon];
            return (
              <section key={c.title} className={`bk-column tone-${c.tone}`}>
                <h2>
                  {Icon && <Icon size={30} weight="duotone" aria-hidden="true" />} {c.title}
                </h2>
                {c.text && <p>{c.text}</p>}
                {c.list?.length > 0 && (
                  <ul>
                    {c.list.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
      {section.cards?.length > 0 && (
        <ul className={`bk-cards is-${section.layout || "rows"}`}>
          {section.cards.map((c) => (
            <Card key={c.resource.id} card={c} wide={section.layout === "wide"} moreIcon={section.moreIcon} mapHref={mapHref} />
          ))}
        </ul>
      )}
      {section.boxes?.length > 0 && (
        <div className="bk-boxes">
          {section.boxes.map((b) => {
            const Icon = ICON[b.icon] || Lightbulb;
            return (
              <section key={b.title} className={`bk-box tone-${b.tone}`}>
                <h2>
                  <Lightbulb size={24} weight="duotone" aria-hidden="true" /> {b.title}
                </h2>
                <p>
                  <span>{b.text}</span>
                  <Icon size={44} weight="duotone" aria-hidden="true" />
                </p>
              </section>
            );
          })}
        </div>
      )}
      {section.note && (
        <p className="bk-note">
          <span>{section.note}</span>
          <Leaf size={30} weight="fill" aria-hidden="true" />
        </p>
      )}
    </div>
  );
}

function Card({ card, wide, moreIcon, mapHref }) {
  const More = moreIcon === "pin" ? MapPin : Star;
  const media = card.photo ? (
    <img src={card.photo} alt={card.resource.label} loading="lazy" />
  ) : card.video ? (
    <video src={card.video} controls preload="metadata" aria-label={`فيديو ${card.resource.label}`} />
  ) : (
    <span className="bk-media-empty" aria-hidden="true">
      <LessonSymbol resource={card.resource} />
    </span>
  );
  return (
    <li className="bk-card" style={{ "--tone": card.resource.color || "#0a5fd8" }}>
      <div className="bk-card-text">
        <h3>
          <span className="bk-card-icon" aria-hidden="true">
            <LessonSymbol resource={card.resource} />
          </span>
          {card.resource.label}
        </h3>
        <p>{card.text}</p>
        {card.place &&
          (wide ? (
            <p className="bk-place">
              <More size={24} weight="fill" aria-hidden="true" />
              <span>{card.place}</span>
            </p>
          ) : (
            <p className="bk-place-inline">{card.place}</p>
          ))}
      </div>
      <div className="bk-media">
        {media}
        {card.mappable && (
          <Link className="bk-on-map" to={mapHref(card.resource.id)}>
            <MapTrifold size={22} aria-hidden="true" /> شاهد على الخريطة
          </Link>
        )}
      </div>
    </li>
  );
}

function spokenText(s) {
  return [
    s.title,
    s.lead,
    ...(s.columns || []).flatMap((c) => [c.title, c.text, ...(c.list || [])]),
    ...(s.cards || []).flatMap((c) => [c.resource.label, c.text, c.place]),
    ...(s.boxes || []).flatMap((b) => [b.title, b.text]),
    s.note,
  ]
    .filter(Boolean)
    .map((t) => (/[.؟!:]$/.test(t) ? t : `${t}.`))
    .join(" ");
}

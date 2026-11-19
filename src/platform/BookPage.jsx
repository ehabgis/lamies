import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CheckCircle,
  Factory,
  Fire,
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
import { useLessonPlace } from "./lessonPlace";
import BrandMark from "./BrandMark";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import RobotGuide from "../components/Map/RobotGuide";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./book.css";
import { LESSONS_HREF } from "./links";

const LESSONS = [
  ["lesson-1", "الدرس الأول", "الثروة المعدنية ومصادر الطاقة"],
  ["lesson-2", "الدرس الثاني", "موارد المياه"],
  ["lesson-3", "الدرس الثالث", "المشروعات القومية (رؤية مصر للمستقبل)"],
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
  const place = useLessonPlace();
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  // The card chosen on the open book's left page (first one by default).
  const [pick, setPick] = useState(0);
  const heading = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    setBook(null);
    setError("");
    api(`${place.api}/${encodeURIComponent(id)}/book`)
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
    setPick(0);
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
  const choose = (i) => {
    narrator.stop();
    play("select");
    setPick(i);
    // Phones stack the pages, so show the facts that just changed above.
    if (window.matchMedia?.("(max-width: 760px)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() =>
        document.querySelector(".bk-fact, .bk-source")?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }),
      );
    }
  };
  const goTo = (sid) => {
    const i = sections.findIndex((s) => s.id === sid);
    if (i >= 0) go(i);
  };
  const mapHref = (rid) => `${place.page}/${id}${rid ? `?resource=${encodeURIComponent(rid)}` : ""}`;

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
          <Link className="bk-explore" to={mapHref()} onClick={() => play("project")}>
            <MapTrifold size={22} aria-hidden="true" /> استكشف الخريطة
          </Link>
        </nav>

        <main className="bk-page" aria-labelledby="bk-lesson-title">
          <header className="bk-hero">
            <small>كنوز مصر</small>
            <h1 id="bk-lesson-title">{book.title}</h1>
          </header>
          <button
            type="button"
            className="bk-index-open"
            aria-expanded={indexOpen}
            aria-controls="bk-index"
            onClick={() => setIndexOpen(true)}
          >
            <ListBullets size={20} aria-hidden="true" /> محتويات الدرس · {at + 1} من {sections.length}
          </button>
          {section.spread ? (
            <Spread section={section} pick={pick} choose={choose} goTo={goTo} mapHref={mapHref} heading={heading} />
          ) : (
            <div className="bk-sheet">
              <h2 id="bk-title" ref={heading} tabIndex={-1} className="bk-title">
                {section.title}
              </h2>
              <Section section={section} mapHref={mapHref} />
            </div>
          )}
        </main>
      </div>

      <footer className="bk-bar">
        <button type="button" className="bk-side-btn" onClick={() => go(at - 1)} disabled={!prev}>
          <ArrowRight size={20} aria-hidden="true" /> السابق
        </button>
        <button
          type="button"
          className="bk-listen"
          aria-pressed={speaking}
          onClick={() => (speaking ? narrator.stop() : narrator.speak(spokenText(section, pick)))}
          disabled={!narrator.available()}
        >
          {speaking ? <Stop size={22} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={22} aria-hidden="true" />}
          {speaking ? "إيقاف الشرح" : "استمع للشرح"}
        </button>
        {next ? (
          <button type="button" className="bk-side-btn is-next" onClick={() => go(at + 1)}>
            التالي <ArrowLeft size={20} aria-hidden="true" />
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
  const place = useLessonPlace();
  const lessonsHref = place.classroom ? "/journey" : LESSONS_HREF;
  const home = place.classroom ? "/journey" : "/";
  return (
    <div className="bk-shell" dir="rtl">
      <header className="bk-top">
        <Link to={home} className="bk-brand">
          <BrandMark size={42} /> <span>الخرائط التعليمية الذكية</span>
        </Link>
        <nav aria-label="التنقل">
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(lessonsHref))}>
            <ArrowRight size={22} aria-hidden="true" /> <span>رجوع</span>
          </button>
          <Link to={home}>
            <House size={22} aria-hidden="true" /> <span>{place.classroom ? "رحلتي" : "الرئيسية"}</span>
          </Link>
          <Link to={lessonsHref} className="is-current" title="العودة إلى دروس الوحدة">
            <BookOpen size={22} aria-hidden="true" /> <span>كتابي التفاعلي</span>
          </Link>
          <Link to={`${place.page}/${id}`}>
            <MapTrifold size={22} aria-hidden="true" /> <span>الخريطة التفاعلية</span>
          </Link>
        </nav>
      </header>
      <nav className="bk-lessons" aria-label="دروس الوحدة الثالثة: كنوز مصر">
        {LESSONS.map(([lid, n, name], i) => (
          <Link key={lid} to={`${place.page}/${lid}/book`} aria-current={lid === id ? "page" : undefined} onClick={() => play("select")}>
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

// What «استمع للشرح» reads: the visible text only (on the open book, the
// chosen card, not every card).
function spokenText(s, pick = 0) {
  const card = s.spread && s.spread !== "goals" ? s.cards?.[pick] : null;
  const parts = s.spread
    ? [
        s.title,
        s.spread === "goals" ? "في نهاية الدرس أستطيع أن" : s.spread === "sources" ? null : s.lead,
        ...(s.spread === "goals" ? s.columns?.[0]?.list || [] : []),
        ...(s.uses || []).flatMap((u) => [u.title, u.text]),
        ...(s.kinds || []).flatMap((k) => [k.title, k.chips.join("، ")]),
        ...(s.spread === "roles" ? s.columns.flatMap((c) => [c.title, ...c.list]) : []),
        ...(card ? cardWords(s, card) : []),
      ]
    : [
        s.title,
        s.lead,
        ...(s.columns || []).flatMap((c) => [c.title, c.text, ...(c.list || [])]),
        ...(s.cards || []).flatMap((c) => [c.resource.label, c.text, c.place]),
        ...(s.boxes || []).flatMap((b) => [b.title, b.text]),
        s.note,
      ];
  return parts
    .filter(Boolean)
    .map((t) => (/[.؟!:]$/.test(t) ? t : `${t}.`))
    .join(" ");
}
function cardWords(s, c) {
  if (s.spread === "minerals")
    return [c.resource.label, `من مناطق استخراجه: ${c.regions[0]}`, `من استخداماته: ${c.use}`];
  return [c.resource.label, firstSentence(c.text), c.place];
}
// "البترول يُستخرج منه … . مصدر طاقة غير متجدد." → its first sentence.
const firstSentence = (t) => String(t || "").split(/(?<=\.)\s/)[0];

// ---------------------------------------------------------- open book
// Two pages: the text page on the right (with the robot) and the page to
// choose from on the left. Every choice is a real button, so the keyboard
// and screen readers work the same as a tap.
function Spread({ section: s, pick, choose, goTo, mapHref, heading }) {
  const card = s.cards?.[pick] || s.cards?.[0];
  const title = (
    <div className={`bk-pg-head ${s.tone ? `tone-${s.tone}` : ""}`}>
      <span className="bk-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <h2 id="bk-title" ref={heading} tabIndex={-1}>
        {s.title}
      </h2>
    </div>
  );
  let right;
  let left;
  if (s.spread === "goals") {
    right = (
      <>
        {title}
        <h3 className="bk-pg-sub">في نهاية الدرس أستطيع أن:</h3>
        <ol className="bk-goals">
          {s.columns[0].list.map((g, i) => (
            <li key={g}>
              <b aria-hidden="true">{i + 1}</b>
              <span>{g}</span>
            </li>
          ))}
        </ol>
      </>
    );
    left = (
      <>
        <h3 className="bk-pg-sub">في هذا الدرس نتعرّف على</h3>
        <ul className="bk-symbols">
          {s.cards.map((c) => (
            <li key={c.resource.id}>
              <span aria-hidden="true">
                <LessonSymbol resource={c.resource} />
              </span>
              {c.resource.label}
            </li>
          ))}
        </ul>
      </>
    );
  } else if (s.spread === "minerals") {
    right = (
      <>
        {title}
        <p className="bk-pg-lead">{s.lead}</p>
        <div className="bk-fact" aria-live="polite">
          <h3>
            <span className="bk-fact-icon" aria-hidden="true">
              <LessonSymbol resource={card.resource} />
            </span>
            {card.resource.label}
          </h3>
          <dl>
            <div>
              <dt>من مناطق استخراجه</dt>
              <dd>{card.regions[0]}</dd>
            </div>
            <div>
              <dt>من استخداماته</dt>
              <dd>{card.use}</dd>
            </div>
          </dl>
          {card.mappable && <OnMap href={mapHref(card.resource.id)} />}
        </div>
      </>
    );
    left = <Picker title={s.pickTitle} cards={s.cards} pick={pick} choose={choose} grid />;
  } else if (s.spread === "energy") {
    right = (
      <>
        {title}
        <p className="bk-pg-lead">{s.lead}</p>
        <h3 className="bk-pg-sub">كيف نستخدم الطاقة؟</h3>
        <ul className="bk-uses">
          {s.uses.map((u) => {
            const Icon = u.id === "old" ? Fire : Factory;
            return (
              <li key={u.id} className={`is-${u.id}`}>
                <span className="bk-use-pic" aria-hidden="true">
                  <Icon size={40} weight="duotone" />
                </span>
                <span>
                  <strong>{u.title}</strong>
                  {u.text}
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );
    left = (
      <>
        <h3 className="bk-pg-sub">تعرّف على نوعَي الطاقة</h3>
        <div className="bk-kinds">
          {s.kinds.map((k) => (
            <button key={k.to} type="button" className={`bk-kind tone-${k.tone}`} onClick={() => goTo(k.to)}>
              <strong>
                {k.tone === "green" ? <Leaf size={28} weight="duotone" aria-hidden="true" /> : <GasPump size={28} weight="duotone" aria-hidden="true" />}
                {k.title}
              </strong>
              <span className="bk-chips">
                {k.chips.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </span>
              <CaretLeft size={22} weight="bold" aria-hidden="true" className="bk-kind-go" />
            </button>
          ))}
        </div>
      </>
    );
  } else if (s.spread === "sources") {
    right = (
      <>
        {title}
        <div className="bk-source" aria-live="polite">
          <span className="bk-pill">{card.resource.label}</span>
          <p>{firstSentence(card.text)}</p>
          {s.tone === "green" && card.place && (
            <p className="bk-place">
              <MapPin size={22} weight="fill" aria-hidden="true" />
              <span>{card.place}</span>
            </p>
          )}
          <Picture card={card} />
          {card.mappable && <OnMap href={mapHref(card.resource.id)} />}
        </div>
      </>
    );
    left = <Picker title={s.pickTitle} cards={s.cards} pick={pick} choose={choose} />;
  } else {
    const [state, people] = s.columns;
    // Both pages share rows (CSS subgrid), so the two headings line up.
    right = (
      <>
        <div className="bk-roles-top">
          {title}
          <p className="bk-pg-lead">{s.lead}</p>
        </div>
        <Roles col={state} Icon={Bank} />
      </>
    );
    left = (
      <>
        <span className="bk-roles-top" aria-hidden="true" />
        <Roles col={people} Icon={UsersThree} />
      </>
    );
  }
  return (
    <div className={`bk-book is-${s.spread}`}>
      <section className="bk-pg is-right" aria-labelledby="bk-title">
        {right}
      </section>
      <section className="bk-pg is-left" aria-label={s.pickTitle || "تابع الصفحة"}>
        {left}
      </section>
    </div>
  );
}

function Picker({ title, cards, pick, choose, grid }) {
  return (
    <>
      <h3 className="bk-pg-sub">{title}</h3>
      <ul className={grid ? "bk-pick is-grid" : "bk-pick is-list"}>
        {cards.map((c, i) => (
          <li key={c.resource.id}>
            <button type="button" aria-pressed={i === pick} onClick={() => choose(i)}>
              <span className="bk-pick-pic" aria-hidden="true">
                {c.photo ? <img src={c.photo} alt="" loading="lazy" /> : <LessonSymbol resource={c.resource} />}
              </span>
              <span className="bk-pick-name">{c.resource.label}</span>
              {grid ? (
                i === pick && <CheckCircle size={26} weight="fill" className="bk-pick-check" aria-hidden="true" />
              ) : (
                <CaretLeft size={20} weight="bold" aria-hidden="true" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// A photo when the teacher's site file exists; until then the resource symbol.
function Picture({ card }) {
  return (
    <figure className="bk-pic">
      {card.photo ? (
        <img src={card.photo} alt={card.resource.label} loading="lazy" />
      ) : (
        <span className="bk-pic-symbol" aria-hidden="true">
          <LessonSymbol resource={card.resource} />
        </span>
      )}
    </figure>
  );
}

function OnMap({ href }) {
  return (
    <Link className="bk-on-map" to={href}>
      <MapTrifold size={22} aria-hidden="true" /> شاهد على الخريطة
    </Link>
  );
}

function Roles({ col, Icon }) {
  return (
    <div className={`bk-roles tone-${col.tone}`}>
      <h3>
        <Icon size={28} weight="duotone" aria-hidden="true" /> {col.title}
      </h3>
      <ul>
        {col.list.map((x) => (
          <li key={x}>
            <CheckCircle size={22} weight="fill" aria-hidden="true" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

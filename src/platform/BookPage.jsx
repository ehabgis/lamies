import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  MagnifyingGlassPlus,
  X,
} from "phosphor-react";
import { api } from "./api";
import { useLessonPlace } from "./lessonPlace";
import BrandMark from "./BrandMark";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import RobotGuide from "../components/Map/RobotGuide";
import CitizenLab, { citizenScenes } from "./CitizenLab";
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
  // The photo open in the enlarged view, or null.
  const [zoom, setZoom] = useState(null);
  // The page being turned: a picture of the old pages over the new ones.
  const [turn, setTurn] = useState(null);
  const turning = useRef(false);
  const extra = useResourceMedia();
  const heading = useRef(null);
  const first = useRef(true);
  const stage = useRef(null);

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
  // Every part of every lesson is shown as the open book's two pages.
  const view = section ? asSpread(section, id) : null;

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
    if (turning.current || i < 0 || i >= sections.length) return;
    play("select");
    setIndexOpen(false);
    if (i !== at) {
      const dir = i > at ? "next" : "prev";
      const leaf = bigTurn() && snapshot(stage.current, dir);
      if (leaf) {
        turning.current = true;
        setTimeout(() => {
          turning.current = false;
          setTurn((t) => (t?.leaf === leaf ? null : t));
        }, TURN_MS);
      }
      setTurn({ dir, leaf });
    }
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
        document.querySelector(".bk-show")?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }),
      );
    }
  };
  const goTo = (sid) => {
    const i = sections.findIndex((s) => s.id === sid);
    if (i >= 0) go(i);
  };
  // ← and → turn the pages too (the book reads right to left), and a
  // sideways swipe on a phone; neither takes over a field, a video or a
  // control that uses the arrows itself.
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    if (zoom) return undefined;
    const key = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || ownsKeys(e.target)) return;
      if (e.key === "ArrowLeft") goRef.current(atRef.current + 1);
      else if (e.key === "ArrowRight") goRef.current(atRef.current - 1);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [zoom]);
  const atRef = useRef(at);
  atRef.current = at;
  const swipe = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    swipe.current = e.touches.length === 1 && !ownsKeys(e.target) ? { x: t.clientX, y: t.clientY, at: Date.now() } : null;
  };
  const onTouchEnd = (e) => {
    const s = swipe.current;
    swipe.current = null;
    const t = e.changedTouches[0];
    if (!s || !t || Date.now() - s.at > 700) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    go(dx > 0 ? at + 1 : at - 1);
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
    <Frame id={id} title={book.title}>
      <div className="bk-layout">
        <nav id="bk-index" className={`bk-index ${indexOpen ? "is-open" : ""}`} aria-label="محتويات الدرس">
          <h2>
            <BookOpen size={26} aria-hidden="true" /> محتويات الدرس
            <button type="button" className="bk-index-close" aria-label="إغلاق المحتويات" onClick={() => setIndexOpen(false)}>
              <X size={20} weight="bold" />
            </button>
          </h2>
          <ol>
          <p className="bk-progress">
            <span>
              الجزء {at + 1} من {sections.length}
            </span>
            <span className="bk-progress-bar" aria-hidden="true">
              <span style={{ width: `${((at + 1) / Math.max(sections.length, 1)) * 100}%` }} />
            </span>
          </p>
            {sections.map((s, i) => {
              const Icon = ICON[s.icon] || BookOpen;
              return (
                <li key={s.id}>
                  <button type="button" aria-current={i === at ? "step" : undefined} onClick={() => go(i)}>
                    <Icon size={28} aria-hidden="true" />
                    <span>{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Link className="bk-explore" to={mapHref()} onClick={() => play("project")}>
            <MapPin size={24} aria-hidden="true" /> استكشف الخريطة
          </Link>
        </nav>

        <main className="bk-page" aria-labelledby="bk-title" ref={stage} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button
            type="button"
            className="bk-index-open"
            aria-expanded={indexOpen}
            aria-controls="bk-index"
            onClick={() => setIndexOpen(true)}
          >
            <ListBullets size={20} aria-hidden="true" /> محتويات الدرس · {at + 1} من {sections.length}
          </button>
          <Spread
            key={section.id}
            section={view}
            pick={pick}
            choose={choose}
            goTo={goTo}
            mapHref={mapHref}
            heading={heading}
            extra={extra}
            onZoom={setZoom}
            turn={turn?.dir && `is-${turn.leaf ? "turn" : "slide"}-${turn.dir}`}
          />
          {turn?.leaf && <Turn key={turn.leaf.id} dir={turn.dir} leaf={turn.leaf} />}
        </main>

      <footer className="bk-bar">
        <button type="button" className="bk-side-btn" onClick={() => go(at - 1)} disabled={!prev}>
          <ArrowRight size={20} aria-hidden="true" /> السابق
        </button>
        <button
          type="button"
          className="bk-listen"
          aria-pressed={speaking}
          onClick={() => (speaking ? narrator.stop() : narrator.speak(spokenText(view, pick)))}
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
      </div>
      {zoom && <Lightbox photo={zoom} onClose={() => setZoom(null)} />}
    </Frame>
  );
}

function Frame({ id, title, children }) {
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
      <div className="bk-headrow">
        <header className="bk-hero">
          <small>كنوز مصر</small>
          <h1 id="bk-lesson-title">{title || LESSONS.find(([lid]) => lid === id)?.[2]}</h1>
        </header>
        <nav className="bk-lessons" aria-label="دروس الوحدة الثالثة: كنوز مصر">
          {LESSONS.map(([lid, n, name]) => (
            <Link
              key={lid}
              to={`${place.page}/${lid}/book`}
              aria-current={lid === id ? "page" : undefined}
              title={name}
              onClick={() => play("select")}
            >
              {n}
            </Link>
          ))}
        </nav>
      </div>
      {children}
      <span className="bk-ground" aria-hidden="true" />
    </div>
  );
}


// ------------------------------------------------------ book pages
// The server sends lesson 1's layout in `spread`; the other lessons' parts
// get one here from what they hold, so every lesson reads as the same book
// (no data changes: the same text, cards and lists, only arranged).
function asSpread(s, lessonId) {
  // «دور الدولة والمواطنين»: the state's list beside «أنا مواطن مسؤول».
  if (s.id === "roles" && citizenScenes(s).scenes.length) return { ...s, spread: "citizens" };
  if (s.spread === "sources") return { ...s, spread: "showcase" };
  if (s.spread) return s;
  if (s.id === "goals") return { ...s, spread: "goals", cards: [] };
  if (s.cards?.length)
    return { ...s, spread: "showcase", intro: s.lead, pickTitle: lessonId === "lesson-3" ? "اختر مشروعًا" : "اختر موردًا" };
  return { ...s, spread: "info" };
}

// Documented photos listed in public/lesson-media/resource-media.json (the
// same file the map reads), used when a resource has no site photo yet.
let mediaJson = null;
function useResourceMedia() {
  const [media, setMedia] = useState(mediaJson || {});
  useEffect(() => {
    if (mediaJson) return;
    let live = true;
    fetch("/lesson-media/resource-media.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => {
        mediaJson = j.resources || {};
        if (live) setMedia(mediaJson);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return media;
}
// The card's photo: the teacher's site file first, then the documented one.
function photoOf(card, extra) {
  if (card.photo) return { src: card.photo, alt: card.resource.label, credit: "" };
  const m = extra?.[card.resource.id];
  if (m?.imageUrl) return { src: m.imageUrl, alt: card.resource.label, credit: m.imageCredit || "" };
  return null;
}

// What «استمع للشرح» reads: the text on the two pages, and for pages with
// a choice, only the chosen card.
function spokenText(s, pick = 0) {
  if (!s) return "";
  const card = s.cards?.[pick];
  let parts;
  if (s.spread === "goals") parts = [s.title, "في نهاية الدرس أستطيع أن", ...(s.columns?.[0]?.list || []), ...(s.boxes || []).flatMap((b) => [b.title, b.text])];
  else if (s.spread === "minerals") parts = [s.title, s.lead, card?.resource.label, card && `من مناطق استخراجه: ${card.regions[0]}`, card && `من استخداماته: ${card.use}`];
  else if (s.spread === "energy") parts = [s.title, s.lead, "كيف نستخدم الطاقة؟", ...s.uses.flatMap((u) => [u.title, u.text]), ...s.kinds.flatMap((k) => [k.title, k.chips.join("، ")])];
  else if (s.spread === "showcase")
    parts = [s.title, s.intro, card?.resource.label, card?.text, card?.place, ...extrasOf(s).flatMap((c) => [c.title, c.text, ...(c.list || [])])];
  else parts = [s.title, s.lead, ...extrasOf(s).flatMap((c) => [c.title, c.text, ...(c.list || [])])];
  return parts
    .filter(Boolean)
    .map((t) => (/[.؟!:]$/.test(t) ? t : `${t}.`))
    .join(" ");
}
// Lists and boxes a part holds besides its cards, as one kind of panel.
function extrasOf(s) {
  return [
    ...(s.columns || []),
    ...(s.boxes || []).map((b) => ({ title: b.title, text: b.text, tone: b.tone === "value" ? "green" : "blue" })),
    ...(s.note ? [{ title: "", text: s.note, tone: "green" }] : []),
  ];
}
// "البترول يُستخرج منه … . مصدر طاقة غير متجدد." → its first sentence.
const firstSentence = (t) => String(t || "").split(/(?<=\.)\s/)[0];

// Two pages: the text page with the big picture on the right, the page to
// choose from on the left. Every choice is a real button, so keyboard and
// screen readers work the same as a tap.
function Spread({ section: s, pick, choose, goTo, mapHref, heading, extra, onZoom, turn }) {
  const card = s.cards?.[pick] || s.cards?.[0];
  const head = (
    <div className={`bk-pg-head ${s.tone ? `tone-${s.tone}` : ""}`}>
      <h2 id="bk-title" ref={heading} tabIndex={-1}>
        {s.title}
      </h2>
      <span className="bk-robot" aria-hidden="true">
        <RobotGuide />
      </span>
    </div>
  );
  let right;
  let left;
  if (s.spread === "goals") {
    right = (
      <>
        {head}
        <h3 className="bk-pg-sub">في نهاية الدرس أستطيع أن:</h3>
        <ul className="bk-goals">
          {(s.columns?.[0]?.list || []).map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </>
    );
    left = s.cover ? (
      <Picture photo={{ src: s.cover, alt: `صورة تمهيدية لدرس ${s.title}`, credit: "" }} onZoom={onZoom} fill />
    ) : s.cards?.length ? (
      <>
        <h3 className="bk-pg-sub is-lined">في هذا الدرس نتعرّف على</h3>
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
    ) : (
      <>
        <p className="bk-pg-lead">{s.lead}</p>
        <Panels items={(s.boxes || []).map((b) => ({ title: b.title, text: b.text, tone: "blue" }))} />
      </>
    );
  } else if (s.spread === "minerals") {
    right = (
      <div className="bk-show" aria-live="polite">
        <p className="bk-kicker">{s.title}</p>
        <div className="bk-pg-head">
          <h2 key={card.resource.id} id="bk-title" ref={heading} tabIndex={-1} className="is-big bk-swap">
            {card.resource.label}
          </h2>
          <span className="bk-robot" aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
        <dl key={card.resource.id} className="bk-facts bk-swap">
          <div>
            <dt>من مناطق استخراجه:</dt>
            <dd>{card.regions[0]}</dd>
          </div>
          <div>
            <dt>من استخداماته:</dt>
            <dd>{card.use}</dd>
          </div>
        </dl>
        <Picture card={card} photo={photoOf(card, extra)} onZoom={onZoom} mapHref={card.mappable && mapHref(card.resource.id)} />
      </div>
    );
    left = (
      <>
        <p className="bk-pg-lead is-intro">{s.lead}</p>
        <Picker title={s.pickTitle} cards={s.cards} pick={pick} choose={choose} extra={extra} grid />
      </>
    );
  } else if (s.spread === "energy") {
    right = (
      <>
        {head}
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
        <h3 className="bk-pg-sub is-lined">تعرّف على نوعَي الطاقة</h3>
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
  } else if (s.spread === "showcase") {
    right = (
      <div className="bk-show" aria-live="polite">
        {head}
        <span key={`p-${card.resource.id}`} className="bk-pill bk-swap">
          {card.resource.label}
        </span>
        <p key={`t-${card.resource.id}`} className="bk-show-text bk-swap">{s.lead && !s.intro ? firstSentence(card.text) : card.text}</p>
        {card.place && (
          <p key={`l-${card.resource.id}`} className="bk-place bk-swap">
            <MapPin size={20} weight="fill" aria-hidden="true" />
            <span>{card.place}</span>
          </p>
        )}
        <Picture card={card} photo={photoOf(card, extra)} onZoom={onZoom} mapHref={card.mappable && mapHref(card.resource.id)} />
      </div>
    );
    left = (
      <>
        {s.intro && <p className="bk-pg-lead is-intro">{s.intro}</p>}
        <Picker title={s.pickTitle} cards={s.cards} pick={pick} choose={choose} extra={extra} />
        <Panels items={extrasOf(s)} />
      </>
    );
  } else if (s.spread === "citizens") {
    const lab = citizenScenes(s);
    const state = s.columns.find((c) => c.icon === "state");
    right = (
      <>
        {head}
        {s.lead && <p className="bk-pg-lead">{s.lead}</p>}
        {state && <Roles col={state} Icon={Bank} />}
        {lab.rest.length > 0 && <Roles col={{ title: lab.title, tone: "green", list: lab.rest }} Icon={UsersThree} />}
      </>
    );
    left = <CitizenLab key={s.id} scenes={lab.scenes} />;
  } else if (s.spread === "roles") {
    const [state, people] = s.columns;
    right = (
      <>
        <div className="bk-roles-top">
          {head}
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
  } else {
    // A part with lists only: the first list beside the title, the rest on
    // the facing page.
    const [firstCol, ...rest] = extrasOf(s);
    right = (
      <>
        {head}
        {s.lead && <p className="bk-pg-lead">{s.lead}</p>}
        {firstCol && <Panels items={[firstCol]} />}
      </>
    );
    left = <Panels items={rest} />;
  }
  return (
    <div className={`bk-book is-${s.spread} ${turn || ""}`}>
      <section className="bk-pg is-right" aria-labelledby="bk-title">
        {right}
      </section>
      <section className="bk-pg is-left" aria-label={s.pickTitle || "تابع الصفحة"}>
        {left}
      </section>
    </div>
  );
}

// ------------------------------------------------------ turning pages
const TURN_MS = 680;
// The full turn needs the two pages side by side and room to move; tablets
// and phones slide the new page in, and reduced motion only swaps it.
function bigTurn() {
  const mq = (q) => window.matchMedia?.(q).matches;
  return mq("(min-width: 981px)") && !mq("(prefers-reduced-motion: reduce)");
}
// Fields, videos and sliders keep their own arrow keys and swipes.
function ownsKeys(el) {
  return Boolean(el?.closest?.("input, textarea, select, video, audio, [contenteditable], [role=slider], [data-own-keys]"));
}
// A still copy of the two open pages, taken just before the new ones show:
// the page that turns (left going on, right going back) and the one it lands
// on, each with its place inside the stage.
let turnId = 0;
function snapshot(stageEl, dir) {
  const book = stageEl?.querySelector(".bk-book");
  if (!book) return null;
  const base = stageEl.getBoundingClientRect();
  const copy = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const node = el.cloneNode(true);
    node.removeAttribute("aria-labelledby");
    node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    node.querySelectorAll("video").forEach((v) => v.removeAttribute("src"));
    node.setAttribute("inert", "");
    return { node, rect: { top: r.top - base.top, left: r.left - base.left, width: r.width, height: r.height } };
  };
  const left = copy(book.querySelector(".bk-pg.is-left"));
  const right = copy(book.querySelector(".bk-pg.is-right"));
  if (!left || !right) return null;
  turnId += 1;
  return dir === "next" ? { id: turnId, lift: left, stay: right } : { id: turnId, lift: right, stay: left };
}
// The turning leaf: its front is the old page, its back plain paper, and it
// swings over the spine onto the facing page (right to left for an Arabic
// book going on). Only the copy moves: the real pages under it are already
// the new ones, ready to use, and their text is never mirrored.
function Turn({ dir, leaf }) {
  const front = useRef(null);
  const stay = useRef(null);
  useLayoutEffect(() => {
    front.current?.replaceChildren(leaf.lift.node);
    stay.current?.replaceChildren(leaf.stay.node);
  }, [leaf]);
  const box = (r) => ({ top: r.top, left: r.left, width: r.width, height: r.height });
  return (
    <div className={`bk-turn is-${dir}`} aria-hidden="true" style={{ "--bk-turn-ms": `${TURN_MS}ms` }}>
      <div ref={stay} className="bk-turn-stay" style={box(leaf.stay.rect)} />
      <div className="bk-turn-cast" style={box(leaf.lift.rect)} />
      <div className="bk-leaf" style={box(leaf.lift.rect)}>
        <div ref={front} className="bk-leaf-face is-front" />
        <div className="bk-leaf-face is-back" />
      </div>
    </div>
  );
}

function Picker({ title, cards, pick, choose, extra, grid }) {
  return (
    <>
      <h3 className="bk-pg-sub is-lined">{title}</h3>
      <ul className={grid ? "bk-pick is-grid" : "bk-pick is-list"}>
        {cards.map((c, i) => {
          const photo = photoOf(c, extra);
          const thumb = photo && <Thumb photo={photo} resource={c.resource} />;
          return (
            <li key={c.resource.id}>
              <button type="button" aria-pressed={i === pick} onClick={() => choose(i)}>
                <span className={`bk-pick-pic ${photo ? "has-photo" : ""}`} aria-hidden="true">
                  {thumb || <LessonSymbol resource={c.resource} />}
                </span>
                <span className="bk-pick-name">{c.resource.label}</span>
                {grid ? (
                  i === pick && <CheckCircle size={26} weight="fill" className="bk-pick-check" aria-hidden="true" />
                ) : i === pick ? (
                  <CheckCircle size={24} weight="fill" className="bk-pick-mark" aria-hidden="true" />
                ) : (
                  <CaretLeft size={20} weight="bold" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// A card's small photo, or its symbol if the photo cannot load.
function Thumb({ photo, resource }) {
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  if (broken) return <LessonSymbol resource={resource} />;
  return (
    <img
      ref={(el) => el?.complete && el.naturalWidth && !ready && setReady(true)}
      className={ready ? "" : "is-loading"}
      src={photo.src}
      alt=""
      loading="lazy"
      onLoad={() => setReady(true)}
      onError={() => setBroken(true)}
    />
  );
}

// The big picture. A real photo fills the frame without being cropped (a
// soft copy of it fills the empty sides) and opens larger on a tap; with no
// photo yet, the resource's symbol keeps its place.
function Picture({ card, photo: given, onZoom, mapHref, fill }) {
  // A photo that cannot load (offline, blocked host) gives way to the symbol.
  const [broken, setBroken] = useState("");
  // The photo shown so far: until the new one arrives a soft shimmer holds
  // its place, so the page does not jump.
  const [ready, setReady] = useState("");
  const photo = given && given.src !== broken ? given : null;
  const loading = photo && ready !== photo.src;
  const video = !photo && card?.video;
  return (
    <figure className={`bk-pic ${fill ? "is-fill" : ""} ${photo ? "has-photo" : ""}`}>
      {photo ? (
        <button
          key={photo.src}
          type="button"
          className={`bk-pic-zoom ${loading ? "is-loading" : ""}`}
          onClick={() => onZoom(photo)}
          aria-label={`تكبير صورة ${photo.alt}`}
          style={{ "--bk-photo": `url("${photo.src}")` }}
        >
          <img
            ref={(el) => el?.complete && el.naturalWidth && ready !== photo.src && setReady(photo.src)}
            src={photo.src}
            alt={photo.alt}
            onLoad={() => setReady(photo.src)}
            onError={() => setBroken(photo.src)}
          />
          <span className="bk-pic-hint" aria-hidden="true">
            <MagnifyingGlassPlus size={22} weight="bold" />
          </span>
        </button>
      ) : video ? (
        <video key={video} src={video} controls preload="metadata" aria-label={`فيديو ${card.resource.label}`} />
      ) : (
        <span key={card?.resource.id} className="bk-pic-symbol" aria-hidden="true">
          {card && <LessonSymbol resource={card.resource} />}
        </span>
      )}
      {photo?.credit && <figcaption>{photo.credit}</figcaption>}
      {mapHref && <OnMap href={mapHref} />}
    </figure>
  );
}

// The enlarged photo: Esc, the button or a tap outside closes it, and the
// focus goes back to the picture that opened it.
function Lightbox({ photo, onClose }) {
  const close = useRef(null);
  useEffect(() => {
    const back = document.activeElement;
    close.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        e.preventDefault();
        close.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      back?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="bk-lightbox" role="dialog" aria-modal="true" aria-label={`صورة ${photo.alt}`} onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.src} alt={photo.alt} />
        <figcaption>
          <strong>{photo.alt}</strong>
          {photo.credit && <small>{photo.credit}</small>}
        </figcaption>
        <button ref={close} type="button" className="bk-lightbox-close" onClick={onClose} aria-label="إغلاق الصورة">
          <X size={22} weight="bold" />
        </button>
      </figure>
    </div>
  );
}

function OnMap({ href }) {
  return (
    <Link className="bk-on-map" to={href}>
      <MapTrifold size={20} aria-hidden="true" /> شاهد على الخريطة
    </Link>
  );
}

// Lists, definitions and notes of a part, each in a soft panel.
function Panels({ items }) {
  if (!items?.length) return null;
  return (
    <div className="bk-panels">
      {items.map((c, i) => (
        <section key={`${c.title}-${i}`} className={`bk-panel tone-${c.tone || "blue"}`}>
          {c.title && (
            <h3>
              <Lightbulb size={22} weight="duotone" aria-hidden="true" /> {c.title}
            </h3>
          )}
          {c.text && <p>{c.text}</p>}
          {c.list?.length > 0 && (
            <ul>
              {c.list.map((x) => (
                <li key={x}>
                  <CheckCircle size={20} weight="fill" aria-hidden="true" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
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

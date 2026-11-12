import RobotGuide from "../components/Map/RobotGuide";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Info,
  MapTrifold,
  Star,
} from "phosphor-react";
import Shell from "./Shell";
import { play } from "./sfx";
import { api } from "./api";
import { useSession } from "./Session";
import "./journey-workspace.css";
import "./platform-polish.css";
import "./journey-tiles.css";
import "./journey-v3.css";

const steps = ["الصف والفصل الدراسي", "الوحدة والدروس"];
// «الصف الخامس الابتدائي» → «الصف الخامس», «الفصل الدراسي الأول» → «الفصل الأول».
const short = (t) => String(t).replace(/ الابتدائي$/, "").replace(/^الفصل الدراسي /, "الفصل ").split(":")[0];
const emptyProgress = { lessons: [], xp: 0, stars: 0 };

// The guide-with-map artwork; until the file is added the robot stands in.
function GuideArt() {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="journey-guide-fallback" aria-hidden="true">
      <RobotGuide />
    </div>
  ) : (
    <img
      className="journey-guide-art"
      src="/welcome/guide-map.webp"
      alt="روبوت المرشد يحمل بوصلة ويشير إلى خريطة رحلة على نهر النيل"
      onError={() => setFailed(true)}
    />
  );
}
export default function JourneyPage({ demo = false }) {
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [sample, setSample] = useState(demo);
  const [selection, setSelection] = useState({});
  const [progress, setProgress] = useState(emptyProgress);
  const [step, setStep] = useState(0);
  const heading = useRef(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api(demo ? "/demo/catalog" : "/catalog"),
      demo ? Promise.resolve(emptyProgress) : api("/progress"),
    ])
      .then(([catalog, p]) => {
        if (!active) return;
        const useSample = demo;
        setSample(useSample);
        setNodes(catalog.nodes);
        setProgress(p);
        const enrolled = user?.enrollment;
        const year =
          !useSample && catalog.nodes.find((n) => n.id === enrolled?.yearId);
        // Coming from the opening screen with a grade and term: jump to units.
        const g = useSample && catalog.nodes.find((n) => n.id === params.get("grade"));
        const t = g && catalog.nodes.find((n) => n.id === params.get("term") && n.parentId === g.id);
        const y = t && catalog.nodes.find((n) => n.kind === "year" && n.parentId === t.id);
        if (g && t && y) {
          const u = catalog.nodes.find((n) => n.id === params.get("unit") && n.kind === "unit");
          setSelection({ yearTitle: y.title, stageId: g.parentId, gradeId: g.id, termId: t.id, ...(u ? { unitId: u.id } : {}) });
          setStep(1);
        } else {
          setSelection(year ? { ...enrolled, yearTitle: year.title } : {});
          setStep(0);
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [demo, reload, user?.id]);
  const years = [
    ...new Set(nodes.filter((n) => n.kind === "year").map((n) => n.title)),
  ];
  const stages = nodes.filter((n) => n.kind === "stage");
  const grades = nodes.filter(
    (n) => n.kind === "grade" && n.parentId === selection.stageId,
  );
  const terms = nodes.filter(
    (n) =>
      n.kind === "term" &&
      n.parentId === selection.gradeId &&
      nodes.some(
        (y) =>
          y.kind === "year" &&
          y.parentId === n.id &&
          y.title === selection.yearTitle,
      ),
  );
  const year = nodes.find(
    (n) =>
      n.kind === "year" &&
      n.parentId === selection.termId &&
      n.title === selection.yearTitle,
  );
  const subjects = nodes.filter(
    (n) => n.kind === "subject" && n.parentId === year?.id,
  );
  const subject = subjects[0];
  const units = nodes.filter(
    (n) => n.kind === "unit" && n.parentId === subject?.id,
  );
  const lessons = nodes.filter(
    (n) => n.kind === "lesson" && n.parentId === selection.unitId,
  );
  const order = [
    "yearTitle",
    "stageId",
    "gradeId",
    "termId",
    "subjectId",
    "unitId",
  ];
  // A choice with a single option is made for the child (e.g. one school year).
  useEffect(() => {
    if (loading) return;
    if (!selection.yearTitle && years.length === 1) choose("yearTitle", years[0]);
    else if (selection.yearTitle && !selection.stageId && stages.length === 1)
      choose("stageId", stages[0].id);
  }, [loading, years.length, stages.length, selection.yearTitle, selection.stageId]);
  function choose(key, value) {
    setSelection((old) => {
      const next = { ...old, [key]: value };
      for (const child of order.slice(order.indexOf(key) + 1))
        delete next[child];
      return next;
    });
    setError("");
  }
  // Grades, terms and units with at least one lesson that can be opened; the
  // others stay in place, dimmed, and cannot be chosen.
  const withContent = new Set();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes)
    if (n.kind === "lesson" && n.available !== false)
      for (let p = byId.get(n.parentId); p; p = byId.get(p.parentId)) withContent.add(p.id);
  const ready = step === 0 ? selection.gradeId && selection.termId && year && subject : selection.unitId;
  const name = (id) => nodes.find((n) => n.id === id)?.title;
  async function openLesson(lesson) {
    if (saving || lesson.available === false) return;
    if (lesson.demo) {
      navigate(`/demo/${lesson.demoLessonId || lesson.id}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const enrollment = {
        stageId: selection.stageId,
        gradeId: selection.gradeId,
        termId: selection.termId,
        yearId: year.id,
      };
      const result = await api("/enrollment", {
        method: "PUT",
        body: enrollment,
      });
      setUser(result.user || { ...user, enrollment });
      navigate(`/classroom/${lesson.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  function tiles(key, label, options, { disabled = false, prerequisite, wide = false } = {}) {
    const items = options.map((o) => (typeof o === "string" ? { id: o, title: o } : o));
    return (
      <fieldset className={`journey-tiles ${wide ? "is-wide" : ""}`} disabled={disabled || loading || saving}>
        <legend>{label}</legend>
        {disabled && prerequisite ? (
          <p className="journey-tiles-hint">{prerequisite}</p>
        ) : !items.length ? (
          <p className="journey-tiles-hint">لا تتوفر خيارات لهذا المسار حاليًا.</p>
        ) : (
          <div role="radiogroup" aria-label={label}>
            {items.map((o, i) => {
              const parts = o.title.split(":");
              const soon = ["gradeId", "termId", "unitId"].includes(key) && !withContent.has(o.id);
              return (
                <button
                  type="button"
                  key={o.id}
                  role="radio"
                  aria-checked={selection[key] === o.id}
                  aria-disabled={soon || undefined}
                  disabled={soon}
                  className={`journey-tile tile-tone-${i % 4} ${soon ? "is-soon" : ""}`}
                  onClick={() => {
                    play("select");
                    choose(key, o.id);
                  }}
                >
                  <b>{parts[0].replace(/ الابتدائي$/, "").replace(/^الفصل الدراسي /, "الفصل ")}</b>
                  {parts[1] && <small>{parts[1].trim()}</small>}
                  {selection[key] === o.id && (
                    <CheckCircle className="journey-tile-check" weight="fill" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <Shell journeyPage>
      <div className="journey-heading">
        <div>
          <h1>{step === 0 ? "اختر صفك وفصلك الدراسي" : "اختر وحدتك ودرسك"}</h1>
          <p>
            {step === 0
              ? "حدّد صفك وفصلك، ثم انتقل لاختيار الدرس."
              : [name(selection.gradeId), name(selection.termId)].filter(Boolean).map(short).join(" • ")}
          </p>
        </div>
        {!sample && (
          <span className="journey-mode">
            <Star weight="fill" /> {progress.xp || 0} نقطة
          </span>
        )}
      </div>
      <nav className="journey-stepper" aria-label="خطوات اختيار الدرس">
        {steps.map((title, i) => (
          <button
            key={title}
            disabled={i > step || saving}
            aria-current={step === i ? "step" : undefined}
            onClick={() => {
              setStep(i);
              setError("");
            }}
          >
            <span>
              {i < step ? <CheckCircle size={22} weight="fill" /> : i + 1}
            </span>
            {title}
          </button>
        ))}
      </nav>
      <div className="journey-workspace">
        <section
          className="journey-picker"
          aria-labelledby="journey-step-title"
          aria-busy={loading || saving}
        >
          {/* The page title already says it; this one is for screen readers. */}
          <h2 id="journey-step-title" ref={heading} tabIndex={-1} className="sr-only">
            {step === 0 ? "اختر صفك وفصلك الدراسي" : "اختر وحدتك ودرسك"}
          </h2>
          {loading ? (
            <p role="status">جارٍ تحميل الخيارات…</p>
          ) : (
            <>
              <div className="journey-fields">
                {step === 0 && (
                  <>
                    {/* Year and stage are only asked when there is a real choice. */}
                    {years.length > 1 && tiles("yearTitle", "العام الدراسي", years)}
                    {stages.length > 1 &&
                      tiles("stageId", "المرحلة التعليمية", stages, {
                        disabled: !selection.yearTitle,
                        prerequisite: "اختر العام الدراسي أولًا.",
                      })}
                    {tiles("gradeId", "الصف الدراسي", grades, {
                      disabled: !selection.stageId,
                      prerequisite: "اختر المرحلة التعليمية أولًا.",
                    })}
                    {tiles("termId", "الفصل الدراسي", terms, {
                      disabled: !selection.gradeId,
                      prerequisite: "اختر صفّك أولًا، ثم الفصل الدراسي.",
                    })}
                  </>
                )}
                {step === 1 && tiles("unitId", "الوحدة", units, { wide: true })}
              </div>
              {step === 1 && (
                <section
                  className="journey-lesson-list"
                  aria-label="الدروس المتاحة"
                  aria-live="polite"
                >
                  {!selection.unitId ? (
                    <p className="journey-inline-help">
                      اختر الوحدة لتظهر دروسها هنا.
                    </p>
                  ) : !lessons.length ? (
                    <div className="journey-inline-help">
                      <BookOpen size={28} />
                      <p>لا توجد دروس منشورة في هذه الوحدة حتى الآن.</p>
                      {!demo && (
                        <Link to="/explore">افتح الرحلة التجريبية</Link>
                      )}
                    </div>
                  ) : (
                    lessons.map((lesson, li) => {
                      const p = progress.lessons.find(
                        (x) => x.lessonId === lesson.id,
                      );
                      // The full book title, as everywhere else in the app.
                      const head = lesson.title;
                      const tail = "";
                      const unavailable = saving || lesson.available === false;
                      return (
                        <article className="journey-lesson" key={lesson.id} style={{ "--i": li }}>
                          <span className="journey-lesson-icon">
                            <BookOpen size={30} weight="duotone" />
                          </span>
                          <div>
                            <h3>{head}</h3>
                            <small>
                              {lesson.available === false
                                ? "قيد التجهيز · المحتوى لم يُضف بعد"
                                : tail ||
                                  (p?.completed ? "درس مكتمل · يمكنك مراجعته" : !lesson.demo ? "درس منشور" : "")}
                            </small>
                          </div>
                          <div className="journey-lesson-ways">
                            {lesson.demoLessonId && (
                              <button
                                type="button"
                                className="journey-study"
                                disabled={unavailable}
                                onClick={() => {
                                  play("open");
                                  navigate(`/demo/${lesson.demoLessonId}/book`);
                                }}
                              >
                                <BookOpen size={22} aria-hidden="true" /> ذاكر الدرس
                              </button>
                            )}
                            <button
                              type="button"
                              className="journey-explore"
                              disabled={unavailable}
                              onClick={() => {
                                play("project");
                                openLesson(lesson);
                              }}
                            >
                              <MapTrifold size={22} aria-hidden="true" />
                              {lesson.available === false ? "قيد التجهيز" : saving ? "جارٍ الفتح…" : "استكشف الخريطة"}
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </section>
              )}
              {step === 0 && selection.termId && !subjects.length && (
                <p className="journey-inline-help">
                  لا توجد مواد منشورة لهذا الفصل. جرّب اختيار فصل آخر.
                </p>
              )}
              {step === 1 && !units.length && (
                <p className="journey-inline-help">
                  لا توجد وحدات منشورة لهذه المادة.{" "}
                  {!demo && <Link to="/explore">يمكنك تجربة درس كنوز مصر</Link>}
                </p>
              )}
            </>
          )}
          {error && (
            <div className="p-error" role="alert">
              {error}
              {!nodes.length && (
                <button onClick={() => setReload((r) => r + 1)}>
                  إعادة المحاولة
                </button>
              )}
            </div>
          )}
          {step === 1 && selection.unitId && lessons.length > 0 && (
            <p className="journey-switch-note">
              <Info size={20} aria-hidden="true" /> يمكنك الانتقال بين شرح الدرس وخريطته في أي وقت.
            </p>
          )}
          <div className="journey-actions">
            {step > 0 && (
              <button
                className="p-secondary"
                disabled={saving}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                <ArrowRight size={19} />
                السابق
              </button>
            )}
            {step < 1 && (
              <button
                className="p-button"
                disabled={!ready || loading}
                onClick={() => {
                  play("open");
                  setStep(step + 1);
                }}
              >
                التالي
                <ArrowLeft size={19} />
              </button>
            )}
          </div>
        </section>
        <aside className="journey-companion" aria-label="دليل الرحلة">
          <p className="journey-bubble" aria-live="polite">
            {step === 1
              ? "اختر درسك، ثم ذاكر الدرس أو استكشف خريطته."
              : !selection.gradeId
                ? "أهلًا يا مستكشف! اختر صفك الدراسي"
                : !selection.termId
                  ? "جميل! دلوقتي اختَر الفصل الدراسي"
                  : "رائع! اضغط التالي لاختيار الوحدة والدرس"}
          </p>
          <GuideArt />
          {selection.gradeId && (
            <div className="journey-choices">
              <strong>اختياراتك</strong>
              <p>
                {[name(selection.gradeId), name(selection.termId), step === 1 && name(selection.unitId)]
                  .filter(Boolean)
                  .map(short)
                  .join(" • ")}
              </p>
            </div>
          )}
          {!sample && (
            <div className="journey-account-shortcuts">
              {progress.lastLessonId && (
                <Link to={`/classroom/${progress.lastLessonId}`}>
                  تابع آخر درس <ArrowLeft size={16} />
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

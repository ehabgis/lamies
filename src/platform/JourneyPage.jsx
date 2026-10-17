import RobotGuide from "../components/Map/RobotGuide";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Compass,
  Star,
} from "phosphor-react";
import Shell from "./Shell";
import { play } from "./sfx";
import { api } from "./api";
import { useSession } from "./Session";
import "./journey-workspace.css";
import "./platform-polish.css";
import "./journey-tiles.css";

const steps = ["العام والصف", "الفصل الدراسي", "الوحدة والدروس"];
const emptyProgress = { lessons: [], xp: 0, stars: 0 };
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
      api("/demo/catalog"),
    ])
      .then(([catalog, p, example]) => {
        if (!active) return;
        const useSample =
          demo || !catalog.nodes.some((n) => n.kind === "lesson");
        setSample(useSample);
        catalog = useSample ? example : catalog;
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
          setSelection({ yearTitle: y.title, stageId: g.parentId, gradeId: g.id, termId: t.id });
          setStep(2);
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
  const ready =
    step === 0
      ? selection.yearTitle && selection.stageId && selection.gradeId
      : step === 1
        ? year && subject
        : selection.unitId;
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
              return (
                <button
                  type="button"
                  key={o.id}
                  role="radio"
                  aria-checked={selection[key] === o.id}
                  className={`journey-tile tile-tone-${i % 4}`}
                  onClick={() => {
                    play("select");
                    choose(key, o.id);
                  }}
                >
                  <b>{parts[0].replace(/ الابتدائي$/, "")}</b>
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
          <h1>اختر رحلتك الدراسية</h1>
          <p>
            {demo
              ? "جرّب الاستكشاف دون حساب. يمكنك الرجوع لتغيير اختياراتك."
              : `أهلًا ${user?.name || user?.username}، إلى أين نذهب اليوم؟`}
          </p>
        </div>
        <span className="journey-mode">
          {sample ? (
            "تجربة غير معتمدة"
          ) : (
            <>
              <Star weight="fill" /> {progress.xp || 0} نقطة
            </>
          )}
        </span>
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
          <h2 id="journey-step-title" ref={heading} tabIndex={-1}>
            {step === 0
              ? "لنبدأ بالسنة والصف"
              : step === 1
                ? "اختر الفصل الدراسي"
                : "اختر الوحدة، وابدأ الدرس"}
          </h2>
          {loading ? (
            <p role="status">جارٍ تحميل الخيارات…</p>
          ) : (
            <>
              <div className="journey-fields">
                {step === 0 && (
                  <>
                    {tiles("yearTitle", "العام الدراسي", years)}
                    {tiles("stageId", "المرحلة التعليمية", stages, {
                      disabled: !selection.yearTitle,
                      prerequisite: "اختر العام الدراسي أولًا.",
                    })}
                    {tiles("gradeId", "الصف الدراسي", grades, {
                      disabled: !selection.stageId,
                      prerequisite: "اختر المرحلة التعليمية أولًا.",
                    })}
                  </>
                )}
                {step === 1 && (
                  <>
                    {tiles("termId", "الفصل الدراسي", terms)}
                    <p className="journey-fixed-subject">
                      <BookOpen size={20} />
                      المادة: الدراسات الاجتماعية
                    </p>
                  </>
                )}
                {step === 2 && tiles("unitId", "الوحدة", units, { wide: true })}
              </div>
              {step === 2 && (
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
                    lessons.map((lesson) => {
                      const p = progress.lessons.find(
                        (x) => x.lessonId === lesson.id,
                      );
                      return (
                        <article className="journey-lesson" key={lesson.id}>
                          <span className="journey-lesson-icon">
                            <BookOpen size={30} weight="duotone" />
                          </span>
                          <div>
                            <small>
                              {lesson.available === false
                                ? "قيد التجهيز · المحتوى لم يُضف بعد"
                                : lesson.demo
                                  ? "تجربة · لا تُحفظ نتائج رسمية"
                                  : p?.completed
                                    ? "درس مكتمل · يمكنك مراجعته"
                                    : "درس منشور"}
                            </small>
                            <h3>{lesson.title}</h3>
                          </div>
                          <button
                            className="p-button"
                            disabled={saving || lesson.available === false}
                            onClick={() => {
                              play("project");
                              openLesson(lesson);
                            }}
                          >
                            {lesson.available === false
                              ? "قيد التجهيز"
                              : saving
                                ? "جارٍ فتح الدرس…"
                                : p?.completed
                                  ? "راجع الدرس"
                                  : "ابدأ الدرس"}
                            <ArrowLeft size={19} />
                          </button>
                        </article>
                      );
                    })
                  )}
                </section>
              )}
              {step === 1 && selection.termId && !subjects.length && (
                <p className="journey-inline-help">
                  لا توجد مواد منشورة لهذا الفصل. جرّب اختيار فصل آخر.
                </p>
              )}
              {step === 2 && !units.length && (
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
            {step < 2 && (
              <button
                className="p-button"
                disabled={!ready || loading}
                onClick={() => {
                  play("open");
                  setStep(step + 1);
                }}
              >
                التالي: {steps[step + 1]}
                <ArrowLeft size={19} />
              </button>
            )}
          </div>
        </section>
        <aside className="journey-companion" aria-label="دليل الرحلة">
          <div className="journey-companion-message">
            <RobotGuide />
            <p>
              {step === 0
                ? "أهلًا يا مستكشف! اختر عامك الدراسي، ثم مرحلتك وصفّك."
                : step === 1
                  ? "خطوة جميلة! اختر الفصل الدراسي لنجد وحداتك."
                  : "وصلنا! اختر الوحدة، ثم اضغط «ابدأ الدرس»."}
            </p>
          </div>
          <img
            src="/welcome/hero.webp"
            alt="المستكشف يشير إلى مصر على الكرة الأرضية"
          />
          <div className="journey-selection-summary">
            <Compass size={24} />
            <div>
              <strong>وجهتك المختارة</strong>
              <p>
                {[
                  selection.yearTitle,
                  name(selection.gradeId),
                  name(selection.termId),
                  subject?.title,
                  name(selection.unitId),
                ]
                  .filter(Boolean)
                  .join(" · ") || "اختياراتك ستظهر هنا خطوة بخطوة."}
              </p>
            </div>
          </div>
          {sample ? (
            <small>
              الصفوف والوحدات هيكل تجريبي للتنقل. المحتوى المتاح للصف الخامس
              فقط، ويُعرض للفصلين كتجربة دون اعتماد منهجي.
            </small>
          ) : (
            <div className="journey-account-shortcuts">
              {progress.lastLessonId && (
                <Link to={`/classroom/${progress.lastLessonId}`}>
                  تابع آخر درس <ArrowLeft size={16} />
                </Link>
              )}
              <Link to="/explore">
                أو جرّب درسًا دون نتائج رسمية <ArrowLeft size={16} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

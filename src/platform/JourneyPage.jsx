import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Compass,
  Robot,
  Star,
} from "phosphor-react";
import Shell from "./Shell";
import { api } from "./api";
import { useSession } from "./Session";
import "./journey-workspace.css";

const steps = ["العام والصف", "الفصل والمادة", "الوحدة والدروس"];
const emptyProgress = { lessons: [], xp: 0, stars: 0 };
export default function JourneyPage({ demo = false }) {
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
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
        setNodes(catalog.nodes);
        setProgress(p);
        const enrolled = user?.enrollment;
        const year =
          !demo && catalog.nodes.find((n) => n.id === enrolled?.yearId);
        setSelection(year ? { ...enrolled, yearTitle: year.title } : {});
        setStep(0);
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
  const units = nodes.filter(
    (n) => n.kind === "unit" && n.parentId === selection.subjectId,
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
        ? year && selection.subjectId
        : selection.unitId;
  const name = (id) => nodes.find((n) => n.id === id)?.title;
  async function openLesson(lesson) {
    if (saving) return;
    if (demo) {
      navigate(`/demo/${lesson.id}`);
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
  function selectField(key, label, options, disabled = false) {
    return (
      <label className="journey-field">
        {label}
        <select
          value={selection[key] || ""}
          disabled={disabled || loading || saving}
          onChange={(e) => choose(key, e.target.value)}
        >
          <option value="">اختر {label}</option>
          {options.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
        {!loading && !disabled && !options.length && (
          <small>لا تتوفر خيارات لهذا المسار حاليًا.</small>
        )}
      </label>
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
          {demo ? (
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
                ? "ما المادة التي تريد استكشافها؟"
                : "اختر الوحدة، وابدأ الدرس"}
          </h2>
          {loading ? (
            <p role="status">جارٍ تحميل الخيارات…</p>
          ) : (
            <>
              <div className="journey-fields">
                {step === 0 && (
                  <>
                    <label className="journey-field">
                      العام الدراسي
                      <select
                        value={selection.yearTitle || ""}
                        onChange={(e) => choose("yearTitle", e.target.value)}
                      >
                        <option value="">اختر العام الدراسي</option>
                        {years.map((y) => (
                          <option key={y}>{y}</option>
                        ))}
                      </select>
                    </label>
                    {selectField(
                      "stageId",
                      "المرحلة التعليمية",
                      stages,
                      !selection.yearTitle,
                    )}
                    {selectField(
                      "gradeId",
                      "الصف الدراسي",
                      grades,
                      !selection.stageId,
                    )}
                  </>
                )}
                {step === 1 && (
                  <>
                    {selectField("termId", "الفصل الدراسي", terms)}
                    {selectField(
                      "subjectId",
                      "المادة الدراسية",
                      subjects,
                      !year,
                    )}
                  </>
                )}
                {step === 2 && selectField("unitId", "الوحدة", units)}
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
                              {demo
                                ? "تجربة · لا تُحفظ نتائج رسمية"
                                : p?.completed
                                  ? "درس مكتمل · يمكنك مراجعته"
                                  : "درس منشور"}
                            </small>
                            <h3>{lesson.title}</h3>
                            <p>خريطة تفاعلية، استكشاف، وأنشطة.</p>
                          </div>
                          <button
                            className="p-button"
                            disabled={saving}
                            onClick={() => openLesson(lesson)}
                          >
                            {saving
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
                onClick={() => setStep(step + 1)}
              >
                التالي: {steps[step + 1]}
                <ArrowLeft size={19} />
              </button>
            )}
          </div>
        </section>
        <aside className="journey-companion" aria-label="دليل الرحلة">
          <div className="journey-companion-message">
            <Robot size={38} weight="duotone" />
            <p>
              {step === 0
                ? "أهلًا يا مستكشف! اختر عامك الدراسي، ثم مرحلتك وصفّك."
                : step === 1
                  ? "خطوة جميلة! اختر الفصل والمادة لنجد وحداتك."
                  : "وصلنا! اختر الوحدة، ثم اضغط «ابدأ الدرس»."}
            </p>
          </div>
          <img
            src="/welcome/explorer-globe.webp"
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
                  name(selection.subjectId),
                  name(selection.unitId),
                ]
                  .filter(Boolean)
                  .join(" · ") || "اختياراتك ستظهر هنا خطوة بخطوة."}
              </p>
            </div>
          </div>
          {demo ? (
            <small>
              الخيارات تخص النسخة التجريبية، ولا تمثل منهجًا معتمدًا.
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

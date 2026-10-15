import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Robot, Star, MapTrifold, ArrowLeft } from "phosphor-react";
import Shell from "./Shell";
import { api } from "./api";
import { useSession } from "./Session";
export default function JourneyPage() {
  const { user, setUser } = useSession();
  const [nodes, setNodes] = useState([]),
    [progress, setProgress] = useState({ lessons: [], xp: 0 }),
    [selection, setSelection] = useState(user.enrollment || {}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    Promise.all([api("/catalog"), api("/progress")])
      .then(([c, p]) => {
        setNodes(c.nodes);
        setProgress(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  const kinds = ["stage", "grade", "term", "year"];
  const names = {
    stage: "المرحلة التعليمية",
    grade: "الصف الدراسي",
    term: "الفصل الدراسي",
    year: "العام الدراسي",
  };
  function choose(kind, value) {
    const next = { ...selection, [`${kind}Id`]: value };
    for (const k of kinds.slice(kinds.indexOf(kind) + 1)) delete next[`${k}Id`];
    setSelection(next);
    setSaved(false);
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const result = await api("/enrollment", {
        method: "PUT",
        body: selection,
      });
      setUser(result.user || { ...user, enrollment: selection });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    }
  }
  const descendant = (n) => {
    let p = n,
      seen = new Set();
    while (p && !seen.has(p.id)) {
      if (p.id === selection.yearId) return true;
      seen.add(p.id);
      p = nodes.find((x) => x.id === p.parentId);
    }
    return false;
  };
  const lessons = nodes.filter((n) => n.kind === "lesson" && descendant(n));
  const done = progress.lessons.filter((x) => x.completed).length;
  return (
    <Shell>
      <section className="journey-hero">
        <div>
          <h1>جاهز لاكتشاف جديد، {user.name || user.username}؟</h1>
          <p>اختر صفّك وفصلك، ثم افتح الدرس الذي تريد استكشافه.</p>
        </div>
        <div className="journey-guide">
          <Robot size={48} weight="duotone" />
          <p>مرحبًا يا بطل! اختر الدرس واضغط على «ابدأ الدرس».</p>
        </div>
      </section>
      <section className="journey-summary" aria-label="ملخص التقدم">
        <span>
          <Star weight="fill" />
          {progress.xp || 0} نقطة
        </span>
        <span>
          <BookOpen />
          {done} درس مكتمل
        </span>
        <span>
          <Star weight="fill" />
          {progress.stars || 0} نجمة
        </span>
        <Link to="/my-progress">
          عرض إنجازاتي <ArrowLeft />
        </Link>
      </section>
      {progress.lastLessonId && (
        <p className="p-resume">
          <Link
            className="p-secondary"
            to={`/classroom/${progress.lastLessonId}`}
          >
            تابع آخر درس وصلت إليه <ArrowLeft />
          </Link>
        </p>
      )}
      <section className="enrollment-panel">
        <h2>رحلتك الدراسية</h2>
        <form onSubmit={save} className="enrollment-form">
          {kinds.map((kind, i) => {
            const parent = i ? selection[`${kinds[i - 1]}Id`] : null;
            const options = nodes.filter(
              (n) => n.kind === kind && (!i || n.parentId === parent),
            );
            return (
              <label key={kind}>
                {names[kind]}
                <select
                  value={selection[`${kind}Id`] || ""}
                  required
                  disabled={!!i && !parent}
                  onChange={(e) => choose(kind, e.target.value)}
                >
                  <option value="">اختر {names[kind]}</option>
                  {options.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <button className="p-button">حفظ الاختيار</button>
        </form>
        {saved && <p role="status">تم حفظ اختيارك في حسابك.</p>}
      </section>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
      {busy ? (
        <p role="status">جارٍ تحميل الدروس…</p>
      ) : (
        <section className="journey-lessons">
          <h2>دروسك المتاحة</h2>
          {!lessons.length ? (
            <div className="p-empty">
              <MapTrifold size={48} />
              <h3>نجهّز لك اكتشافات جديدة</h3>
              <p>
                {selection.yearId
                  ? "لا توجد دروس منشورة لهذا الاختيار حتى الآن."
                  : "اختر المرحلة والصف والفصل والعام لعرض الدروس."}
              </p>
              <p>المحتوى لا يظهر للطلاب إلا بعد نشره من الإدارة.</p>
            </div>
          ) : (
            <div className="lesson-library">
              {lessons.map((lesson, i) => {
                const p = progress.lessons.find(
                  (x) => x.lessonId === lesson.id,
                );
                return (
                  <article key={lesson.id}>
                    <span className="lesson-library-number">{i + 1}</span>
                    <div>
                      <small>
                        {nodes.find((x) => x.id === lesson.parentId)?.title}
                      </small>
                      <h3>{lesson.title}</h3>
                      <p>
                        {p?.completed
                          ? "أحسنت، أكملت هذا الدرس. يمكنك مراجعته."
                          : p
                            ? `تقدمك: ${p.percent || 0}% من أسئلة الدرس`
                            : "استكشف الخريطة، تعلّم، وجرّب الأنشطة."}
                      </p>
                      <Link className="p-button" to={`/classroom/${lesson.id}`}>
                        {p?.completed ? "راجع الدرس" : "ابدأ الدرس"}{" "}
                        <ArrowLeft />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}

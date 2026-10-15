import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Trophy, ArrowLeft } from "phosphor-react";
import Shell from "./Shell";
import { api } from "./api";
export default function ProgressPage() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/progress")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Shell>
      <section className="p-progress">
        <Trophy size={60} weight="duotone" />
        <h1>كل محاولة… خطوة للأمام</h1>
        <p>هنا نتائج رحلتك المحفوظة في حسابك.</p>
        {error && (
          <p role="alert" className="p-error">
            {error}
          </p>
        )}
        {data ? (
          <>
            <div className="progress-score">
              <Star weight="fill" />
              {data.xp || 0} نقطة
            </div>
            <p>
              {data.stars || 0} نجمة ·{" "}
              {data.lessons.filter((l) => l.completed).length} شارة إكمال درس
            </p>
            {!data.lessons.length && <p>ابدأ درسك الأول لتظهر إنجازاتك هنا.</p>}
            <div className="p-progress-list">
              {data.lessons.map((l) => (
                <article key={l.lessonId}>
                  <h2>{l.title || l.lessonId}</h2>
                  <p>
                    {l.completed ? "تم إكمال الدرس ✓" : "رحلة التعلم مستمرة"}
                  </p>
                  <p>
                    {l.correctCount ?? l.solved ?? 0} إجابة متقنة ·{" "}
                    {l.percent || 0}%
                  </p>
                  <Link to={`/classroom/${l.lessonId}`}>
                    تابع التعلم <ArrowLeft />
                  </Link>
                </article>
              ))}
            </div>
            <Link className="p-button" to="/journey">
              عد إلى رحلتك
            </Link>
          </>
        ) : (
          !error && <p role="status">جارٍ تحميل التقدم…</p>
        )}
      </section>
    </Shell>
  );
}

import { useState } from "react";
import { ArrowUp, ArrowDown, Star, Lightbulb } from "phosphor-react";
import { api } from "./api";
const label = (o) => (typeof o === "object" ? o.label || o.name || o.id : o);
const value = (o) => (typeof o === "object" ? o.id : o);
export default function Question({
  question: q,
  lessonId,
  solved,
  onSolved,
  onHelp,
  preview = false,
  demo = false,
  presentation,
}) {
  const [showHint, setShowHint] = useState(false);
  const [answer, setAnswer] = useState(
      q.type === "order"
        ? [...(q.options || [])].reverse()
        : ["match", "drag", "image-match"].includes(q.type)
          ? {}
          : "",
    ),
    [feedback, setFeedback] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (preview) {
        setFeedback({
          correct: JSON.stringify(answer) === JSON.stringify(q.answer),
          hint: q.hint,
          explanation: q.explanation,
        });
        return;
      }
      const result = await api(
        `${demo ? "/demo" : ""}/lessons/${lessonId}/answers`,
        {
          method: "POST",
          body: { questionId: q.id, answer },
        },
      );
      setFeedback(result);
      if (result.correct) onSolved(q.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const done = solved || feedback?.correct;
  const [placement, setPlacement] = useState(null);
  function move(i, delta) {
    const next = [...answer];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setAnswer(next);
    setFeedback(null);
  }
  const selections = ["choice", "boolean", "map"].includes(q.type);
  const options =
    q.type === "boolean"
      ? [
          { id: true, label: "صحيح" },
          { id: false, label: "خطأ" },
        ]
      : q.options || [];
  return (
    <form className="p-question" onSubmit={submit}>
      <h3>{q.prompt}</h3>
      {showHint && (
        <p className="p-feedback" role="status">
          تلميح مكتوب: {q.hint || "راجع بطاقة المورد ثم حاول مرة أخرى."}
        </p>
      )}
      {solved && !feedback && (
        <p className="p-success">
          <Star weight="fill" />
          سبق أن أتقنت هذا السؤال. أحسنت!
        </p>
      )}
      {q.type === "map" && (
        <>
          {presentation === "place" && (
            <p>
              <span
                className="drag-map-token"
                draggable={!done}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", "resource-token")
                }
              >
                اسحب رمز المورد إلى الخريطة
              </span>{" "}
              أو اختر الموقع من الأزرار.
            </p>
          )}
          <div
            className="question-site-map"
            onDragOver={(e) => {
              if (presentation === "place") e.preventDefault();
            }}
            onDrop={(e) => {
              if (presentation !== "place" || done) return;
              e.preventDefault();
              if (e.dataTransfer.getData("text/plain") !== "resource-token")
                return;
              const rect = e.currentTarget.getBoundingClientRect();
              const point = {
                x: ((e.clientX - rect.left) / rect.width) * 100,
                y: ((e.clientY - rect.top) / rect.height) * 100,
              };
              const near = options
                .filter((o) => Number.isFinite(o.lat) && Number.isFinite(o.lng))
                .map((o) => ({
                  id: o.id,
                  distance: Math.hypot(
                    (75 + ((o.lng - 24) / 12) * 350) / 5 - point.x,
                    (365 - ((o.lat - 21) / 11) * 330) / 4 - point.y,
                  ),
                }))
                .sort((a, b) => a.distance - b.distance)[0];
              setPlacement(point);
              setFeedback(null);
              setAnswer(near?.distance <= 7 ? near.id : "outside-target");
            }}
          >
            <img
              src="/lesson-media/atlas-geography.svg"
              alt="خريطة مصر التعليمية لاختيار الموقع"
            />
            {options
              .filter(
                (o) =>
                  typeof o === "object" &&
                  Number.isFinite(o.lat) &&
                  Number.isFinite(o.lng),
              )
              .map((o) => (
                <button
                  key={o.id}
                  type="button"
                  style={{
                    left: `${(75 + ((o.lng - 24) / 12) * 350) / 5}%`,
                    top: `${(365 - ((o.lat - 21) / 11) * 330) / 4}%`,
                  }}
                  aria-pressed={answer === o.id}
                  disabled={done || busy}
                  onClick={() => {
                    setAnswer(o.id);
                    setFeedback(null);
                  }}
                >
                  {presentation === "place" ? "ضع الرمز هنا" : o.label}
                </button>
              ))}
            {placement && presentation === "place" && (
              <span
                className="placed-map-token"
                style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
              >
                ●
              </span>
            )}
          </div>
        </>
      )}
      {selections && (
        <div
          className={`question-options ${q.type === "map" ? "map-answer-options" : ""}`}
        >
          {options.map((o, i) => (
            <button
              type="button"
              key={i}
              disabled={done || busy}
              aria-pressed={answer === value(o)}
              onClick={() => {
                setAnswer(value(o));
                setFeedback(null);
              }}
            >
              {typeof label(o) === "boolean" ? String(label(o)) : label(o)}
            </button>
          ))}
        </div>
      )}
      {q.type === "blank" && (
        <label>
          أكمل الإجابة
          <input
            aria-label="إجابتك"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={200}
            disabled={done || busy}
          />
        </label>
      )}
      {q.type === "order" && (
        <ol className="question-order">
          {answer.map((o, i) => (
            <li key={i}>
              <span>{label(o)}</span>
              <button
                type="button"
                aria-label={`نقل ${label(o)} لأعلى`}
                disabled={done || busy || !i}
                onClick={() => move(i, -1)}
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                aria-label={`نقل ${label(o)} لأسفل`}
                disabled={done || busy || i === answer.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown />
              </button>
            </li>
          ))}
        </ol>
      )}
      {["match", "image-match"].includes(q.type) && (
        <div className="question-pairs">
          {(q.pairs || []).map((p) => (
            <label key={p.id}>
              <span>
                {p.image && <img src={p.image} alt={p.alt || p.label} />}{" "}
                {p.label}
              </span>
              <select
                disabled={done || busy}
                value={answer[p.id] || ""}
                onChange={(e) =>
                  setAnswer({ ...answer, [p.id]: e.target.value })
                }
              >
                <option value="">اختر المطابقة</option>
                {(p.choices || q.options || []).map((o, i) => (
                  <option value={value(o)} key={i}>
                    {label(o)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {q.type === "drag" && (
        <>
          <p>اسحب المورد إلى مجموعته، أو اختر المجموعة من القائمة.</p>
          <div className="question-drag-items">
            {(q.options || []).map((o, i) => (
              <div
                key={i}
                draggable={!done}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", value(o))
                }
              >
                <strong>{label(o)}</strong>
                <label>
                  مجموعة {label(o)}
                  <select
                    value={answer[value(o)] || ""}
                    disabled={done || busy}
                    onChange={(e) =>
                      setAnswer({ ...answer, [value(o)]: e.target.value })
                    }
                  >
                    <option value="">اختر المجموعة</option>
                    {(q.groups || []).map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          <div className="question-dropzones">
            {(q.groups || []).map((g) => (
              <div
                key={g}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (
                    !done &&
                    (q.options || []).some((o) => String(value(o)) === id)
                  )
                    setAnswer({ ...answer, [id]: g });
                }}
              >
                <strong>{g}</strong>
                <p>
                  {Object.entries(answer)
                    .filter(([, v]) => v === g)
                    .map(([k]) => k)
                    .join("، ") || "ضع الموارد هنا"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      {q.type === "map" && (
        <p className="p-muted">
          اختر اسم الموقع من الخيارات؛ الأسماء بديل ميسّر عن النقر على العلامات.
        </p>
      )}
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
      {feedback && (
        <div
          role="status"
          className={feedback.correct ? "p-success" : "p-feedback"}
        >
          {feedback.correct ? (
            <>
              <Star weight="fill" />
              أحسنت! {feedback.explanation}
            </>
          ) : (
            <>حاول مرة أخرى. {feedback.hint}</>
          )}
        </div>
      )}
      <div className="p-actions">
        <button className="p-button" disabled={done || busy || answer === ""}>
          {busy ? "جارٍ التحقق…" : done ? "إجابة متقنة ✓" : "تحقق من إجابتي"}
        </button>
        <button
          type="button"
          className="p-secondary"
          onClick={() => (demo ? setShowHint(true) : onHelp(q, answer))}
        >
          <Lightbulb size={20} />
          ساعدني
        </button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { useRef } from "react";
import { ArrowUp, ArrowDown, Star, Lightbulb, Check, X, ArrowLeft, ArrowCounterClockwise, CheckCircle, XCircle } from "phosphor-react";
import { useQuestionHelp, HelpCard, helpHeaders } from "./QuestionHelp";
import { ClassifyActivity, MatchActivity, OrderActivity } from "./ActivityKinds";

const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];
import { api } from "./api";
import { play } from "./sfx";
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
  onNext,
  resources,
}) {
  const [showHint, setShowHint] = useState(false);
  // Graded help: counts, levels and the card live per question for the visit.
  const help = useQuestionHelp({ q, lessonId, demo, enabled: !preview });
  const mem = help.mem;
  const field = useRef(null);
  const focusAnswer = () =>
    requestAnimationFrame(() => (field.current || document.querySelector(`[data-question="${q.id}"] [role=radio], [data-question="${q.id}"] button`))?.focus());
  const initial = () =>
    q.type === "order"
      ? [...(q.options || [])].reverse()
      : ["match", "drag", "image-match"].includes(q.type)
        ? {}
        : "";
  const [answer, setAnswerState] = useState(() => mem.answer ?? initial()),
    [feedback, setFeedbackState] = useState(() => mem.feedback),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pairItems = ["match", "image-match"].includes(q.type)
    ? (q.pairs || []).map((p) => p.id)
    : q.type === "drag"
      ? (q.options || []).map((o) => String(value(o)))
      : [];
  const missing = pairItems.filter((k) => !answer[k]).length;
  const [incomplete, setIncomplete] = useState(false);
  const setAnswer = (a) => {
    mem.answer = a;
    setAnswerState(a);
  };
  const setFeedback = (f) => {
    mem.feedback = f;
    setFeedbackState(f);
  };
  const choose = (key, choice) => {
    setAnswer({ ...answer, [key]: choice });
    setFeedback(null);
    setIncomplete(false);
  };
  async function submit(e) {
    e.preventDefault();
    // Unfinished answers get a friendly nudge instead of a wasted server attempt.
    if (missing || (q.type === "blank" && !String(answer).trim())) {
      setIncomplete(true);
      return;
    }
    // The same answer again is not a new try: keep what is shown.
    const key = JSON.stringify(typeof answer === "string" ? answer.trim() : answer);
    if (feedback && !feedback.correct && key === mem.lastKey) return;
    setBusy(true);
    setError("");
    try {
      if (preview) {
        play(JSON.stringify(answer) === JSON.stringify(q.answer) ? "correct" : "wrong");
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
          headers: helpHeaders(),
          body: { questionId: q.id, answer, attempt: (mem.wrong || 0) + 1 },
        },
      );
      if (result.empty) {
        setIncomplete(true);
        return;
      }
      mem.wrong = result.wrong ?? mem.wrong;
      mem.lastKey = key;
      setFeedback({ ...result, attempt: result.wrong });
      play(result.correct ? "correct" : "wrong");
      // A question finished after its answer was shown is not credited.
      if (result.correct && result.credit !== false) onSolved(q.id);
      // The rules on the server say when help opens by itself, once per level.
      if (!result.correct && result.due) help.ask({ level: result.due, trigger: "auto", answer });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const done = solved || feedback?.correct || Boolean(mem.solution);
  const helpCard = (
    <HelpCard
      help={help}
      q={q}
      answer={answer}
      resources={resources}
      onRetry={() => {
        help.close();
        focusAnswer();
      }}
      onMore={() => {
        const shownExplain = mem.cards.some((c) => c.level === "explain");
        help.ask({ level: q.type === "blank" && !shownExplain ? "explain" : "more", trigger: "asked", answer });
      }}
    />
  );
  const askHelp = () => help.ask({ trigger: "asked", answer });
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
  if (RICH[q.type])
    return (
      <RichActivity
        q={q}
        kind={RICH[q.type]}
        answer={answer}
        setAnswer={(a) => {
          setAnswer(a);
          setFeedback(null);
        }}
        reset={() => {
          setAnswer(initial());
          setFeedback(null);
          setShowHint(false);
        }}
        move={move}
        missing={missing}
        total={pairItems.length}
        done={done}
        solved={solved}
        busy={busy}
        error={error}
        feedback={feedback}
        showHint={showHint}
        toggleHint={() => setShowHint(!showHint)}
        onNext={onNext}
        submit={submit}
        resources={resources}
        helpCard={helpCard}
      />
    );
  return (
    <form className="p-question" onSubmit={submit} data-question={q.id}>
      <h3>{q.prompt}</h3>
      {showHint && (
        <p className="p-feedback" role="status">
          تلميح: {feedback?.hint || q.hint || "راجع بطاقة المورد ثم حاول مرة أخرى."}
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
          className={`question-options ${q.type === "map" ? "map-answer-options" : ""} ${q.type === "boolean" ? "boolean-options" : ""} ${q.type === "choice" ? "choice-options" : ""}`}
          role="radiogroup"
          aria-label="الاختيارات"
        >
          {options.map((o, i) => {
            const picked = answer === value(o);
            const state =
              picked && feedback ? (feedback.correct ? "is-correct" : "is-wrong") : "";
            return (
              <button
                type="button"
                key={i}
                role="radio"
                aria-checked={picked}
                className={state}
                disabled={done || busy}
                onClick={() => {
                  setAnswer(value(o));
                  setFeedback(null);
                }}
              >
                {q.type === "boolean" ? (
                  <span className="option-badge" aria-hidden="true">
                    {value(o) ? <Check weight="bold" /> : <X weight="bold" />}
                  </span>
                ) : q.type === "choice" ? (
                  <span className="option-badge" aria-hidden="true">
                    {LETTERS[i] || i + 1}
                  </span>
                ) : null}
                <span className="option-text">
                  {typeof label(o) === "boolean" ? String(label(o)) : label(o)}
                </span>
                {state === "is-correct" && <Check className="option-mark" weight="bold" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
      {q.type === "blank" && (
        <label>
          أكمل الإجابة
          <input
            ref={field}
            aria-label="إجابتك"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setIncomplete(false);
            }}
            maxLength={200}
            disabled={done || busy}
          />
        </label>
      )}
      {q.type === "order" && (
        <ol className="question-order">
          {answer.map((o, i) => (
            <li key={i}>
              <span className="order-step" aria-hidden="true">
                {i + 1}
              </span>
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
        <div className="question-pairs choice-pairs">
          {(q.pairs || []).map((p) => (
            <fieldset key={p.id} className={answer[p.id] ? "is-answered" : ""}>
              <legend>
                {p.image && <img src={p.image} alt={p.alt || p.label} />}
                {p.label}
              </legend>
              <div className="choice-chips">
                {(p.choices || q.options || []).map((o, i) => (
                  <button
                    type="button"
                    key={i}
                    role="radio"
                    aria-checked={answer[p.id] === value(o)}
                    disabled={done || busy}
                    onClick={() => choose(p.id, value(o))}
                  >
                    {label(o)}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
      {q.type === "drag" && (
        <>
          <p className="p-muted">اضغط المجموعة المناسبة لكل مورد، أو اسحبه إلى صندوقها.</p>
          <div className="question-drag-items">
            {(q.options || []).map((o, i) => (
              <div
                key={i}
                className={answer[value(o)] ? "is-answered" : ""}
                draggable={!done}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", value(o))
                }
              >
                <strong>{label(o)}</strong>
                <div
                  className="choice-chips"
                  role="radiogroup"
                  aria-label={`مجموعة ${label(o)}`}
                >
                  {(q.groups || []).map((g) => (
                    <button
                      type="button"
                      key={g}
                      role="radio"
                      aria-checked={answer[value(o)] === g}
                      disabled={done || busy}
                      onClick={() => choose(String(value(o)), g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
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
                    choose(id, g);
                }}
              >
                <strong>{g}</strong>
                <p>
                  {(q.options || [])
                    .filter((o) => answer[value(o)] === g)
                    .map((o) => (
                      <span className="placed-chip" key={value(o)}>
                        {label(o)}
                      </span>
                    ))}
                  {!(q.options || []).some((o) => answer[value(o)] === g) &&
                    "ضع الموارد هنا"}
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
      {incomplete && q.type === "blank" && (
        <p className="p-feedback" role="status">
          اكتب إجابتك في الفراغ أولًا، ثم اضغط «تحقق من إجابتي».
        </p>
      )}
      {incomplete && missing > 0 && (
        <p className="p-feedback" role="status">
          لم تختر إجابة بعد لـ <bdi>{missing}</bdi> من <bdi>{pairItems.length}</bdi>. أكمل الاختيار ثم اضغط «تحقق من إجابتي».
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
              {feedback.credit === false ? "أكملت السؤال بعد عرض الإجابة. " : "أحسنت! "}
              {feedback.explanation}
              {onNext && (
                <button type="button" className="p-button feedback-next" onClick={onNext}>
                  التالي
                  <ArrowLeft aria-hidden="true" />
                </button>
              )}
            </>
          ) : q.type === "blank" ? (
            <span className="qh-wrong">
              <XCircle size={22} weight="fill" aria-hidden="true" /> حاول مرة أخرى
              {feedback.counted === false && <small> — جرّبت هذه الإجابة من قبل</small>}
            </span>
          ) : feedback.counted === false ? (
            <>
              <Lightbulb size={20} aria-hidden="true" />
              جرّبت هذه الإجابة من قبل؛ اختر إجابة أخرى.
            </>
          ) : feedback.attempt <= 1 ? (
            <>
              <Lightbulb size={20} aria-hidden="true" />
              إجابتك غير صحيحة. راجع المعلومة، وفكّر مرة أخرى قبل أن تختار.
            </>
          ) : (
            <>
              <Lightbulb size={20} aria-hidden="true" />
              ليست هذه الإجابة. {feedback.hint}
            </>
          )}
        </div>
      )}
      {pairItems.length > 0 && !done && (
        <p className="pair-progress" aria-live="polite">
          اخترت <bdi>{pairItems.length - missing}</bdi> من <bdi>{pairItems.length}</bdi>
        </p>
      )}
      <div className="p-actions">
        <button className="p-button" disabled={done || busy || answer === ""}>
          {busy ? "جارٍ التحقق…" : mem.solution && !solved ? "أُكمل بعد عرض الإجابة" : done ? "إجابة متقنة ✓" : "تحقق من إجابتي"}
        </button>
        <button
          type="button"
          className="p-secondary"
          disabled={preview || help.loading || Boolean(mem.solution)}
          onClick={askHelp}
        >
          <Lightbulb size={20} />
          {help.loading ? "المعلم يجهز لك الشرح…" : "ساعدني"}
        </button>
        {mem.solution && onNext && (
          <button type="button" className="p-button" onClick={onNext}>
            التالي <ArrowLeft aria-hidden="true" />
          </button>
        )}
      </div>
      {/* Below the buttons: «تحقق» and «ساعدني» stay right under the answer. */}
      {helpCard}
    </form>
  );
}

// Sort, match and order: one card that fits without scrolling. Title and
// counter on top, the activity, then one line of feedback and the buttons.
const RICH = {
  drag: {
    title: "صنّف",
    subtitle: "اسحب كل بطاقة إلى مجموعتها المناسبة.",
    count: (n, t) => `صنّفت ${n} من ${t}`,
    check: "تحقق من تصنيفي",
    note: "يمكنك نقل البطاقة لتغيير اختيارك.",
    wrong: "بعض البطاقات في المجموعة غير المناسبة.",
  },
  match: {
    title: "صِل",
    subtitle: "اضغط على عنصر، ثم اختر ما يناسبه.",
    count: (n, t) => `وصلت ${n} من ${t}`,
    check: "تحقق من إجابتي",
    note: "اضغط على أي بطاقة موصولة لتغيير اختيارك.",
    wrong: "بعض التوصيلات تحتاج مراجعة.",
  },
  order: {
    title: "رتّب",
    subtitle: "حرّك البطاقات بالأسهم لترتّب الخطوات.",
    check: "تحقق من ترتيبي",
    note: "يمكنك تغيير الترتيب قبل التحقق.",
    wrong: "الترتيب يحتاج تعديلًا بسيطًا.",
  },
};

function RichActivity({ q, kind, answer, setAnswer, reset, move, missing, total, done, solved, busy, error, feedback, showHint, toggleHint, onNext, submit, resources, helpCard }) {
  const complete = q.type === "order" || !missing;
  const locked = done || busy;
  const Body = { drag: ClassifyActivity, match: MatchActivity, order: OrderActivity }[q.type];
  return (
    <form className={`p-question ra ra-${q.type}`} onSubmit={submit}>
      <header className="ra-head">
        <h3>{q.title || q.prompt}</h3>
        {kind.count && (
          <span className="ra-count" aria-live="polite">
            {kind.count(total - missing, total)}
          </span>
        )}
        <p>{q.subtitle || (q.title ? q.prompt : kind.subtitle)}</p>
      </header>
      <Body
        q={q}
        answer={answer}
        onChange={setAnswer}
        onMove={move}
        locked={locked}
        result={feedback ? (feedback.correct ? "correct" : "wrong") : done ? "correct" : null}
        resources={resources}
      />
      <div className="ra-message" role="status">
        {error ? (
          <p className="p-error">{error}</p>
        ) : feedback?.correct || (solved && !feedback) ? (
          <p className="p-success">
            <Star weight="fill" aria-hidden="true" />
            {feedback ? `أحسنت! ${feedback.explanation || ""}` : "سبق أن أتقنت هذا النشاط. أحسنت!"}
            {onNext && (
              <button type="button" className="p-button feedback-next" onClick={onNext}>
                التالي
                <ArrowLeft aria-hidden="true" />
              </button>
            )}
          </p>
        ) : feedback ? (
          <p className="p-feedback">
            <Lightbulb size={20} aria-hidden="true" />
            {kind.wrong} {feedback.attempt > 1 ? `تلميح ${Math.min(feedback.attempt, 3)} من 3: ` : ""}
            {feedback.hint}
          </p>
        ) : showHint ? (
          <p className="p-feedback">
            <Lightbulb size={20} aria-hidden="true" />
            تلميح: {q.hint || "راجع بطاقة المورد ثم حاول مرة أخرى."}
          </p>
        ) : null}
      </div>
      {helpCard}
      <footer className="ra-actions">
        <button className="p-button ra-check" disabled={locked || !complete}>
          {!busy && !done && <CheckCircle size={22} weight="fill" aria-hidden="true" />}
          {busy ? "جارٍ التحقق…" : done ? "أتقنته ✓" : kind.check}
        </button>
        <small className="ra-note">{kind.note}</small>
        {/* In the sort activity these two sit in a side column (see CSS). */}
        <span className="ra-side">
          <button type="button" className="p-secondary ra-side-hint" onClick={toggleHint} aria-pressed={showHint} disabled={done}>
            <Lightbulb size={22} weight="duotone" aria-hidden="true" /> تلميح
          </button>
          <button type="button" className="p-secondary" onClick={reset} disabled={busy || done}>
            <ArrowCounterClockwise size={22} aria-hidden="true" /> ابدأ من جديد
          </button>
        </span>
      </footer>
    </form>
  );
}

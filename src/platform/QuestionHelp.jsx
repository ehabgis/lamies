import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CheckCircle, ChatCircleText, PaperPlaneTilt, PencilSimple, Sparkle } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import { api } from "./api";
import { getConsent, identity, isCurrent, onConsent, registerReset, setConsent, track } from "./privateState";
import { play } from "./sfx";
import "./question-help.css";

// Graded help inside a question (2026-11-09). The server grades, counts
// distinct wrong answers and says which level is due; this file shows it.
// State is kept per lesson and question for the whole visit, so moving
// between questions or closing the card never resets a count.

const TAB_KEY = "lamis.helpTab";
function helpTab() {
  try {
    let id = sessionStorage.getItem(TAB_KEY);
    if (!id) {
      id = `tab-${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
      sessionStorage.setItem(TAB_KEY, id);
    }
    return id;
  } catch {
    return (helpTab.id ||= `tab-${Math.random().toString(36).slice(2, 14)}`);
  }
}
export const helpHeaders = () => ({ "x-help-session": helpTab() });

// Typed answers, feedback and help cards, per person, lesson and question.
// A new person in this tab starts empty, with a new tab id (privateState.js).
const memory = new Map();
registerReset(() => {
  memory.clear();
  helpTab.id = undefined;
});
export function questionMemory(lessonId, qid) {
  const key = `${identity()}|${lessonId}:${qid}`;
  if (!memory.has(key)) memory.set(key, { answer: undefined, feedback: null, lastKey: null, cards: [], open: false, solution: null, apply: null, wrong: 0 });
  return memory.get(key);
}

/** Help for one question: cards, loading, asking, applying. */
export function useQuestionHelp({ q, lessonId, demo, enabled = true }) {
  const mem = questionMemory(lessonId, q.id);
  const [, render] = useState(0);
  const refresh = () => render((n) => n + 1);
  const [loading, setLoading] = useState(false);
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const base = `${demo ? "/demo" : ""}/lessons/${lessonId}`;

  async function ask({ level, trigger, answer, message }) {
    if (!enabled || busy.current) return; // one request at a time
    busy.current = true;
    mem.open = true;
    setLoading(true);
    refresh();
    const shown = mem.cards.map((c) => c.text).filter(Boolean);
    const request = track();
    try {
      const r = await api(`${base}/help`, {
        method: "POST",
        headers: helpHeaders(),
        signal: request.signal,
        body: { questionId: q.id, level, trigger, answer, message, consent: getConsent(), shown },
      });
      // The person changed while waiting: this answer is not theirs to see.
      if (!isCurrent(request.generation)) return;
      if (r.consent !== undefined) setConsent(r.consent);
      if (r.level === "solution") mem.solution = r;
      else mem.cards.push({ ...r, trigger, asked: message || null });
    } catch (e) {
      if (!isCurrent(request.generation)) return;
      // No connection at all: the question's own prepared hint keeps it going.
      mem.cards.push({
        // Shown at the level that was asked for, as the same kind of card.
        level: level || "review",
        failed: true,
        title: "خلّينا نراجع المعلومة",
        text: q.hint || "اقرأ السؤال مرة أخرى، وراجع بطاقة المورد على الخريطة.",
        note: "تعذّر الاتصال بالمعلم الآن؛ هذا تلميح معدّ من الدرس.",
        source: "prepared",
      });
    } finally {
      request.done();
      busy.current = false;
      if (alive.current) {
        setLoading(false);
        refresh();
      }
    }
  }
  async function applyCheck(answer) {
    const r = await api(`${base}/apply`, { method: "POST", headers: helpHeaders(), body: { questionId: q.id, answer } });
    mem.apply = { answer, ...r };
    play(r.correct ? "correct" : "wrong");
    if (alive.current) refresh();
    return r;
  }
  return {
    mem,
    loading,
    ask,
    applyCheck,
    close: () => {
      mem.open = false;
      refresh();
    },
    // Reopen what was already shown: no request, no attempt.
    reopen: () => {
      mem.open = true;
      refresh();
    },
    refresh,
  };
}

/** The card: inside the question, never over its answer field or buttons. */
export function HelpCard({ help, q, resources, onRetry, onMore, answer }) {
  // In «أكمل الفراغ», the clearer explanation and the follow-up chat are the
  // smart teacher's window («أرجع للسؤال»); the short review is a small card
  // («أحاول مرة أخرى» / «اشرح لي أكثر»).
  const { mem, loading } = help;
  const [message, setMessage] = useState("");
  // Consent lives on the server for this session; this only mirrors it.
  const [consent, setConsentShown] = useState(getConsent);
  const [consentBusy, setConsentBusy] = useState(false);
  useEffect(() => onConsent(setConsentShown), []);
  const giveConsent = async (value) => {
    setConsentBusy(true);
    try {
      const r = await api("/ai/consent", { method: "POST", headers: helpHeaders(), body: { consent: value } });
      setConsent(r.consent);
    } catch {
      setConsent(false);
    } finally {
      setConsentBusy(false);
    }
  };
  const box = useRef(null);
  // A new explanation, or the answer, is brought into view without moving focus.
  const count = mem.cards.length + (mem.solution ? 1 : 0);
  useEffect(() => {
    if (count && mem.open) box.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [count, loading]);
  const last = mem.cards[mem.cards.length - 1];
  // These sit inside the question's own form, so no nested <form>.
  const send = () => {
    if (!message.trim() || loading) return;
    help.ask({ level: "more", trigger: "asked", answer, message: message.trim() });
    setMessage("");
  };
  if (!mem.open && !mem.solution) return null;
  const canAsk = mem.cards.some((c) => c.canAsk);
  const byId = (id) => (resources || []).find((r) => r.id === id);
  if (mem.solution)
    return (
      <div ref={box}>
        <SolutionCard help={help} q={q} />
      </div>
    );
  const teacher = q.type === "blank" && last && last.level !== "review";
  return (
    <section ref={box} className={`qh-card ${last?.level === "explain" ? "is-explain" : ""} ${teacher ? "is-teacher" : ""}`} aria-live="polite" aria-label={teacher ? "المعلم الذكي" : "خلّينا نراجع المعلومة"}>
      <span className="qh-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <div className="qh-body">
        <h4>{teacher || (loading && last) ? "المعلم الذكي" : last?.title || "خلّينا نراجع المعلومة"}</h4>
        {mem.cards.length > 1 && (
          <details className="qh-earlier">
            <summary>الشرح السابق</summary>
            {mem.cards.slice(0, -1).map((c, i) => (
              <p key={i}>{c.text}</p>
            ))}
          </details>
        )}
        {mem.cards.slice(-1).map((c, i) => (
          <div key={i} className="qh-entry">
            {c.asked && <p className="qh-asked">سؤالك: {c.asked}</p>}
            <p>{c.text}</p>
            {c.compare?.length > 0 && (
              <ul className="qh-compare" aria-label="مقارنة">
                {c.compare.map((x, k) => (
                  <li key={k} className={x.resource ? "" : "is-unknown"}>
                    <span className="qh-symbol" aria-hidden="true">
                      {x.resource && byId(x.resource) ? <LessonSymbol resource={byId(x.resource)} /> : "؟"}
                    </span>
                    <small>{x.caption}</small>
                  </li>
                ))}
              </ul>
            )}
            {c.note && <small className="qh-note">{c.note}</small>}
          </div>
        ))}
        {loading && (
          <p className="qh-loading" role="status">
            <Sparkle size={18} weight="fill" aria-hidden="true" /> المعلم يجهز لك الشرح…
          </p>
        )}
        <div className="qh-actions">
          <button type="button" className="p-button" onClick={onRetry}>
            <ArrowCounterClockwise size={18} aria-hidden="true" /> {teacher ? "أرجع للسؤال" : "أحاول مرة أخرى"}
          </button>
          {!teacher && (
            <button type="button" className="p-secondary" disabled={loading} onClick={() => onMore()}>
              <ChatCircleText size={18} aria-hidden="true" /> اشرح لي أكثر
            </button>
          )}
        </div>
        {teacher && !canAsk && !loading && !last?.failed && (
          <small className="qh-note">كتابة الأسئلة للمعلم الذكي تعمل بعد ربطه بالخادم؛ هذا شرح معدّ من الدرس.</small>
        )}
        {canAsk && (
          <div className="qh-ask" role="group" aria-label="استفسار إضافي">
            {!consent ? (
              <label className="qh-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={consentBusy}
                  onChange={(e) => giveConsent(e.target.checked)}
                />
                أوافق على إرسال السؤال إلى المعلم المتصل، دون اسمي.
              </label>
            ) : (
              <>
                <input
                  value={message}
                  maxLength={300}
                  placeholder="اكتب ما لم تفهمه…"
                  aria-label="استفسارك للمعلم"
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button type="button" className="p-secondary" aria-label="إرسال الاستفسار" disabled={loading || !message.trim()} onClick={send}>
                  <PaperPlaneTilt size={18} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SolutionCard({ help, q }) {
  const { mem } = help;
  const s = mem.solution;
  const [value, setValue] = useState(mem.apply?.answer || "");
  const [busy, setBusy] = useState(false);
  const done = mem.apply?.correct;
  const [open, setOpen] = useState(Boolean(mem.applyOpen || mem.apply));
  const field = useRef(null);
  const openApply = () => {
    mem.applyOpen = true;
    setOpen(true);
    requestAnimationFrame(() => field.current?.focus());
  };
  const check = async () => {
    if (!value.trim() || busy || done) return;
    setBusy(true);
    try {
      await help.applyCheck(value);
    } catch (e) {
      mem.apply = { answer: value, correct: false, hint: e.message };
      help.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="qh-card is-solution" aria-live="polite" aria-label="الإجابة الصحيحة">
      <span className="qh-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <div className="qh-body">
        <span className="qh-badge">
          <CheckCircle size={18} weight="fill" aria-hidden="true" /> تمت المراجعة بمساعدة
        </span>
        <h4>
          الإجابة: <b>{s.answer}</b>
        </h4>
        <p>{s.text}</p>
        {!open && (
          <div className="qh-actions">
            <button type="button" className="p-button" onClick={openApply}>
              <PencilSimple size={18} aria-hidden="true" /> جرّب سؤالًا تطبيقيًا
            </button>
          </div>
        )}
        {open && (
        <div className="qh-apply" role="group" aria-label="سؤال تطبيق">
          <label htmlFor={`apply-${q.id}`}>
            <PencilSimple size={18} aria-hidden="true" /> {s.apply.prompt}
          </label>
          <input
            ref={field}
            id={`apply-${q.id}`}
            value={value}
            maxLength={120}
            disabled={done}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                check();
              }
            }}
          />
          <button type="button" className="p-button" disabled={busy || done || !value.trim()} onClick={check}>
            {busy ? "جارٍ التحقق…" : done ? "أحسنت ✓" : "تحقق من فهمي"}
          </button>
          {mem.apply && (
            <p className={mem.apply.correct ? "p-success" : "p-feedback"} role="status">
              {mem.apply.correct ? `أحسنت! ${mem.apply.explanation}` : `حاول مرة أخرى. ${mem.apply.hint}`}
            </p>
          )}
        </div>
        )}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CheckCircle, ChatCircleText, PaperPlaneTilt, PencilSimple, Sparkle } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import { api } from "./api";
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

const memory = new Map();
let consentGiven = false;
export function questionMemory(lessonId, qid) {
  const key = `${lessonId}:${qid}`;
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
    try {
      const r = await api(`${base}/help`, {
        method: "POST",
        headers: helpHeaders(),
        body: { questionId: q.id, level, trigger, answer, message, consent: consentGiven, shown },
      });
      if (r.level === "solution") mem.solution = r;
      else mem.cards.push({ ...r, trigger, asked: message || null });
    } catch (e) {
      mem.cards.push({ level: "error", title: "المعلم الذكي", text: e.message || "تعذّر عرض الشرح الآن.", source: "prepared" });
    } finally {
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
    refresh,
  };
}

/** The card: inside the question, never over its answer field or buttons. */
export function HelpCard({ help, q, resources, onRetry, onMore, answer }) {
  const { mem, loading } = help;
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(consentGiven);
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
  return (
    <section ref={box} className={`qh-card ${last?.level === "explain" ? "is-explain" : ""}`} aria-live="polite" aria-label="مساعدة المعلم الذكي">
      <span className="qh-robot" aria-hidden="true">
        <RobotGuide />
      </span>
      <div className="qh-body">
        <h4>{loading && !last ? "المعلم الذكي" : last?.title || "المعلم الذكي"}</h4>
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
            <ArrowCounterClockwise size={18} aria-hidden="true" /> أحاول مرة أخرى
          </button>
          <button type="button" className="p-secondary" disabled={loading} onClick={() => onMore()}>
            <ChatCircleText size={18} aria-hidden="true" /> اشرح لي أكثر
          </button>
        </div>
        {canAsk && (
          <div className="qh-ask" role="group" aria-label="استفسار إضافي">
            {!consent ? (
              <label className="qh-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    consentGiven = e.target.checked;
                    setConsent(e.target.checked);
                  }}
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
        <div className="qh-apply" role="group" aria-label="سؤال تطبيق">
          <label htmlFor={`apply-${q.id}`}>
            <PencilSimple size={18} aria-hidden="true" /> {s.apply.prompt}
          </label>
          <input
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
      </div>
    </section>
  );
}

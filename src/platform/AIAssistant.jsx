import { useState } from "react";
import { Robot, PaperPlaneTilt } from "phosphor-react";
import { api } from "./api";
export default function AIAssistant({
  lessonId,
  resource,
  location,
  initial = "",
  mode = "explain",
  onQuestion,
  lessonTitle,
  assessment,
}) {
  const [message, setMessage] = useState(initial),
    [consent, setConsent] = useState(false),
    [history, setHistory] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/ai", {
        method: "POST",
        body: {
          lessonId,
          resourceId: resource?.id,
          locationId: location?.id,
          message,
          mode,
          consent,
          ...assessment,
          previousResponse: history.at(-1)?.message,
        },
      });
      setHistory((h) => [...h, { question: message, ...data }]);
      setMessage("");
      if (data.question) onQuestion?.(data.question);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ai-assistant">
      <Robot size={45} weight="duotone" />
      <p>
        اسأل عن الدرس{resource ? ` أو ${resource.label}` : ""}. يُرسل السؤال
        وسياق الدرس إلى OpenAI، دون اسمك أو نتائجك.
      </p>
      <p className="p-muted">
        قد يخطئ المساعد؛ راجع مصدره واسأل معلمك عند الشك. التقييم والنقاط
        يحددهما الخادم.
      </p>
      {history.map((h, i) => (
        <article key={i}>
          <strong>{h.question}</strong>
          <p>{h.message}</p>
          <small>
            مصدر الإجابة: {lessonTitle} — {h.sourceIds.join("، ")}
          </small>
        </article>
      ))}
      <form onSubmit={send}>
        <label>
          سؤالك
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            required
            placeholder="مثل: بيستخدم في إيه؟"
          />
        </label>
        <label className="p-checkbox">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          أوافق على إرسال هذا السؤال وسياق الدرس إلى خدمة OpenAI. لن أكتب
          معلومات شخصية.
        </label>
        {error && (
          <div role="alert" className="p-feedback">
            {error}
            <p>
              يمكنك متابعة الدرس دون المساعد. التلميحات المكتوبة داخل الأسئلة
              متاحة.
            </p>
          </div>
        )}
        <button className="p-button" disabled={!consent || busy}>
          {busy ? "المعلم يفكر…" : "أرسل سؤالي"}
          <PaperPlaneTilt />
        </button>
      </form>
    </section>
  );
}

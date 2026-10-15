import RobotGuide from "../components/Map/RobotGuide";
import { useState, useEffect } from "react";
import { PaperPlaneTilt } from "phosphor-react";
import { api } from "./api";
import { useSession } from "./Session";
export default function AIAssistant({
  lessonId,
  resource,
  location,
  initial = "",
  mode = "explain",
  onQuestion,
  lessonTitle,
  assessment,
  demo = false,
  reviewReady = true,
}) {
  const { user } = useSession();
  const [configured, setConfigured] = useState(null);
  useEffect(() => {
    let active = true;
    api("/health")
      .then((s) => {
        if (active) setConfigured(s.aiConfigured);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const canConnect = configured === true && !demo && !!user && reviewReady;
  const [message, setMessage] = useState(initial),
    [consent, setConsent] = useState(false),
    [history, setHistory] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e) {
    e.preventDefault();
    if (!canConnect) return;
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
      <div className="smart-teacher-heading">
        <RobotGuide />
        <div>
          <h3>المعلم الذكي</h3>
          <span role="status">
            {configured === null
              ? "جارٍ فحص الاتصال…"
              : canConnect
                ? "جاهز للإجابة عبر OpenAI"
                : "المعلم المتصل غير متاح حاليًا"}
          </span>
        </div>
      </div>
      {!canConnect && configured !== null && (
        <p className="p-feedback">
          {demo
            ? "أنت في درس تجريبي؛ استخدم التلميحات المكتوبة داخل الأسئلة. الاتصال بالمعلم يتطلب حسابًا ودرسًا منشورًا بمصادر مراجعة وتفعيل الخدمة."
            : !configured
              ? "خدمة المعلم لم تُفعّل بعد. يمكنك متابعة التعلّم واستخدام تلميحات الأسئلة."
              : !reviewReady
                ? "مصادر هذا الدرس تحتاج مراجعة قبل تشغيل المعلم المتصل."
                : "سجّل الدخول لاستخدام المعلم المتصل."}
        </p>
      )}
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
          <strong>سؤالك: {h.question}</strong>
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
            disabled={!canConnect}
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
            disabled={!canConnect}
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
        <button className="p-button" disabled={!canConnect || !consent || busy}>
          {busy ? "المعلم يفكر…" : "أرسل سؤالي"}
          <PaperPlaneTilt />
        </button>
      </form>
    </section>
  );
}

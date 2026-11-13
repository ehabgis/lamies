import RobotGuide from "../components/Map/RobotGuide";
import { useState, useEffect } from "react";
import { PaperPlaneTilt, SpeakerHigh } from "phosphor-react";
import * as narrator from "./narrator";
import { api } from "./api";
import { useSession } from "./Session";
import { isCurrent, setConsent as setSessionConsent, track } from "./privateState";
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
  const [status, setStatus] = useState(null);
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setStatus(null);
    api("/ai/status")
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setStatus({ configured: false, available: false });
      });
    return () => {
      active = false;
    };
  }, [userId, user?.role]);
  const providerLabel = status?.provider === "cloudflare" ? "Cloudflare Workers AI"
    : status?.provider === "openai" ? "OpenAI" : "خدمة الذكاء الاصطناعي";
  const canConnect = status?.available === true && !demo && !!user && reviewReady;
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
    setConsent(false);
    const request = track();
    try {
      // The tick for this message also records consent for this session on
      // the server, which checks it before calling the model.
      if (consent) setSessionConsent((await api("/ai/consent", { method: "POST", body: { consent: true } })).consent);
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
        signal: request.signal,
      });
      if (!isCurrent(request.generation)) return;
      setHistory((h) => [...h, { question: message, ...data }]);
      setMessage("");
      if (data.question) onQuestion?.(data.question);
    } catch (e) {
      if (isCurrent(request.generation)) setError(e.message);
    } finally {
      request.done();
      if (isCurrent(request.generation)) setBusy(false);
    }
  }
  return (
    <section className="ai-assistant">
      <div className="smart-teacher-heading">
        <RobotGuide />
        <div>
          <h3>المعلم الذكي</h3>
          <span role="status">
            {status === null
              ? "جارٍ فحص الاتصال…"
              : canConnect
                ? `جاهز للإجابة عبر ${providerLabel}`
                : "المعلم المتصل غير متاح حاليًا"}
          </span>
        </div>
      </div>
      {mode === "explain" && resource && <Simple resource={resource} />}
      {!canConnect && status !== null && (
        <p className="p-feedback">
          {demo
            ? "أنت في درس تجريبي؛ استخدم التلميحات المكتوبة داخل الأسئلة. الاتصال بالمعلم يتطلب حسابًا ودرسًا منشورًا بمصادر مراجعة وتفعيل الخدمة."
            : !status.configured
              ? "خدمة المعلم لم تُفعّل بعد. يمكنك متابعة التعلّم واستخدام تلميحات الأسئلة."
              : !reviewReady
                ? "المعلم المتصل غير مفعّل لهذا الدرس بعد."
                : !user
                  ? "سجّل الدخول لاستخدام المعلم المتصل."
                  : "المعلم المتصل متاح لفريق التعليم فقط حاليًا."}
        </p>
      )}
      <p>
        اسأل عن الدرس{resource ? ` أو ${resource.label}` : ""}. يُرسل السؤال
        وسياق الدرس إلى {providerLabel}، دون إرفاق اسم حسابك أو نتائجك.
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
          أوافق على إرسال هذا السؤال وسياق الدرس إلى {providerLabel}. لن أكتب
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

// «اشرح لي ببساطة» without the online teacher: the card's own approved text,
// cut into a few short sentences (nothing added).
export function simpleLines(resource) {
  return [resource.description, resource.importance]
    .filter(Boolean)
    .flatMap((t) => String(t).split(/[.؛]|،\s*(?=و?(?:من|يُ|ي|ت|في))/))
    .map((t) => t.trim().replace(/^و\s*/, ""))
    .filter((t) => t.split(/\s+/).length >= 3)
    .slice(0, 4);
}
function Simple({ resource }) {
  const lines = simpleLines(resource);
  if (!lines.length) return null;
  return (
    <div className="ai-simple">
      <h4>{resource.label} باختصار</h4>
      <ul>
        {lines.map((t) => (
          <li key={t}>{t}.</li>
        ))}
      </ul>
      <button type="button" className="p-secondary" onClick={() => narrator.speak([resource.label, ...lines].join(". "))}>
        <SpeakerHigh size={18} aria-hidden="true" /> استمع
      </button>
    </div>
  );
}

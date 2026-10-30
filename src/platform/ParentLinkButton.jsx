import { useEffect, useRef, useState } from "react";
import { Copy, CheckCircle, LinkSimple, X } from "phosphor-react";
import { api } from "./api";
import { useSession } from "./Session";
import "./parent-link.css";

// «ربط ولي الأمر» beside a signed-in student's name: opens the one-time code
// the parent types in «إضافة ابني». Only students see it.
export default function ParentLinkButton({ className = "" }) {
  const { user } = useSession() || {};
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  if (user?.role !== "student") return null;
  return (
    <>
      <button
        ref={button}
        type="button"
        className={`parent-link-open ${className}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <LinkSimple size={20} weight="bold" aria-hidden="true" /> ربط ولي الأمر
      </button>
      {open && (
        <ParentLinkDialog
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        />
      )}
    </>
  );
}

export function ParentLinkDialog({ onClose }) {
  const [code, setCode] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const close = useRef(null);
  const field = useRef(null);
  useEffect(() => {
    close.current?.focus();
    api("/parent/link-code", { method: "POST", body: {} })
      .then(setCode)
      .catch((e) => setError(e.message));
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code.code);
    } catch {
      // Older browsers: select the code so the child can copy it by hand.
      field.current?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
  }
  return (
    <div className="parent-link-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="parent-link-dialog" role="dialog" aria-modal="true" aria-labelledby="parent-link-title" dir="rtl">
        <button ref={close} type="button" className="parent-link-x" aria-label="إغلاق" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>
        <span className="parent-link-icon" aria-hidden="true">
          <LinkSimple size={34} weight="bold" />
        </span>
        <h2 id="parent-link-title">ربط ولي الأمر</h2>
        <p>انسخ هذا الرمز وأعطه لولي أمرك ليكتبه في شاشة «إضافة ابني» داخل حسابه.</p>
        {error ? (
          <p className="parent-link-error" role="alert">
            {error}
          </p>
        ) : !code ? (
          <p role="status">نجهّز رمزك…</p>
        ) : (
          <>
            <input
              ref={field}
              className="parent-link-code"
              value={code.code}
              readOnly
              dir="ltr"
              aria-label="رمز ربط الطالب"
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="parent-link-copy" onClick={copy}>
              {copied ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <Copy size={22} aria-hidden="true" />}
              {copied ? "تم النسخ" : "نسخ رمز الربط"}
            </button>
            <small>
              صالح لمرة واحدة حتى{" "}
              {new Date(code.expires).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}.
              بعد الربط لا يحتاج ولي الأمر إلى الرمز مرة أخرى.
            </small>
          </>
        )}
      </section>
    </div>
  );
}

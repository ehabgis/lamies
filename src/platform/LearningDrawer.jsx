import { useEffect, useRef } from "react";
import { X } from "phosphor-react";
export default function LearningDrawer({ title, onClose, children }) {
  const close = useRef(null),
    body = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const escape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    close.current?.focus({ preventScroll: true });
    if (body.current) body.current.scrollTop = 0;
  }, [title]);
  return (
    <aside
      id="lesson-learning-drawer"
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="learning-drawer"
    >
      <header>
        <div>
          <h2>{title}</h2>
        </div>
        <button ref={close} aria-label="إغلاق مساحة التعلّم" onClick={onClose}>
          <X size={23} />
        </button>
      </header>
      <div ref={body} className="learning-drawer-body">
        {children}
      </div>
    </aside>
  );
}

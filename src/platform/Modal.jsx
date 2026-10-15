import { useEffect, useRef } from "react";
import { X } from "phosphor-react";
export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      queueMicrotask(() => {
        if (previous?.isConnected) previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="p-modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="إغلاق اللوحة">
          <X size={25} />
        </button>
      </header>
      <div className="p-modal-body">{children}</div>
    </dialog>
  );
}

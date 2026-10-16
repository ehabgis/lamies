import { useId } from "react";
import { CaretDown } from "phosphor-react";
import "./SelectField.css";

// Keep native select semantics and the mobile operating system's picker.
export default function SelectField({ label, hint, compact = false, className = "", children, ...props }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={`select-field ${compact ? "select-field-compact" : ""} ${className}`} data-filled={Boolean(props.value)}>
      <label htmlFor={id}>{label}</label>
      <div className="select-control">
        <select {...props} id={id} aria-label={label} aria-describedby={hint ? hintId : undefined}>{children}</select>
        <CaretDown size={19} weight="bold" aria-hidden="true" />
      </div>
      {hint && <small id={hintId} className="select-field-hint">{hint}</small>}
    </div>
  );
}

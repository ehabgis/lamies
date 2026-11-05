// Notes meant for the teacher — "موضع تقريبي…" and "تحتاج مراجعة المعلم" —
// are kept in the content for review but not shown to students or to the
// open demo (owner's request, 2026-11-05). Only these phrases are removed;
// a string that held nothing else becomes empty and is hidden by the page.
const RULES = [
  // "…؛ موضع تقريبي للمكان المذكور في الكتاب، يحتاج مراجعة المعلم."
  /[؛،]?\s*موضع تقريبي[^.]*?(?:يحتاج|تحتاج)\s+(?:إلى\s+)?مراجعة\s+(?:المعلم|تعليمية)\.?/g,
  /[؛،]?\s*موضع تقريبي[^.]*\.?/g,
  // "عنوان — إضافة توضيحية تحتاج مراجعة المعلم"
  /\s*[—–-]\s*(?:إضافة توضيحية\s*)?(?:تحتاج|يحتاج)\s+مراجعة\s+المعلم/g,
  // "(مسودة تحتاج مراجعة)" and ". مسودة تحتاج مراجعة …"
  /\s*\(\s*مسودة تحتاج مراجعة\s*\)/g,
  /\.?\s*مسودة تحتاج مراجعة[^.]*\.?/g,
  // "…، وتحتاج مراجعة المعلم." / "… يحتاج مراجعة المعلم."
  /[،؛]?\s*و?(?:تحتاج|يحتاج)\s+(?:إلى\s+)?مراجعة\s+(?:المعلم|تعليمية)\.?/g,
];
// Whole sentences that are only a note to the reviewer.
const WHOLE = /[^.\n]*(?:الموقع من إحداثيات النسخة القديمة التقريبية|(?:تحتاج|يحتاج) مراجعة قبل)[^.]*\.?/g;

export function studentText(text) {
  if (typeof text !== "string" || !/تقريبي|مراجعة/.test(text)) return text;
  let out = text.replace(WHOLE, "");
  for (const rule of RULES) out = out.replace(rule, "");
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.،؛:])/g, "$1").trim();
  // A label left alone ("جبل الزيت:") or bare punctuation says nothing.
  if (/^[^.؛،]{0,40}:$/.test(out) || /^[.،؛\s]*$/.test(out)) return "";
  out = out.replace(/[،؛]$/, ".");
  // A sentence that ended with a full stop keeps one.
  return /[.؟!]$/.test(text.trim()) && !/[.؟!)»]$/.test(out) ? `${out}.` : out;
}

export function forStudents(value) {
  if (typeof value === "string") return studentText(value);
  if (Array.isArray(value)) return value.map(forStudents);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = forStudents(v);
    return out;
  }
  return value;
}

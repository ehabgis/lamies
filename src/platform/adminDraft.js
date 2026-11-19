// What the content editor (AdminPage) opens, kept apart from the JSX so it can
// be tested without a browser.

// A catalog node as the editor's draft: its own kind, parent and content,
// never defaults borrowed from the "new content" form.
export function draftFromNode(n) {
  return {
    ...n,
    enabled: n.enabled ?? !n.disabled,
    content: n.content && typeof n.content === "object" ? n.content : {},
  };
}

// The «كنوز مصر» lessons marked bundled: students see the content that comes
// with the app (server/demo.mjs). From the catalog node the server uses only
// the title, publication, review flag, sources and completion XP, so the
// editor must say that its other lesson fields are not what students see.
export function isBundledLesson(draft) {
  return draft?.kind === "lesson" && draft.content?.bundled === true;
}

// Sources of a bundled lesson that nobody has approved yet: imported from the
// sample for review, never treated as approved here.
export function unapprovedSources(draft) {
  return (draft?.content?.sources || []).filter((s) => s?.approved !== true);
}

// What a bundled lesson's catalog node decides, for the editor's summary.
// "approved" counts sources as the server does (approved === true with an id
// and a text): only those reach the smart teacher, and publishing needs one.
// With no saved sources the lesson falls back to the bundled ones, which the
// server always marks unapproved.
export function bundledReview(draft) {
  const sources = draft?.content?.sources || [];
  const approved = sources.filter((s) => s?.approved === true && s.id && s.text).length;
  const reviewed = draft?.content?.reviewRequired === false;
  return {
    published: draft?.status === "published",
    reviewed,
    total: sources.length,
    approved,
    usesBundledSources: sources.length === 0,
    canPublish: reviewed && approved > 0,
  };
}

// Bring the editor into view after a choice in the tree when it is off
// screen (on a phone it sits below the tree). Instant with reduced motion.
export function revealEditor(el, win = globalThis.window) {
  if (!el || !win) return false;
  const r = el.getBoundingClientRect();
  const visible = r.top >= 0 && r.top < win.innerHeight * 0.6;
  if (!visible) {
    const reduced = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  el.focus?.({ preventScroll: true });
  return !visible;
}

// Gives each Nile path its own length so the CSS draw animation can run it
// from its first point (south) to its last; afterwards the dash is cleared so
// zooming (which rewrites the path) never shows a partial river.
export function prepareNileDraw(pane, selector = "path.nile-draw") {
  if (!pane) return;
  for (const path of pane.querySelectorAll(selector)) {
    const length = Math.ceil(path.getTotalLength?.() || 0);
    if (!length) continue;
    path.style.setProperty("--nile-length", length);
    path.classList.add("is-drawing");
    path.addEventListener(
      "animationend",
      () => path.classList.replace("is-drawing", "is-drawn"),
      { once: true },
    );
  }
}

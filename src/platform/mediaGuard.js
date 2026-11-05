// One sound at a time, across the whole app (2026-11-05):
// - a video or audio element that starts playing pauses every other one and
//   stops the robot's voice;
// - the robot starting to speak pauses any playing video or audio;
// - leaving a page (route change) stops everything that is still playing.
// Installed once from main.jsx; components need no wiring of their own.
import * as narrator from "./narrator";

const media = () => [...document.querySelectorAll("video, audio")];

export function stopAllMedia() {
  narrator.stop();
  for (const m of media()) if (!m.paused) m.pause();
}

let installed = false;
export function installMediaGuard() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "play",
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLMediaElement)) return;
      narrator.stop();
      for (const m of media()) if (m !== el && !m.paused) m.pause();
    },
    true,
  );
  narrator.onSpeak(() => {
    for (const m of media()) if (!m.paused && !m.muted) m.pause();
  });
}

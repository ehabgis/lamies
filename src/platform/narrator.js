// Robot narrator: one voice at a time, Arabic, child-friendly pace.
// Uses the browser's speech synthesis (no keys, works offline when the device
// has an Arabic voice). Text is always shown on screen, so nothing depends on
// sound. Speech starts only from a child's action (browser autoplay rules).
const KEY = "lamis.narrator.v1";
const load = () => {
  try {
    return { muted: false, volume: 0.9, rate: 0.9, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { muted: false, volume: 0.9, rate: 0.9 };
  }
};
let settings = load();
let state = "idle"; // idle | speaking | paused
let current = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn({ ...settings, state, available: available() }));

export const available = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export function hasArabicVoice() {
  if (!available()) return false;
  return window.speechSynthesis.getVoices().some((v) => /^ar/i.test(v.lang));
}

function arabicVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^ar-EG/i.test(v.lang)) ||
    voices.find((v) => /^ar/i.test(v.lang) && /google|microsoft|natural/i.test(v.name)) ||
    voices.find((v) => /^ar/i.test(v.lang)) ||
    null
  );
}

export function subscribe(fn) {
  listeners.add(fn);
  fn({ ...settings, state, available: available() });
  return () => listeners.delete(fn);
}

export function getSettings() {
  return { ...settings, state, available: available() };
}

export function update(next) {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
  if (settings.muted) stop();
  emit();
}

export function stop() {
  if (!available()) return;
  current = null;
  window.speechSynthesis.cancel();
  state = "idle";
  emit();
}

// `text` is shown on screen; `spoken` may carry diacritics for clearer names.
export function speak(text, spoken = text) {
  if (!available() || settings.muted || !text) return;
  window.speechSynthesis.cancel();
  // Speak sentence by sentence: short units are clearer and pause cleanly.
  const parts = String(spoken).split(/(?<=[.!؟?،:])\s+/).filter(Boolean);
  const token = {};
  current = token;
  const voice = arabicVoice();
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = voice?.lang || "ar-EG";
    if (voice) u.voice = voice;
    u.rate = settings.rate;
    u.pitch = 1.05;
    u.volume = settings.volume;
    u.onstart = () => {
      if (current !== token) return;
      state = "speaking";
      emit();
    };
    if (i === parts.length - 1)
      u.onend = u.onerror = () => {
        if (current !== token) return;
        state = "idle";
        emit();
      };
    window.speechSynthesis.speak(u);
  });
}

export function pause() {
  if (!available() || state !== "speaking") return;
  window.speechSynthesis.pause();
  state = "paused";
  emit();
}

export function resume() {
  if (!available() || state !== "paused") return;
  window.speechSynthesis.resume();
  state = "speaking";
  emit();
}

if (available()) {
  window.speechSynthesis.onvoiceschanged = () => emit();
  window.addEventListener("pagehide", stop);
}

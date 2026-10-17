// Short sound effects made with the Web Audio API (no audio files). They play
// only in response to something the child just did, never on their own, and a
// mute toggle (header) is remembered on this device.
const KEY = "lamis.sfx.v1";
let ctx = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
})();
const listeners = new Set();

export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? "off" : "on");
  } catch {}
  listeners.forEach((fn) => fn(muted));
}
export function onMuteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio() {
  if (muted || typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ||= new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// One soft note: frequency glide, quick attack, exponential release.
function tone(a, { from, to = from, start = 0, dur = 0.18, type = "sine", gain = 0.12 }) {
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(a, { start = 0, dur = 0.25, gain = 0.06, freq = 900 }) {
  const t = a.currentTime + start;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const amp = a.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, t);
  filter.frequency.exponentialRampToValueAtTime(freq * 2.5, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(amp).connect(a.destination);
  src.start(t);
  src.stop(t + dur);
}

const SOUNDS = {
  tap: (a) => tone(a, { from: 660, to: 720, dur: 0.07, type: "triangle", gain: 0.06 }),
  select: (a) => {
    tone(a, { from: 520, dur: 0.09, type: "triangle", gain: 0.08 });
    tone(a, { from: 780, dur: 0.12, start: 0.07, type: "triangle", gain: 0.08 });
  },
  open: (a) => tone(a, { from: 420, to: 640, dur: 0.16, type: "sine", gain: 0.07 }),
  close: (a) => tone(a, { from: 600, to: 400, dur: 0.12, type: "sine", gain: 0.06 }),
  // Resource kinds
  mineral: (a) => {
    tone(a, { from: 1320, dur: 0.35, type: "sine", gain: 0.07 });
    tone(a, { from: 1980, dur: 0.25, start: 0.02, type: "sine", gain: 0.035 });
  },
  water: (a) => {
    tone(a, { from: 380, to: 900, dur: 0.12, type: "sine", gain: 0.1 });
    tone(a, { from: 480, to: 1100, dur: 0.1, start: 0.11, type: "sine", gain: 0.07 });
  },
  energy: (a) => {
    tone(a, { from: 220, to: 880, dur: 0.22, type: "sawtooth", gain: 0.035 });
    tone(a, { from: 880, dur: 0.12, start: 0.2, type: "triangle", gain: 0.06 });
  },
  wind: (a) => noise(a, { dur: 0.45, gain: 0.07, freq: 500 }),
  project: (a) => {
    [523, 659, 784].forEach((f, i) => tone(a, { from: f, dur: 0.16, start: i * 0.07, type: "triangle", gain: 0.07 }));
  },
  train: (a) => {
    tone(a, { from: 392, dur: 0.18, type: "square", gain: 0.03 });
    tone(a, { from: 494, dur: 0.22, start: 0.16, type: "square", gain: 0.03 });
  },
  // Answers
  correct: (a) => {
    [659, 784, 1047].forEach((f, i) => tone(a, { from: f, dur: 0.2, start: i * 0.09, type: "triangle", gain: 0.09 }));
  },
  wrong: (a) => {
    tone(a, { from: 330, to: 262, dur: 0.22, type: "triangle", gain: 0.08 });
  },
  star: (a) => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(a, { from: f, dur: 0.22, start: i * 0.08, type: "sine", gain: 0.08 }));
  },
};

export function play(name) {
  const a = audio();
  const sound = SOUNDS[name];
  if (!a || !sound) return;
  try {
    sound(a);
  } catch {}
}

// Picks a sound for a map resource from its kind / icon family.
export function resourceSound(resource) {
  if (!resource) return "select";
  const id = resource.id || "";
  const family = resource.iconFamily || "";
  if (resource.kind === "water") return "water";
  if (resource.kind === "mineral") return "mineral";
  if (/wind/.test(id + family)) return "wind";
  if (/rail|train/.test(id + family)) return "train";
  if (["renewable", "nonrenewable"].includes(resource.kind) || /solar|energy/.test(id + family)) return "energy";
  if (resource.kind === "project") return "project";
  return "select";
}

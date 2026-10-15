let audioContext;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

export function playPageTurn({ volume = 0.08 } = {}) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const duration = 0.09;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));

    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      const t = i / frameCount;
      const env = Math.pow(1 - t, 2.7);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.9;

    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 500;

    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));

    source.connect(band);
    band.connect(high);
    high.connect(gain);
    gain.connect(ctx.destination);

    source.start();
  } catch {
    // ignore audio failures (autoplay policies, unsupported APIs, etc.)
  }
}


// 🎵 نظام التأثيرات الصوتية للمعالم
// يولد أصواتًا برمجيًا للمعالم المختلفة (رياح، شمس، معادن، مياه)

let audioContext;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

// صوت الرياح 💨
export function playWindSound({ volume = 0.15, duration = 1.2 } = {}) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // توليد صوت رياح باستخدام ضوضاء بيضاء مع مرشح منخفض التردد
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.5;
      const windFreq = 80 + Math.sin(t * 0.3) * 20; // تردد متغير
      const wave = Math.sin(2 * Math.PI * windFreq * t) * 0.3;
      const env = Math.pow(1 - (i / frameCount), 0.5); // envelope
      data[i] = (noise + wave) * env * volume;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // مرشح منخفض التردد لمحاكاة صوت الرياح
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 300;
    lowpass.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  } catch (err) {
    // تجاهل أخطاء الصوت
    console.debug('Wind sound error:', err);
  }
}

// صوت الشمس/الطاقة الشمسية ☀️
export function playSolarSound({ volume = 0.12, duration = 0.8 } = {}) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // صوت ناعم ومشرق للطاقة الشمسية
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const freq1 = 440; // A4
      const freq2 = 554; // C#5
      const freq3 = 659; // E5
      const wave1 = Math.sin(2 * Math.PI * freq1 * t) * 0.3;
      const wave2 = Math.sin(2 * Math.PI * freq2 * t) * 0.2;
      const wave3 = Math.sin(2 * Math.PI * freq3 * t) * 0.1;
      const env = Math.pow(1 - (i / frameCount), 1.5);
      data[i] = (wave1 + wave2 + wave3) * env * volume;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 200;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(highpass);
    highpass.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  } catch (err) {
    console.debug('Solar sound error:', err);
  }
}

// صوت المعادن ⛏️
export function playMetalSound({ volume = 0.18, duration = 0.6 } = {}) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // صوت معدني مع نغمات عالية
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const freq = 800 + Math.sin(t * 5) * 100;
      const wave = Math.sin(2 * Math.PI * freq * t);
      const harmonic = Math.sin(2 * Math.PI * freq * 2 * t) * 0.5;
      const env = Math.pow(1 - (i / frameCount), 2);
      data[i] = (wave + harmonic) * env * volume;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1000;
    bandpass.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  } catch (err) {
    console.debug('Metal sound error:', err);
  }
}

// صوت المياه 💧
export function playWaterSound({ volume = 0.14, duration = 1.0 } = {}) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // صوت مياه ناعم ومتدفق
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.4;
      const freq = 200 + Math.sin(t * 2) * 50;
      const wave = Math.sin(2 * Math.PI * freq * t) * 0.3;
      const env = Math.pow(1 - (i / frameCount), 0.8);
      data[i] = (noise + wave) * env * volume;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 500;
    lowpass.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  } catch (err) {
    console.debug('Water sound error:', err);
  }
}

// دالة رئيسية لتشغيل الصوت حسب نوع المعلم
export function playLandmarkSound(landmark, options = {}) {
  if (!landmark) return;

  const { category, type, emoji } = landmark;
  const soundEnabled = options.soundEnabled !== false;

  if (!soundEnabled) return;

  // تحديد الصوت حسب الفئة
  if (category === 'energy') {
    // طاقة - تحقق من النوع
    if (type?.includes('رياح') || emoji === '💨' || landmark.name?.includes('رياح')) {
      playWindSound(options);
    } else if (type?.includes('شمس') || emoji === '☀️' || landmark.name?.includes('شمس') || landmark.name?.includes('بنبان')) {
      playSolarSound(options);
    } else {
      // طاقة عامة
      playSolarSound(options);
    }
  } else if (category === 'minerals') {
    // معادن
    playMetalSound(options);
  } else if (category === 'water') {
    // مياه
    playWaterSound(options);
  } else if (category === 'projects') {
    // مشروعات - صوت بناء خفيف
    playMetalSound({ ...options, volume: options.volume || 0.12 });
  } else {
    // صوت افتراضي
    playSolarSound({ ...options, volume: options.volume || 0.1 });
  }
}

// دالة مساعدة للتحقق من دعم الصوت
export function isSoundSupported() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const DEFAULT_EMOJIS = ['', '', '', '', '', ''];

const createRng = (seed = 1) => {
  let value = Number.isFinite(seed) ? seed : 1;
  return () => {
    value |= 0;
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export default function PlayfulParticles({
  count = 14,
  seed = 2026,
  className = '',
  emojis = DEFAULT_EMOJIS,
  direction = 'down'
}) {
  const prefersReducedMotion = useReducedMotion();

  const particles = useMemo(() => {
    const rand = createRng(seed);
    const safeEmojis = Array.isArray(emojis) && emojis.length ? emojis : DEFAULT_EMOJIS;
    const safeCount = Math.max(0, Number(count) || 0);
    return Array.from({ length: safeCount }).map((_, index) => {
      const left = rand() * 100;
      const size = 18 + rand() * 22;
      const drift = (rand() - 0.5) * 240;
      const duration = 14 + rand() * 18;
      const delay = rand() * 10;
      const rotate = (rand() - 0.5) * 220;
      const opacity = 0.18 + rand() * 0.26;
      const emoji = safeEmojis[index % safeEmojis.length];
      return { id: `${seed}-${index}`, left, size, drift, duration, delay, rotate, opacity, emoji };
    });
  }, [count, seed, emojis]);

  if (prefersReducedMotion) return null;

  const goingUp = direction === 'up';

  return (
    <div aria-hidden className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none drop-shadow-sm"
          style={{ left: `${p.left}%`, top: goingUp ? '110vh' : '-80px', fontSize: `${p.size}px` }}
          animate={{
            y: goingUp ? ['110vh', '-80px'] : ['-80px', '110vh'],
            x: [0, p.drift],
            rotate: [0, p.rotate],
            opacity: [0, p.opacity, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: p.delay
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

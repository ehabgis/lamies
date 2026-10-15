import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

const toPercent = (value, max) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return '50%';
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
};

export default function GlobalPointerGlow() {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const root = document.documentElement;
    let raf = 0;
    let latestX = window.innerWidth * 0.5;
    let latestY = window.innerHeight * 0.35;

    const apply = () => {
      raf = 0;
      root.style.setProperty('--kid-mx', toPercent(latestX, window.innerWidth));
      root.style.setProperty('--kid-my', toPercent(latestY, window.innerHeight));
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    const onPointerMove = (event) => {
      latestX = event.clientX ?? latestX;
      latestY = event.clientY ?? latestY;
      schedule();
    };

    const onTouchMove = (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      latestX = touch.clientX ?? latestX;
      latestY = touch.clientY ?? latestY;
      schedule();
    };

    root.style.setProperty('--kid-mx', toPercent(latestX, window.innerWidth));
    root.style.setProperty('--kid-my', toPercent(latestY, window.innerHeight));

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', schedule);
    };
  }, [prefersReducedMotion]);

  return null;
}


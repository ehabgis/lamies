import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const INTERACTIVE_SELECTOR = [
  '.kid-button',
  '.interactive-card',
  '.interactive-chip',
  '.map-marker-chip',
  '.lesson-dashboard-map-quick-card',
  '[data-interactive="true"]'
].join(', ');

const REACTION_EMOJIS = ['✨', '🎉', '⭐', '💫', '🪄', '🌈', '🫧', '🚀'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const randomInRange = (min, max) => min + Math.random() * (max - min);

const clearFxState = (element) => {
  if (!element) return;
  element.removeAttribute('data-kid-fx');
  element.style.removeProperty('--kid-fx-x');
  element.style.removeProperty('--kid-fx-y');
};

export default function GlobalInteractiveBooster() {
  const prefersReducedMotion = useReducedMotion();
  const [bursts, setBursts] = useState([]);
  const activeElementRef = useRef(null);
  const rafRef = useRef(0);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const applyPointerFx = () => {
      rafRef.current = 0;
      const pending = pendingRef.current;
      if (!pending) return;

      const { target, x, y } = pending;
      if (!target || !target.isConnected) return;

      const rect = target.getBoundingClientRect();
      const percentX = clamp(((x - rect.left) / Math.max(1, rect.width)) * 100, 0, 100);
      const percentY = clamp(((y - rect.top) / Math.max(1, rect.height)) * 100, 0, 100);

      target.setAttribute('data-kid-fx', '1');
      target.style.setProperty('--kid-fx-x', `${percentX.toFixed(1)}%`);
      target.style.setProperty('--kid-fx-y', `${percentY.toFixed(1)}%`);
    };

    const schedulePointerFx = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(applyPointerFx);
    };

    const onPointerMove = (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) return;

      const interactiveTarget = rawTarget.closest(INTERACTIVE_SELECTOR);
      if (!interactiveTarget) {
        if (activeElementRef.current) {
          clearFxState(activeElementRef.current);
          activeElementRef.current = null;
        }
        return;
      }

      if (activeElementRef.current && activeElementRef.current !== interactiveTarget) {
        clearFxState(activeElementRef.current);
      }
      activeElementRef.current = interactiveTarget;
      pendingRef.current = {
        target: interactiveTarget,
        x: event.clientX,
        y: event.clientY
      };
      schedulePointerFx();
    };

    const onPointerDown = (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) return;
      const interactiveTarget = rawTarget.closest(INTERACTIVE_SELECTOR);
      if (!interactiveTarget) return;

      const centerX = event.clientX;
      const centerY = event.clientY;
      const burstId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const nextBurst = Array.from({ length: 7 }).map((_, index) => ({
        id: `${burstId}-${index}`,
        x: centerX,
        y: centerY,
        dx: randomInRange(-70, 70),
        dy: randomInRange(-85, 50),
        rotate: randomInRange(-80, 80),
        scale: randomInRange(0.85, 1.25),
        emoji: REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)]
      }));

      setBursts((previous) => [...previous.slice(-24), ...nextBurst]);
      window.setTimeout(() => {
        setBursts((previous) => previous.filter((item) => !item.id.startsWith(burstId)));
      }, 980);
    };

    const onWindowBlur = () => {
      if (!activeElementRef.current) return;
      clearFxState(activeElementRef.current);
      activeElementRef.current = null;
    };

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', onWindowBlur);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (activeElementRef.current) clearFxState(activeElementRef.current);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[145] overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.span
            key={burst.id}
            className="absolute select-none text-xl"
            style={{ left: 0, top: 0 }}
            initial={{
              opacity: 0,
              x: burst.x,
              y: burst.y,
              scale: 0.4
            }}
            animate={{
              opacity: [0, 1, 0],
              x: burst.x + burst.dx,
              y: burst.y + burst.dy,
              scale: [0.45, burst.scale, 0.2],
              rotate: [0, burst.rotate]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {burst.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}


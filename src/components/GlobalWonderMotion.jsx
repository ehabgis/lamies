import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const FLOATERS = [
  { id: 'floater-rocket', emoji: '', top: '6%', duration: 23, delay: 0.2, scale: 1.06, size: '1.9rem' },
  { id: 'floater-rainbow', emoji: '', top: '11%', duration: 28, delay: 3.4, scale: 1.04, size: '1.8rem' },
  { id: 'floater-robot', emoji: '', top: '15%', duration: 26, delay: 1.7, scale: 1.08, size: '1.9rem' },
  { id: 'floater-puzzle', emoji: '', top: '83%', duration: 24, delay: 4.8, scale: 0.98, size: '1.7rem' },
  { id: 'floater-balloon', emoji: '', top: '88%', duration: 27, delay: 5.4, scale: 0.96, size: '1.75rem' },
  { id: 'floater-spark', emoji: '', top: '92%', duration: 21, delay: 2.2, scale: 0.95, size: '1.65rem' },
  { id: 'floater-kite', emoji: '', top: '95%', duration: 30, delay: 6.2, scale: 0.92, size: '1.55rem' }
];

const LANE_RUNNERS = [
  { id: 'runner-bot', emoji: '', top: '96%', size: '1.9rem', duration: 14.6, delay: 0.4 },
  { id: 'runner-train', emoji: '', top: '90%', size: '1.75rem', duration: 16.2, delay: 3.6 },
  { id: 'runner-plane', emoji: '', top: '5%', size: '1.6rem', duration: 19.4, delay: 5.1 }
];

const ROUTE_THEME_MAP = {
  default: {
    tip: 'مغامرة جديدة بدأت! ',
    colors: ['rgba(255, 222, 130, 0.46)', 'rgba(146, 214, 255, 0.42)']
  },
  '/home': {
    tip: 'يلا نلعب ونتعلم معًا! ',
    colors: ['rgba(255, 206, 153, 0.46)', 'rgba(163, 214, 255, 0.42)']
  },
  '/map': {
    tip: 'استعد لاكتشاف جديد على الخريطة! ',
    colors: ['rgba(125, 213, 255, 0.46)', 'rgba(155, 246, 209, 0.38)']
  },
  '/lessons': {
    tip: 'جاهز للدرس الممتع؟ ',
    colors: ['rgba(255, 179, 201, 0.46)', 'rgba(255, 225, 143, 0.4)']
  },
  '/awards': {
    tip: 'الشارات الجديدة مستنياك! ',
    colors: ['rgba(255, 212, 126, 0.5)', 'rgba(255, 166, 217, 0.38)']
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const pickRouteTheme = (pathname = '/') => {
  if (pathname.startsWith('/lesson/')) {
    return {
      tip: 'ركز خطوة خطوة وابقى بطل الدرس! ',
      colors: ['rgba(180, 220, 255, 0.46)', 'rgba(255, 211, 145, 0.4)']
    };
  }
  if (pathname.startsWith('/quiz/')) {
    return {
      tip: 'سؤال جديد! جاوب بثقة ',
      colors: ['rgba(255, 196, 170, 0.5)', 'rgba(187, 238, 255, 0.4)']
    };
  }
  return ROUTE_THEME_MAP[pathname] || ROUTE_THEME_MAP.default;
};

const buildTwinkleDots = (count) =>
  Array.from({ length: count }).map((_, index) => ({
    id: `twinkle-${index}`,
    left: `${Math.round(
      index % 4 === 0
        ? Math.random() * 100
        : index % 4 === 1
          ? Math.random() * 100
          : index % 4 === 2
            ? 2 + Math.random() * 10
            : 88 + Math.random() * 10
    )}%`,
    top: `${Math.round(
      index % 4 === 0
        ? 2 + Math.random() * 12
        : index % 4 === 1
          ? 86 + Math.random() * 12
          : 16 + Math.random() * 68
    )}%`,
    size: 1.3 + Math.random() * 2.2,
    delay: Math.random() * 4.6,
    duration: 2.2 + Math.random() * 2.5
  }));

const buildOrbiters = (count) =>
  Array.from({ length: count }).map((_, index) => ({
    id: `orbiter-${index}`,
    emoji: ['', '', '', '', ''][index % 5],
    left: `${index % 4 < 2 ? 8 + ((index * 11.5) % 84) : index % 4 === 2 ? 5 : 95}%`,
    top: `${index % 4 === 0 ? 7 : index % 4 === 1 ? 93 : 20 + ((index * 9.5) % 60)}%`,
    duration: 5.6 + (index % 5) * 0.9,
    delay: index * 0.25
  }));

export default function GlobalWonderMotion() {
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();
  const [routeFx, setRouteFx] = useState({
    key: '',
    message: '',
    colors: ROUTE_THEME_MAP.default.colors
  });
  const [pointer, setPointer] = useState({ x: 50, y: 35 });
  const frameRef = useRef(0);
  const pendingPointerRef = useRef(pointer);

  const twinkleDots = useMemo(() => buildTwinkleDots(28), []);
  const orbiters = useMemo(() => buildOrbiters(12), []);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const applyPointer = () => {
      frameRef.current = 0;
      setPointer(pendingPointerRef.current);
    };

    const schedule = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(applyPointer);
    };

    const onPointerMove = (event) => {
      pendingPointerRef.current = {
        x: clamp((event.clientX / Math.max(1, window.innerWidth)) * 100, 0, 100),
        y: clamp((event.clientY / Math.max(1, window.innerHeight)) * 100, 0, 100)
      };
      schedule();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const nextTheme = pickRouteTheme(location.pathname);
    setRouteFx({
      key: `${location.pathname}-${Date.now()}`,
      message: nextTheme.tip,
      colors: nextTheme.colors
    });
  }, [location.pathname, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  const parallaxX = (pointer.x - 50) * 0.34;
  const parallaxY = (pointer.y - 50) * 0.28;
  const routeGlowA = routeFx.colors?.[0] || 'rgba(255, 235, 167, 0.46)';
  const routeGlowB = routeFx.colors?.[1] || 'rgba(148, 211, 255, 0.42)';

  return (
    <div aria-hidden className="global-wonder-layer pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      <motion.div
        className="absolute -right-[12%] -top-[14%] h-[42vw] w-[42vw] rounded-full blur-3xl"
        animate={{ x: parallaxX * 0.45, y: parallaxY * 0.38, opacity: [0.28, 0.5, 0.28] }}
        transition={{ type: 'spring', stiffness: 46, damping: 24, mass: 1.06 }}
        style={{
          background: `radial-gradient(circle, ${routeGlowA} 0%, rgba(255,255,255,0) 72%)`
        }}
      />
      <motion.div
        className="absolute -left-[10%] -bottom-[16%] h-[40vw] w-[40vw] rounded-full blur-3xl"
        animate={{ x: parallaxX * -0.34, y: parallaxY * -0.32, opacity: [0.24, 0.44, 0.24] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: `radial-gradient(circle, ${routeGlowB} 0%, rgba(255,255,255,0) 72%)`
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 8% 10%, rgba(255,255,255,0.62) 0 1px, rgba(255,255,255,0) 4px),
            radial-gradient(circle at 92% 14%, rgba(255,255,255,0.5) 0 1px, rgba(255,255,255,0) 4px),
            radial-gradient(circle at 10% 88%, rgba(255,255,255,0.42) 0 1px, rgba(255,255,255,0) 4px),
            radial-gradient(circle at 90% 86%, rgba(255,255,255,0.32) 0 1px, rgba(255,255,255,0) 4px)
          `,
          backgroundSize: '360px 360px, 300px 300px, 260px 260px, 240px 240px',
          animation: 'sparkle-drift 24s linear infinite'
        }}
      />

      {twinkleDots.map((dot) => (
        <motion.span
          key={dot.id}
          className="absolute rounded-full bg-white/80"
          style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
          animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.7, 1.4, 0.7] }}
          transition={{
            delay: dot.delay,
            duration: dot.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}

      <motion.div
        className="absolute inset-0"
        animate={{ x: parallaxX * -0.22, y: parallaxY * -0.22 }}
        transition={{ type: 'spring', stiffness: 36, damping: 22 }}
      >
        {orbiters.map((orb) => (
          <motion.span
            key={orb.id}
            className="absolute select-none text-base"
            style={{ left: orb.left, top: orb.top }}
            animate={{
              x: [-8, 10, -6, -8],
              y: [0, -10, 5, 0],
              rotate: [0, 14, -10, 0],
              opacity: [0.4, 0.9, 0.55, 0.4]
            }}
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {orb.emoji}
          </motion.span>
        ))}
      </motion.div>

      {FLOATERS.map((floater) => (
        <motion.div
          key={floater.id}
          className="absolute select-none drop-shadow-lg"
          style={{ top: floater.top, left: '-14vw', fontSize: floater.size }}
          animate={{
            x: ['0vw', '126vw'],
            y: [0, -15, 0, 11, 0],
            rotate: [0, 7, -7, 0],
            scale: [floater.scale * 0.9, floater.scale, floater.scale * 0.93]
          }}
          transition={{
            delay: floater.delay,
            duration: floater.duration,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {floater.emoji}
        </motion.div>
      ))}

      {LANE_RUNNERS.map((runner) => (
        <motion.div
          key={runner.id}
          className="absolute select-none opacity-90"
          style={{ top: runner.top, left: '-18vw', fontSize: runner.size }}
          animate={{ x: ['0vw', '138vw'], y: [0, -4, 0], rotate: [0, 2, -2, 0] }}
          transition={{
            duration: runner.duration,
            delay: runner.delay,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {runner.emoji}
        </motion.div>
      ))}

      <AnimatePresence>
        {routeFx.key && (
          <>
            <motion.div
              key={`route-pulse-${routeFx.key}`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.66, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.22, ease: 'easeOut' }}
              style={{
                background: `radial-gradient(circle at 90% 12%, ${routeGlowA} 0%, ${routeGlowB} 24%, rgba(255,255,255,0) 58%)`
              }}
            />
            <motion.div
              key={`route-badge-${routeFx.key}`}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: [0, 1, 1, 0], y: [16, 0, 0, -12], scale: [0.95, 1, 1, 0.96] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
              className="absolute right-4 top-6 rounded-full border border-white/80 bg-white/92 px-4 py-2 text-xs font-black text-slate-700 shadow-xl md:right-6"
            >
              {routeFx.message}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

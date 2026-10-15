import { motion, useReducedMotion } from 'framer-motion';

export default function PageTransition({ children }) {
  const prefersReducedMotion = useReducedMotion();

  const transition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.16, ease: 'easeOut' };

  const exitTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.08, ease: 'easeOut' };

  return (
    <motion.div
      className="relative overflow-x-hidden"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition }}
      exit={{ opacity: 0, transition: exitTransition }}
    >
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0.75, x: '-120%' }}
          animate={{ opacity: 0, x: '120%' }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.55) 45%, transparent 80%)',
            mixBlendMode: 'overlay'
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

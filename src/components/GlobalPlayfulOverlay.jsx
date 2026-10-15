import { useReducedMotion } from 'framer-motion';
import PlayfulParticles from './PlayfulParticles';

export default function GlobalPlayfulOverlay() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="magic-orbs opacity-80">
        <span className="magic-orb orb-1" />
        <span className="magic-orb orb-2" />
        <span className="magic-orb orb-3" />
        <span className="magic-orb orb-4" />
        <span className="magic-orb orb-5" />
        <span className="magic-orb orb-6" />
      </div>

      <PlayfulParticles
        count={24}
        seed={2026}
        className="opacity-72"
        emojis={['✨', '⭐', '🌟', '💫', '🌈', '💎', '🎈']}
        direction="down"
      />

      <PlayfulParticles
        count={14}
        seed={4096}
        className="opacity-60"
        emojis={['🫧', '🫧', '🫧', '✨']}
        direction="up"
      />

      <PlayfulParticles
        count={10}
        seed={7711}
        className="opacity-45"
        emojis={['🤖', '🛸', '✨', '🌟', '🎉']}
        direction="down"
      />
    </div>
  );
}

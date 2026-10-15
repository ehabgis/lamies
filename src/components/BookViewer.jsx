import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretLeft, CaretRight } from 'phosphor-react';
import { playPageTurn } from '../utils/pageTurnSfx';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function useResizeBox(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

function HtmlSlide({ html, baseWidth, baseHeight }) {
  const boxRef = useRef(null);
  const { width, height } = useResizeBox(boxRef);

  const scale = useMemo(() => {
    if (!width || !height) return 1;
    const s = Math.min(width / baseWidth, height / baseHeight);
    return Number.isFinite(s) && s > 0 ? s : 1;
  }, [width, height, baseWidth, baseHeight]);

  return (
    <div ref={boxRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      <div
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
        // pptx-to-html returns self-contained HTML; trusted local content
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function ImagePage({ src, alt }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

const pageVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
    rotateY: direction > 0 ? 75 : -75,
    scale: 0.98,
    transformOrigin: direction > 0 ? '100% 50%' : '0% 50%'
  }),
  center: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transformOrigin: '50% 50%'
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
    rotateY: direction > 0 ? -75 : 75,
    scale: 0.98,
    transformOrigin: direction > 0 ? '0% 50%' : '100% 50%'
  })
};

export default function BookViewer({
  pages = [],
  initialIndex = 0,
  soundEnabled = true,
  htmlBaseWidth = 1280,
  htmlBaseHeight = 720,
  className = ''
}) {
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, Math.max(0, pages.length - 1)));
  const [direction, setDirection] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    setIndex((prev) => clamp(prev, 0, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  useEffect(() => {
    setIndex(clamp(initialIndex, 0, Math.max(0, pages.length - 1)));
    setDirection(1);
  }, [initialIndex]);

  const canPrev = index > 0;
  const canNext = index < pages.length - 1;

  const goTo = (nextIndex) => {
    const target = clamp(nextIndex, 0, Math.max(0, pages.length - 1));
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    setIndex(target);
    setHasInteracted(true);
    if (soundEnabled) playPageTurn();
  };

  const goPrev = () => {
    if (!canPrev) return;
    goTo(index - 1);
  };

  const goNext = () => {
    if (!canNext) return;
    goTo(index + 1);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, canNext, canPrev, soundEnabled, pages.length]);

  const current = pages[index];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-black text-slate-600">
          صفحة <span className="text-slate-800">{pages.length ? index + 1 : 0}</span> / {pages.length}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: canPrev ? 1.04 : 1 }}
            whileTap={{ scale: canPrev ? 0.98 : 1 }}
            onClick={goPrev}
            disabled={!canPrev}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black border transition ${canPrev ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
          >
            <CaretRight size={18} weight="bold" className="rotate-180" />
            السابق
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: canNext ? 1.04 : 1 }}
            whileTap={{ scale: canNext ? 0.98 : 1 }}
            onClick={goNext}
            disabled={!canNext}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black border transition ${canNext ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
          >
            التالي
            <CaretRight size={18} weight="bold" />
          </motion.button>
        </div>
      </div>

      <div
        className="relative w-full rounded-[28px] border border-slate-100 shadow-2xl overflow-hidden bg-gradient-to-br from-[#FFF9E7] via-white to-[#E8F6FF]"
        style={{ perspective: 1400 }}
      >
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-200/60 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-slate-200/40 to-transparent pointer-events-none" />

        <div className="relative h-[72vh] max-h-[760px] min-h-[420px]">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {current && (
              <motion.div
                key={current.key || `${index}`}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 p-3 sm:p-4"
                style={{ transformStyle: 'preserve-3d' }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -90 || info.velocity.x < -700) goNext();
                  if (info.offset.x > 90 || info.velocity.x > 700) goPrev();
                }}
              >
                <div className="relative w-full h-full rounded-3xl bg-white overflow-hidden border border-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/0 via-white/0 to-slate-50/80" />

                  {current.type === 'html' && (
                    <HtmlSlide html={current.html} baseWidth={htmlBaseWidth} baseHeight={htmlBaseHeight} />
                  )}
                  {current.type === 'image' && (
                    <ImagePage src={current.src} alt={current.alt || `Page ${index + 1}`} />
                  )}

                  {/* clickable zones */}
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={goPrev}
                    disabled={!canPrev}
                    className={`absolute inset-y-0 left-0 w-1/4 sm:w-1/5 ${canPrev ? 'cursor-pointer' : 'cursor-not-allowed'} bg-transparent`}
                  />
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={goNext}
                    disabled={!canNext}
                    className={`absolute inset-y-0 right-0 w-1/4 sm:w-1/5 ${canNext ? 'cursor-pointer' : 'cursor-not-allowed'} bg-transparent`}
                  />

                  {/* nav hints */}
                  <motion.div
                    initial={false}
                    animate={{ opacity: canPrev ? 1 : 0.25 }}
                    className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-4 pointer-events-none"
                  >
                    <div className="w-11 h-11 rounded-full bg-white/85 border border-slate-100 shadow flex items-center justify-center">
                      <CaretLeft size={22} weight="bold" className="text-slate-700" />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={false}
                    animate={{ opacity: canNext ? 1 : 0.25 }}
                    className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 pointer-events-none"
                  >
                    <div className="w-11 h-11 rounded-full bg-white/85 border border-slate-100 shadow flex items-center justify-center">
                      <CaretRight size={22} weight="bold" className="text-slate-700" />
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {!hasInteracted && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.25 }}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 border border-slate-100 shadow px-4 py-2 rounded-full text-xs font-black text-slate-700"
                      >
                        اسحب يمين/شمال أو اضغط على الحواف للتقليب
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

const ROBOT_BUDDIES = [
  {
    id: 'buddy-lumo',
    name: 'لومو',
    emoji: '🤖',
    shellClass: 'from-cyan-400 via-sky-400 to-blue-500',
    ringClass: 'from-cyan-200 to-sky-200',
    positionClass: 'left-3 bottom-28 md:left-6 md:bottom-32'
  },
  {
    id: 'buddy-ziko',
    name: 'المرشد',
    emoji: '👋',
    imagePath: '/lesson-media/friend-guide.svg',
    shellClass: 'from-fuchsia-400 via-pink-400 to-rose-500',
    ringClass: 'from-pink-200 to-rose-200',
    positionClass: 'hidden md:block left-3 top-24 md:left-6 md:top-20'
  }
];

const DEFAULT_TIPS = [
  'أنا معاك يا بطل. دوس على أي حاجة وأنا أشرحها لك بسرعة.',
  'يلا بينا لعبة جديدة: كل ضغطة ليها معلومة حلوة.',
  'لو حسيت إن خطوة صعبة، قولي وأنا أبسطها لك فورًا.'
];

const MAP_TIPS = [
  'يلا نختار معلم من الخريطة ونكتشف حكايته.',
  'ركز على: فين المكان؟ وليه مهم؟ دي أسرع طريقة للحفظ.',
  'اختار علامة واحدة بس دلوقتي وهنكمل خطوة خطوة.'
];

const LESSON_TIPS = [
  'ابدأ بالملخص الصغير الأول، وبعدها شوف المثال.',
  'افتح صورة أو فيديو واحد، وبعدها جاوب سؤال بسيط.',
  'قول المصطلح الجديد بصوت عالي مرتين عشان يثبت.'
];

const AWARDS_TIPS = [
  'كل إجابة صح تقربك من شارة جديدة.',
  'عايز نقاط أسرع؟ راجع الدروس السهلة الأول.',
  'هدفنا دلوقتي: نكسب شارة جديدة سوا.'
];

const HOME_TIPS = [
  'ابدأ بالخريطة الأول، وبعدها ارجع على الدروس.',
  'رحلة البطل: خريطة ثم درس ثم تحدي ثم جائزة.',
  'اختار درس واحد النهاردة وخليه هدفك.'
];

const QUIZ_TIPS = [
  'خد نفس صغير وفكر بهدوء. أنت تقدر.',
  'قبل الإجابة، بص على الكلمات المفتاحية في السؤال.',
  'حتى لو غلطت، عادي. المحاولة الجاية هتبقى أحسن.'
];

const EXTRA_CHIRPS = [
  'أنا سامعك طول الوقت. دوس وأنا أتكلم معاك.',
  'شاطر! كل خطوة صغيرة بتخليك أقوى.',
  'لو عايز شرح أسهل، قولي: اشرحها أبسط.',
  'أنا مبسوط بيك. كمّل وأنا معاك.'
];

const pickRandom = (items = []) => {
  if (!Array.isArray(items) || !items.length) return '';
  return items[Math.floor(Math.random() * items.length)];
};

const pickRandomDifferent = (items = [], lastValue = '') => {
  if (!Array.isArray(items) || !items.length) return '';
  const filtered = items.filter((item) => item && item !== lastValue);
  return pickRandom(filtered.length ? filtered : items);
};

const resolveTipsByPath = (pathname = '/') => {
  if (pathname === '/map' || pathname.startsWith('/map/')) return MAP_TIPS;
  if (pathname === '/home') return HOME_TIPS;
  if (pathname === '/lessons' || pathname.startsWith('/lesson/')) return LESSON_TIPS;
  if (pathname === '/awards') return AWARDS_TIPS;
  if (pathname.startsWith('/quiz/')) return QUIZ_TIPS;
  return DEFAULT_TIPS;
};

export default function GlobalRobotBuddies() {
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();
  const { enabled, speak } = useVoiceNarration();
  const [activeBubbleRobotId, setActiveBubbleRobotId] = useState('');
  const [tipByRobot, setTipByRobot] = useState(() => ({
    'buddy-lumo': DEFAULT_TIPS[0],
    'buddy-ziko': DEFAULT_TIPS[1]
  }));
  const lastSpokenTipRef = useRef('');

  const routeTips = useMemo(
    () => resolveTipsByPath(location.pathname),
    [location.pathname]
  );

  const allTips = useMemo(
    () => [...routeTips, ...EXTRA_CHIRPS],
    [routeTips]
  );

  const updateRobotTip = useCallback((robotId, options = {}) => {
    const withSpeech = options.withSpeech === true;
    const sourceTips = allTips.length ? allTips : DEFAULT_TIPS;
    const nextTip = pickRandomDifferent(sourceTips, lastSpokenTipRef.current) || pickRandom(sourceTips);
    if (!nextTip) return;

    setTipByRobot((prev) => ({
      ...prev,
      [robotId]: nextTip
    }));
    setActiveBubbleRobotId(robotId);

    if (withSpeech && enabled) {
      lastSpokenTipRef.current = nextTip;
      speak(nextTip, {
        channel: 'ui-focus',
        profile: 'child',
        interrupt: false,
        rate: 1.16,
        pitch: 1.42
      });
    }
  }, [allTips, enabled, speak]);

  useEffect(() => {
    updateRobotTip('buddy-lumo', { withSpeech: false });
    updateRobotTip('buddy-ziko', { withSpeech: false });
  }, [location.pathname, updateRobotTip]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const interval = window.setInterval(() => {
      const robot = ROBOT_BUDDIES[Math.floor(Math.random() * ROBOT_BUDDIES.length)];
      updateRobotTip(robot.id, { withSpeech: false });
    }, 7000);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion, updateRobotTip]);

  useEffect(() => {
    if (prefersReducedMotion || !enabled) return undefined;

    const interval = window.setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis?.pending) return;
      const robot = ROBOT_BUDDIES[Math.floor(Math.random() * ROBOT_BUDDIES.length)];
      updateRobotTip(robot.id, { withSpeech: true });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [enabled, prefersReducedMotion, updateRobotTip]);

  useEffect(() => {
    if (!activeBubbleRobotId) return undefined;
    const timer = window.setTimeout(() => {
      setActiveBubbleRobotId('');
    }, 6800);
    return () => window.clearTimeout(timer);
  }, [activeBubbleRobotId]);

  if (prefersReducedMotion) return null;

  return (
    <div aria-hidden className="global-robot-layer pointer-events-none fixed inset-0 z-[140]">
      {ROBOT_BUDDIES.map((robot, index) => {
        const robotTip = tipByRobot[robot.id] || pickRandom(routeTips) || '';
        const isBubbleOpen = activeBubbleRobotId === robot.id;

        return (
          <div key={robot.id} className={`absolute ${robot.positionClass} pointer-events-auto`}>
            <AnimatePresence>
              {isBubbleOpen && robotTip && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="mb-2 w-[250px] max-w-[74vw] rounded-2xl border-2 border-white bg-white/95 px-3 py-2.5 shadow-2xl text-right"
                >
                  <p className="text-[11px] font-black text-slate-800 leading-relaxed">
                    {robotTip}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onMouseEnter={() => updateRobotTip(robot.id, { withSpeech: false })}
              onClick={() => updateRobotTip(robot.id, { withSpeech: true })}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.94 }}
              animate={{
                y: [0, -10, 0],
                rotate: [0, index === 0 ? 3 : -3, 0]
              }}
              transition={{
                duration: index === 0 ? 4.6 : 5.4,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className={`relative h-14 w-14 rounded-2xl border-4 border-white bg-gradient-to-br ${robot.shellClass} shadow-[0_12px_26px_rgba(15,23,42,0.32)] kid-button`}
              title={`${robot.name} - اضغط لنصيحة`}
            >
              {robot.imagePath ? (
                <img src={robot.imagePath} alt={robot.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <span className="text-3xl drop-shadow-sm">{robot.emoji}</span>
              )}
              <motion.span
                className={`absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${robot.ringClass} border border-white text-[10px]`}
                animate={{ scale: [1, 1.18, 1], rotate: [0, 20, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                ✨
              </motion.span>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}

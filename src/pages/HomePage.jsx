import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Books,
  ChatCircleDots,
  Compass,
  GraduationCap,
  MapPin,
  Sparkle,
  Star,
  Trophy
} from 'phosphor-react';
import { useGameStore } from '../store/gameStore';

const TALK_TO_MAP_URL = 'https://talk-with-map.vercel.app/';

const QUICK_LINKS = [
  { label: 'الدروس', path: '/lessons', icon: Books },
  { label: 'جوائزي', path: '/awards', icon: Trophy }
];

const MAP_PINS = [
  { id: 'alexandria', label: 'الإسكندرية', x: 36, y: 16, color: '#63dcff' },
  { id: 'cairo', label: 'القاهرة', x: 49, y: 26, color: '#f7b955' },
  { id: 'aswan', label: 'أسوان', x: 55, y: 78, color: '#f472b6' }
];

function EgyptMap({ onExplore }) {
  return (
    <div className="smart-home-map-shell" aria-label="خريطة مصر التفاعلية">
      <div className="smart-home-map-orbit" aria-hidden="true" />
      <svg className="smart-home-map" viewBox="0 0 420 500" role="img" aria-labelledby="egypt-map-title">
        <title id="egypt-map-title">خريطة مبسطة لجمهورية مصر العربية ونهر النيل</title>
        <defs>
          <linearGradient id="egyptFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d5dfc" stopOpacity=".27" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity=".13" />
          </linearGradient>
          <linearGradient id="egyptStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#73e9ff" />
            <stop offset="52%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#fb77c8" />
          </linearGradient>
          <filter id="mapGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="riverGlow" x="-80%" y="-20%" width="260%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path
          className="smart-home-egypt-shape"
          d="M93 62 L312 62 L332 111 L350 151 L334 181 L317 209 L305 247 L296 291 L282 336 L266 383 L252 441 L148 437 L132 391 L116 344 L103 299 L91 247 L83 196 L76 145 Z"
          fill="url(#egyptFill)"
          stroke="url(#egyptStroke)"
          strokeWidth="4"
          strokeLinejoin="round"
          filter="url(#mapGlow)"
        />
        <path
          className="smart-home-sinai"
          d="M312 63 L391 116 L332 182 L305 247 L302 126 Z"
          fill="rgba(109,93,252,.13)"
          stroke="url(#egyptStroke)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter="url(#mapGlow)"
        />
        <path className="smart-home-map-grid" d="M87 153 L332 153 M98 252 L303 252 M121 350 L277 350 M151 64 L151 438 M224 63 L224 440" />
        <path
          className="smart-home-nile"
          d="M221 423 C217 385 220 355 216 320 C211 284 220 252 214 215 C211 186 221 158 213 131 C208 115 200 99 192 84 M213 132 C228 111 244 94 264 81 M213 132 C198 113 182 97 163 87"
          fill="none"
          stroke="#64e6ff"
          strokeWidth="6"
          strokeLinecap="round"
          filter="url(#riverGlow)"
        />
      </svg>

      {MAP_PINS.map((pin, index) => (
        <motion.button
          key={pin.id}
          type="button"
          className="smart-home-pin"
          style={{ left: `${pin.x}%`, top: `${pin.y}%`, '--pin-color': pin.color }}
          initial={{ opacity: 0, y: -18, scale: 0.6 }}
          animate={{ opacity: 1, y: [0, -7, 0], scale: 1 }}
          transition={{ opacity: { delay: 0.55 + index * 0.12 }, scale: { delay: 0.55 + index * 0.12 }, y: { delay: index * 0.4, duration: 2.8, repeat: Infinity } }}
          onClick={onExplore}
          aria-label={`استكشف ${pin.label}`}
        >
          <MapPin size={32} weight="fill" />
          <span>{pin.label}</span>
        </motion.button>
      ))}

      <div className="smart-home-map-caption">
        <Compass size={20} weight="duotone" />
        <span>اضغط على أي نقطة وابدأ الاكتشاف</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { playerName = 'بطلنا', totalPoints = 0 } = useGameStore();

  const openSmartDialog = () => {
    window.open(TALK_TO_MAP_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <main data-tts-root className="smart-home" dir="rtl">
      <div className="smart-home-stars" aria-hidden="true">
        <span className="star star-one" /><span className="star star-two" />
        <span className="star star-three" /><span className="star star-four" />
      </div>

      <div className="smart-home-container">
        <motion.header
          className="smart-home-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="smart-home-brand-mark" aria-hidden="true">
            <MapPin size={30} weight="fill" />
            <Books size={27} weight="duotone" />
          </div>
          <div className="smart-home-heading">
            <span className="smart-home-kicker"><Sparkle size={16} weight="fill" /> تعلّم واكتشف</span>
            <h1>الخرائط التعليمية الذكية</h1>
            <p>رحلة تفاعلية ممتعة لاكتشاف كنوز مصر</p>
          </div>
          <div className="smart-home-score" aria-label={`${totalPoints} نقطة`}>
            <Star size={20} weight="fill" />
            <span>{totalPoints}</span>
            <small>نقطة</small>
          </div>
        </motion.header>

        <section className="smart-home-hero">
          {/* ── الجانب الأيمن: بطاقة التحكم والخيارات (الكلام علي اليمين) ── */}
          <motion.div
            className="smart-home-panel"
            initial={{ opacity: 0, x: 35 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            <div className="smart-home-welcome">
              <span className="smart-home-welcome-icon"><GraduationCap size={26} weight="duotone" /></span>
              <div>
                <p>أهلًا يا {playerName}!</p>
                <h2>جاهز تبدأ مغامرة جديدة؟</h2>
              </div>
            </div>

            <div className="smart-home-mode-row">
              <button type="button" className="smart-home-mode active" onClick={() => navigate('/map')}>
                <Compass size={21} weight="fill" /> معلمك الذكي
              </button>
              <button type="button" className="smart-home-mode" onClick={openSmartDialog}>
                <ChatCircleDots size={21} weight="fill" /> حوار ذكي
              </button>
            </div>

            <div className="smart-home-search-box">
              <input
                type="text"
                placeholder="اسأل عن أي مكان أو معلومة في خريطة مصر..."
                className="smart-home-search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openSmartDialog();
                }}
              />
              <button type="button" className="smart-home-search-btn" onClick={openSmartDialog}>
                ✈️
              </button>
            </div>

            <motion.button
              type="button"
              className="smart-home-primary"
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/map')}
            >
              <span><Compass size={25} weight="fill" /> ابدأ استكشاف الخريطة</span>
              <ArrowLeft size={24} weight="bold" />
            </motion.button>

            <div className="smart-home-divider"><span>أو انتقل سريعًا إلى</span></div>

            <div className="smart-home-quick-links">
              {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                <button key={path} type="button" onClick={() => navigate(path)}>
                  <Icon size={23} weight="duotone" />
                  <span>{label}</span>
                  <ArrowLeft size={16} weight="bold" />
                </button>
              ))}
            </div>

            <div className="smart-home-note">
              <Sparkle size={17} weight="fill" />
              <span>رحلة تعليمية ممتعة — تعلم مع الخرائط الذكية واكتشف كنوز بلدك مصر</span>
            </div>
          </motion.div>

          {/* ── الجانب الأيسر: خريطة مصر التفاعلية النيون (الصورة علي الشمال) ── */}
          <motion.div
            className="smart-home-map-column"
            initial={{ opacity: 0, x: -35 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
          >
            <EgyptMap onExplore={() => navigate('/map')} />
          </motion.div>
        </section>
      </div>
    </main>
  );
}

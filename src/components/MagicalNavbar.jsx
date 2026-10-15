import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, GlobeHemisphereEast, House, MapTrifold, Trophy } from 'phosphor-react';
import { useGameStore } from '../store/gameStore';
import { preloadRoute } from '../utils/routePreload';

const TALK_TO_MAP_URL = 'https://talk-with-map.vercel.app/';
const TOTAL_PROGRESS_GOALS = 24; // 21 موقعًا + 3 دروس

const NAV_ITEMS = [
  { path: '/home', icon: House, label: 'الرئيسية', color: 'amber' },
  { path: '/lessons', icon: BookOpen, label: 'الدروس', color: 'sky' },
  { path: TALK_TO_MAP_URL, icon: GlobeHemisphereEast, label: 'تحدث مع الخريطة', color: 'cyan', external: true },
  { path: '/map', icon: MapTrifold, label: 'الخريطة', color: 'pink' },
  { path: '/awards', icon: Trophy, label: 'الجوائز', color: 'rose' }
];

const ACTIVE_ICON_STYLES = {
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  pink: 'bg-pink-50 text-pink-600',
  rose: 'bg-rose-50 text-rose-600'
};

export default function MagicalNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { earnedBadges = [], visitedLocations = [] } = useGameStore();

  if (location.pathname === '/' || location.pathname === '/map' || location.pathname === '/lesson/lesson-1') return null;

  const progressPercent = Math.min(
    ((visitedLocations.length + earnedBadges.length) / TOTAL_PROGRESS_GOALS) * 100,
    100
  );

  const warmRoute = (item) => {
    if (!item.external) preloadRoute(item.path);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[12000] w-full max-w-xl px-3 sm:px-4 sm:bottom-6 pointer-events-none">
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        aria-label="التنقل الرئيسي"
        className="bg-white/85 backdrop-blur-xl rounded-[32px] sm:rounded-[38px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-2 border-white/60 p-2 sm:p-3 flex justify-between items-center relative overflow-hidden pointer-events-auto"
      >
        <div className="absolute inset-x-4 top-0 h-[3px] sm:h-[4px] bg-slate-100/60 rounded-full overflow-hidden mt-0.5 sm:mt-1">
          <motion.div
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.25 }}
            className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400"
          />
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = !item.external && location.pathname === item.path;
          const className = `flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-colors relative ${isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`;
          const content = (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl sm:rounded-2xl -z-10 bg-violet-100/70"
                  transition={{ duration: 0.16 }}
                />
              )}
              <span className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl flex items-center justify-center shadow-sm ${isActive ? ACTIVE_ICON_STYLES[item.color] : 'bg-slate-100 text-slate-400'}`}>
                <Icon size={30} weight="fill" />
              </span>
              <span className="text-[9px] sm:text-[11px] font-black hidden sm:inline text-center leading-tight whitespace-nowrap">{item.label}</span>
            </>
          );

          if (item.external) {
            return (
              <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer" className={className} aria-label={item.label}>
                {content}
              </a>
            );
          }

          return (
            <button
              key={item.path}
              type="button"
              className={className}
              onPointerEnter={() => warmRoute(item)}
              onPointerDown={() => warmRoute(item)}
              onFocus={() => warmRoute(item)}
              onClick={() => navigate(item.path)}
            >
              {content}
            </button>
          );
        })}
      </motion.nav>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Books,
  CaretDown,
  ImageSquare,
  MapPin,
  MusicNotes,
  PlayCircle,
  Question,
  SpeakerHigh,
  Sparkle,
  VideoCamera,
  X
} from 'phosphor-react';
import { playLandmarkSound } from '../../utils/landmarkSounds';
import { useGameStore } from '../../store/gameStore';
import { useVoiceNarration } from '../../context/VoiceNarrationContext';
import MediaViewer from '../MediaViewer';

const buildDetails = (location) => [
  {
    id: 'what',
    label: 'ما هذا المكان؟',
    icon: Sparkle,
    value: location.characterDialog?.explanation || location.simpleInfo?.what
  },
  {
    id: 'where',
    label: 'أين يوجد؟',
    icon: MapPin,
    value: location.characterDialog?.location || location.simpleInfo?.where || location.governorate
  },
  {
    id: 'why',
    label: 'لماذا هو مهم؟',
    icon: Question,
    value: location.characterDialog?.importance || location.simpleInfo?.why
  },
  {
    id: 'fact',
    label: 'هل تعلم؟',
    icon: Sparkle,
    value: location.characterDialog?.funFact || location.simpleInfo?.howMuch
  }
].filter((item) => item.value);

const buildQuickFacts = (location) => [
  {
    id: 'what',
    label: 'ما هذا؟',
    icon: Sparkle,
    value: location.simpleInfo?.what || location.type || location.characterDialog?.explanation,
    tone: 'purple'
  },
  {
    id: 'where',
    label: 'أين يوجد؟',
    icon: MapPin,
    value: location.simpleInfo?.where || location.governorate || location.characterDialog?.location,
    tone: 'blue'
  },
  {
    id: 'why',
    label: 'لماذا هو مهم؟',
    icon: Question,
    value: location.simpleInfo?.why || location.characterDialog?.importance,
    tone: 'green'
  },
  {
    id: 'fact',
    label: 'هل تعلم؟',
    icon: Sparkle,
    value: location.simpleInfo?.howMuch || location.characterDialog?.funFact,
    tone: 'yellow'
  }
].filter((item) => item.value);

export default function LocationDialog({ location, onClose }) {
  const navigate = useNavigate();
  const { soundEnabled = true } = useGameStore();
  const { speak, enabled: voiceEnabled } = useVoiceNarration();
  const [showMore, setShowMore] = useState(false);
  const [openDetail, setOpenDetail] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const details = useMemo(() => buildDetails(location), [location]);
  const quickFacts = useMemo(() => buildQuickFacts(location), [location]);
  const summary = location.summary
    || location.simpleInfo?.what
    || location.characterDialog?.intro
    || 'مكان مهم من كنوز مصر.';
  const mediaItems = (location.mediaItems || []).slice(0, 5);

  const listen = () => {
    if (soundEnabled) playLandmarkSound(location, { soundEnabled, volume: 0.13 });
    if (voiceEnabled) {
      const text = [location.name, summary, location.characterDialog?.funFact].filter(Boolean).join('. ');
      speak(text, { channel: 'location-card', profile: 'child' });
    }
  };

  const startQuiz = () => {
    onClose();
    navigate(`/quiz/${location.id}`);
  };

  const openLesson = () => {
    if (!location.lessonId && !location.lesson) return;
    onClose();
    navigate(`/lesson/${location.lessonId || location.lesson}`);
  };

  return (
    <motion.div
      className="simple-location-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        className="simple-location-card"
        initial={{ x: 36, opacity: 0, y: 8 }}
        animate={{ x: 0, opacity: 1, y: 0 }}
        exit={{ x: 30, opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-card-title"
      >
        <button type="button" className="simple-location-close" onClick={onClose} aria-label="إغلاق بطاقة المكان">
          <X size={23} weight="bold" />
        </button>

        <div className="simple-location-image">
          {!imageFailed ? (
            <img
              src={location.previewImage || '/lesson-media/egypt_map.svg'}
              alt=""
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div><MapPin size={58} weight="duotone" /></div>
          )}
          <span><MapPin size={16} weight="fill" /> {location.governorate || 'مصر'}</span>
        </div>

        <div className="simple-location-content">
          <div className="simple-location-heading">
            <div className="simple-location-emoji" aria-hidden="true">{location.emoji || '📍'}</div>
            <div>
              <small>اكتشفت مكانًا جديدًا</small>
              <h2 id="location-card-title">{location.name}</h2>
            </div>
          </div>

          <p className="simple-location-summary">{summary}</p>

          {!!quickFacts.length && (
            <section className="simple-location-quick-facts" aria-label="معلومات المكان السريعة">
              {quickFacts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <article key={fact.id} className={`tone-${fact.tone}`}>
                    <span><Icon size={18} weight="fill" /></span>
                    <div>
                      <small>{fact.label}</small>
                      <p>{fact.value}</p>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <div className="simple-location-main-actions">
            <button type="button" className="listen" onClick={listen}>
              <SpeakerHigh size={22} weight="fill" /> استمع
            </button>
            <button type="button" className="quiz" onClick={startQuiz}>
              <PlayCircle size={22} weight="fill" /> ابدأ سؤالًا
            </button>
          </div>

          {!!mediaItems.length && (
            <section className="simple-location-media" aria-labelledby="location-media-title">
              <div className="simple-location-section-head">
                <div>
                  <small>شاهد واكتشف</small>
                  <h3 id="location-media-title">صور وفيديوهات الدرس</h3>
                </div>
                <span>{mediaItems.length} ملفات</span>
              </div>
              <div className="simple-location-media-grid">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.path}-${index}`}
                    type="button"
                    className={index === 0 ? 'featured' : ''}
                    onClick={() => setSelectedMedia(item)}
                    aria-label={`افتح ${item.title || 'المحتوى التعليمي'}`}
                  >
                    {item.type === 'image' ? (
                      <img src={item.path} alt="" loading="lazy" />
                    ) : item.type === 'video' ? (
                      <video src={item.path} muted playsInline preload="metadata" />
                    ) : (
                      <div className="audio-preview"><MusicNotes size={32} weight="duotone" /></div>
                    )}
                    <span className="simple-location-media-type">
                      {item.type === 'video'
                        ? <VideoCamera size={16} weight="fill" />
                        : item.type === 'image'
                          ? <ImageSquare size={16} weight="fill" />
                          : <MusicNotes size={16} weight="fill" />}
                    </span>
                    <span className="simple-location-media-play"><PlayCircle size={27} weight="fill" /></span>
                    <strong>{item.title || (item.type === 'video' ? 'فيديو تعليمي' : 'صورة تعليمية')}</strong>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!!details.length && (
            <button
              type="button"
              className={`simple-location-more-toggle ${showMore ? 'open' : ''}`}
              onClick={() => {
                setShowMore((value) => !value);
                if (showMore) setOpenDetail(null);
              }}
              aria-expanded={showMore}
            >
              <span><Sparkle size={20} weight="fill" /> اعرف أكثر</span>
              <CaretDown size={20} weight="bold" />
            </button>
          )}

          <AnimatePresence initial={false}>
            {showMore && (
              <motion.div
                className="simple-location-details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                {details.map((detail) => {
                  const Icon = detail.icon;
                  const isOpen = openDetail === detail.id;
                  return (
                    <div key={detail.id} className={isOpen ? 'open' : ''}>
                      <button
                        type="button"
                        onClick={() => setOpenDetail(isOpen ? null : detail.id)}
                        aria-expanded={isOpen}
                      >
                        <span><Icon size={19} weight="duotone" /> {detail.label}</span>
                        <CaretDown size={18} weight="bold" />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            {detail.value}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {(location.lessonId || location.lesson) && (
            <button type="button" className="simple-location-lesson-button" onClick={openLesson}>
              <span><Books size={22} weight="duotone" /><span><small>تابع التعلّم</small>افتح الدرس كاملًا</span></span>
              <ArrowLeft size={21} weight="bold" />
            </button>
          )}
        </div>
      </motion.aside>
      <AnimatePresence>
        {selectedMedia && <MediaViewer item={selectedMedia} onClose={() => setSelectedMedia(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

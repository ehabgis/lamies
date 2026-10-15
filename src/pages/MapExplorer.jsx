import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  VideoCamera,
  BookOpen,
  CaretLeft,
  CornersOut,
  GraduationCap,
  Lightbulb,
  ListBullets,
  Play,
  Ruler,
  SpeakerHigh,
  SpeakerSlash,
  Stack,
  UserCircle,
  ArrowClockwise,
  Buildings,
  CheckCircle,
  Drop,
  FunnelSimple,
  Factory,
  House,
  Lightning,
  MapTrifold,
  MagnifyingGlass,
  MapPin,
  Star,
  Target,
  X
} from 'phosphor-react';
import { CURRICULUM_DATA, MAP_LOCATIONS } from '../data/curriculumData';
import MagicalMap from '../components/Map/MagicalMap';
import RobotGuide from '../components/Map/RobotGuide';
import ResourcePin from '../components/Map/ResourcePin';
import ResourceVideoModal from '../components/Map/ResourceVideoModal';
import { MAP_RESOURCES as RESOURCE_KEY, resourceForLocation, matchesMapResource as matchesResource, guideForStage } from '../data/mapResources';
import { mapDistance } from '../utils/mapDistance';
import '../styles/atlas.css';
import LocationDialog from '../components/Character/LocationDialog';
import { useGameStore } from '../store/gameStore';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

const CATEGORY_META = {
  all: { label: 'كل الكنوز', icon: MapPin, color: '#6758e8' },
  minerals: { label: 'المعادن', icon: Factory, color: '#a855f7' },
  energy: { label: 'الطاقة', icon: Lightning, color: '#f5a524' },
  water: { label: 'المياه', icon: Drop, color: '#269de3' },
  projects: { label: 'المشروعات', icon: Buildings, color: '#30a66b' }
};

const getLessonById = (lessonId) => (
  (CURRICULUM_DATA.lessons || []).find((lesson) => lesson.id === lessonId) || null
);

const getMediaType = (item = {}) => {
  const path = String(item.path || '').split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|jfif|png|webp|svg|gif)$/.test(path)) return 'image';
  if (/\.(mp4|mov|webm|m4v)$/.test(path)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(path)) return 'audio';
  return item.type || 'file';
};

const getLessonMedia = (lesson) => (lesson?.media || [])
  .filter((item) => item?.path && ['image', 'video', 'audio'].includes(getMediaType(item)))
  .map((item) => ({ ...item, type: getMediaType(item) }))
  .filter((item, index, items) => items.findIndex((candidate) => candidate.path === item.path) === index)
  .slice(0, 6);

const getPreviewImage = (location) => {
  const lesson = getLessonById(location?.lesson);
  const resourceName = location?.name?.split(' - ')[0];
  const media = getLessonMedia(lesson).find((item) => item.type === 'image'
    && resourceName && `${item.title || ''} ${item.description || ''}`.includes(resourceName));
  return media?.path || null;
};

const buildLocations = () => Object.entries(MAP_LOCATIONS || {}).flatMap(([category, items]) => (
  (items || []).map((location) => {
    const lesson = getLessonById(location.lesson);
    return {
      ...location,
      category,
      previewImage: getPreviewImage(location),
      lessonId: lesson?.id || location.lesson,
      lessonTitle: lesson?.title || 'درس من كنوز مصر',
      lessonSummary: lesson?.summary || lesson?.description || '',
      mediaItems: getLessonMedia(lesson)
    };
  })
));

const getLocationSummary = (location) => (
  location?.simpleInfo?.what
  || location?.characterDialog?.intro
  || location?.characterDialog?.explanation
  || 'مكان مهم من كنوز مصر يستحق الاكتشاف.'
);

function MapPanel({ type, locations, activeCategory, onCategoryChange, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (type === 'search') inputRef.current?.focus();
  }, [type]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ar');
    if (!normalizedQuery) return locations.slice(0, 7);
    return locations.filter((location) => (
      `${location.name || ''} ${location.governorate || ''}`
        .toLocaleLowerCase('ar')
        .includes(normalizedQuery)
    )).slice(0, 8);
  }, [locations, query]);

  return (
    <motion.aside
      className="simple-map-popover"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      role="dialog"
      aria-modal="false"
      aria-label={type === 'search' ? 'البحث في الخريطة' : 'تصفية علامات الخريطة'}
    >
      <div className="simple-map-popover-head">
        <div>
          <span>{type === 'search' ? 'ابحث عن مكان' : 'اختر نوع الكنز'}</span>
          <small>{type === 'search' ? 'اكتب الاسم ثم اختر نتيجة واحدة' : 'ستظهر علامات النوع المختار فقط'}</small>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><X size={22} weight="bold" /></button>
      </div>

      {type === 'search' ? (
        <>
          <label className="simple-map-search-field">
            <MagnifyingGlass size={22} weight="bold" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="مثلاً: السد العالي"
            />
          </label>
          <div className="simple-map-search-results">
            {results.map((location) => (
              <button key={location.id} type="button" onClick={() => onSelect(location)}>
                <span className="simple-map-result-pin" style={{ background: CATEGORY_META[location.category]?.color }}>
                  <MapPin size={19} weight="fill" />
                </span>
                <span><strong>{location.name}</strong><small>{location.governorate || 'مصر'}</small></span>
              </button>
            ))}
            {!results.length && <p className="simple-map-empty">لا يوجد مكان بهذا الاسم. جرّب كلمة أقصر.</p>}
          </div>
        </>
      ) : (
        <div className="simple-map-category-list">
          {Object.entries(CATEGORY_META).filter(([id]) => id === 'all' || locations.some((location) => location.category === id)).map(([id, meta]) => {
            const Icon = meta.icon;
            const count = id === 'all' ? locations.length : locations.filter((location) => location.category === id).length;
            return (
              <button
                key={id}
                type="button"
                className={activeCategory === id ? 'active' : ''}
                style={{ '--category-color': meta.color }}
                onClick={() => onCategoryChange(id)}
              >
                <span><Icon size={23} weight="duotone" /></span>
                <strong>{meta.label}</strong>
                <small>{count}</small>
                {activeCategory === id && <CheckCircle size={21} weight="fill" />}
              </button>
            );
          })}
        </div>
      )}
    </motion.aside>
  );
}

function MissionCard({ mission, onClose, onNext, onOpenLocation }) {
  if (!mission) return null;
  const isCorrect = mission.status === 'correct';
  const isWrong = mission.status === 'wrong';

  return (
    <motion.div
      className={`simple-map-mission ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      role="status"
      aria-live="polite"
    >
      <div className="simple-map-mission-icon">
        {isCorrect ? <CheckCircle size={26} weight="fill" /> : <Target size={25} weight="duotone" />}
      </div>
      <div className="simple-map-mission-copy">
        <small>{isCorrect ? 'إجابة رائعة!' : isWrong ? 'حاول مرة ثانية' : 'مهمتك الآن'}</small>
        <strong>
          {isCorrect
            ? `وجدت ${mission.target.name}`
            : isWrong
              ? `هذه ليست ${mission.target.name}`
              : `أين يوجد ${mission.target.name}؟`}
        </strong>
        {!isCorrect && <span>{isWrong ? `تلميح: ابحث في ${mission.target.governorate}` : 'اضغط على العلامة الصحيحة في الخريطة'}</span>}
      </div>
      <div className="simple-map-mission-actions">
        {isCorrect && (
          <>
            <button type="button" onClick={onOpenLocation}>اعرف المكان</button>
            <button type="button" className="icon" onClick={onNext} aria-label="مهمة أخرى"><ArrowClockwise size={21} weight="bold" /></button>
          </>
        )}
        <button type="button" className="icon close" onClick={onClose} aria-label="إنهاء المهمة"><X size={20} weight="bold" /></button>
      </div>
    </motion.div>
  );
}

function ResourcePicture({ location, media, resource }) {
  const imageUrl = media?.imageUrl || location?.previewImage;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  return !failed && imageUrl ? (
    <><img src={imageUrl} alt={`خامات ${resource?.label || location.name}`} onError={() => setFailed(true)} />{media?.imageCredit && <small className="atlas-image-credit">{media.imageCredit}</small>}</>
  ) : (
    <div className="atlas-resource-placeholder" role="img" aria-label={`رسم توضيحي: ${location?.name || 'كنوز مصر'}`}>
      <ResourcePin resource={resource}/><strong>{resource?.label || location?.name}</strong><small>رسم توضيحي — صورة الخام غير متاحة حاليًا</small>
    </div>
  );
}

export default function MapExplorer() {
  const navigate = useNavigate();
  const { speak, stop, enabled: voiceEnabled, setEnabled } = useVoiceNarration();
  const { playerName, visitedLocations = [], totalPoints = 0, visitLocation, addPoints } = useGameStore();
  const allLocations = useMemo(() => buildLocations().filter((item) => item.lessonId === 'lesson-1'), []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeResource, setActiveResource] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [focusLocationId, setFocusLocationId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [zoomCommand, setZoomCommand] = useState(null);
  const [detailLevel, setDetailLevel] = useState('basic');
  const [mission, setMission] = useState(null);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [notice, setNotice] = useState('');
  const [pendingNarration, setPendingNarration] = useState('');
  const [guideStage, setGuideStage] = useState('welcome');
  const [legendPulse, setLegendPulse] = useState(true);
  const [mediaConfig, setMediaConfig] = useState({});
  const [basemapUrl, setBasemapUrl] = useState('/lesson-media/atlas-geography.svg');
  const [satelliteStatus, setSatelliteStatus] = useState('loading');
  const [videoLocation, setVideoLocation] = useState(null);
  const legendRef = useRef(null);
  const guideRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const pageRef = useRef(null);
  const lastMissionIdRef = useRef(null);
  const visibleLocations = useMemo(() => allLocations.filter((location) => (
    (activeCategory === 'all' || location.category === activeCategory)
  )), [allLocations, activeCategory]);
  const visibleLocationIds = useMemo(() => visibleLocations.map((location) => location.id), [visibleLocations]);
  const infoLocation = selectedLocation;
  const resource = RESOURCE_KEY.find((item) => infoLocation && matchesResource(infoLocation, item));
  const emphasizedLocationIds = activeResource ? visibleLocations.filter((item) => matchesResource(item, activeResource)).map((item) => item.id) : null;
  const guide = guideForStage(guideStage, resource || activeResource);
  const selectedMedia = mediaConfig.resources?.[resource?.id];
  const distance = measurePoints.length === 2 ? Math.round(mapDistance(...measurePoints)) : null;
  const focusLocation = useCallback((location) => {
    setFocusLocationId(location.id);
    setFocusNonce((value) => value + 1);
  }, []);
  const openLocation = useCallback((location) => {
    setActivePanel(null);
    setSelectedLocation(location);
    setActiveResource(resourceForLocation(location) || null);
    setGuideStage('location'); setLegendPulse(false);
    focusLocation(location);
    visitLocation(location.id);
  }, [focusLocation, visitLocation]);
  const pickMission = useCallback(() => {
    const resourceLocations = activeResource ? visibleLocations.filter((item) => matchesResource(item, activeResource)) : visibleLocations;
    const pool = resourceLocations.length ? resourceLocations : allLocations;
    const candidates = pool.filter((item) => item.id !== lastMissionIdRef.current);
    const target = (candidates.length ? candidates : pool)[Math.floor(Math.random() * (candidates.length || pool.length))];
    if (!target) return;
    lastMissionIdRef.current = target.id;
    setSelectedLocation(null); setActivePanel(null); setFocusLocationId(null); setMeasuring(false); setShowDialog(false);
    setMission({ target, status: 'active' });
    if (voiceEnabled) speak(`أين يوجد ${target.name}؟`, { channel: 'map-mission', profile: 'child' });
  }, [allLocations, activeResource, speak, visibleLocations, voiceEnabled]);
  const handleLocationSelect = (location) => {
    const item = allLocations.find((candidate) => candidate.id === location.id) || location;
    if (measuring) {
      setMeasurePoints((current) => current.length >= 2 ? [item] : [...current, item]);
      return;
    }
    if (mission && mission.status !== 'correct') {
      const correct = item.id === mission.target.id;
      setMission((current) => ({ ...current, status: correct ? 'correct' : 'wrong' }));
      if (correct) {
        visitLocation(item.id); addPoints(8); focusLocation(item);
        confetti({ particleCount: 70, spread: 68, origin: { y: 0.55 } });
      }
      if (voiceEnabled) speak(correct ? 'أحسنت يا بطل!' : 'حاول مرة أخرى يا بطل.', { channel: 'map-feedback', profile: 'child' });
      return;
    }
    openLocation(item);
  };
  const changeCategory = (category) => {
    setActiveCategory(category); setActiveResource(null); setActivePanel(null); setGuideStage('explore');
    setSelectedLocation(null); setMission(null); setShowDialog(false); setFocusLocationId(null); setResetNonce((n) => n + 1);
  };
  const changeResource = (item) => {
    setActiveResource(item); setActiveCategory('all'); setSelectedLocation(null); setGuideStage('resource'); setLegendPulse(false); setMeasuring(false); setMeasurePoints([]);
    setMission(null); setActivePanel(null); setShowDialog(false); setFocusLocationId(null); setResetNonce((n) => n + 1);
  };
  const togglePanel = (panel) => setActivePanel((current) => current === panel ? null : panel);
  const selectSearchResult = (location) => {
    setActiveResource(null); setActiveCategory('all'); setMission(null); setMeasuring(false); openLocation(location);
  };
  const resetMap = () => { setFocusLocationId(null); setResetNonce((n) => n + 1); };
  const zoom = (delta) => setZoomCommand((current) => ({ delta, nonce: (current?.nonce || 0) + 1 }));
  const readResource = () => {
    setEnabled(true);
    setPendingNarration(`${guide.title}. ${guide.text}`);
    guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  useEffect(() => {
    if (!voiceEnabled || !pendingNarration) return;
    speak(pendingNarration, { channel: 'map-resource', profile: 'child' });
    setPendingNarration('');
  }, [voiceEnabled, pendingNarration, speak]);
  const pulseLegend = () => {
    setLegendPulse(false);
    window.clearTimeout(pulseTimerRef.current);
    window.requestAnimationFrame(() => setLegendPulse(true));
    pulseTimerRef.current = window.setTimeout(() => setLegendPulse(false), 2600);
  };
  const exploreAnother = () => {
    changeCategory('all'); setMeasuring(false); setMeasurePoints([]); setVideoLocation(null);
    pulseLegend(); legendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const openVideo = (location) => {
    if (!location) return;
    openLocation(location); setVideoLocation(location); stop();
  };
  const closeVideo = useCallback(() => setVideoLocation(null), []);
  const videoResource = resourceForLocation(videoLocation);
  const videoMedia = mediaConfig.resources?.[videoResource?.id] || {};
  const matchedVideo = videoLocation?.mediaItems?.find((item) => item.type === 'video' && item.title?.includes(videoResource?.label));
  const video = {
    title: videoMedia.videoTitle || videoResource?.videoTitle || `تعرف على ${videoResource?.label || 'المورد'}`,
    url: videoMedia.videoUrl || matchedVideo?.path || null,
    poster: videoMedia.imageUrl || undefined,
    credit: videoMedia.videoCredit
  };
  const isVideoLocation = (location) => {
    if (!activeResource || !matchesResource(location, activeResource) || mission || measuring) return false;
    const configured = mediaConfig.resources?.[activeResource.id];
    return location.id === configured?.videoLocationId || location.mediaItems?.some((item) => item.type === 'video' && item.title?.includes(activeResource.label));
  };
  useEffect(() => {
    let cancelled = false;
    fetch('/lesson-media/resource-media.json').then((response) => {
      if (!response.ok) throw new Error('Media settings unavailable');
      return response.json();
    }).then((config) => { if (!cancelled) setMediaConfig(config); }).catch(() => { if (!cancelled) setSatelliteStatus('unavailable'); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const url = mediaConfig.basemap?.url;
    if (!url) return;
    const image = new Image();
    image.onload = () => { setBasemapUrl(url); setSatelliteStatus('ready'); };
    image.onerror = () => setSatelliteStatus('unavailable');
    image.src = url;
    return () => { image.onload = null; image.onerror = null; };
  }, [mediaConfig.basemap?.url]);
  useEffect(() => {
    if (voiceEnabled && !videoLocation && !mission) speak(`${guide.title}. ${guide.text}`, { channel: 'map-guide', profile: 'child' });
  }, [guide.title, guide.text, voiceEnabled, videoLocation, mission, speak]);
  useEffect(() => {
    pulseTimerRef.current = window.setTimeout(() => setLegendPulse(false), 2600);
    return () => window.clearTimeout(pulseTimerRef.current);
  }, []);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (pageRef.current?.requestFullscreen) await pageRef.current.requestFullscreen();
      else setNotice('ملء الشاشة غير متاح في هذا المتصفح.');
    } catch { setNotice('تعذّر فتح ملء الشاشة في هذا المتصفح.'); }
  };
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || videoLocation) return;
      setActivePanel(null); setShowDialog(false); setMission(null); setMeasuring(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [videoLocation]);

  return (
    <main data-tts-root className="simple-map-page atlas-page" dir="rtl" ref={pageRef}>
      <header className="atlas-header">
        <div className="atlas-profile"><button onClick={() => navigate('/')} title="العودة لشاشة الترحيب"><UserCircle size={36} weight="duotone"/><strong>{playerName || 'يا بطل'}</strong><CaretLeft size={16}/></button><span><Star size={24} weight="fill"/> ابتدائي</span></div>
        <div className="atlas-heading"><h1><BookOpen weight="duotone"/>الخريطة التعليمية الذكية</h1><p>الصف الخامس الابتدائي <CaretLeft/> الفصل الدراسي الأول <CaretLeft/> الدرس الأول: الخامات المعدنية ومصادر الطاقة في مصر</p></div>
        <div className="atlas-subject"><span>🌍</span><strong>الدراسات الاجتماعية</strong><BookOpen size={38} weight="duotone"/></div>
      </header>
      <div className="atlas-workspace">
        <aside className="atlas-left" aria-label="التنقل ومفتاح الخريطة">
          <nav className="atlas-navigation" aria-label="أقسام الدرس">
            {[{label:'الرئيسية', icon:House, action:() => navigate('/home')},
              {label:'مفاهيم الدرس', icon:BookOpen, action:() => navigate('/lesson/lesson-1/details')},
              {label:'معلومات الدرس', icon:ListBullets, action:() => navigate('/lesson/lesson-1/details')},
              {label:'الأنشطة التفاعلية', icon:Stack, action:pickMission},
              {label:'أسئلة الدرس', icon:Target, action:() => navigate(`/quiz/${infoLocation?.id || 'iron-bahariya'}`)},
              {label:'المعلم الذكي', icon:GraduationCap, action:readResource}].map(({label,icon:Icon,action}) => (
                <button type="button" key={label} onClick={action}><span className="atlas-nav-icon"><Icon size={27} weight="fill"/></span><strong>{label}</strong><CaretLeft size={17}/></button>
              ))}
          </nav>
          <section className={`atlas-legend ${legendPulse ? 'atlas-legend-pulse' : ''}`} ref={legendRef}><h2><BookOpen size={29} weight="duotone"/>مفتاح الخريطة</h2>
            {RESOURCE_KEY.map((item) => <button type="button" key={item.id} aria-label={item.label} aria-pressed={activeResource?.id === item.id} className={activeResource?.id === item.id ? 'active' : ''} onClick={() => changeResource(item)}><ResourcePin resource={item}/><strong>{item.label}</strong>{activeResource?.id === item.id && <CaretLeft size={16}/>}</button>)}
            <button type="button" className="atlas-show-all" onClick={() => changeCategory('all')}>إظهار جميع الموارد <MapTrifold size={20}/></button>
          </section>
        </aside>
        <section className="simple-map-stage atlas-stage" aria-label="خريطة مصر التفاعلية">
          <div className="atlas-map-top"><button type="button" onClick={() => changeCategory('all')}><BookOpen size={20}/>إظهار الكل</button><span><ResourcePin resource={activeResource}/>{activeResource ? `المعروض الآن: مواقع ${activeResource.label}` : 'المعروض الآن: جميع كنوز مصر'}</span></div>
          <div className="atlas-camera"><button type="button" onClick={() => zoom(.2)} aria-label="تكبير الخريطة">+</button><button type="button" onClick={() => zoom(-.2)} aria-label="تصغير الخريطة">−</button><button type="button" onClick={resetMap} aria-label="عرض خريطة مصر كاملة"><Target size={25}/></button></div>
          <AnimatePresence mode="wait">{activePanel && <MapPanel key={activePanel} type={activePanel} locations={allLocations} activeCategory={activeCategory} onCategoryChange={changeCategory} onSelect={selectSearchResult} onClose={() => setActivePanel(null)}/>}</AnimatePresence>
          <AnimatePresence>{mission && <MissionCard mission={mission} onClose={() => setMission(null)} onNext={pickMission} onOpenLocation={() => {const target=mission.target;setMission(null);openLocation(target);}}/>}</AnimatePresence>
          <MagicalMap basemapUrl={basemapUrl} emphasizedLocationIds={emphasizedLocationIds} enableMarkerNarration={false} renderMarker={(location) => <ResourcePin resource={resourceForLocation(location)}/>} renderMarkerAccessory={(location) => isVideoLocation(location) ? <button type="button" className="atlas-video-pin" aria-label={`شاهد فيديو ${activeResource.label} — ${location.name}`} onClick={(event) => {event.stopPropagation();openVideo(allLocations.find((item) => item.id === location.id));}}><VideoCamera size={28} weight="fill"/></button> : null} markerAppearance={(location) => RESOURCE_KEY.find((item) => matchesResource(location, item))} onLocationSelect={handleLocationSelect} focusLocationId={focusLocationId} focusNonce={focusNonce} cameraResetNonce={resetNonce} zoomCommand={zoomCommand} pinnedLocationId={selectedLocation?.id || (mission?.status === 'correct' ? mission.target.id : null)} activeCategory={activeCategory} visibleLocationIds={visibleLocationIds} showAudioControl={false} showCategorySidebar={false} showLandmarkPicker={false} showCategoryChips={false} showCompass={false} showNarratorGuide={false} showSignature={false} showInquiryTool={false} showInquiryCard={false} showMapLegend={false} showKidHelper={false} compactMode largeMode kidSimpleMode detailLevel={detailLevel} detailStyle="labels" enableCameraControls={false} containerClassName="simple-map-canvas"/>
          <div className="atlas-map-caption" role="status">{measuring ? (distance !== null ? `المسافة التقريبية: ${distance} كم بين ${measurePoints[0].name} و${measurePoints[1].name}` : `اختر ${measurePoints.length ? 'المكان الثاني' : 'مكانين'} على الخريطة لقياس المسافة`) : `اضغط على علامة لاستكشاف المكان · ${visibleLocations.length} موقع`}</div>
        </section>
        <aside className="atlas-right" aria-label="المعلم ومعلومات المورد">
          <section className="atlas-guide" ref={guideRef}><RobotGuide/><div aria-live="polite" aria-atomic="true"><h2>{mission ? 'مهمة جديدة! 🌟' : guide.title}</h2><p>{mission ? 'ابحث عن المكان المطلوب على الخريطة.' : guide.text}</p>
            {['welcome','explore'].includes(guideStage) && !mission && <button className="atlas-guide-arrow" type="button" onClick={() => {pulseLegend();legendRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});}}>← اختر من مفتاح الخريطة</button>}
            {guideStage === 'location' && !mission && <div className="atlas-guide-choices"><button type="button" className="primary" onClick={() => openVideo(infoLocation)}><Play size={17} weight="fill"/>نعم، أريد مشاهدة الفيديو</button><button type="button" onClick={() => setGuideStage('reading')}>لا، أريد متابعة الاستكشاف</button></div>}
            {guideStage === 'watched' && !mission && <div className="atlas-guide-choices"><button type="button" className="primary" onClick={exploreAnother}>استكشف {resource?.kind === 'mineral' ? 'معدنًا' : 'موردًا'} آخر</button><button type="button" onClick={() => navigate(`/quiz/${infoLocation.id}`)}>اختبر معلوماتك</button></div>}
            <button type="button" className="atlas-read-guide" onClick={readResource}><SpeakerHigh size={16}/>استمع للمعلم</button>
          </div></section>
          {infoLocation && <section className="atlas-resource" aria-label="بطاقة معلومات المورد"><h2><BookOpen size={28} weight="duotone"/>معلومات المورد</h2>
            <div className="atlas-resource-body"><h3><ResourcePin resource={resource}/>{resource?.label || infoLocation.name}</h3><ResourcePicture location={infoLocation} resource={resource} media={selectedMedia}/>
              <h4 className="atlas-resource-subtitle">أماكن وجود {resource?.label || 'المورد'}:</h4><p>{resource?.description || infoLocation.simpleInfo?.where || getLocationSummary(infoLocation)}</p>
              <p className="atlas-selected-place"><MapPin size={18} weight="fill"/>الموقع المختار: {infoLocation.name.includes(' - ') ? infoLocation.name.split(' - ').slice(1).join(' - ') : infoLocation.name}</p>
              <div className="atlas-fact"><h4><Lightbulb size={25} weight="fill"/>أهمية {resource?.label || 'المورد'}</h4><p>{resource?.importance || infoLocation.simpleInfo?.why || infoLocation.characterDialog?.importance}</p></div>
              <div className="atlas-resource-actions"><button type="button" onClick={() => setShowDialog(true)}>اعرف المزيد <CaretLeft size={17}/></button><button type="button" aria-label={voiceEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'} onClick={() => {setEnabled(!voiceEnabled);if(voiceEnabled)stop();}}>{voiceEnabled ? <SpeakerHigh size={22}/> : <SpeakerSlash size={22}/>}</button></div>
            </div>
          </section>}
          {!infoLocation && <div className="atlas-explorer-tip"><MapTrifold size={38} weight="duotone"/><h3>رحلتك تبدأ من هنا</h3><p>اختر موردًا من المفتاح، ثم اضغط موقعه المضيء على الخريطة.</p><span>⛏ معادن · ☀ طاقة متجددة · 🔥 طاقة غير متجددة</span></div>}
          <div className="atlas-progress"><Star size={19} weight="fill"/><strong>{totalPoints} نقطة</strong><span>{allLocations.filter((item) => visitedLocations.includes(item.id)).length} / {allLocations.length} مكان مكتشف</span></div>
        </aside>
      </div>
      <footer className="atlas-bottom" aria-label="أدوات الخريطة">
        <button type="button" onClick={() => togglePanel('search')} aria-pressed={activePanel === 'search'}><MagnifyingGlass size={27}/><span>البحث في الخريطة</span></button>
        <button type="button" className={measuring ? 'active' : ''} aria-pressed={measuring} onClick={() => {setMeasuring(!measuring);setMeasurePoints([]);setMission(null);setActivePanel(null);}}><Ruler size={27}/><span>قياس المسافات</span></button>
        <button type="button" onClick={() => togglePanel('filter')} aria-pressed={activePanel === 'filter'}><Stack size={27} weight="fill"/><span>طبقات الخريطة</span></button>
        <button type="button" onClick={resetMap}><Target size={27}/><span>عرض مصر كاملة</span></button>
        <button type="button" aria-pressed={detailLevel === 'expanded'} onClick={() => setDetailLevel((current) => current === 'basic' ? 'expanded' : 'basic')}><MapTrifold size={27}/><span>تفاصيل الخريطة</span></button>
        <button type="button" onClick={fullscreen}><CornersOut size={27}/><span>ملء الشاشة</span></button>
        <button type="button" className="atlas-quiz" onClick={pickMission}><GraduationCap size={29}/><span>اسأل الخريطة</span><Play size={19} weight="fill"/></button>
      </footer>
      <div className="atlas-basemap-credit">{satelliteStatus === 'ready' ? <a href={mediaConfig.basemap?.sourceUrl} target="_blank" rel="noreferrer">{mediaConfig.basemap?.credit}</a> : <span>{satelliteStatus === 'loading' ? 'جارٍ تحميل صورة القمر الصناعي…' : 'تعذّر تحميل صورة القمر الصناعي؛ المعروض رسم تعليمي بديل.'}</span>}</div>
      {videoLocation && <ResourceVideoModal video={video} onClose={closeVideo} onWatched={() => setGuideStage('watched')}/>}
      {notice && <div className="atlas-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="إغلاق"><X size={18}/></button></div>}
      <AnimatePresence>{showDialog && selectedLocation && <LocationDialog location={{...selectedLocation,summary:getLocationSummary(selectedLocation),previewImage:selectedLocation.previewImage || getPreviewImage(selectedLocation)}} onClose={() => setShowDialog(false)}/>}</AnimatePresence>
    </main>
  );
}

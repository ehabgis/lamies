import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DownloadSimple, SpeakerHigh, SpeakerSlash, ArrowRight, MapTrifold } from 'phosphor-react';
import { PUBLIC_RESOURCES } from '../data/publicResources';
import { CURRICULUM_DATA, MAP_LOCATIONS } from '../data/curriculumData';
import { useGameStore } from '../store/gameStore';
import BookViewer from '../components/BookViewer';

function flattenNodes(nodes = []) {
  const out = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    out.push(node);
    if (node.type === 'directory' && node.children?.length) stack.push(...node.children);
  }
  return out;
}

function flattenFiles(nodes = []) {
  return flattenNodes(nodes).filter((n) => n.type === 'file');
}

const isImageExtension = (ext = '') => /^(jpg|jpeg|png|webp|jfif)$/i.test(ext);

function collectImageDecks(resources = []) {
  const decks = [];

  const walk = (node) => {
    if (!node || node.type !== 'directory') return;
    const name = (node.name || '').toLowerCase();
    const looksLikePresentation = name.includes('presentation') || name.includes('الدرس');

    const files = flattenFiles(node.children || []);
    const images = files
      .filter((f) => isImageExtension(f.extension) && !(f.name || '').startsWith('~$'))
      .map((f) => f.path)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (looksLikePresentation && images.length >= 1) {
      decks.push({
        id: `images:${node.path}`,
        type: 'images',
        title: node.name || 'كتاب الصور',
        pages: images
      });
    }

    node.children?.forEach(walk);
  };

  resources.forEach(walk);
  return decks;
}

const ACTION_ITEMS = [
  { id: 'overview', label: 'ابدأ هنا', emoji: '' },
  { id: 'content', label: 'اقرأ الدرس', emoji: '' },
  { id: 'practice', label: 'جاوب سؤال', emoji: '' },
  { id: 'tasks', label: 'مهامي اليوم', emoji: '' },
  { id: 'guide', label: 'اسأل المساعد الراجل', emoji: '' }
];

const MAP_LEGEND = [
  { key: 'minerals', label: 'المعادن', emoji: '', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'energy', label: 'الطاقة', emoji: '', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'water', label: 'المياه', emoji: '', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'projects', label: 'المشروعات', emoji: '', color: 'bg-violet-100 text-violet-700 border-violet-200' }
];

const QUICK_STEPS = [
  { id: 'step-1', text: 'اختار الدرس ' },
  { id: 'step-2', text: 'اقلب صفحات الكتاب ' },
  { id: 'step-3', text: 'جاوب سؤال سريع ' }
];

const ROBOT_QUICK_QUESTIONS = [
  'فين المكان على الخريطة؟',
  'ايه أهم هدف في الدرس؟',
  'اديني تلميح للسؤال'
];

function toArabicNumber(value) {
  return Number(value || 0).toLocaleString('ar-EG');
}

export default function PresentationPage() {
  const navigate = useNavigate();
  const {
    playerName = '',
    totalPoints = 0,
    currentLevel = 1,
    visitedLocations = [],
    completedLessons = []
  } = useGameStore();

  const files = useMemo(() => flattenFiles(PUBLIC_RESOURCES), []);

  const pptxDecks = useMemo(() => {
    const pptxFiles = files
      .filter((f) => f.extension === 'pptx' && !(f.name || '').startsWith('~$'))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const preferredFirst = pptxFiles.sort((a, b) => {
      const aPref = a.path === '/presentation.pptx' || /presentation\.pptx$/i.test(a.name || '');
      const bPref = b.path === '/presentation.pptx' || /presentation\.pptx$/i.test(b.name || '');
      return Number(bPref) - Number(aPref);
    });

    return preferredFirst.map((f) => ({
      id: `pptx:${f.path}`,
      type: 'pptx',
      title: f.name || 'PowerPoint',
      path: f.path
    }));
  }, [files]);

  const imageDecks = useMemo(() => collectImageDecks(PUBLIC_RESOURCES), []);
  const decks = useMemo(() => [...pptxDecks, ...imageDecks], [pptxDecks, imageDecks]);

  const [activeDeckId, setActiveDeckId] = useState(() => decks[0]?.id || '');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!decks.length) return;
    if (decks.some((d) => d.id === activeDeckId)) return;
    setActiveDeckId(decks[0].id);
  }, [decks, activeDeckId]);

  const activeDeck = useMemo(
    () => decks.find((d) => d.id === activeDeckId) || decks[0] || null,
    [decks, activeDeckId]
  );

  const [pptxSlidesById, setPptxSlidesById] = useState({});
  const [pptxLoadingId, setPptxLoadingId] = useState('');
  const [pptxError, setPptxError] = useState('');

  useEffect(() => {
    const deck = activeDeck;
    if (!deck || deck.type !== 'pptx') return undefined;
    if (pptxSlidesById[deck.id]) return undefined;

    let cancelled = false;
    setPptxError('');
    setPptxLoadingId(deck.id);

    (async () => {
      try {
        const res = await fetch(deck.path);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const buf = await res.arrayBuffer();
        const mod = await import('@jvmr/pptx-to-html');
        const pptxToHtml = mod.pptxToHtml || mod.default?.pptxToHtml || mod.default;
        if (typeof pptxToHtml !== 'function') throw new Error('pptxToHtml export not found');

        const htmlSlides = await pptxToHtml(buf, {
          width: 1280,
          height: 720,
          scaleToFit: true,
          letterbox: true
        });

        const pages = (htmlSlides || []).map((html, i) => ({
          key: `${deck.id}-${i + 1}`,
          type: 'html',
          html
        }));

        if (cancelled) return;
        setPptxSlidesById((prev) => ({ ...prev, [deck.id]: pages }));
      } catch (err) {
        if (cancelled) return;
        setPptxError('تعذر فتح ملف PowerPoint داخل المنصة. يمكنك تحميل الملف وفتحه محلياً.');
      } finally {
        if (!cancelled) setPptxLoadingId('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDeck, pptxSlidesById]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  // grades currently hardcoded to data but structured for future expansion
  const grades = useMemo(() => [{
    id: CURRICULUM_DATA.grade.id,
    label: CURRICULUM_DATA.grade.label
  }], []);
  const [selectedGradeId, setSelectedGradeId] = useState(grades[0]?.id || '');

  const lessons = useMemo(() => {
    if (selectedGradeId === CURRICULUM_DATA.grade.id) {
      return CURRICULUM_DATA.lessons || [];
    }
    return [];
  }, [selectedGradeId]);

  const [activeLessonId, setActiveLessonId] = useState(() => lessons[0]?.id || '');
  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0] || null,
    [lessons, activeLessonId]
  );

  useEffect(() => {
    if (!lessons.length) return;
    if (lessons.some((lesson) => lesson.id === activeLessonId)) return;
    setActiveLessonId(lessons[0].id);
  }, [lessons, activeLessonId]);

  // when grade changes ensure lesson resets
  useEffect(() => {
    setActiveLessonId('');
  }, [selectedGradeId]);

  const allMapLocations = useMemo(() => Object.values(MAP_LOCATIONS || {}).flat(), []);
  const lessonLocations = useMemo(
    () => allMapLocations.filter((location) => location.lesson === activeLesson?.id),
    [allMapLocations, activeLesson?.id]
  );

  const visitedLessonLocations = useMemo(
    () => lessonLocations.filter((location) => visitedLocations.includes(location.id)),
    [lessonLocations, visitedLocations]
  );

  const lessonExplorePercent = lessonLocations.length
    ? Math.round((visitedLessonLocations.length / lessonLocations.length) * 100)
    : 0;

  const activePages = activeDeck?.type === 'pptx'
    ? (pptxSlidesById[activeDeck.id] || [])
    : (activeDeck?.pages || []).map((src, i) => ({
      key: `${activeDeck.id}-${i + 1}`,
      type: 'image',
      src,
      alt: `${activeDeck.title} - صفحة ${i + 1}`
    }));

  const isActivePptx = activeDeck?.type === 'pptx';
  const isLoading = isActivePptx && pptxLoadingId === activeDeck?.id;

  const overviewRef = useRef(null);
  const mapKeyRef = useRef(null);
  const contentRef = useRef(null);
  const guideRef = useRef(null);
  const practiceRef = useRef(null);
  const conceptsRef = useRef(null);
  const tasksRef = useRef(null);

  const sectionRefs = {
    overview: overviewRef,
    mapKey: mapKeyRef,
    content: contentRef,
    guide: guideRef,
    practice: practiceRef,
    concepts: conceptsRef,
    tasks: tasksRef
  };

  const [activeAction, setActiveAction] = useState('overview');

  const scrollToSection = (id) => {
    setActiveAction(id);
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const practiceQuestion = activeLesson?.practiceQuestions?.[0] || null;
  const [selectedOption, setSelectedOption] = useState(null);
  const [practiceResult, setPracticeResult] = useState(null);

  useEffect(() => {
    setSelectedOption(null);
    setPracticeResult(null);
  }, [activeLessonId]);

  const handlePracticeAnswer = (index) => {
    if (!practiceQuestion) return;
    const correctIndex = practiceQuestion.correctIndex ?? practiceQuestion.correct;
    const isCorrect = index === correctIndex;
    setSelectedOption(index);
    setPracticeResult(isCorrect);
  };

  const dailyTasks = useMemo(() => {
    if (!activeLesson) return [];
    return [
      { id: 'task-overview', text: 'اقرأ ملخص الدرس.' },
      { id: 'task-map', text: 'افتح الخريطة واضغط مكان واحد.' },
      { id: 'task-book', text: 'اقلب 3 صفحات من الكتاب.' },
      { id: 'task-question', text: 'جاوب السؤال السريع.' }
    ];
  }, [activeLesson]);

  const [taskChecks, setTaskChecks] = useState({});

  useEffect(() => {
    setTaskChecks({});
  }, [activeLessonId]);

  const toggleTask = (taskId) => {
    setTaskChecks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const completedTaskCount = dailyTasks.filter((task) => taskChecks[task.id]).length;
  const taskProgress = dailyTasks.length ? Math.round((completedTaskCount / dailyTasks.length) * 100) : 0;
  const simpleProgress = Math.round((lessonExplorePercent + taskProgress) / 2);

  const [robotInput, setRobotInput] = useState('');
  const [robotReply, setRobotReply] = useState('أهلاً يا بطل! أنا المساعد الراجل. اختار سؤال جاهز وأنا أجاوبك ببساطة وباللهجة المصرية.');

  useEffect(() => {
    setRobotReply('أهلاً يا بطل! أنا المساعد الراجل. اختار سؤال جاهز وأنا أجاوبك ببساطة وباللهجة المصرية.');
    setRobotInput('');
  }, [activeLessonId]);

  const runRobotAnswer = (rawQuestion) => {
    const question = rawQuestion.trim();
    if (!question || !activeLesson) return;

    const firstObjective = activeLesson.objectives?.[0] || 'افتح بطاقة الأهداف وشوف أول نقطة.';
    const firstLocation = lessonLocations?.[0]?.name || 'افتح الخريطة واختار أي مكان من الدرس.';
    const firstTerm = activeLesson.vocabulary?.[0];
    const firstFact = activeLesson.funFacts?.[0] || activeLesson.summary;

    let answer = `تعالى نبدأ كده: ${firstObjective}`;

    if (question.includes('خريطة') || question.includes('مكان')) {
      answer = `حلو! ابدأ من ${firstLocation} على الخريطة، واضغط عليه مرة.`;
    } else if (question.includes('هدف') || question.includes('مطلوب')) {
      answer = `هدف الدرس ببساطة: ${firstObjective}`;
    } else if (question.includes('اختبار') || question.includes('سؤال')) {
      answer = practiceQuestion?.hint ? `تلميح سريع يا بطل: ${practiceQuestion.hint}` : 'جاوب السؤال السريع اللي تحت، ولو تحب أشرحلكه قبل الحل.';
    } else if (question.includes('مصطلح') || question.includes('مفهوم')) {
      answer = firstTerm
        ? `بص يا بطل، ${firstTerm.term}: ${firstTerm.meaning}`
        : 'افتح بطاقة المفاهيم وهتلاقي المصطلحات جاهزة.';
    } else if (question.includes('معلومة') || question.includes('هل تعلم')) {
      answer = firstFact || 'كمّل في العرض التفاعلي وهتلاقي معلومة جديدة حالًا.';
    } else if (question.includes('ولد') || question.includes('بنت') || question.includes('واحد') || question.includes('واحدة')) {
      answer = 'أنا مساعد راجل وبساعدك خطوة بخطوة. اسأل أي نقطة في الدرس وأنا معاك.';
    } else {
      answer = `سؤالك ممتاز يا بطل. خلينا نبدأ بالنقطة دي: ${firstObjective}`;
    }

    setRobotReply(answer);
    setRobotInput('');
  };

  const handleRobotAsk = (e) => {
    e.preventDefault();
    runRobotAnswer(robotInput);
  };

  const lessonMedia = activeLesson?.media || [];
  const featuredMedia = lessonMedia.slice(0, 3);

  const robotImage = encodeURI('/اشكال للروبوتات والشات جى بى تى/clipart-cartoon-robot-256x256-1cd8.png');
  const studentDisplayName = playerName?.trim() ? playerName : 'الطالب البطل';

  return (
    <div data-tts-root className="min-h-screen p-4 pb-32 md:p-6 relative overflow-hidden" style={{backgroundImage: 'linear-gradient(240deg, #FFB6D9 0%, #87CEEB 20%, #90EE90 40%, #FFE4B5 60%, #FF69B4 80%, #FFB347 100%)'}}>
      <div className="max-w-7xl mx-auto relative z-10 space-y-5">
        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-[30px] p-4 md:p-6 shadow-2xl border border-slate-100 gradient-border interactive-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition kid-button"
              >
                <ArrowRight size={18} weight="bold" />
                رجوع
              </button>

              <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800">تعلم بسهولة يا بطل</h1>
                <p className="text-sm md:text-base font-black text-slate-600 mt-1">اختار درس، اقرأ الصفحات، جاوب سؤال</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-2 rounded-full bg-sky-100 text-sky-700 text-sm font-black">خامسة ابتدائي</span>
              <span className="px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-black">{CURRICULUM_DATA.unit.title}</span>
              <span className="px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-black"> {studentDisplayName}</span>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3 text-right">
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
              <p className="text-xs font-black text-slate-500">نقطي</p>
              <p className="text-2xl font-black text-slate-800">{toArabicNumber(totalPoints)}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
              <p className="text-xs font-black text-slate-500">مستواي</p>
              <p className="text-2xl font-black text-slate-800">{toArabicNumber(currentLevel)}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
              <p className="text-xs font-black text-slate-500">تقدمي اليوم</p>
              <p className="text-2xl font-black text-slate-800">{toArabicNumber(simpleProgress)}%</p>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-2">
            {QUICK_STEPS.map((step) => (
              <div key={step.id} className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-center text-sm md:text-base font-black text-slate-700">
                {step.text}
              </div>
            ))}
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-5">
            <section ref={overviewRef} className="bg-white/95 rounded-[30px] p-5 md:p-6 border border-white shadow-xl interactive-card">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="text-right space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={selectedGradeId}
                      onChange={(e) => setSelectedGradeId(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-black"
                      title="اختر الصف"
                    >
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>

                    <select
                      value={activeLessonId}
                      onChange={(e) => setActiveLessonId(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-black"
                      title="اختر الدرس"
                    >
                      {lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.icon} {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                    {activeLesson?.icon} {activeLesson?.title}
                  </h2>
                  <p className="text-slate-700 text-lg font-black leading-relaxed">
                    {activeLesson?.summary || 'اختار درس من الأزرار فوق.'}
                  </p>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-xs font-black text-emerald-600">أماكن الدرس</p>
                      <p className="text-xl font-black text-emerald-800">{toArabicNumber(lessonLocations.length)}</p>
                    </div>
                    <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3">
                      <p className="text-xs font-black text-sky-600">استكشاف الخريطة</p>
                      <p className="text-xl font-black text-sky-800">{toArabicNumber(lessonExplorePercent)}%</p>
                    </div>
                    <div className="rounded-2xl bg-pink-50 border border-pink-100 p-3">
                      <p className="text-xs font-black text-pink-600">مهامي</p>
                      <p className="text-xl font-black text-pink-800">{toArabicNumber(taskProgress)}%</p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[260px] bg-gradient-to-br from-violet-500 to-pink-500 text-white rounded-[26px] p-4 border border-white/20 shadow-xl">
                  <p className="text-base font-black opacity-95">جاهز للعب؟</p>
                  <p className="text-lg font-black leading-relaxed mt-2">افتح الخريطة واضغط على العلامات المضيئة.</p>

                  <button
                    type="button"
                    onClick={() => navigate('/map')}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-violet-700 px-4 py-3 font-black hover:bg-violet-50 transition kid-button"
                  >
                    <MapTrifold size={20} weight="fill" />
                    ابدأ الاستكشاف
                  </button>
                </div>
              </div>
            </section>

            <section ref={mapKeyRef} className="bg-white/95 rounded-[30px] p-5 md:p-6 border border-white shadow-xl interactive-card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-2xl font-black text-slate-800">تعرف ألوان الخريطة</h3>
                <p className="text-sm font-black text-slate-600">كل لون = نوع مختلف</p>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MAP_LEGEND.map((item) => {
                  const count = MAP_LOCATIONS[item.key]?.length || 0;
                  return (
                    <div key={item.key} className={`rounded-2xl border p-4 ${item.color}`}>
                      <p className="text-lg font-black">{item.emoji} {item.label}</p>
                      <p className="text-sm font-bold mt-2">{toArabicNumber(count)} موقع</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section ref={contentRef} className="bg-white/95 rounded-[30px] p-5 md:p-6 border border-white shadow-xl interactive-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-right">
                  <h3 className="text-2xl font-black text-slate-800">كتاب الدرس</h3>
                  <p className="text-sm font-black text-slate-600 mt-1">اقلب الصفحات يمين وشمال</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((value) => !value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black border transition kid-button ${soundEnabled
                      ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    title={soundEnabled ? 'إيقاف صوت التقليب' : 'تشغيل صوت التقليب'}
                  >
                    {soundEnabled ? <SpeakerHigh size={18} weight="bold" /> : <SpeakerSlash size={18} weight="bold" />}
                    {soundEnabled ? 'الصوت شغال' : 'الصوت مقفول'}
                  </button>

                  {isActivePptx && activeDeck?.path && (
                    <a
                      href={activeDeck.path}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white font-black hover:bg-indigo-700 transition glow-button kid-button"
                    >
                      <DownloadSimple size={18} weight="bold" />
                      تحميل العرض
                    </a>
                  )}
                </div>
              </div>

              {decks.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {decks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => setActiveDeckId(deck.id)}
                      className={`px-4 py-3 rounded-full text-sm font-black border transition kid-button ${deck.id === activeDeckId
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      title={deck.title}
                    >
                      {deck.type === 'pptx' ? 'PowerPoint' : 'صور'}: {deck.title}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600 text-center">
                  لا يوجد كتاب متاح الآن.
                </div>
              )}

              <div className="mt-5">
                {isLoading ? (
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
                    <p className="text-lg font-black text-slate-800">جاري تجهيز الكتاب...</p>
                    <p className="mt-2 text-sm font-black text-slate-600">لحظة صغيرة ونبدأ القراءة.</p>
                  </div>
                ) : pptxError && isActivePptx ? (
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center space-y-3">
                    <p className="text-lg font-black text-slate-800">{pptxError}</p>
                    {activeDeck?.path && (
                      <a
                        href={activeDeck.path}
                        download
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition"
                      >
                        <DownloadSimple size={18} weight="bold" />
                        تحميل الملف
                      </a>
                    )}
                  </div>
                ) : activePages.length ? (
                  <BookViewer
                    key={activeDeck?.id || 'book'}
                    pages={activePages}
                    soundEnabled={soundEnabled}
                    htmlBaseWidth={1280}
                    htmlBaseHeight={720}
                  />
                ) : (
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
                    <p className="text-lg font-black text-slate-800">لا توجد صفحات للعرض حالياً.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid md:grid-cols-3 gap-3">
                {featuredMedia.length > 0 ? featuredMedia.map((item, index) => (
                  <button
                    key={`${item.title}-${index}`}
                    type="button"
                    onClick={() => navigate(`/lesson/${activeLesson?.id}`)}
                    className="text-right rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition kid-button"
                  >
                    <p className="text-sm font-black text-slate-700">
                      {item.type === 'video' ? ' فيديو' : item.type === 'audio' ? ' صوت' : ' صورة'}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600 line-clamp-2">{item.title}</p>
                  </button>
                )) : (
                  <div className="md:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600 text-center">
                    ستظهر موارد الدرس هنا بعد اختيار درس يحتوي على وسائط.
                  </div>
                )}
              </div>
            </section>

            <section ref={conceptsRef} className="bg-white/95 rounded-[30px] p-5 md:p-6 border border-white shadow-xl interactive-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-800">كلمات وأفكار مهمة</h3>
                <p className="text-sm font-black text-slate-600">مختصر سريع للحفظ</p>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <h4 className="font-black text-slate-800 mb-3">مصطلحات مهمة</h4>
                  <div className="space-y-2">
                    {(activeLesson?.vocabulary || []).slice(0, 4).map((term, index) => (
                      <div key={`${term.term}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-black text-slate-800">{term.term}</p>
                        <p className="text-sm font-bold text-slate-600">{term.meaning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <h4 className="font-black text-slate-800 mb-3">أهداف سريعة</h4>
                  <ul className="space-y-2 text-sm font-bold text-slate-600">
                    {(activeLesson?.objectives || []).slice(0, 4).map((objective, index) => (
                      <li key={`${objective}-${index}`} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1"></span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section ref={practiceRef} className="bg-white/95 rounded-[30px] p-5 md:p-6 border border-white shadow-xl interactive-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-800">سؤال سريع</h3>
                <button
                  type="button"
                  onClick={() => navigate(`/lesson/${activeLesson?.id}`)}
                  className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition kid-button"
                >
                  افتح تدريب كامل
                </button>
              </div>

              {practiceQuestion ? (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="font-black text-slate-800">{practiceQuestion.question}</p>

                  {practiceQuestion.options?.length ? (
                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      {practiceQuestion.options.map((option, index) => {
                        const isPicked = selectedOption === index;
                        const isCorrect = isPicked && practiceResult === true;
                        const isWrong = isPicked && practiceResult === false;
                        return (
                          <button
                            key={`${option}-${index}`}
                            type="button"
                            onClick={() => handlePracticeAnswer(index)}
                            className={`w-full text-right rounded-xl border px-3 py-2 text-sm font-black transition ${isCorrect
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : isWrong
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-bold text-slate-600"> {practiceQuestion.hint}</p>
                  )}

                  {practiceResult !== null && (
                    <p className={`mt-3 text-sm font-black ${practiceResult ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {practiceResult ? 'إجابة صحيحة! ممتاز ' : 'حاول مرة أخرى، أنت قريب جداً.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600 text-center">
                  لا يوجد سؤال استعداد متاح لهذا الدرس حالياً.
                </div>
              )}
            </section>

            <section ref={tasksRef} className="bg-white/95 rounded-[30px] p-5 md:p-6 border border-white shadow-xl interactive-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-800">قائمة اليوم</h3>
                <span className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-black">
                  {toArabicNumber(taskProgress)}%
                </span>
              </div>

              <div className="mt-4 w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${taskProgress}%` }}
                  className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400"
                />
              </div>

              <div className="mt-4 space-y-2">
                {dailyTasks.map((task) => {
                  const checked = Boolean(taskChecks[task.id]);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-right transition kid-button ${checked
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="font-bold">{task.text}</span>
                      <span className="text-lg">{checked ? '' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="bg-white/95 rounded-[30px] p-4 border border-white shadow-xl interactive-card">
              <h3 className="text-lg font-black text-slate-800 mb-3 text-right">اختصارات سريعة</h3>
              <div className="space-y-2">
                {ACTION_ITEMS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => scrollToSection(action.id)}
                    className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border text-base font-black transition kid-button ${activeAction === action.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <span>{action.label}</span>
                    <span className="text-lg">{action.emoji}</span>
                  </button>
                ))}
              </div>
            </section>

            <section ref={guideRef} className="bg-white/95 rounded-[30px] p-4 border border-white shadow-xl interactive-card text-right">
              <div className="flex items-center gap-3">
                <img
                  src={robotImage}
                  alt="المساعد الراجل"
                  className="w-14 h-14 rounded-2xl bg-slate-50 p-1 border border-slate-100 shadow-sm"
                />
                <div>
                  <h3 className="text-lg font-black text-slate-800">المساعد الراجل</h3>
                  <p className="text-xs font-black text-slate-600">صوت راجل باللهجة المصرية - اسأل براحتك</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-base font-black text-slate-700 leading-relaxed">{robotReply}</p>
              </div>

              <div className="mt-3 grid gap-2">
                {ROBOT_QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => runRobotAnswer(question)}
                    className="w-full text-right rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-sm font-black transition kid-button"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <form onSubmit={handleRobotAsk} className="mt-3 space-y-2">
                <input
                  value={robotInput}
                  onChange={(e) => setRobotInput(e.target.value)}
                  placeholder="اكتب سؤالك بالمصري هنا"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition kid-button"
                >
                  اسأل المساعد الراجل دلوقتي
                </button>
              </form>
            </section>

            <section className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-[30px] p-4 shadow-xl border border-white/20">
              <h3 className="text-lg font-black">معلومة سريعة</h3>
              <p className="text-sm font-bold leading-relaxed mt-2">
                {activeLesson?.funFacts?.[0] || 'ابدأ الدرس وستظهر لك معلومات ممتعة هنا.'}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}


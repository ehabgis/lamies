import { useEffect, useMemo, useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import { useGameStore } from '../store/gameStore';

import { Play, Image as ImageIcon, MusicNotes, ArrowRight, GameController, Lightbulb } from 'phosphor-react';

import MediaViewer from '../components/MediaViewer';
import MagicalMap from '../components/Map/MagicalMap';
import LocationDialog from '../components/Character/LocationDialog';

import { CURRICULUM_DATA, MAP_LOCATIONS } from '../data/curriculumData';
import { playLandmarkSound } from '../utils/landmarkSounds';



const MEDIA_ICONS = {

    video: <Play size={32} weight="fill" className="text-pink-500" />,

    image: <ImageIcon size={32} weight="fill" className="text-sky-500" />,

    audio: <MusicNotes size={32} weight="fill" className="text-violet-500" />,

};

const LESSON_MAP_META = {
    'lesson-1': {
        mapVariant: 'lesson-1',
        headerGradient: 'from-amber-500 to-orange-600',
        blankSurface: 'from-[#FFF5E8] via-[#FFF9F2] to-[#FFF0E8]',
        blankPointClass: 'bg-amber-600 hover:bg-amber-500',
        progressGradient: 'from-amber-400 via-orange-400 to-rose-400',
        blankCanvasClass: 'from-[#FFE4BA] via-[#FFF2DA] to-[#FFD9A1]',
        blankWaterColor: '#8ED8FF',
        blankLandFill: '#F6DFB4',
        blankLandStroke: '#9E6E34',
        markerSymbol: '',
        lessonHintLead: 'ثروات ومعادن',
        kidSteps: ['شوف اسم المكان', 'فكر في المحافظة', 'اضغط النقطة الأقرب']
    },
    'lesson-2': {
        mapVariant: 'lesson-2',
        headerGradient: 'from-sky-500 to-cyan-600',
        blankSurface: 'from-[#EAF9FF] via-[#F5FDFF] to-[#E9F6FF]',
        blankPointClass: 'bg-sky-600 hover:bg-sky-500',
        progressGradient: 'from-cyan-400 via-sky-400 to-blue-500',
        blankCanvasClass: 'from-[#CFF4FF] via-[#E8FAFF] to-[#B9E7FF]',
        blankWaterColor: '#75CFFF',
        blankLandFill: '#F2E9CB',
        blankLandStroke: '#5C88A6',
        markerSymbol: '',
        lessonHintLead: 'مياه وموارد مائية',
        kidSteps: ['اقرأ السؤال بتركيز', 'استخدم زر التلميح لو احتجت', 'اختار نقطة واحدة']
    },
    'lesson-3': {
        mapVariant: 'lesson-3',
        headerGradient: 'from-indigo-500 to-violet-600',
        blankSurface: 'from-[#EEF0FF] via-[#F7F8FF] to-[#EEE9FF]',
        blankPointClass: 'bg-indigo-600 hover:bg-indigo-500',
        progressGradient: 'from-indigo-400 via-violet-400 to-fuchsia-500',
        blankCanvasClass: 'from-[#E3E7FF] via-[#F3F4FF] to-[#D9DEFF]',
        blankWaterColor: '#A7B8FF',
        blankLandFill: '#ECE4D0',
        blankLandStroke: '#7468A7',
        markerSymbol: '',
        lessonHintLead: 'مشروعات قومية',
        kidSteps: ['حدد اسم المشروع', 'تذكر مكانه على الخريطة', 'اضغط النقطة الصح']
    },
    default: {
        mapVariant: 'default',
        headerGradient: 'from-pink-500 to-violet-600',
        blankSurface: 'from-[#EAF7FF] via-[#F6FCFF] to-[#EEF5FF]',
        blankPointClass: 'bg-blue-600 hover:bg-blue-500',
        progressGradient: 'from-emerald-400 via-cyan-400 to-blue-500',
        blankCanvasClass: 'from-sky-200 via-cyan-100 to-blue-200',
        blankWaterColor: '#A5DEF7',
        blankLandFill: '#F8E7B5',
        blankLandStroke: '#9E6E34',
        markerSymbol: '',
        lessonHintLead: 'معالم الدرس',
        kidSteps: ['اقرأ الاسم', 'اطلب تلميح عند الحاجة', 'اضغط النقطة الأقرب']
    }
};

const BLANK_MAP_VIEWBOX = { width: 500, height: 400 };
const BLANK_MARKER_LAT_RANGE = { min: 21, max: 32 };
const BLANK_MARKER_LNG_RANGE = { min: 24, max: 36 };
const BLANK_DRAW_BOUNDS = { xMin: 75, xMax: 425, yMin: 35, yMax: 365 };

const BLANK_MAINLAND_POINTS = [
    { lat: 22.0, lng: 25.0 },
    { lat: 31.6, lng: 25.0 },
    { lat: 31.55, lng: 26.4 },
    { lat: 31.45, lng: 27.8 },
    { lat: 31.25, lng: 29.4 },
    { lat: 31.4, lng: 30.4 },
    { lat: 31.55, lng: 31.1 },
    { lat: 31.4, lng: 31.9 },
    { lat: 31.3, lng: 32.35 },
    { lat: 30.7, lng: 32.45 },
    { lat: 29.97, lng: 32.55 },
    { lat: 29.3, lng: 32.85 },
    { lat: 28.5, lng: 33.2 },
    { lat: 27.7, lng: 33.6 },
    { lat: 26.95, lng: 34.0 },
    { lat: 26.15, lng: 34.4 },
    { lat: 25.2, lng: 34.75 },
    { lat: 24.2, lng: 35.1 },
    { lat: 23.2, lng: 35.55 },
    { lat: 22.25, lng: 35.9 },
    { lat: 22.0, lng: 32.0 },
    { lat: 22.0, lng: 29.0 },
    { lat: 22.0, lng: 27.0 },
    { lat: 22.0, lng: 25.0 }
];

const BLANK_SINAI_POINTS = [
    { lat: 31.3, lng: 32.35 },
    { lat: 31.35, lng: 33.2 },
    { lat: 31.28, lng: 34.2 },
    { lat: 30.7, lng: 34.45 },
    { lat: 30.2, lng: 34.7 },
    { lat: 29.5, lng: 34.9 },
    { lat: 28.9, lng: 34.75 },
    { lat: 28.25, lng: 34.55 },
    { lat: 27.75, lng: 34.3 },
    { lat: 28.35, lng: 33.95 },
    { lat: 28.95, lng: 33.65 },
    { lat: 29.45, lng: 33.25 },
    { lat: 29.97, lng: 32.55 },
    { lat: 30.7, lng: 32.45 },
    { lat: 31.3, lng: 32.35 }
];

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

const blankLngLatToSvg = ({ lat, lng }) => {
    const safeLng = clampValue(lng, BLANK_MARKER_LNG_RANGE.min, BLANK_MARKER_LNG_RANGE.max);
    const safeLat = clampValue(lat, BLANK_MARKER_LAT_RANGE.min, BLANK_MARKER_LAT_RANGE.max);

    const x = BLANK_DRAW_BOUNDS.xMin
        + ((safeLng - BLANK_MARKER_LNG_RANGE.min) / (BLANK_MARKER_LNG_RANGE.max - BLANK_MARKER_LNG_RANGE.min))
        * (BLANK_DRAW_BOUNDS.xMax - BLANK_DRAW_BOUNDS.xMin);

    const y = BLANK_DRAW_BOUNDS.yMax
        - ((safeLat - BLANK_MARKER_LAT_RANGE.min) / (BLANK_MARKER_LAT_RANGE.max - BLANK_MARKER_LAT_RANGE.min))
        * (BLANK_DRAW_BOUNDS.yMax - BLANK_DRAW_BOUNDS.yMin);

    return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10
    };
};

const blankPathFromPoints = (points) => {
    if (!Array.isArray(points) || points.length < 2) return '';
    const coords = points.map(blankLngLatToSvg);
    return `${coords.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`;
};

const getBlankMarkerPercentPosition = (location) => {
    const x = ((location.lng - BLANK_MARKER_LNG_RANGE.min) / (BLANK_MARKER_LNG_RANGE.max - BLANK_MARKER_LNG_RANGE.min)) * 100;
    const y = 100 - ((location.lat - BLANK_MARKER_LAT_RANGE.min) / (BLANK_MARKER_LAT_RANGE.max - BLANK_MARKER_LAT_RANGE.min)) * 100;
    return { x, y };
};

const toArabicNumber = (value) => Number(value || 0).toLocaleString('ar-EG');
const toArabicDecimal = (value, digits = 2) => Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
});

const LESSON_CATEGORY_META = {
    minerals: { label: 'معادن وثروات', emoji: '', chipClass: 'bg-amber-50 border-amber-200 text-amber-700' },
    energy: { label: 'طاقة', emoji: '', chipClass: 'bg-sky-50 border-sky-200 text-sky-700' },
    water: { label: 'مياه', emoji: '', chipClass: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
    projects: { label: 'مشروعات', emoji: '', chipClass: 'bg-violet-50 border-violet-200 text-violet-700' }
};

const simplifyText = (text, maxWords = 14) => {
    const plain = String(text || '').replace(/\s+/g, ' ').trim();
    if (!plain) return '';
    const words = plain.split(' ');
    if (words.length <= maxWords) return plain;
    return `${words.slice(0, maxWords).join(' ')}...`;
};

const buildLessonBlankQuestionVariants = (location) => {
    if (!location) return [];

    const questions = [];

    // السؤال المكاني الأساسي
    questions.push({ 
        id: 'loc-location', 
        type: 'مكاني', 
        text: `فين مكان ${location.name} على الخريطة؟` 
    });

    // السؤال عن المحافظة
    if (location.governorate) {
        questions.push({ 
            id: 'loc-gov', 
            type: 'محافظة', 
            text: `اختار موقع ${location.name} اللي في محافظة ${location.governorate}.` 
        });
    }

    // أسئلة من simpleInfo
    if (location.simpleInfo) {
        if (location.simpleInfo.what) {
            questions.push({
                id: 'info-what',
                type: 'معلومة أساسية',
                text: `${location.name} هو: ${location.simpleInfo.what}`
            });
        }
        if (location.simpleInfo.why) {
            questions.push({
                id: 'info-why',
                type: 'فائدة',
                text: `ليه ${location.name} مهم؟ قول: ${location.simpleInfo.why}`
            });
        }
        if (location.simpleInfo.howMuch) {
            questions.push({
                id: 'info-howMuch',
                type: 'كمية/إحصائية',
                text: `كام كمية من ${location.name}؟ الجواب: ${location.simpleInfo.howMuch}`
            });
        }
        if (location.simpleInfo.where) {
            questions.push({
                id: 'info-where',
                type: 'موقعي تفصيلي',
                text: `تدقيقاً: ${location.name} موجود ${location.simpleInfo.where}`
            });
        }
    }

    // أسئلة من characterDialog
    if (location.characterDialog) {
        if (location.characterDialog.explanation) {
            questions.push({
                id: 'dialog-explain',
                type: 'شرح',
                text: location.characterDialog.explanation.substring(0, 80) + '...'
            });
        }
        if (location.characterDialog.funFact) {
            questions.push({
                id: 'dialog-fact',
                type: 'حقيقة مرحة',
                text: `هل تعلم؟ ${location.characterDialog.funFact}`
            });
        }
        if (location.characterDialog.importance) {
            questions.push({
                id: 'dialog-import',
                type: 'أهمية',
                text: `${location.name} مهم لأن: ${location.characterDialog.importance.substring(0, 60)}...`
            });
        }
    }

    // أسئلة من quiz إن وجدت
    if (location.quiz && Array.isArray(location.quiz)) {
        location.quiz.slice(0, 4).forEach((item, index) => {
            questions.push({
                id: `quiz-${index}`,
                type: 'اختيار من متعدد',
                text: item?.question || `سؤال عن ${location.name}`
            });
        });
    }

    // إذا كانت الأسئلة قليلة، أضف أسئلة عامة
    if (questions.length < 5) {
        questions.push({
            id: 'general-name',
            type: 'إعادة تعريف',
            text: `اختار على الخريطة: ${location.name} (${location.emoji})`
        });

        if (location.type) {
            questions.push({
                id: 'general-type',
                type: 'تصنيف',
                text: `${location.name} من نوع: ${location.type}`
            });
        }
    }

    return questions.slice(0, 12); // حد أقصى 12 سؤال
};

const buildLessonLocations = (activeLessonId) => {
    if (!activeLessonId) return [];
    return Object.entries(MAP_LOCATIONS || {}).flatMap(([cat, list]) => (
        (list || [])
            .filter((location) => location.lesson === activeLessonId)
            .map((location) => ({ ...location, cat }))
    ));
};



export default function LessonDashboard() {

    const { lessonId } = useParams();

    const navigate = useNavigate();

    const { completedLessons, soundEnabled = true } = useGameStore();

    const [selectedMedia, setSelectedMedia] = useState(null);

    const [foundSecrets, setFoundSecrets] = useState([]);

    const [confetti, setConfetti] = useState(false);
    const [practiceAnswers, setPracticeAnswers] = useState({});
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [lessonMapTargetId, setLessonMapTargetId] = useState(null);
    const [lessonMapScore, setLessonMapScore] = useState(0);
    const [lessonMapAttempts, setLessonMapAttempts] = useState(0);
    const [lessonMapFeedback, setLessonMapFeedback] = useState('');
    const [lessonMapFocusId, setLessonMapFocusId] = useState(null);
    const [lessonMapFocusNonce, setLessonMapFocusNonce] = useState(0);
    const [blankTargetId, setBlankTargetId] = useState(null);
    const [blankScore, setBlankScore] = useState(0);
    const [blankAttempts, setBlankAttempts] = useState(0);
    const [blankRound, setBlankRound] = useState(1);
    const [blankFeedback, setBlankFeedback] = useState('');
    const [blankLastGuessId, setBlankLastGuessId] = useState(null);
    const [blankHintVisible, setBlankHintVisible] = useState(false);
    const [blankHoveredLocationId, setBlankHoveredLocationId] = useState(null);
    const [activeMapView, setActiveMapView] = useState('interactive');
    const [selectedLessonLandmarkId, setSelectedLessonLandmarkId] = useState('');
    const [activeConceptIndex, setActiveConceptIndex] = useState(0);
    const [mapCameraResetNonce, setMapCameraResetNonce] = useState(0);



    const lesson = CURRICULUM_DATA.lessons.find((l) => l.id === lessonId);



    const triggerConfetti = () => {

        setConfetti(true);

        setTimeout(() => setConfetti(false), 3000);

    };

    const handlePracticeAnswer = (questionIndex, optionIndex, correctIndex) => {
        const isCorrect = optionIndex === correctIndex;
        setPracticeAnswers(prev => ({
            ...prev,
            [questionIndex]: { selected: optionIndex, isCorrect }
        }));
        if (isCorrect) {
            triggerConfetti();
        }
    };



    // Progressive content revealing

    const [visibleMediaCount, setVisibleMediaCount] = useState(3);

    const totalMedia = lesson?.media?.length || 0;

    const totalSecrets = lesson?.secrets?.length || 0;

    const estimatedMinutes = Math.max(8, totalMedia * 3);

    const totalObjectives = lesson?.objectives?.length || 0;



    const mediaProgress = totalMedia > 0 ? (Math.min(visibleMediaCount, totalMedia) / totalMedia) : 1;

    const secretProgress = totalSecrets > 0 ? (foundSecrets.length / totalSecrets) : 1;



    // 70% based on media, 30% based on secrets

    const progressPercent = Math.round((mediaProgress * 70) + (secretProgress * 30));

    const lessonLocations = useMemo(() => buildLessonLocations(lessonId), [lessonId]);
    const lessonLocationIds = useMemo(() => lessonLocations.map((location) => location.id), [lessonLocations]);
    const lessonMapMeta = LESSON_MAP_META[lessonId] || LESSON_MAP_META.default;
    const blankMapPathMainland = useMemo(() => blankPathFromPoints(BLANK_MAINLAND_POINTS), []);
    const blankMapPathSinai = useMemo(() => blankPathFromPoints(BLANK_SINAI_POINTS), []);
    const lessonMapTarget = useMemo(
        () => lessonLocations.find((location) => location.id === lessonMapTargetId) || null,
        [lessonLocations, lessonMapTargetId]
    );
    const lessonMapAccuracy = lessonMapAttempts ? Math.round((lessonMapScore / lessonMapAttempts) * 100) : 0;
    const blankTarget = useMemo(
        () => lessonLocations.find((location) => location.id === blankTargetId) || null,
        [lessonLocations, blankTargetId]
    );
    const blankQuestionOptions = useMemo(
        () => (blankTarget ? buildLessonBlankQuestionVariants(blankTarget) : []),
        [blankTarget]
    );
    const blankActiveQuestion = useMemo(() => {
        if (!blankQuestionOptions.length) return null;
        const index = Math.abs((blankRound + blankAttempts) % blankQuestionOptions.length);
        return blankQuestionOptions[index];
    }, [blankQuestionOptions, blankRound, blankAttempts]);
    const blankAccuracy = blankAttempts ? Math.round((blankScore / blankAttempts) * 100) : 0;
    const blankGuideMessage = useMemo(() => {
        if (!blankTarget) return 'اختار "سؤال جديد" علشان يبدأ التمرين.';
        if (!blankAttempts) return 'اقرأ اسم المكان المطلوب ثم اضغط نقطة واحدة على الخريطة.';
        if (blankFeedback.startsWith('')) return 'إجابة ممتازة! كمّل على السؤال اللي بعده.';
        return 'جرّب مرة تانية بهدوء أو استخدم زر "إظهار تلميح".';
    }, [blankAttempts, blankFeedback, blankTarget]);

    const pickNextLessonMapTarget = (excludeId = null, options = {}) => {
        const { focus = false } = options;
        if (!lessonLocations.length) {
            setLessonMapTargetId(null);
            return;
        }

        const filtered = excludeId
            ? lessonLocations.filter((location) => location.id !== excludeId)
            : lessonLocations;
        const source = filtered.length ? filtered : lessonLocations;
        const next = source[Math.floor(Math.random() * source.length)];

        setLessonMapTargetId(next.id);
        if (focus) {
            setLessonMapFocusId(next.id);
            setLessonMapFocusNonce((value) => value + 1);
        }
    };

    const resetLessonMapChallenge = () => {
        setLessonMapScore(0);
        setLessonMapAttempts(0);
        setLessonMapFeedback('');
        setLessonMapFocusId(null);
        setMapCameraResetNonce((value) => value + 1);
        pickNextLessonMapTarget();
    };

    const focusRandomLessonLocation = () => {
        if (!lessonLocations.length) return;
        const next = lessonLocations[Math.floor(Math.random() * lessonLocations.length)];
        setLessonMapFocusId(next.id);
        setLessonMapFocusNonce((value) => value + 1);
        setLessonMapFeedback(` ركز على: ${next.name}`);
    };

    const focusLessonLocation = (location, openDetails = false) => {
        if (!location) return;
        setLessonMapFocusId(location.id);
        setLessonMapFocusNonce((value) => value + 1);
        setLessonMapFeedback(` استعلم عن: ${location.name}`);
        if (openDetails) {
            setSelectedLocation(location);
        }
    };

    const handleLessonLandmarkSelect = (locationId, openDetails = false) => {
        if (!locationId) return;
        const location = lessonLocations.find((item) => item.id === locationId);
        if (!location) return;
        setSelectedLessonLandmarkId(location.id);
        focusLessonLocation(location, openDetails);
        
        // تشغيل صوت المعلم
        if (soundEnabled) {
            playLandmarkSound(location, { soundEnabled, volume: 0.12 });
        }
    };

    const handleLessonMapLocationSelect = (location) => {
        setSelectedLessonLandmarkId(location.id);
        focusLessonLocation(location, false);
        
        // تشغيل صوت المعلم
        if (soundEnabled) {
            playLandmarkSound(location, { soundEnabled, volume: 0.15 });
        }
        
        if (!lessonMapTargetId) return;

        const isCorrect = location.id === lessonMapTargetId;
        setLessonMapAttempts((value) => value + 1);

        if (isCorrect) {
            setLessonMapScore((value) => value + 1);
            setLessonMapFeedback(` ممتاز! اخترت ${location.name} صح.`);
            triggerConfetti();
            pickNextLessonMapTarget(location.id);
            return;
        }

        setLessonMapFeedback(` ليست ${location.name}. تلميح: ${lessonMapTarget?.governorate || 'راجع خريطة الدرس'}.`);
    };

    const pickNextBlankTarget = (excludeId = null) => {
        if (!lessonLocations.length) {
            setBlankTargetId(null);
            return;
        }

        const filtered = excludeId
            ? lessonLocations.filter((location) => location.id !== excludeId)
            : lessonLocations;
        const source = filtered.length ? filtered : lessonLocations;
        const next = source[Math.floor(Math.random() * source.length)];
        setBlankTargetId(next.id);
    };

    const resetBlankMap = () => {
        setBlankScore(0);
        setBlankAttempts(0);
        setBlankRound(1);
        setBlankLastGuessId(null);
        setBlankHintVisible(false);
        setBlankFeedback('');
        pickNextBlankTarget();
    };

    const handleBlankGuess = (location) => {
        if (!blankTargetId) return;

        const isCorrect = location.id === blankTargetId;
        setBlankAttempts((value) => value + 1);
        setBlankLastGuessId(location.id);

        if (isCorrect) {
            setBlankScore((value) => value + 1);
            setBlankRound((value) => value + 1);
            setBlankHintVisible(false);
            setBlankFeedback(` ممتاز! مكان ${location.name} صحيح.`);
            triggerConfetti();
            pickNextBlankTarget(location.id);
            return;
        }

        setBlankFeedback(` ليست ${location.name}. تلميح: ${blankTarget?.governorate || 'راجع مواقع الدرس'}.`);
    };

    useEffect(() => {
        setSelectedLocation(null);
        setLessonMapFocusId(null);
        setLessonMapFocusNonce(0);
        setSelectedLessonLandmarkId('');
        setActiveMapView('interactive');
        setActiveConceptIndex(0);
        setMapCameraResetNonce((value) => value + 1);
        resetLessonMapChallenge();
        resetBlankMap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId, lessonLocations.length]);



    if (!lesson) return <div className="p-8 text-center text-2xl font-black">الدرس غير موجود! </div>;

    const summaryText = lesson.summary || lesson.description || `تعرف على أهم أفكار درس ${lesson.title}.`;
    const detailsText = lesson.details || '';
    const keyPoints = (lesson.keyPoints && lesson.keyPoints.length)
        ? lesson.keyPoints
        : (lesson.objectives && lesson.objectives.length)
            ? lesson.objectives
            : (lesson.funFacts || []).slice(0, 4);
    const vocabulary = (lesson.vocabulary && lesson.vocabulary.length)
        ? lesson.vocabulary
        : [
            { term: lesson.title, meaning: "موضوع الدرس الرئيسي الذي نتعلم تفاصيله." },
            { term: CURRICULUM_DATA.unit.title, meaning: "اسم الوحدة التي ينتمي إليها الدرس." }
        ];
    const fallbackExamples = [
        ...(lesson.media || []).slice(0, 2).map((item) => `مشاهدة: ${item.title}`),
        ...(lesson.secrets || []).slice(0, 2).map((secret) => `${secret.title}: ${secret.content}`)
    ].slice(0, 4);
    const examples = (lesson.examples && lesson.examples.length) ? lesson.examples : fallbackExamples;
    const realLifeText = lesson.realLife || `هذا الدرس مرتبط بحياتنا اليومية من خلال ${lesson.title}.`;
    const practiceQuestions = (lesson.practiceQuestions && lesson.practiceQuestions.length)
        ? lesson.practiceQuestions
        : [
            { question: `اذكر معلومة تعلمتها عن ${lesson.title}.`, hint: "راجع الملخص والوسائط." },
            { question: `لماذا يعتبر ${lesson.title} مهمًا لمصر؟`, hint: "فكر في الفوائد أو الموارد." },
            { question: `كيف نستفيد من هذا الدرس في حياتنا اليومية؟`, hint: "اذكر تطبيقًا عمليًا." }
        ];
    const lessonCategoryBreakdown = Object.entries(
        lessonLocations.reduce((acc, location) => {
            acc[location.cat] = (acc[location.cat] || 0) + 1;
            return acc;
        }, {})
    ).map(([cat, count]) => ({
        cat,
        count,
        ...(LESSON_CATEGORY_META[cat] || { label: cat, emoji: '', chipClass: 'bg-slate-50 border-slate-200 text-slate-700' })
    }));
    const conceptCards = [
        {
            id: 'summary',
            emoji: '',
            title: 'فكرة الدرس',
            text: simplifyText(summaryText, 16)
        },
        ...keyPoints.slice(0, 2).map((point, index) => ({
            id: `key-point-${index}`,
            emoji: '',
            title: `مفهوم ${toArabicNumber(index + 1)}`,
            text: simplifyText(point, 14)
        })),
        ...lessonLocations.slice(0, 2).map((location) => ({
            id: `location-concept-${location.id}`,
            emoji: location.emoji || '',
            title: location.name,
            text: simplifyText(location.simpleInfo?.what || location.characterDialog?.explanation || location.category, 14)
        })),
        ...(vocabulary[0]
            ? [{
                id: 'vocabulary',
                emoji: '',
                title: vocabulary[0].term,
                text: simplifyText(vocabulary[0].meaning, 14)
            }]
            : [])
    ].slice(0, 6);
    const activeConceptCard = conceptCards[activeConceptIndex] || null;
    const lessonJourneySteps = [
        {
            id: 'step-discover',
            emoji: '',
            title: 'استكشاف',
            detail: `${toArabicNumber(lessonLocations.length)} معالم على الخريطة`
        },
        {
            id: 'step-understand',
            emoji: '',
            title: 'فهم المفاهيم',
            detail: `${toArabicNumber(keyPoints.length)} نقاط رئيسية`
        },
        {
            id: 'step-practice',
            emoji: '',
            title: 'تدريب سريع',
            detail: `${toArabicNumber(practiceQuestions.length)} سؤال بسيط`
        },
        {
            id: 'step-apply',
            emoji: '',
            title: 'تطبيق',
            detail: 'نشاط تفاعلي على الخريطة'
        }
    ];
    const activeLessonLocation = lessonLocations.find((location) => location.id === selectedLessonLandmarkId)
        || lessonLocations.find((location) => location.id === lessonMapFocusId)
        || lessonMapTarget
        || lessonLocations[0]
        || null;
    const lessonMapInfoCards = [
        {
            id: 'lesson-map-story',
            emoji: '',
            title: 'حكاية الدرس',
            text: simplifyText(summaryText, 18)
        },
        {
            id: 'lesson-map-details',
            emoji: '',
            title: 'تفصيل مهم',
            text: simplifyText(detailsText || keyPoints[2] || realLifeText, 16)
        },
        {
            id: 'lesson-map-point',
            emoji: '',
            title: 'فكرة محورية',
            text: simplifyText(keyPoints[0] || realLifeText, 16)
        },
        {
            id: 'lesson-map-point-2',
            emoji: '',
            title: 'تفصيلة داعمة',
            text: simplifyText(keyPoints[1] || detailsText || realLifeText, 16)
        },
        {
            id: 'lesson-map-term',
            emoji: '',
            title: vocabulary[0]?.term || 'مصطلح سهل',
            text: simplifyText(vocabulary[0]?.meaning || 'مصطلح بسيط يساعد الطفل يفهم الدرس بسرعة.', 14)
        },
        {
            id: 'lesson-map-objective',
            emoji: '',
            title: 'هدف تعلم',
            text: simplifyText(lesson.objectives?.[0] || 'يربط الطفل بين مواقع الخريطة ومحتوى الدرس.', 15)
        },
        {
            id: 'lesson-map-objective-2',
            emoji: '',
            title: 'هدف إضافي',
            text: simplifyText(lesson.objectives?.[1] || 'يتعرف على أسباب أهمية كل معلم على الخريطة.', 15)
        },
        {
            id: 'lesson-map-example',
            emoji: '',
            title: 'مثال تطبيقي',
            text: simplifyText(examples?.[0] || 'مثال من الحياة اليومية يساعد على الفهم.', 15)
        }
    ].slice(0, 8);
    const lessonMapChildSteps = [
        'اختَر معلمًا واحدًا وابدأ به.',
        'اقرأ: ما هو؟ أين؟ ولماذا مهم؟',
        'جاوب سؤالًا سريعًا، ثم افتح معلمًا جديدًا.'
    ];
    const kidMapSections = [
        {
            id: 'kid-map-start',
            emoji: '',
            title: 'شوف أولًا',
            detail: 'اختر علامة على الخريطة الكبيرة.'
        },
        {
            id: 'kid-map-understand',
            emoji: '',
            title: 'افهم بسرعة',
            detail: 'اقرأ البطاقة المختصرة للمعلم.'
        },
        {
            id: 'kid-map-question',
            emoji: '',
            title: 'جرب سؤال',
            detail: 'جاوب سؤال بسيط مع تلميح.'
        },
        {
            id: 'kid-map-win',
            emoji: '',
            title: 'اكسب تشجيع',
            detail: 'كل إجابة صح تقربك من الشارات.'
        }
    ];
    const gentleMapGuide = activeLessonLocation
        ? `ابدأ من ${activeLessonLocation.name}، وبعدها اختَر معلمًا ثانيًا للمقارنة.`
        : 'اختَر أي معلم وابدأ الرحلة خطوة خطوة.';
    const lessonMapLegendStats = [
        { id: 'legend-locations', emoji: '', label: 'معالم', value: toArabicNumber(lessonLocations.length) },
        { id: 'legend-points', emoji: '', label: 'نقاط', value: toArabicNumber(keyPoints.length) },
        { id: 'legend-vocab', emoji: '', label: 'مصطلحات', value: toArabicNumber(vocabulary.length) },
        { id: 'legend-questions', emoji: '', label: 'أسئلة', value: toArabicNumber(practiceQuestions.length) }
    ];
    const lessonMapLegendHighlights = [
        summaryText,
        detailsText,
        keyPoints[0],
        keyPoints[1],
        vocabulary[0] ? `${vocabulary[0].term}: ${vocabulary[0].meaning}` : '',
        practiceQuestions[0]?.question,
        realLifeText
    ]
        .filter(Boolean)
        .map((line) => simplifyText(line, 15))
        .slice(0, 4);
    const activeLocationFacts = activeLessonLocation ? [
        { id: 'what', label: 'ما هو؟', value: activeLessonLocation.simpleInfo?.what || activeLessonLocation.characterDialog?.explanation },
        { id: 'where', label: 'أين؟', value: activeLessonLocation.simpleInfo?.where || activeLessonLocation.governorate },
        { id: 'why', label: 'لماذا مهم؟', value: activeLessonLocation.simpleInfo?.why || activeLessonLocation.characterDialog?.importance },
        { id: 'type', label: 'النوع', value: activeLessonLocation.type },
        {
            id: 'category',
            label: 'الفئة',
            value: (LESSON_CATEGORY_META[activeLessonLocation.cat]?.label || activeLessonLocation.category)
        },
        { id: 'location-detail', label: 'مكانه بالتفصيل', value: activeLessonLocation.characterDialog?.location },
        { id: 'amount', label: 'رقم مهم', value: activeLessonLocation.simpleInfo?.howMuch },
        {
            id: 'coords',
            label: 'إحداثيات',
            value: Number.isFinite(activeLessonLocation.lat) && Number.isFinite(activeLessonLocation.lng)
                ? `${toArabicDecimal(activeLessonLocation.lat)} ، ${toArabicDecimal(activeLessonLocation.lng)}`
                : ''
        },
        { id: 'quiz', label: 'سؤال من الموقع', value: activeLessonLocation.quiz?.[0]?.question },
        { id: 'activity', label: 'نشاط تفاعلي', value: activeLessonLocation.activities?.matching?.question || activeLessonLocation.activities?.dragDrop?.question },
        {
            id: 'reward',
            label: 'شارة ونقاط',
            value: activeLessonLocation.reward?.badge
                ? `${activeLessonLocation.reward.badge}${activeLessonLocation.reward?.points ? `  ${activeLessonLocation.reward.points} نقطة` : ''}`
                : ''
        }
    ].filter((fact) => fact.value) : [];
    const activeLocationStories = activeLessonLocation ? [
        activeLessonLocation.characterDialog?.intro,
        activeLessonLocation.characterDialog?.explanation,
        activeLessonLocation.characterDialog?.funFact,
        activeLessonLocation.characterDialog?.importance
    ].filter(Boolean).slice(0, 3) : [];
    const activeLocationQuestion = activeLessonLocation?.quiz?.[0] || null;
    const activeLocationMatchPairs = activeLessonLocation?.activities?.matching?.pairs?.slice(0, 2) || [];
    const activeLocationHint = activeLocationQuestion?.hint || practiceQuestions[0]?.hint || '';


    return (

        <div data-tts-root className="kid-lesson-theme lesson-dashboard-root min-h-screen p-4 md:p-8 relative overflow-hidden" style={{backgroundImage: 'linear-gradient(135deg, #FFB6D9 0%, #FFA07A 22%, #FFD700 44%, #87CEEB 66%, #FF69B4 88%, #90EE90 100%)'}}>
            <div className="magic-orbs">
                <span className="magic-orb orb-1" />
                <span className="magic-orb orb-2" />
                <span className="magic-orb orb-3" />
                <span className="magic-orb orb-4" />
            </div>

            {/* Magical Background Particles */}

            <div className="absolute inset-0 pointer-events-none overflow-hidden">

                {[...Array(15)].map((_, i) => (

                    <motion.div

                        key={i}

                        animate={{

                            y: [-20, 1000],

                            x: [Math.random() * 1000, Math.random() * 1000],

                            opacity: [0, 0.5, 0],

                            scale: [0, 1.5, 0]

                        }}

                        transition={{

                            duration: 10 + Math.random() * 20,

                            repeat: Infinity,

                            ease: "linear",

                            delay: Math.random() * 20

                        }}

                        className="absolute text-2xl sparkle-effect"

                        style={{ left: `${Math.random() * 100}%`, top: `-50px` }}

                    >

                        {['', '', '', '', ''][Math.floor(Math.random() * 5)]}

                    </motion.div>

                ))}

            </div>



            <div className="lesson-dashboard-shell max-w-5xl mx-auto relative z-10">

                {/* Navigation Header */}

                <button

                    onClick={() => navigate('/lessons')}

                    className="lesson-dashboard-back-pill flex items-center gap-2 text-slate-600 font-bold mb-6 hover:text-slate-900 transition-colors bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 bounce-hover"

                >

                    <ArrowRight size={24} />

                    العودة لكل الدروس

                </button>



                {/* Lesson Hero */}

                <motion.div

                    initial={{ scale: 0.9, opacity: 0 }}

                    animate={{ scale: 1, opacity: 1 }}

                    whileHover={{ scale: 1.02 }}

                    className="lesson-dashboard-hero bg-white rounded-[40px] p-8 md:p-12 shadow-2xl mb-8 relative overflow-hidden group rainbow-glow-hover"

                >

                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br opacity-5 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" style={{ background: lesson.color }} />



                    {/* Progress Badge */}

                    <div className="lesson-dashboard-progress-badge absolute top-8 left-8 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">

                        <div className={`w-3 h-3 rounded-full ${completedLessons.includes(lesson.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />

                        <span className="text-xs font-black text-emerald-700">

                            {completedLessons.includes(lesson.id) ? 'مكتمل بنجاح!' : 'قيد الاستكشاف'}

                        </span>

                    </div>



                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 pt-4">

                        <motion.div

                            animate={{ rotate: [0, 5, -5, 0] }}

                            transition={{ duration: 4, repeat: Infinity }}

                            className="text-9xl magical-float drop-shadow-2xl"

                            style={{ color: lesson.color }}

                        >

                            {lesson.icon}

                        </motion.div>

                        <div className="text-center md:text-right">

                            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">

                                <h1 className="text-4xl md:text-5xl font-black text-slate-800">{lesson.title}</h1>

                                {completedLessons.includes(lesson.id) && (

                                    <span className="text-4xl animate-bounce sparkle-effect"></span>

                                )}

                            </div>

                            <p className="text-xl md:text-2xl text-slate-600 font-bold mb-8 leading-relaxed">
                                {lesson.summary || "تعال نتعلم تفاصيل الدرس خطوة بخطوة ونكتشف كنوز مصر بشكل ممتع!"}
                            </p>


                            {/* Lesson Progress Bar */}

                            <div className="lesson-dashboard-progress-box max-w-md mx-auto md:mx-0 mb-8 bg-slate-50 p-4 rounded-[30px] border-2 border-slate-100 shadow-inner">

                                <div className="flex justify-between items-center mb-2 px-2">

                                    <span className="text-xs font-black text-slate-400">تقدم الاستكشاف</span>

                                    <span className="text-xs font-black text-sky-500">{progressPercent}%</span>

                                </div>

                                <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden p-1 shadow-inner">

                                    <motion.div

                                        initial={{ width: 0 }}

                                        animate={{ width: `${progressPercent}%` }}

                                        className="h-full bg-gradient-to-r from-sky-400 via-pink-400 to-amber-400 rounded-full shadow-lg"

                                    />

                                </div>

                            </div>



                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">

                                {lesson.objectives.map((obj, i) => (

                                    <motion.span

                                        key={i}

                                        whileHover={{ scale: 1.1, rotate: 2 }}

                                        className="lesson-dashboard-objective-chip bg-slate-50 text-slate-700 px-5 py-3 rounded-2xl text-sm font-black border-2 border-slate-100 shadow-sm flex items-center gap-2"

                                    >

                                        <span className="text-lg"></span>

                                        {obj}

                                    </motion.span>

                                ))}

                            </div>

                        </div>

                    </div>

                </motion.div>



                

                <motion.div

                    initial={{ y: 20, opacity: 0 }}

                    animate={{ y: 0, opacity: 1 }}

                    className="lesson-dashboard-summary-board bg-white/90 backdrop-blur-md rounded-[32px] p-6 md:p-8 shadow-xl border-2 border-white mb-8"

                >

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                        <div className="text-right">

                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">ملخص الدرس</h2>
                            <p className="text-slate-600 font-bold">معلومات سريعة تساعدك تخطط رحلتك.</p>
                            <p className="text-slate-600 font-bold mt-3 leading-relaxed">{summaryText}</p>
                            {detailsText && (
                                <p className="text-slate-600 font-bold mt-2 leading-relaxed">{detailsText}</p>
                            )}
                        </div>

                        <div className="flex gap-3 flex-wrap">

                            <div className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-black interactive-chip">تقدم: {progressPercent}%</div>

                            <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-black interactive-chip">مهمة نشطة</div>

                            <div className="px-4 py-2 rounded-full bg-pink-100 text-pink-700 text-sm font-black interactive-chip">محتوى تفاعلي</div>

                        </div>

                    </div>

                    <div className="mt-6 grid md:grid-cols-4 gap-4 text-center">

                        <div className="lesson-dashboard-summary-metric bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">

                            <div className="text-2xl font-black text-slate-800">{totalMedia}</div>

                            <div className="text-xs font-bold text-slate-500">وسائط</div>

                        </div>

                        <div className="lesson-dashboard-summary-metric bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">

                            <div className="text-2xl font-black text-slate-800">{totalObjectives}</div>

                            <div className="text-xs font-bold text-slate-500">أهداف</div>

                        </div>

                        <div className="lesson-dashboard-summary-metric bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">

                            <div className="text-2xl font-black text-slate-800">{totalSecrets}</div>

                            <div className="text-xs font-bold text-slate-500">أسرار</div>

                        </div>

                        <div className="lesson-dashboard-summary-metric bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">

                            <div className="text-2xl font-black text-slate-800">{estimatedMinutes}</div>

                            <div className="text-xs font-bold text-slate-500">دقائق تقديرية</div>

                        </div>

                    </div>

                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="lesson-dashboard-journey-board bg-white/90 backdrop-blur-md rounded-[32px] p-6 md:p-8 shadow-xl border-2 border-white mb-8"
                >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="text-right">
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-1"> رحلة الدرس</h2>
                                    <p className="text-slate-600 font-bold">خطوات واضحة وسهلة عشان الطفل يمشي عليها.</p>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                {lessonJourneySteps.map((step) => (
                                    <div
                                        key={step.id}
                                        className="lesson-dashboard-journey-step rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-4 text-right shadow-sm interactive-card"
                                    >
                                        <p className="text-2xl">{step.emoji}</p>
                                        <p className="text-sm font-black text-slate-800 mt-2">{step.title}</p>
                                        <p className="text-xs font-bold text-slate-600 mt-1">{step.detail}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 grid sm:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveMapView('interactive');
                                        setMapCameraResetNonce((value) => value + 1);
                                        pickNextLessonMapTarget(lessonMapTargetId);
                                    }}
                                    className="rounded-2xl bg-indigo-600 text-white px-4 py-3 text-sm font-black hover:bg-indigo-700 transition kid-button"
                                >
                                     ابدأ تحدي المعالم
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveMapView('blank');
                                        setBlankHintVisible(false);
                                        pickNextBlankTarget(blankTargetId);
                                    }}
                                    className="rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-black hover:bg-emerald-700 transition kid-button"
                                >
                                     تدريب الخريطة الصماء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConceptIndex((prev) => (conceptCards.length ? (prev + 1) % conceptCards.length : 0))}
                                    className="rounded-2xl bg-amber-500 text-white px-4 py-3 text-sm font-black hover:bg-amber-600 transition kid-button"
                                >
                                     مفهوم جديد
                                </button>
                            </div>
                        </div>

                        <div className="lesson-dashboard-concept-panel lg:w-[310px] rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-rose-50 p-4">
                            <p className="text-sm font-black text-slate-800 mb-3 text-right"> بطاقة مفهوم مبسط</p>
                            {activeConceptCard ? (
                                <motion.div
                                    key={activeConceptCard.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="lesson-dashboard-concept-card rounded-2xl bg-white border border-slate-200 p-4 shadow-sm text-right"
                                >
                                    <p className="text-2xl">{activeConceptCard.emoji}</p>
                                    <p className="text-base font-black text-slate-800 mt-2">{activeConceptCard.title}</p>
                                    <p className="text-sm font-bold text-slate-600 mt-1 leading-relaxed">{activeConceptCard.text}</p>
                                </motion.div>
                            ) : (
                                <div className="lesson-dashboard-concept-card rounded-2xl bg-white border border-slate-200 p-4 shadow-sm text-right">
                                    <p className="text-sm font-bold text-slate-600">سيتم إضافة مفاهيم مبسطة لهذا الدرس.</p>
                                </div>
                            )}
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveConceptIndex((prev) => (prev <= 0 ? Math.max(conceptCards.length - 1, 0) : prev - 1))}
                                    className="flex-1 rounded-xl bg-slate-100 text-slate-700 px-3 py-2 text-sm font-black hover:bg-slate-200 transition kid-button"
                                >
                                    السابق
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConceptIndex((prev) => (conceptCards.length ? (prev + 1) % conceptCards.length : 0))}
                                    className="flex-1 rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm font-black hover:bg-indigo-700 transition kid-button"
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {(keyPoints.length > 0 || vocabulary.length > 0) && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="lesson-dashboard-knowledge-board bg-white/90 backdrop-blur-md rounded-[32px] p-6 md:p-8 shadow-xl border-2 border-white mb-8"
                    >
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                            <div className="text-right">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">أهم النقاط والمصطلحات</h2>
                                <p className="text-slate-600 font-bold">ملخص مركز يساعدك تذاكر بسرعة.</p>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <div className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 text-sm font-black">نقاط مهمة</div>
                                <div className="px-4 py-2 rounded-full bg-sky-100 text-sky-700 text-sm font-black">مصطلحات</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="lesson-dashboard-pane-card bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-3">النقاط الرئيسية</h3>
                                <ul className="space-y-2 text-sm text-slate-600 font-bold">
                                    {keyPoints.map((point, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-emerald-500 mt-1"></span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="lesson-dashboard-pane-card bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-3">مصطلحات مهمة</h3>
                                <div className="space-y-2">
                                    {vocabulary.map((item, i) => (
                                        <div key={i} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                                            <span className="font-black text-slate-800">{item.term}</span>
                                            <span className="text-sm text-slate-600 font-bold text-right">{item.meaning}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {(examples.length > 0 || realLifeText || practiceQuestions.length > 0) && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="lesson-dashboard-details-board bg-white/90 backdrop-blur-md rounded-[32px] p-6 md:p-8 shadow-xl border-2 border-white mb-8"
                    >
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                            <div className="text-right">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">تفاصيل إضافية</h2>
                                <p className="text-slate-600 font-bold">أمثلة من الواقع + تدريب سريع قبل الاختبار.</p>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <div className="px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-black">أمثلة</div>
                                <div className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-black interactive-chip">تطبيق عملي</div>
                                <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-black interactive-chip">تدريب سريع</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="lesson-dashboard-pane-card bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-3">أمثلة من الدرس</h3>
                                <ul className="space-y-2 text-sm text-slate-600 font-bold">
                                    {examples.map((example, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-emerald-500 mt-1"></span>
                                            <span>{example}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="lesson-dashboard-pane-card bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-3">تطبيقات واقعية</h3>
                                <p className="text-sm text-slate-600 font-bold leading-relaxed">
                                    {realLifeText}
                                </p>
                            </div>
                        </div>

                        {practiceQuestions.length > 0 && (
                            <div className="lesson-dashboard-practice-box mt-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <h3 className="text-lg font-black text-slate-800 mb-3">تدريب سريع</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {practiceQuestions.map((item, i) => {
                                        const answerState = practiceAnswers[i];
                                        return (
                                            <div key={i} className="lesson-dashboard-practice-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card text-right">
                                                <p className="text-sm font-black text-slate-800 mb-2">{item.question}</p>
                                                {item.options?.length ? (
                                                    <div className="mt-3 grid gap-2">
                                                        {item.options.map((option, optionIndex) => {
                                                            const isSelected = answerState?.selected === optionIndex;
                                                            const isCorrect = isSelected && answerState?.isCorrect;
                                                            const isWrong = isSelected && answerState && !answerState.isCorrect;
                                                            return (
                                                                <motion.button
                                                                    key={optionIndex}
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    onClick={() => handlePracticeAnswer(i, optionIndex, item.correctIndex)}
                                                                    className={`quiz-option w-full text-right px-3 py-2 rounded-xl border border-slate-100 font-bold text-sm transition-all ${isCorrect ? 'correct' : isWrong ? 'wrong' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                                                >
                                                                    {option}
                                                                </motion.button>
                                                            );
                                                        })}
                                                        {answerState && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className={`text-xs font-black ${answerState.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}
                                                            >
                                                                {answerState.isCorrect ? ' إجابة رائعة!' : ' حاول مرة أخرى'}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-600 font-bold"> {item.hint}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

<div className="grid gap-8">
                    {/* Media Section */}

                    <motion.div

                        initial={{ x: -20, opacity: 0 }}

                        animate={{ x: 0, opacity: 1 }}

                        transition={{ delay: 0.2 }}

                        className="lesson-dashboard-media-column space-y-6 order-2"

                    >

                        <h2 className="text-3xl font-black flex items-center gap-3">

                            <span></span>

                            مكتبة الميديا

                        </h2>



                        <div className="grid gap-4">

                            {lesson.media?.slice(0, visibleMediaCount).map((item, index) => (

                                <motion.button

                                    key={index}

                                    whileHover={{ scale: 1.02 }}

                                    whileTap={{ scale: 0.98 }}

                                    onClick={() => setSelectedMedia(item)}

                                    className="lesson-dashboard-media-item bg-white p-4 rounded-3xl shadow-lg border-2 border-transparent hover:border-pink-200 transition-all flex items-center gap-4 group w-full"

                                >

                                    <div className="bg-slate-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">

                                        {MEDIA_ICONS[item.type] || <ImageIcon size={32} />}

                                    </div>

                                    <div className="flex-1 text-right">

                                        <p className="font-black text-slate-800 line-clamp-1">{item.title}</p>

                                        <p className="text-sm text-slate-400 font-bold">{item.type === 'video' ? 'فيديو تفاعلي' : item.type === 'image' ? 'صورة توضيحية' : 'تسجيل صوتي'}</p>

                                    </div>

                                </motion.button>

                            ))}



                            {totalMedia > visibleMediaCount && (

                                <motion.button

                                    whileHover={{ scale: 1.05 }}

                                    whileTap={{ scale: 0.95 }}

                                    onClick={() => setVisibleMediaCount(prev => prev + 3)}

                                    className="w-full py-4 bg-pink-50 text-pink-600 rounded-2xl font-black border-2 border-pink-100 hover:bg-pink-100 transition-all flex items-center justify-center gap-2"

                                >

                                    <span></span>

                                    عرض المزيد من المصادر ({totalMedia - visibleMediaCount})

                                </motion.button>

                            )}

                            {(!lesson.media || lesson.media.length === 0) && (

                                <div className="lesson-dashboard-media-empty bg-slate-100/50 rounded-3xl p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200">

                                    سيتم إضافة الملفات قريباً! 

                                </div>

                            )}

                        </div>

                    </motion.div>



                    {/* Action Section */}

                    <motion.div

                        initial={{ x: 20, opacity: 0 }}

                        animate={{ x: 0, opacity: 1 }}

                        transition={{ delay: 0.4 }}

                        className="lesson-dashboard-map-column flex flex-col gap-8 order-1 w-full max-w-6xl mx-auto"

                    >

                        <div className="lesson-dashboard-map-switch rounded-[28px] border border-slate-200 bg-white/80 p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveMapView('interactive');
                                        setLessonMapFocusId(null);
                                        setMapCameraResetNonce((value) => value + 1);
                                    }}
                                    className={`rounded-2xl px-4 py-3 text-sm font-black transition kid-button ${activeMapView === 'interactive' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                     الخريطة التفاعلية
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveMapView('blank')}
                                    className={`rounded-2xl px-4 py-3 text-sm font-black transition kid-button ${activeMapView === 'blank' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                     الخريطة الصماء
                                </button>
                            </div>
                            <p className="text-xs font-bold text-slate-500 mt-2 text-right px-2">
                                اختَر وضع اللعب والتعلم الذي يناسب الطفل.
                            </p>
                        </div>

                        {activeMapView === 'interactive' && (
                        <div className="lesson-dashboard-interactive-map bg-white/95 backdrop-blur-md rounded-[40px] p-5 md:p-6 border-2 border-white shadow-2xl">
                            <div className={`rounded-3xl bg-gradient-to-r ${lessonMapMeta.headerGradient} p-4 text-white mb-4`}>
                                <h3 className="text-2xl md:text-3xl font-black"> خريطة {lesson.title}</h3>
                                <p className="text-white/90 font-bold mt-1">
                                    دي خريطة تفاعلية خاصة بالدرس الحالي فقط وفيها معالمه.
                                </p>
                            </div>

                            <div className="mb-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-sky-50/60 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm md:text-base font-black text-slate-800"> تقسيم سهل للطفل</p>
                                    <span className="text-[11px] font-black text-indigo-600 bg-white border border-indigo-100 rounded-full px-2 py-1">
                                        تعلم خطوة بخطوة
                                    </span>
                                </div>
                                <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
                                    {kidMapSections.map((item) => (
                                        <article key={item.id} className="rounded-2xl border border-white bg-white/90 px-3 py-2.5 shadow-sm text-right">
                                            <p className="text-sm font-black text-slate-800">{item.emoji} {item.title}</p>
                                            <p className="mt-1 text-[11px] font-bold text-slate-600 leading-relaxed">{item.detail}</p>
                                        </article>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-2xl px-3 py-2">
                                     {gentleMapGuide}
                                </p>
                            </div>

                            <div className="lesson-dashboard-map-challenge rounded-3xl border-2 border-slate-100 bg-white/85 p-4 mb-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-800"> تحدي الخريطة التفاعلية</p>
                                        <p className="text-sm font-bold text-slate-600 mt-1">
                                            اختَر المعلم الصحيح بسهولة، ولو محتاج استخدم التلميح.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 text-xs font-black">
                                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-700">
                                            صح: {toArabicNumber(lessonMapScore)}
                                        </div>
                                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700">
                                            محاولات: {toArabicNumber(lessonMapAttempts)}
                                        </div>
                                        <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-sky-700">
                                            دقة: {toArabicNumber(lessonMapAccuracy)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-col lg:flex-row lg:items-center gap-3">
                                    <div className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
                                        <p className="text-xs font-black text-slate-500">المطلوب الآن:</p>
                                        <p className="text-base font-black text-slate-800 mt-1">
                                            {lessonMapTarget ? `${lessonMapTarget.emoji} ${lessonMapTarget.name}` : 'لا توجد معالم لهذا الدرس'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={focusRandomLessonLocation}
                                            className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition kid-button"
                                        >
                                            تلميح مكاني 
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => pickNextLessonMapTarget(lessonMapTargetId)}
                                            className="px-4 py-2 rounded-2xl bg-sky-600 text-white text-sm font-black hover:bg-sky-700 transition kid-button"
                                        >
                                            معلم جديد 
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetLessonMapChallenge}
                                            className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-sm font-black hover:bg-slate-200 transition kid-button"
                                        >
                                            إعادة 
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 grid md:grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                                    <select
                                        value={selectedLessonLandmarkId}
                                        onChange={(event) => setSelectedLessonLandmarkId(event.target.value)}
                                        className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    >
                                        <option value="">اختر معلمًا من القائمة</option>
                                        {lessonLocations.map((location) => (
                                            <option key={`lesson-map-picker-${location.id}`} value={location.id}>
                                                {location.emoji} {location.name} - {location.governorate}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => handleLessonLandmarkSelect(selectedLessonLandmarkId, false)}
                                        disabled={!selectedLessonLandmarkId}
                                        className="rounded-2xl px-4 py-2 bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed kid-button"
                                    >
                                        ركز على الخريطة 
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleLessonLandmarkSelect(selectedLessonLandmarkId, true)}
                                        disabled={!selectedLessonLandmarkId}
                                        className="rounded-2xl px-4 py-2 bg-violet-600 text-white text-sm font-black hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed kid-button"
                                    >
                                        اعرض التفاصيل 
                                    </button>
                                </div>

                                {lessonCategoryBreakdown.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {lessonCategoryBreakdown.map((item) => (
                                            <span
                                                key={`lesson-category-breakdown-${item.cat}`}
                                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${item.chipClass}`}
                                            >
                                                <span>{item.emoji}</span>
                                                <span>{item.label}</span>
                                                <span>({toArabicNumber(item.count)})</span>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <p className={`mt-3 text-sm font-black ${!lessonMapFeedback ? 'text-slate-600' : lessonMapFeedback.startsWith('') ? 'text-emerald-700' : lessonMapFeedback.startsWith('') ? 'text-rose-700' : 'text-slate-700'}`}>
                                    {lessonMapFeedback || 'اضغط على أي معلم في الخريطة لعرض المعلومات، أو استخدم قائمة المعالم السريعة.'}
                                </p>
                            </div>

                            <MagicalMap
                                onLocationSelect={handleLessonMapLocationSelect}
                                focusLocationId={lessonMapFocusId}
                                focusNonce={lessonMapFocusNonce}
                                cameraResetNonce={mapCameraResetNonce}
                                visibleLocationIds={lessonLocationIds}
                                showAudioControl={false}
                                showCategorySidebar={false}
                                showLandmarkPicker={false}
                                showCategoryChips={false}
                                showCompass={false}
                                showNarratorGuide={false}
                                showSignature={false}
                                showInquiryTool
                                showMapLegend={true}
                                lessonTitle={`خريطة ${lesson.title}`}
                                lessonId={lesson.id}
                                lessonHighlights={lessonMapLegendHighlights}
                                lessonStats={lessonMapLegendStats}
                                mapVariant={lessonMapMeta.mapVariant}
                                largeMode={true}
                                enableCameraControls={true}
                                containerClassName="lesson-dashboard-map-canvas min-h-[520px] md:min-h-[640px] lg:min-h-[720px]"
                            />

                            <div className="lesson-dashboard-map-list mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                                <p className="text-sm font-black text-slate-800 text-right"> معالم الدرس</p>
                                <p className="text-xs font-bold text-slate-500 text-right mt-1">
                                    اضغط على البطاقة للتركيز على الموقع، واستخدم زر التفاصيل عند الحاجة.
                                </p>
                                <div className="lesson-dashboard-map-quick-grid mt-3 max-h-64 overflow-y-auto grid md:grid-cols-2 gap-2.5">
                                    {lessonLocations.map((location, idx) => {
                                        const isSelected = selectedLessonLandmarkId === location.id;
                                        const locationWhat = simplifyText(
                                            location.simpleInfo?.what || location.characterDialog?.explanation || location.type,
                                            10
                                        );
                                        const locationWhy = simplifyText(
                                            location.simpleInfo?.why || location.characterDialog?.importance || location.category,
                                            10
                                        );
                                        const locationAmount = simplifyText(
                                            location.simpleInfo?.howMuch || '',
                                            8
                                        );

                                        return (
                                            <motion.article
                                                key={`lesson-landmark-quick-${location.id}`}
                                                initial={{ opacity: 0, y: 20, rotateX: -60 }}
                                                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                                                transition={{ delay: (idx % 6) * 0.1, type: "spring", stiffness: 100, damping: 15 }}
                                                whileHover={{ scale: 1.03, y: -4 }}
                                                className={`lesson-dashboard-map-quick-card rounded-2xl border p-2.5 text-right transition-all stagger-item ${isSelected ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200 bg-white'}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleLessonLandmarkSelect(location.id, false)}
                                                    className="w-full text-right rounded-xl px-2 py-1.5 transition hover:bg-slate-50/80"
                                                >
                                                    <p className="font-black text-sm text-slate-800">{location.emoji} {location.name}</p>
                                                    <p className="text-[11px] font-bold text-slate-500 mt-1">{location.governorate}</p>
                                                </button>

                                                <div className="mt-2 grid gap-1">
                                                    <p className="rounded-lg bg-sky-50 border border-sky-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                                                         {locationWhat}
                                                    </p>
                                                    <p className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                                                         {locationWhy}
                                                    </p>
                                                    <p className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                                                         النوع: {location.type}
                                                    </p>
                                                    {locationAmount && (
                                                        <p className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                                                             {locationAmount}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleLessonLandmarkSelect(location.id, true)}
                                                    className="mt-2 w-full rounded-xl bg-violet-600 text-white px-2 py-1.5 text-xs font-black hover:bg-violet-700 transition kid-button"
                                                >
                                                     تفاصيل المعلم
                                                </button>
                                            </motion.article>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="lesson-dashboard-map-education mt-4 grid xl:grid-cols-[1.2fr_1fr] gap-3">
                                <div className="lesson-dashboard-map-info-stack rounded-3xl border border-slate-200 bg-white/95 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-slate-800"> دليل الدرس على الخريطة</p>
                                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-1">
                                            {lesson.title}
                                        </span>
                                    </div>
                                    <div className="lesson-dashboard-map-info-mini-grid mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {lessonMapInfoCards.map((card) => (
                                            <article
                                                key={card.id}
                                                className="lesson-dashboard-map-info-mini rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-2.5 text-right"
                                            >
                                                <p className="text-base">{card.emoji}</p>
                                                <p className="text-xs font-black text-slate-800 mt-1">{card.title}</p>
                                                <p className="text-[11px] font-bold text-slate-600 mt-1 leading-relaxed">{card.text}</p>
                                            </article>
                                        ))}
                                    </div>
                                    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-2.5">
                                        <p className="text-xs font-black text-amber-800"> خطوات سهلة للطفل</p>
                                        <div className="mt-2 grid gap-1">
                                            {lessonMapChildSteps.map((step, index) => (
                                                <p key={`map-step-${index}`} className="text-[11px] font-bold text-slate-700">
                                                    {toArabicNumber(index + 1)}. {step}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-2 rounded-2xl border border-sky-200 bg-sky-50/70 p-2.5 text-right">
                                        <p className="text-xs font-black text-sky-800"> رحلة الخريطة</p>
                                        <div className="mt-2 grid gap-1">
                                            {kidMapSections.map((step) => (
                                                <p key={step.id} className="text-[11px] font-bold text-slate-700">
                                                    {step.emoji} {step.title}: {step.detail}
                                                </p>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-[11px] font-black text-indigo-700">
                                             {gentleMapGuide}
                                        </p>
                                    </div>
                                </div>

                                <div className="lesson-dashboard-location-focus rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-3">
                                    <p className="text-sm font-black text-slate-800 text-right"> بطاقة المعلم الحالي</p>
                                    {activeLessonLocation ? (
                                        <div className="mt-2">
                                            <div className="rounded-2xl border border-indigo-100 bg-white p-3 text-right">
                                                <p className="text-base font-black text-slate-800">
                                                    {activeLessonLocation.emoji} {activeLessonLocation.name}
                                                </p>
                                                <p className="text-[11px] font-bold text-slate-500 mt-1">
                                                    {activeLessonLocation.governorate}  {activeLessonLocation.type}
                                                </p>
                                            </div>

                                            {activeLocationFacts.length > 0 && (
                                                <div className="mt-2 grid gap-1.5">
                                                    {activeLocationFacts.slice(0, 8).map((fact) => (
                                                        <div key={fact.id} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-right">
                                                            <p className="text-[11px] font-black text-indigo-600">{fact.label}</p>
                                                            <p className="text-[11px] font-bold text-slate-700 mt-0.5 leading-relaxed">{fact.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {activeLocationStories.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {activeLocationStories.map((story, index) => (
                                                        <p key={`location-story-${index}`} className="rounded-xl bg-slate-100/80 px-2.5 py-2 text-[11px] font-bold text-slate-700 leading-relaxed text-right">
                                                             {simplifyText(story, 20)}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}

                                            {activeLocationQuestion && (
                                                <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-right">
                                                    <p className="text-xs font-black text-emerald-800"> سؤال سريع</p>
                                                    <p className="text-[11px] font-bold text-slate-700 mt-1 leading-relaxed">
                                                        {activeLocationQuestion.question}
                                                    </p>
                                                    {activeLocationHint && (
                                                        <p className="text-[11px] font-bold text-emerald-700 mt-1">
                                                             {activeLocationHint}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {activeLocationMatchPairs.length > 0 && (
                                                <div className="mt-2 rounded-2xl border border-sky-200 bg-sky-50/70 p-2.5 text-right">
                                                    <p className="text-xs font-black text-sky-800"> توصيل سريع</p>
                                                    <div className="mt-1 grid gap-1">
                                                        {activeLocationMatchPairs.map((pair, index) => (
                                                            <p key={`pair-${index}`} className="text-[11px] font-bold text-slate-700">
                                                                {pair.item}  {pair.match}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => focusLessonLocation(activeLessonLocation, false)}
                                                    className="rounded-xl bg-indigo-600 text-white px-2 py-2 text-xs font-black hover:bg-indigo-700 transition kid-button"
                                                >
                                                     ركز عليه
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLocation(activeLessonLocation)}
                                                    className="rounded-xl bg-violet-600 text-white px-2 py-2 text-xs font-black hover:bg-violet-700 transition kid-button"
                                                >
                                                     تفاصيل أكبر
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs font-bold text-slate-600 text-right">
                                            اختَر معلمًا من القائمة لتظهر معلوماته هنا.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}

                        {activeMapView === 'blank' && (
                        <div className={`lesson-dashboard-blank-map rounded-[40px] p-5 md:p-6 border-2 border-white shadow-xl bg-gradient-to-br ${lessonMapMeta.blankSurface}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-right">
                                    <h3 className="text-2xl font-black text-slate-800"> الخريطة الصماء للدرس</h3>
                                    <p className="text-sm font-bold text-slate-600 mt-1">
                                        كل درس له شكل خريطة مختلف. اختار المكان الصحيح ببساطة.
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBlankHintVisible(false);
                                            pickNextBlankTarget(blankTargetId);
                                        }}
                                        className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition kid-button"
                                    >
                                        سؤال جديد 
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBlankHintVisible((value) => !value)}
                                        className="px-4 py-2 rounded-2xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600 transition kid-button"
                                    >
                                        {blankHintVisible ? 'إخفاء التلميح ' : 'إظهار تلميح '}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetBlankMap}
                                        className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-sm font-black hover:bg-slate-200 transition kid-button"
                                    >
                                        إعادة 
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-right">
                                <p className="text-xs font-black text-slate-500">دليل سريع للطفل</p>
                                <p className="text-sm font-black text-slate-700 mt-1"> {blankGuideMessage}</p>
                                <div className="mt-2 grid sm:grid-cols-3 gap-2">
                                    {(lessonMapMeta.kidSteps || []).map((step, idx) => (
                                        <p key={`blank-step-${idx}`} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700">
                                            {toArabicNumber(idx + 1)}. {step}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 grid lg:grid-cols-[1fr_320px] gap-4">
                                <div className={`lesson-dashboard-blank-canvas relative h-[380px] md:h-[460px] lg:h-[540px] rounded-[26px] border-4 border-white overflow-visible shadow-lg bg-gradient-to-br ${lessonMapMeta.blankCanvasClass}`}>
                                    <svg
                                        viewBox={`0 0 ${BLANK_MAP_VIEWBOX.width} ${BLANK_MAP_VIEWBOX.height}`}
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                        preserveAspectRatio="none"
                                    >
                                        <rect width={BLANK_MAP_VIEWBOX.width} height={BLANK_MAP_VIEWBOX.height} fill={lessonMapMeta.blankWaterColor} />
                                        <path d={blankMapPathMainland} fill={lessonMapMeta.blankLandFill} stroke={lessonMapMeta.blankLandStroke} strokeWidth="3.5" />
                                        <path d={blankMapPathSinai} fill={lessonMapMeta.blankLandFill} stroke={lessonMapMeta.blankLandStroke} strokeWidth="3.2" />
                                        <path
                                            d="M 250 380 Q 260 280 240 200 Q 245 150 250 120 L 220 50 M 250 120 L 280 50"
                                            fill="none"
                                            stroke="rgba(255,255,255,0.75)"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                        />
                                        <text x="24" y="42" fontSize="24" opacity="0.8">{lessonMapMeta.markerSymbol}</text>
                                        <text x="460" y="374" textAnchor="end" fontSize="18" opacity="0.65">{lessonMapMeta.markerSymbol}</text>
                                    </svg>

                                    <div className="absolute inset-0 m-4 md:m-6 z-10">
                                        {lessonLocations && lessonLocations.length > 0 ? (
                                            lessonLocations.map((location) => {
                                                const { x, y } = getBlankMarkerPercentPosition(location);
                                                const isTarget = blankTargetId === location.id;
                                                const isWrongGuess = blankLastGuessId === location.id && !isTarget;
                                                const isHovered = blankHoveredLocationId === location.id;
                                                return (
                                                    <div key={`location-wrapper-${location.id}`} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                                                        <motion.button
                                                            key={`lesson-blank-point-${location.id}`}
                                                            type="button"
                                                            whileHover={{ scale: 1.15 }}
                                                            onMouseEnter={() => setBlankHoveredLocationId(location.id)}
                                                            onMouseLeave={() => setBlankHoveredLocationId(null)}
                                                            onClick={() => handleBlankGuess(location)}
                                                            aria-label={`موقع ${location.name}`}
                                                            className={`absolute w-11 h-11 md:w-12 md:h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-lg transition kid-button ${isWrongGuess ? 'bg-rose-500' : lessonMapMeta.blankPointClass} ${blankHintVisible && isTarget ? 'ring-4 ring-yellow-300 animate-pulse' : ''} ${isHovered ? 'ring-4 ring-offset-2' : ''}`}
                                                            title="نقطة على الخريطة"
                                                        >
                                                            <span className="text-white text-base md:text-lg font-black">?</span>
                                                        </motion.button>
                                                        {isHovered && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="absolute -translate-x-1/2 -translate-y-full -top-3 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-lg whitespace-nowrap z-20 text-xs font-black text-slate-800 pointer-events-none"
                                                            >
                                                                {location.name}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-black text-lg">
                                                لا توجد مواقع
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="lesson-dashboard-blank-status rounded-[24px] bg-white/95 border border-slate-200 p-4 shadow">
                                    <p className="text-xs font-black text-slate-500">الجولة الحالية</p>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{toArabicNumber(blankRound)}</p>

                                    <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                        <p className="text-xs font-black text-slate-500">سؤال الجولة:</p>
                                        <p className="text-base md:text-lg font-black text-slate-800 mt-1 leading-relaxed">
                                            {blankActiveQuestion?.text || (blankTarget ? `${blankTarget.emoji} ${blankTarget.name}` : 'لا توجد معالم مرتبطة بهذا الدرس')}
                                        </p>
                                        {blankActiveQuestion && (
                                            <span className="inline-flex mt-2 rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-1 text-[11px] font-black text-indigo-700">
                                                نوع السؤال: {blankActiveQuestion.type}
                                            </span>
                                        )}
                                        {blankTarget && (
                                            <p className="text-xs font-black text-slate-600 mt-1">
                                                 {lessonMapMeta.lessonHintLead}: {blankTarget.governorate}
                                            </p>
                                        )}
                                    </div>

                                    {blankHoveredLocationId && lessonLocations.find((l) => l.id === blankHoveredLocationId) && (
                                        <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-2.5">
                                            <p className="text-xs font-black text-indigo-800"> معلومات الموقع</p>
                                            <div className="mt-2 space-y-1.5">
                                                {(() => {
                                                    const hovered = lessonLocations.find((l) => l.id === blankHoveredLocationId);
                                                    return (
                                                        <>
                                                            <p className="text-xs font-black text-slate-800">{hovered.emoji} {hovered.name}</p>
                                                            <p className="text-[11px] font-bold text-slate-700"> {hovered.governorate}</p>
                                                            {hovered.simpleInfo?.what && (
                                                                <p className="text-[11px] font-bold text-slate-700"> {hovered.simpleInfo.what}</p>
                                                            )}
                                                            {hovered.simpleInfo?.why && (
                                                                <p className="text-[11px] font-bold text-slate-700"> {hovered.simpleInfo.why}</p>
                                                            )}
                                                            {hovered.simpleInfo?.howMuch && (
                                                                <p className="text-[11px] font-bold text-slate-700"> {hovered.simpleInfo.howMuch}</p>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {blankQuestionOptions.length > 1 && (
                                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2.5">
                                            <p className="text-[11px] font-black text-slate-500 mb-1.5">أسئلة متنوعة لنفس المكان:</p>
                                            <div className="grid gap-1.5">
                                                {blankQuestionOptions.slice(0, 3).map((item) => (
                                                    <p key={item.id} className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                                                         {item.text}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-emerald-700">
                                            صح: {toArabicNumber(blankScore)}
                                        </div>
                                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-700">
                                            محاولات: {toArabicNumber(blankAttempts)}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs font-black text-slate-500 mb-1">
                                            <span>نسبة النجاح</span>
                                            <span>{toArabicNumber(blankAccuracy)}%</span>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${blankAccuracy}%` }}
                                                transition={{ duration: 0.45 }}
                                                className={`h-full bg-gradient-to-r ${lessonMapMeta.progressGradient}`}
                                            />
                                        </div>
                                    </div>

                                    <p className={`mt-3 text-sm font-black leading-relaxed ${!blankFeedback ? 'text-slate-600' : blankFeedback.startsWith('') ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {blankFeedback || 'اضغط على النقطة الصحيحة في الخريطة الصماء.'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-md">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="text-right">
                                        <h3 className="text-sm font-black text-slate-800 mb-3"> قائمة المعالم</h3>
                                        <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                            {lessonLocations.map((location) => (
                                                <motion.button
                                                    key={`blank-location-${location.id}`}
                                                    whileHover={{ scale: 1.05 }}
                                                    onMouseEnter={() => setBlankHoveredLocationId(location.id)}
                                                    onMouseLeave={() => setBlankHoveredLocationId(null)}
                                                    className={`rounded-xl p-2 text-right border transition text-xs font-bold ${blankHoveredLocationId === location.id ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200'}`}
                                                >
                                                    <p className="font-black text-slate-800">{location.emoji} {location.name}</p>
                                                    <p className="text-[11px] text-slate-600 mt-0.5">{location.governorate}</p>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <h3 className="text-sm font-black text-slate-800 mb-3"> مفتاح الخريطة</h3>
                                        <div className="space-y-2">
                                            {lessonCategoryBreakdown.map((cat) => (
                                                <div key={cat.cat} className={`rounded-xl p-2.5 text-right border ${cat.chipClass}`}>
                                                    <p className="font-black text-sm">{cat.emoji} {cat.label}</p>
                                                    <p className="text-[11px] font-bold mt-0.5">
                                                        {toArabicNumber(cat.count)} {cat.count === 1 ? 'موقع' : 'مواقع'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}



                        {/* Fact Card */}

                        <div className="lesson-dashboard-fact-card bg-yellow-100 rounded-[40px] p-8 border-4 border-yellow-400 shadow-xl relative overflow-hidden">

                            <h3 className="text-2xl font-black text-yellow-800 mb-4 flex items-center gap-2">

                                <span></span>

                                معلومة سريعة

                            </h3>

                            <p className="text-yellow-900 text-lg font-bold leading-relaxed">

                                {lesson.id === 'lesson-1'

                                    ? 'مصر من أغنى دول العالم بالثروات المعدنية، والذهب المصري معروف منذ أيام الفراعنة!'

                                    : lesson.id === 'lesson-2'

                                        ? 'نهر النيل هو أطول نهر في العالم، وهو اللي بيشرب منه أكتر من ١٠٠ مليون مصري!'

                                        : 'المشروعات القومية هي اللي بتخلي مصر دولة حديثة وقوية وبتبني مستقبلنا!'}

                            </p>

                            <motion.div

                                animate={{ y: [0, -10, 0] }}

                                transition={{ duration: 2, repeat: Infinity }}

                                className="absolute -bottom-2 -right-2 text-6xl opacity-20 grayscale"

                            >

                                

                            </motion.div>

                        </div>



                        {/* Hidden Secrets Section */}

                        {lesson.secrets && (

                            <div className="lesson-dashboard-secrets-card bg-white rounded-[40px] p-8 border-2 border-dashed border-sky-200 shadow-lg">

                                <h3 className="text-2xl font-black text-sky-800 mb-6 flex items-center gap-3">

                                    <span className="p-2 bg-sky-50 rounded-xl"></span>

                                    أسرار الدرس الخفية

                                </h3>

                                <div className="grid gap-4">

                                    {lesson.secrets.map((secret, i) => {

                                        const isFound = foundSecrets.includes(i);

                                        return (

                                            <motion.div

                                                key={i}

                                                whileHover={isFound ? { x: -10 } : {}}

                                                className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${isFound

                                                    ? "bg-sky-50/50 border-sky-100 cursor-help group"

                                                    : "bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed"

                                                    }`}

                                                onClick={() => isFound && alert(` سر ${secret.title}: ${secret.content}`)}

                                            >

                                                <div className={`w-12 h-12 rounded-xl shadow-inner flex items-center justify-center text-2xl transition-transform ${isFound ? "bg-white group-hover:rotate-12" : "bg-slate-200"}`}>

                                                    {isFound ? "" : ""}

                                                </div>

                                                <div className="text-right">

                                                    <p className={`font-black ${isFound ? "text-sky-700" : "text-slate-400"}`}>

                                                        {isFound ? secret.title : `سر مخفي رقم ${(i + 1).toLocaleString('ar-EG')}`}

                                                    </p>

                                                    <p className="text-xs text-slate-400 font-bold">

                                                        {isFound ? "اضغط لقراءة السر!" : "ابحث عن النجمة الذهبية  عشان تفتح السر!"}

                                                    </p>

                                                </div>

                                            </motion.div>

                                        );

                                    })}

                                </div>

                            </div>

                        )}

                    </motion.div>

                </div>



                {/* Bottom Sections: Fun Facts & Challenges */}

                <div className="lesson-dashboard-bottom-grid grid md:grid-cols-2 gap-8 mt-12 pb-12">

                    <motion.div

                        initial={{ y: 20, opacity: 0 }}

                        animate={{ y: 0, opacity: 1 }}

                        transition={{ delay: 0.6 }}

                        className="lesson-dashboard-funfacts-card bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden"

                    >

                        <Lightbulb size={120} weight="fill" className="absolute -bottom-4 -left-4 opacity-20 rotate-12" />

                        <h3 className="text-3xl font-black mb-6 flex items-center gap-3">

                            <span></span>

                            هل تعلم؟

                        </h3>

                        <div className="space-y-4 relative z-10 font-bold text-lg leading-relaxed">

                            {lesson.funFacts?.length > 0 ? (

                                lesson.funFacts.map((fact, i) => (

                                    <p key={i}> {fact}</p>

                                ))

                            ) : (

                                <p>انتظروا المزيد من الحقائق الممتعة قريباً!</p>

                            )}

                        </div>

                    </motion.div>



                    <motion.div

                        initial={{ y: 20, opacity: 0 }}

                        animate={{ y: 0, opacity: 1 }}

                        transition={{ delay: 0.7 }}

                        className="lesson-dashboard-challenge-card bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden"

                    >

                        <GameController size={120} weight="fill" className="absolute -bottom-4 -left-4 opacity-20 -rotate-12" />

                        <h3 className="text-3xl font-black mb-6 flex items-center gap-3">

                            <span></span>

                            تحدي الأبطال

                        </h3>

                        <p className="font-bold text-lg mb-8 opacity-90">

                            اختبر معلوماتك وجمع نقاط أكتر عشان تفتح جوائز جديدة!

                        </p>

                        <button

                            onClick={() => navigate('/map')}

                            className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-black text-xl shadow-lg hover:scale-105 transition-transform"

                        >

                            ابدأ التحدي الآن

                        </button>

                    </motion.div>

                </div>

            </div>



            {/* Hidden Secrets - Dynamic Stars */}

            <div className="absolute inset-0 pointer-events-none">

                {lesson.secrets?.map((secret, i) => (

                    !foundSecrets.includes(i) && (

                        <motion.button

                            key={i}

                            initial={{ scale: 0, opacity: 0 }}

                            animate={{

                                scale: [0, 1.2, 1],

                                opacity: 1,

                                y: [0, -20, 0],

                                rotate: [0, 90, 0]

                            }}

                            transition={{

                                duration: 3 + i,

                                repeat: Infinity,

                                ease: "easeInOut"

                            }}

                            onClick={() => {

                                setFoundSecrets([...foundSecrets, i]);

                                triggerConfetti();

                                alert(` واو! اكتشفت سر خفي:\n\n ${secret.title} \n${secret.content}`);

                            }}

                            className="absolute pointer-events-auto bg-gradient-to-tr from-yellow-300 to-orange-400 p-3 rounded-full shadow-[0_0_20px_rgba(255,191,0,0.5)] border-4 border-white sparkle-effect z-50 text-2xl flex items-center justify-center hover:scale-125 transition-transform"

                            style={{

                                left: `${10 + (i * 25) + (Math.sin(i) * 10)}%`,

                                top: `${20 + (i * 15) + (Math.cos(i) * 10)}%`

                            }}

                        >

                            

                        </motion.button>

                    )

                ))}

            </div>



            {/* Confetti Effect */}

            <AnimatePresence>

                {confetti && (

                    <div className="fixed inset-0 pointer-events-none z-[200]">

                        {[...Array(50)].map((_, i) => (

                            <motion.div

                                key={i}

                                initial={{ top: "100%", left: "50%" }}

                                animate={{

                                    top: "-10%",

                                    left: `${Math.random() * 100}%`,

                                    rotate: 360,

                                    scale: [1, 1.5, 0.5]

                                }}

                                exit={{ opacity: 0 }}

                                transition={{ duration: 2, ease: "easeOut" }}

                                className="absolute w-4 h-4 rounded-full"

                                style={{ backgroundColor: ['#FF8FCB', '#7AE6C5', '#FFE07A', '#FFC48C', '#C6A6FF'][Math.floor(Math.random() * 5)] }}

                            />

                        ))}

                    </div>

                )}

            </AnimatePresence>



            <AnimatePresence>

                {selectedMedia && (

                    <MediaViewer

                        item={selectedMedia}

                        onClose={() => setSelectedMedia(null)}

                    />

                )}

            </AnimatePresence>

            <AnimatePresence>
                {selectedLocation && (
                    <LocationDialog
                        location={selectedLocation}
                        onClose={() => setSelectedLocation(null)}
                    />
                )}
            </AnimatePresence>

        </div>

    );

}

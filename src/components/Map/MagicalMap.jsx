import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildDeclutteredPercentPositions } from '../../utils/markerLayout';
import { MAP_LOCATIONS } from '../../data/curriculumData';
import { SpeakerHigh, SpeakerSlash, MagnifyingGlass } from 'phosphor-react';
import { useVoiceNarration } from '../../context/VoiceNarrationContext';

const CATEGORIES = [
    { id: 'minerals', label: 'معادن', icon: '⛏️', color: 'bg-orange-500' },
    { id: 'energy', label: 'طاقة', icon: '⚡', color: 'bg-amber-500' },
    { id: 'water', label: 'مياه', icon: '💧', color: 'bg-sky-500' },
    { id: 'projects', label: 'مشروعات', icon: '🏗️', color: 'bg-violet-500' }
];

const CATEGORY_GLOW = {
    minerals: 'rgba(249, 115, 22, 0.45)',
    energy: 'rgba(245, 158, 11, 0.45)',
    water: 'rgba(14, 165, 233, 0.45)',
    projects: 'rgba(139, 92, 246, 0.45)'
};

const CATEGORY_MARKER_SYMBOL = {
    minerals: '●',
    energy: '▲',
    water: '●',
    projects: '■'
};

const AMBIENT_MOVERS_BY_CATEGORY = {
    all: [
        { id: 'ambient-cloud-1', emoji: '☁️', left: '7%', top: '8%', dx: 8, dy: 4, rotate: 4, size: '1.45rem', duration: 8.2, delay: 0.2 },
        { id: 'ambient-cloud-2', emoji: '☁️', left: '88%', top: '10%', dx: -8, dy: 5, rotate: -3, size: '1.35rem', duration: 9.1, delay: 1.4 },
        { id: 'ambient-star', emoji: '⭐', left: '94%', top: '24%', dx: -6, dy: -7, rotate: 10, size: '1.05rem', duration: 5.8, delay: 0.7 },
        { id: 'ambient-ship', emoji: '🚢', left: '89%', top: '92%', dx: -7, dy: -3, rotate: 5, size: '1.2rem', duration: 7.9, delay: 2.6 }
    ],
    minerals: [
        { id: 'ambient-gem', emoji: '💎', left: '6%', top: '56%', dx: 5, dy: -7, rotate: 12, size: '1.1rem', duration: 6.2, delay: 0.5 },
        { id: 'ambient-pickaxe', emoji: '⛏️', left: '8%', top: '72%', dx: 5, dy: -6, rotate: 8, size: '1.2rem', duration: 6.9, delay: 1.6 },
        { id: 'ambient-gold', emoji: '🏆', left: '10%', top: '88%', dx: 4, dy: -6, rotate: 10, size: '1.1rem', duration: 5.9, delay: 2.2 }
    ],
    energy: [
        { id: 'ambient-solar', emoji: '☀️', left: '92%', top: '34%', dx: -6, dy: -7, rotate: 12, size: '1.1rem', duration: 6.1, delay: 0.4 },
        { id: 'ambient-wind', emoji: '💨', left: '93%', top: '52%', dx: -6, dy: 6, rotate: -10, size: '1.2rem', duration: 6.8, delay: 1.9 },
        { id: 'ambient-energy', emoji: '⚡', left: '94%', top: '68%', dx: -5, dy: -5, rotate: 10, size: '1.05rem', duration: 5.6, delay: 2.4 }
    ],
    water: [
        { id: 'ambient-drop-1', emoji: '💧', left: '7%', top: '42%', dx: 5, dy: -6, rotate: 10, size: '1.05rem', duration: 5.8, delay: 0.5 },
        { id: 'ambient-fish', emoji: '🐟', left: '8%', top: '84%', dx: 6, dy: -4, rotate: -8, size: '1.1rem', duration: 6.6, delay: 1.6 },
        { id: 'ambient-wave', emoji: '🌊', left: '6%', top: '94%', dx: 6, dy: -3, rotate: 8, size: '1.1rem', duration: 6.3, delay: 2.4 }
    ],
    projects: [
        { id: 'ambient-robot', emoji: '🤖', left: '93%', top: '80%', dx: -5, dy: -5, rotate: 10, size: '1.15rem', duration: 6.1, delay: 0.8 },
        { id: 'ambient-tools', emoji: '🔧', left: '92%', top: '90%', dx: -5, dy: -4, rotate: 8, size: '1.1rem', duration: 6.7, delay: 1.9 },
        { id: 'ambient-rocket', emoji: '🚀', left: '90%', top: '18%', dx: -6, dy: -7, rotate: 10, size: '1.2rem', duration: 5.9, delay: 2.6 }
    ]
};

const AMBIENT_SPARKLE_POINTS = [
    { id: 'ambient-spark-1', left: '6%', top: '10%', delay: 0.3, duration: 2.6 },
    { id: 'ambient-spark-2', left: '18%', top: '8%', delay: 1.1, duration: 2.8 },
    { id: 'ambient-spark-3', left: '82%', top: '10%', delay: 1.8, duration: 2.9 },
    { id: 'ambient-spark-4', left: '94%', top: '14%', delay: 2.2, duration: 2.7 },
    { id: 'ambient-spark-5', left: '6%', top: '86%', delay: 0.7, duration: 2.5 },
    { id: 'ambient-spark-6', left: '18%', top: '92%', delay: 1.4, duration: 2.9 },
    { id: 'ambient-spark-7', left: '82%', top: '90%', delay: 2.4, duration: 2.7 },
    { id: 'ambient-spark-8', left: '94%', top: '86%', delay: 0.9, duration: 2.8 },
    { id: 'ambient-spark-9', left: '6%', top: '52%', delay: 1.6, duration: 2.6 },
    { id: 'ambient-spark-10', left: '94%', top: '54%', delay: 2.8, duration: 2.9 }
];

const MARKER_LAT_RANGE = { min: 21, max: 32 };
const MARKER_LNG_RANGE = { min: 24, max: 36 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const VIEWBOX = { width: 500, height: 400 };
// Keep the drawing slightly inset (matches marker padding + looks nicer)
const EGYPT_DRAW_BOUNDS = { xMin: 75, xMax: 425, yMin: 35, yMax: 365 };

const KID_GEOGRAPHY_LABELS = {
    basic: [
        { id: 'mediterranean', label: 'البحر المتوسط', x: 250, y: 19, width: 116, tone: 'water' },
        { id: 'red-sea', label: 'البحر الأحمر', x: 454, y: 236, width: 102, tone: 'water', rotate: 90 },
        { id: 'nile', label: 'نهر النيل', x: 218, y: 235, width: 78, tone: 'water', rotate: -4 },
        { id: 'delta', label: 'دلتا النيل', x: 250, y: 61, width: 86, tone: 'nature' },
        { id: 'sinai', label: 'شبه جزيرة سيناء', x: 382, y: 115, width: 122, tone: 'land' }
    ],
    expanded: [
        { id: 'western-desert', label: 'الصحراء الغربية', x: 155, y: 215, width: 118, tone: 'desert' },
        { id: 'eastern-desert', label: 'الصحراء الشرقية', x: 326, y: 258, width: 118, tone: 'desert' },
        { id: 'suez-canal', label: 'قناة السويس', x: 335, y: 88, width: 92, tone: 'water', rotate: 72 },
        { id: 'lake-nasser', label: 'بحيرة ناصر', x: 260, y: 346, width: 92, tone: 'water' }
    ]
};

const KID_VISUAL_DETAILS = [
    { id: 'delta-farms', emoji: '🌾', label: 'زراعة الدلتا', x: 220, y: 82 },
    { id: 'pyramids', emoji: '🔺', label: 'الأهرامات', x: 218, y: 128 },
    { id: 'suez-ships', emoji: '🚢', label: 'سفن القناة', x: 342, y: 76 },
    { id: 'sinai-mountains', emoji: '🏔️', label: 'جبال سيناء', x: 386, y: 153 },
    { id: 'wind-energy', emoji: '💨', label: 'طاقة الرياح', x: 348, y: 190 },
    { id: 'red-sea-mines', emoji: '⛏️', label: 'مناجم', x: 360, y: 286 },
    { id: 'high-dam', emoji: '🌊', label: 'السد العالي', x: 244, y: 318 },
    { id: 'solar-energy', emoji: '☀️', label: 'طاقة شمسية', x: 310, y: 338 }
];

const round1 = (value) => Math.round(value * 10) / 10;

const lngLatToSvg = ({ lat, lng }) => {
    const safeLng = clamp(lng, MARKER_LNG_RANGE.min, MARKER_LNG_RANGE.max);
    const safeLat = clamp(lat, MARKER_LAT_RANGE.min, MARKER_LAT_RANGE.max);

    const x = EGYPT_DRAW_BOUNDS.xMin
        + ((safeLng - MARKER_LNG_RANGE.min) / (MARKER_LNG_RANGE.max - MARKER_LNG_RANGE.min)) * (EGYPT_DRAW_BOUNDS.xMax - EGYPT_DRAW_BOUNDS.xMin);

    const y = EGYPT_DRAW_BOUNDS.yMax
        - ((safeLat - MARKER_LAT_RANGE.min) / (MARKER_LAT_RANGE.max - MARKER_LAT_RANGE.min)) * (EGYPT_DRAW_BOUNDS.yMax - EGYPT_DRAW_BOUNDS.yMin);

    return { x: round1(x), y: round1(y) };
};

const buildClosedPath = (points) => {
    if (!Array.isArray(points) || points.length < 2) return '';
    const coords = points.map(lngLatToSvg);
    return `${coords.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} Z`;
};

const buildOpenPath = (points) => {
    if (!Array.isArray(points) || points.length < 2) return '';
    const coords = points.map(lngLatToSvg);
    return `${coords.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}`;
};

const MAP_OVERVIEW_INSIGHT = {
    id: 'egypt-overview',
    emoji: '🗺️',
    title: 'خريطة مصر الساحرة',
    subtitle: 'اكتشف الكنوز',
    details: [
        'استكشف أكثر من 15 موقع في مصر: من معادن وثروات إلى طاقة ومشروعات قومية.',
        'كل مكان له قصة تاريخية وأهمية اقتصادية وحقائق ممتعة للتعلم.',
        'تحدث مع سكان المناطق واسأل عن كنوز مصر والمشروعات القومية الكبرى.',
        'اجمع النقاط والشارات من كل موقع وكن أسطورة الاستكشاف!'
    ],
    speech: 'أهلا بك في خريطة مصر الساحرة. استكشف أكثر من 15 موقع مشهور في كل أنحاء مصر!'
};

const SCENE_INSIGHTS = {
    redSeaMountains: {
        id: 'scene-red-sea-mountains',
        emoji: '⛰️',
        title: 'جبال البحر الأحمر',
        subtitle: 'الصحراء - جنوب الشرق',
        details: [
            'تحتوي على ثروات معدنية كبيرة جداً في الصحراء الشرقية.',
            'من هنا يتم استخراج الذهب والفوسفات والحديد.',
            'هذه الجبال غنية بالمعادن الثمينة والنادرة جداً.'
        ],
        speech: 'جبال البحر الأحمر غنية جداً بالذهب والمعادن النفيسة!'
    },
    saintCatherine: {
        id: 'scene-saint-catherine',
        emoji: '⛰️',
        title: 'دير سانت كاترين',
        subtitle: 'سيناء - جنوب سيناء',
        details: [
            'أعلى جبل في مصر يقع في سيناء.',
            'مكان تاريخي عظيم وموقع ديني مهم جداً.',
            'في القمة هواء بارد وطبيعة خلابة جميلة جداً.'
        ],
        speech: 'دير سانت كاترين أقدس موقع ديني في سيناء! '
    },
    uwainat: {
        id: 'scene-uwainat',
        emoji: '⛰️',
        title: 'جبل العويسات',
        subtitle: 'صحراء صحراء',
        details: [
            'تحتوي على كنوز معادن نادرة في الصحراء الغربية الهادئة.',
            'يوجد هنا مياه عذبة نادرة تحت الرمال والصخور.',
            'مكان هادئ جداً نادر جداً في الصحراء.'
        ],
        speech: 'جبل العويسات هو كنز خفي من كنوز مصر القديمة.'
    },
    gilfKebir: {
        id: 'scene-gilf-kebir',
        emoji: '⛰️',
        title: 'جبل الجلف الكبير',
        subtitle: 'صحراء مصريتان',
        details: [
            'جبل صعب جداً يقع في الصحراء الغربية الشرقية.',
            'يحتوي على رسومات تاريخية قديمة جداً وآثار.',
            'مكان غامض نادر جداً في الصحراء.'
        ],
        speech: 'الجلف الكبير ملجأ الحضارة المصرية القديمة جداً.'
    },
    qattara: {
        id: 'scene-qattara',
        emoji: '🌊',
        title: 'منخفض القطارة',
        subtitle: 'الساحل الشمالي',
        details: [
            'هو أخفض نقطة في مصر كلها.',
            'يوجد هنا منطقة غريبة وعجيبة جداً.',
            'الطبيعة هنا غريبة جداً مختلفة كثيرا عن باقي مصر.'
        ],
        speech: 'منخفض القطارة جزء جميل من الطبيعة المصرية!'
    },
    sun: {
        id: 'scene-sun',
        emoji: '☀️',
        title: 'محطة بنبان الشمسية',
        subtitle: 'أسوان - جنوب مصر',
        details: [
            'محطة ضخمة للطاقة الشمسية النظيفة والطاقة الخضراء.',
            'توليد كهرباء من شمس مصر الساخنة في الجنوب.',
            'مشروع رائع جداً متقدم من مشروعات مصر الحديثة.'
        ],
        speech: 'محطة بنبان الشمسية تنتج كهرباء خضراء نظيفة!'
    },
    palms: {
        id: 'scene-palms',
        emoji: '🌴',
        title: 'واحات مصر الخضراء',
        subtitle: 'الواحات وسط الصحراء',
        details: [
            'واحات خضراء وسط الصحراء الجافة والرملية والقاحلة.',
            'توجد هنا مياه عذبة تحت الرمل والصخور والتربة.',
            'أماكن جميلة يعيش فيها الناس في وسط الصحراء.'
        ],
        speech: 'واحات مصر هي حياة وخضرة وسط الصحراء الذهبية!'
    },
    nileBoats: {
        id: 'scene-nile-boats',
        emoji: '⛵',
        title: 'نهر النيل والقوارب',
        subtitle: 'نهر مصر',
        details: [
            'نهر النيل شريان الحياة في مصر عبر التاريخ كله.',
            'قوارب شراعية توصل الناس والبضائع والتجارة.',
            'في النيل جزر وشواطئ جميلة وطبيعة ساحرة جداً.'
        ],
        speech: 'نيل مصر هو حياة ورزق الشعب المصري القديم والحديث.'
    },
    pyramids: {
        id: 'scene-pyramids',
        emoji: '🔺',
        title: 'الأهرامات المصرية',
        subtitle: 'الجيزة - القاهرة',
        details: [
            'آثار قديمة جداً بنيت بمهارة عظيمة من مئات السنين.',
            'بني من حجر جيري ضخم وتمثال أبو الهول عظيم جداً.',
            'من أعظم عجائب العالم القديم والحديث معاً.'
        ],
        speech: 'الأهرامات والعظمة المصرية القديمة آية في الروعة!'
    },
    zaafaranaWind: {
        id: 'scene-zaafarana',
        emoji: '💨',
        title: 'محطات الزعفرانة الهوائية',
        subtitle: 'خليج الزعفرانة',
        details: [
            'محطات ضخمة تولد كهرباء من الرياح القوية والشديدة.',
            'توربينات طويلة جداً تستخدم قوة الريح لتوليد كهرباء نظيفة.',
            'مشروع رائع جداً لطاقة خضراء متجددة ومستدامة.'
        ],
        speech: 'محطات الزعفرانة توليد كهرباء من قوة الرياح المصرية.'
    },
    highDam: {
        id: 'scene-high-dam',
        emoji: '🏗️',
        title: 'السد العالي',
        subtitle: 'أسوان - جنوب مصر',
        details: [
            'مشروع ضخم يحبس مياه النيل في بحيرة ناصر كبيرة.',
            'من هنا تأتي طاقة كهربائية تغذي مصر كلها بالكهرباء.',
            'توليد كهرباء رخيصة وسهل للسكان والصناعات.'
        ],
        speech: 'السد العالي يولد كهرباء رخيصة لمصر أرضنا الغالية.'
    },
    deltaIndustry: {
        id: 'scene-delta-industry',
        emoji: '🏭',
        title: 'صناعات الدلتا',
        subtitle: 'دلتا الفرافرة',
        details: [
            'منطقة زراعية كبيرة جداً في دلتا النيل الخضراء.',
            'توجود هنا مصانع كثيرة وزراعة أرز وقمح وخضروات.',
            'صناعات ومزارع تغذي السوق المصري بالمنتجات.'
        ],
        speech: 'صناعات الدلتا بيت الإنتاج المصري والثروة الزراعية.'
    },
    sukariMine: {
        id: 'scene-sukari-mine',
        emoji: '⛏️',
        title: 'منجم السكري',
        subtitle: 'الصحراء الشرقية',
        details: [
            'من أشهر مناجم الذهب في الشرق الأوسط كلها.',
            'يتم استخراج الذهب النقي الغالي جداً من هنا.',
            'ثروة ذهبية كبيرة جداً في الصحراء الشرقية.'
        ],
        speech: 'منجم السكري كنز الذهب المصري الثمين جداً!'
    },
    bahariyaOases: {
        id: 'scene-bahariya-oases',
        emoji: '🌴',
        title: 'واحات البحرية',
        subtitle: 'الواحات البحرية',
        details: [
            'واحات خضراء صحيحة في وسط الصحراء الجافة.',
            'يوجد هنا مياه عذبة وزراعات جميلة جداً.',
            'مكان هادئ جميل يحب الناس قضاء الإجازات فيه.'
        ],
        speech: 'واحات البحرية جنة خضراء وسط صحراء مصر الذهبية.'
    },
    coralReefs: {
        id: 'scene-coral-reefs',
        emoji: '🐠',
        title: 'الشعاب المرجانية',
        subtitle: 'البحر الأحمر - جنوب مصر',
        details: [
            'في البحر الأحمر شعاب مرجانية جميلة وملونة جداً.',
            'أسماك ملونة وجميلة جداً تسبح بين المرجان.',
            'كنز طبيعي جميل من ثروات البحار المصرية.'
        ],
        speech: 'الشعاب المرجانية جنة الحياة البحرية تحت الماء!'
    }
};

const MAP_VARIANTS = {
    default: {
        containerClass: 'bg-[radial-gradient(circle_at_30%_10%,#1f5b94_0%,#174a7f_35%,#123a69_100%)]',
        seaWave: '#2E82B8',
        landFill: '#DFC78E',
        landBorderSoft: '#6A4A2B',
        landBorderMain: '#8E6030',
        canal: '#56B2E8',
        nile: '#56B2E8',
        valley: '#77A870'
    },
    'lesson-1': {
        containerClass: 'bg-[radial-gradient(circle_at_28%_12%,#2b6ba3_0%,#1f5b94_40%,#174a7f_100%)]',
        seaWave: '#3D8FC5',
        landFill: '#E5CD98',
        landBorderSoft: '#77552E',
        landBorderMain: '#A06C33',
        canal: '#56B2E8',
        nile: '#4FA9E0',
        valley: '#88B675'
    },
    'lesson-2': {
        containerClass: 'bg-[radial-gradient(circle_at_32%_10%,#29689f_0%,#1f5489_42%,#153f6e_100%)]',
        seaWave: '#2E7FB2',
        landFill: '#E7D2A3',
        landBorderSoft: '#684A2B',
        landBorderMain: '#916132',
        canal: '#4FA9DF',
        nile: '#4FA9DF',
        valley: '#6EA86E'
    },
    'lesson-3': {
        containerClass: 'bg-[radial-gradient(circle_at_34%_8%,#225888_0%,#1b4777_45%,#153a63_100%)]',
        seaWave: '#2C77A8',
        landFill: '#DCC392',
        landBorderSoft: '#5A4228',
        landBorderMain: '#835A2E',
        canal: '#4AA2D7',
        nile: '#4AA2D7',
        valley: '#729F66'
    }
};

const MAP_REVEAL_DELAY = 0.35;
const MAP_MARKER_STAGGER = 0.055; // زيادة التباعد بين العلامات للأطفال

export default function MagicalMap({
    onLocationSelect,
    focusLocationId = null,
    focusNonce = 0,
    cameraResetNonce = 0,
    zoomCommand = null,
    basemapUrl = null,
    markerAppearance = null,
    renderMarker = null,
    renderMarkerAccessory = null,
    emphasizedLocationIds = null,
    enableMarkerNarration = true,
    pinnedLocationId = null,
    activeCategory: controlledCategory = undefined,
    onCategoryChange = null,
    visibleLocationIds = null,
    showAudioControl = false,
    showCategorySidebar = true,
    showLandmarkPicker = true,
    showCategoryChips = true,
    showCompass = true,
    showNarratorGuide = true,
    showSignature = true,
    showInquiryTool = true,
    showInquiryCard = true,
    showMapLegend = false,
    showKidHelper = true,
    lessonTitle = '',
    lessonId = '',
    lessonHighlights = [],
    lessonStats = [],
    mapVariant = 'default',
    compactMode = false,
    largeMode = false,
    kidSimpleMode = true,
    detailLevel = 'none',
    detailStyle = 'both',
    enableCameraControls = true,
    containerClassName = ''
}) {
    const {
        enabled: globalVoiceEnabled,
        setEnabled: setGlobalVoiceEnabled,
        speak: speakVoice,
        stop: stopVoice
    } = useVoiceNarration();
    const [internalActiveCategory, setInternalActiveCategory] = useState('all');
    const [hoveredLocation, setHoveredLocation] = useState(null);
    const [isNarratorEnabled, setIsNarratorEnabled] = useState(true);
    const [speakingLocation, setSpeakingLocation] = useState(null);
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
    const [clickEffect, setClickEffect] = useState(null);
    const [lastSelectedLocationId, setLastSelectedLocationId] = useState(null);
    const [isInquiryMode, setIsInquiryMode] = useState(false);
    const [activeInquiry, setActiveInquiry] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProgressiveMarkersMode, setIsProgressiveMarkersMode] = useState(false);
    const [progressiveVisibleCount, setProgressiveVisibleCount] = useState(0);
    const [satelliteMode, setSatelliteMode] = useState(false);
    const [markerLayoutSize, setMarkerLayoutSize] = useState({ width: 900, height: 700 });
    const [showDecorations, setShowDecorations] = useState(true);
    const satelliteImagePath = '/lesson-media/egypt-satellite.svg';

    const containerRef = useRef(null);
    const sceneRef = useRef(null);
    const markerBoundsRef = useRef(null);
    const categoryScrollerRef = useRef(null);
    const resetTimerRef = useRef(null);
    const progressiveRevealTimerRef = useRef(null);
    const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
    const dragRef = useRef(null);

    useEffect(() => {
        cameraRef.current = camera;
    }, [camera]);

    const activeCategory = controlledCategory ?? internalActiveCategory;
    const narratorEnabled = enableMarkerNarration && isNarratorEnabled && globalVoiceEnabled;
    const shouldShowAudioControl = showAudioControl && !compactMode;
    const shouldShowCategorySidebar = showCategorySidebar && !compactMode;
    const shouldShowLandmarkPicker = showLandmarkPicker && showCategorySidebar && (!compactMode || largeMode);
    const shouldShowCategoryChips = showCategoryChips && (largeMode || !compactMode);
    const shouldShowCompass = showCompass && !compactMode;
    const shouldShowNarratorGuide = showNarratorGuide && narratorEnabled && !compactMode;
    const shouldShowSignature = showSignature;
    const shouldShowInquiry = showInquiryTool && showInquiryCard;
    const shouldShowCameraControls = enableCameraControls && (!compactMode || largeMode) && !kidSimpleMode;
    const shouldShowMapLegend = showMapLegend && !compactMode;
    const shouldShowKidHelper = showKidHelper && !compactMode;
    const useIconOnlyInquiryButton = kidSimpleMode || compactMode;
    const variantTheme = MAP_VARIANTS[mapVariant] || MAP_VARIANTS.default;
    const mapAspectClass = largeMode
        ? 'aspect-[5/4] md:aspect-[16/10] lg:aspect-[16/9] min-h-[440px] md:min-h-[560px]'
        : 'aspect-square md:aspect-[4/3]';
    const markerInsetClass = '';
    // علامات مصغرة ومنظمة بشكل أفضل
    const markerButtonPaddingClass = kidSimpleMode ? 'p-1.5 md:p-2' : (largeMode ? 'p-2.5 md:p-3' : 'p-2 md:p-2.5');
    const markerEmojiClass = kidSimpleMode ? 'text-sm md:text-base' : (largeMode ? 'text-base md:text-lg' : 'text-sm md:text-base');
    const allowDrag = camera.scale > 1.02;
    const cursorClass = allowDrag ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default';

    const updateActiveCategory = (nextCategory) => {
        const resolvedCategory = typeof nextCategory === 'function'
            ? nextCategory(activeCategory)
            : nextCategory;

        if (controlledCategory === undefined) {
            setInternalActiveCategory(resolvedCategory);
        }

        if (typeof onCategoryChange === 'function') {
            onCategoryChange(resolvedCategory);
        }
    };

    useEffect(() => {
        const scroller = categoryScrollerRef.current;
        if (!scroller) return;

        const activeButton = scroller.querySelector(`[data-category-id="${activeCategory}"]`);
        activeButton?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [activeCategory]);

    const getCameraBounds = useCallback((scale) => {
        const containerEl = containerRef.current;
        if (!containerEl) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }
        const width = containerEl.clientWidth;
        const height = containerEl.clientHeight;
        const minX = width - (width * scale);
        const minY = height - (height * scale);
        return { minX, maxX: 0, minY, maxY: 0 };
    }, []);

    const clampCameraPosition = useCallback((x, y, scale) => {
        const bounds = getCameraBounds(scale);
        return {
            x: clamp(x, bounds.minX, bounds.maxX),
            y: clamp(y, bounds.minY, bounds.maxY)
        };
    }, [getCameraBounds]);


    // Audio Synthesis Setup
    const speak = (text, locationId = null, options = {}) => {
        if (!narratorEnabled || !text) return;
        speakVoice(text, {
            channel: options.channel || 'map-insight',
            profile: options.profile || 'child',
            onStart: () => setSpeakingLocation(locationId),
            onEnd: () => setSpeakingLocation(null)
        });
    };

    const handleLocationHover = (loc) => {
        setHoveredLocation(loc);
        if (narratorEnabled) {
            // Debounce or immediate? Let's keep it simple: speak name
            speak(loc.name, loc.id, { channel: 'map-hover', profile: 'child' });
        }
    };

    const openInquiryCard = (insight, locationId = null) => {
        if (!showInquiryCard) return;
        if (!insight) return;
        setActiveInquiry({ ...insight, openedAt: Date.now() });
        if (narratorEnabled && insight.speech) {
            speak(insight.speech, locationId, { channel: 'map-insight', profile: 'child' });
        }
    };

    const buildLocationInsight = (loc) => {
        const categoryMeta = CATEGORIES.find((category) => category.id === loc.cat);
        const detailRows = [
            loc.characterDialog?.intro,
            loc.characterDialog?.explanation,
            loc.characterDialog?.funFact,
            loc.characterDialog?.importance
        ].filter(Boolean);

        const facts = [
            {
                label: 'كم كمية؟',
                value: loc.simpleInfo?.what || loc.characterDialog?.explanation || ''
            },
            {
                label: 'أين؟',
                value: loc.simpleInfo?.where || loc.governorate || ''
            },
            {
                label: 'لماذا مهم؟',
                value: loc.simpleInfo?.why || loc.characterDialog?.importance || ''
            },
            {
                label: 'كم كمية؟',
                value: loc.simpleInfo?.howMuch || ''
            }
        ].filter((item) => item.value);

        if (loc.quiz?.[0]?.question) {
            facts.push({
                label: 'سؤال تحدي',
                value: loc.quiz[0].question
            });
        }

        if (loc.activities?.matching?.pairs?.[0]) {
            const firstPair = loc.activities.matching.pairs[0];
            facts.push({
                label: 'مطابقة معاني',
                value: `${firstPair.item} ↔ ${firstPair.match}`
            });
        }

        if (loc.reward?.badge || loc.reward?.points) {
            const badgeText = loc.reward?.badge ? `🏅 ${loc.reward.badge}` : '';
            const pointsText = loc.reward?.points ? `${loc.reward.points} نقطة` : '';
            facts.push({
                label: 'الجوائز والنقاط',
                value: [badgeText, pointsText].filter(Boolean).join('  ')
            });
        }

        const miniMission = loc.activities?.dragDrop?.question
            || loc.activities?.matching?.question
            || '';
        const challengeQuestion = loc.quiz?.[0]?.question || '';
        const challengeHint = loc.quiz?.[0]?.hint || '';
        const rewardMessage = loc.reward?.message || '';

        return {
            id: `location-${loc.id}`,
            emoji: loc.emoji || '📍',
            title: loc.name,
            subtitle: `${categoryMeta?.label || 'موقع'}  ${loc.governorate || 'مصر'}`,
            details: [...new Set(detailRows)].slice(0, 4),
            facts: facts.slice(0, 7),
            miniMission,
            challengeQuestion,
            challengeHint,
            rewardMessage,
            speech: loc.characterDialog?.intro || `${loc.name} في ${loc.governorate || 'مصر'}`
        };
    };

    const handleSceneInquiry = (sceneKey, event) => {
        if (event?.stopPropagation) event.stopPropagation();
        const sceneInsight = SCENE_INSIGHTS[sceneKey];
        if (!sceneInsight) return;

        if (isInquiryMode) {
            openInquiryCard(sceneInsight);
            return;
        }

        if (narratorEnabled && sceneInsight.speech) {
            speak(sceneInsight.speech, null, { channel: 'map-insight', profile: 'child' });
        }
    };

    const handleMarkerSelect = (loc) => {
        const point = getMarkerPercentPosition(loc);
        setLastSelectedLocationId(loc.id);
        setClickEffect({
            id: `${loc.id}-${Date.now()}`,
            x: point.x,
            y: point.y,
            color: CATEGORY_GLOW[loc.cat] || 'rgba(59, 130, 246, 0.45)'
        });
        focusCameraOnLocation(loc);

        if (showInquiryCard) {
            openInquiryCard(buildLocationInsight(loc), loc.id);
        }

        if (narratorEnabled) {
            const line = loc.characterDialog?.intro || loc.simpleInfo?.why || `أهلا بك في ${loc.name}! هذا مكان مهم جداً في مصر.`;
            speak(line, loc.id, { channel: 'map-insight', profile: 'child' });
        }

        if (typeof onLocationSelect === 'function') {
            onLocationSelect(loc);
        }
    };

    useEffect(() => {
        if (showInquiryCard) return;
        setIsInquiryMode(false);
        setActiveInquiry(null);
    }, [showInquiryCard]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            setActiveInquiry(null);
            setIsInquiryMode(false);
            setHoveredLocation(null);
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    useEffect(() => () => {
        if (!resetTimerRef.current) return;
        clearTimeout(resetTimerRef.current);
    }, []);

    const allLocations = useMemo(() => ([
        ...MAP_LOCATIONS.minerals.map((l) => ({ ...l, cat: 'minerals' })),
        ...MAP_LOCATIONS.energy.map((l) => ({ ...l, cat: 'energy' })),
        ...MAP_LOCATIONS.water.map((l) => ({ ...l, cat: 'water' })),
        ...MAP_LOCATIONS.projects.map((l) => ({ ...l, cat: 'projects' }))
    ]), []);

    const scopedLocations = useMemo(() => {
        if (!Array.isArray(visibleLocationIds)) return allLocations;
        if (!visibleLocationIds.length) return [];
        const allowedIds = new Set(visibleLocationIds);
        return allLocations.filter((location) => allowedIds.has(location.id));
    }, [allLocations, visibleLocationIds]);

    const categoryCounts = useMemo(() => {
        const counts = {
            all: scopedLocations.length,
            minerals: 0,
            energy: 0,
            water: 0,
            projects: 0
        };
        scopedLocations.forEach((location) => {
            if (counts[location.cat] !== undefined) {
                counts[location.cat] += 1;
            }
        });
        return counts;
    }, [scopedLocations]);

    const handleCategoryQuickSelect = (categoryId) => {
        updateActiveCategory(categoryId);
        const source = categoryId === 'all'
            ? scopedLocations
            : scopedLocations.filter((location) => location.cat === categoryId);

        if (!source.length) return;
        const target = source[0];
        setLastSelectedLocationId(target.id);
        setHoveredLocation(target);
        focusCameraOnLocation(target);
    };

    const filteredLocations = useMemo(() => {
        let filtered = activeCategory === 'all'
            ? scopedLocations
            : scopedLocations.filter((l) => l.cat === activeCategory);
        
        // Filter by lesson if specified
        if (lessonId) {
            filtered = filtered.filter((l) => l.lesson === lessonId);
        }
        
        return filtered;
    }, [activeCategory, scopedLocations, lessonId]);
    const filteredLocationsSignature = useMemo(
        () => filteredLocations.map((location) => location.id).join('|'),
        [filteredLocations]
    );
    const shouldShowProgressiveMarkerTool = filteredLocations.length > 1 && !kidSimpleMode;

    const highlightLocation = pinnedLocationId || focusLocationId;
    const activeHighlightId = highlightLocation || lastSelectedLocationId;

    const ambientLights = useMemo(() => (
        kidSimpleMode ? [] : [
            { id: 'light-1', top: '8%', left: '10%', size: 140, color: 'rgba(250, 204, 21, 0.35)', dx: 18, dy: 14, duration: 7.6 },
            { id: 'light-2', top: '20%', right: '14%', size: 180, color: 'rgba(56, 189, 248, 0.28)', dx: -24, dy: 18, duration: 9.2 },
            { id: 'light-3', bottom: '16%', left: '18%', size: 170, color: 'rgba(192, 132, 252, 0.28)', dx: 20, dy: -18, duration: 10.1 },
            { id: 'light-4', bottom: '8%', right: '10%', size: 130, color: 'rgba(16, 185, 129, 0.25)', dx: -15, dy: -13, duration: 8.7 }
        ]
    ), [kidSimpleMode]);
    const ambientMovers = useMemo(() => {
        if (kidSimpleMode) return [];
        const sharedMovers = AMBIENT_MOVERS_BY_CATEGORY.all || [];

        if (activeCategory === 'all') {
            return [
                ...sharedMovers,
                ...(AMBIENT_MOVERS_BY_CATEGORY.minerals || []).slice(0, 1),
                ...(AMBIENT_MOVERS_BY_CATEGORY.energy || []).slice(0, 1),
                ...(AMBIENT_MOVERS_BY_CATEGORY.water || []).slice(0, 1),
                ...(AMBIENT_MOVERS_BY_CATEGORY.projects || []).slice(0, 1)
            ];
        }

        return [...sharedMovers, ...(AMBIENT_MOVERS_BY_CATEGORY[activeCategory] || [])];
    }, [activeCategory, kidSimpleMode]);

    const getMarkerPercentPosition = (loc) => {
        const projected = lngLatToSvg(loc);
        const x = clamp((projected.x / VIEWBOX.width) * 100, 0, 100);
        const y = clamp((projected.y / VIEWBOX.height) * 100, 0, 100);
        return { x, y };
    };

    const highlightedMarker = useMemo(
        () => scopedLocations.find((loc) => loc.id === activeHighlightId) || null,
        [scopedLocations, activeHighlightId]
    );
    const highlightedMarkerPosition = highlightedMarker ? getMarkerPercentPosition(highlightedMarker) : null;
    const landmarkOptions = useMemo(
        () => [...filteredLocations].sort((a, b) => a.name.localeCompare(b.name, 'ar')),
        [filteredLocations]
    );
    const displayedLocations = useMemo(() => (
        isProgressiveMarkersMode
            ? filteredLocations.slice(0, progressiveVisibleCount)
            : filteredLocations
    ), [filteredLocations, isProgressiveMarkersMode, progressiveVisibleCount]);
    const legendCategoryItems = useMemo(
        () => CATEGORIES.filter((cat) => (categoryCounts[cat.id] || 0) > 0),
        [categoryCounts]
    );
    const legendSymbolItems = useMemo(
        () => [
            { id: 'symbol-marker', emoji: '📍', label: 'معالم على الخريطة' },
            { id: 'symbol-nile', emoji: '🌊', label: 'ماء وموارد مائية' },
            { id: 'symbol-mountain', emoji: '⛰️', label: 'جبال ومعادن' },
            { id: 'symbol-insight', emoji: '💡', label: 'معلومات وحقائق ممتعة' }
        ],
        []
    );
    const normalizedLessonHighlights = useMemo(
        () => (Array.isArray(lessonHighlights) ? lessonHighlights : [])
            .map((item) => String(item || '').trim())
            .filter(Boolean)
            .slice(0, 4),
        [lessonHighlights]
    );
    const normalizedLessonStats = useMemo(
        () => (Array.isArray(lessonStats) ? lessonStats : [])
            .filter((item) => item && (item.label || item.value))
            .map((item, index) => ({
                id: item.id || `lesson-stat-${index}`,
                emoji: item.emoji || '📊',
                label: item.label || 'إحصائية',
                value: item.value || ''
            }))
            .slice(0, 4),
        [lessonStats]
    );
    useEffect(() => {
        if (!renderMarker || !containerRef.current) return;
        const element = containerRef.current;
        const update = () => setMarkerLayoutSize({ width: element.clientWidth, height: element.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, [renderMarker !== null]);
    const resourceMarkerPositions = useMemo(() => {
        if (!renderMarker) return null;
        const distance = Math.max(68 / Math.max(1, markerLayoutSize.width), 74 / Math.max(1, markerLayoutSize.height)) * 100;
        return buildDeclutteredPercentPositions(displayedLocations, (loc) => {
            const projected = lngLatToSvg(loc);
            return { x: projected.x / VIEWBOX.width * 100, y: projected.y / VIEWBOX.height * 100 };
        }, { minDistance: distance, ringStep: distance * .6, maxAttempts: 96, edgePadding: 8 });
    }, [displayedLocations, markerLayoutSize, renderMarker !== null]);

    const activeKidLocation = hoveredLocation || highlightedMarker || filteredLocations[0] || null;
    const kidFlowSteps = useMemo(
        () => ([
            {
                id: 'step-1',
                emoji: '1️⃣',
                title: 'استكشف الخريطة',
                hint: shouldShowCategorySidebar ? 'اختر فئة من الفئات على الجانب الأيسر!' : 'اختر أي موقع من على الخريطة!'
            },
            {
                id: 'step-2',
                emoji: '2️⃣',
                title: 'اقرأ المعلومات',
                hint: 'هل تريد معلومات إضافية؟ انقر على علامة الاستفهام!'
            },
            {
                id: 'step-3',
                emoji: '3️⃣',
                title: 'اجب السؤال',
                hint: 'أجب عن سؤال التحدي واربح نقاط عليك!'
            }
        ]),
        [shouldShowCategorySidebar]
    );
    const kidGuideMessage = useMemo(() => {
        if (!filteredLocations.length) {
            return 'لم نجد أي موقع في هذه الفئة. جرب فئة أخرى مختلفة!';
        }
        if (isProgressiveMarkersMode) {
            return 'انقر على أي موقع جديد لكي تكتشفه!';
        }
        if (isInquiryMode) {
            return 'استكشف كل موقع! اضغط على أي علامة أو حقيقة مهمة لتتعلم أكثر!';
        }
        if (activeKidLocation?.quiz?.[0]?.question) {
            return `سؤال جديد: جاوب على سؤال عن ${activeKidLocation.name} واربح نقاط إضافية!`;
        }
        if (activeKidLocation?.name) {
            return `تعرف على: ${activeKidLocation.name} من خلال معلومات ممتعة جداً!`;
        }
        return 'اختر أي موقع على الخريطة لتبدأ المغامرة!';
    }, [activeKidLocation, filteredLocations.length, isInquiryMode, isProgressiveMarkersMode]);

    useEffect(() => {
        if (progressiveRevealTimerRef.current) {
            clearInterval(progressiveRevealTimerRef.current);
            progressiveRevealTimerRef.current = null;
        }

        if (!isProgressiveMarkersMode) {
            setProgressiveVisibleCount(filteredLocations.length);
            return undefined;
        }

        setProgressiveVisibleCount(0);
        if (!filteredLocations.length) return undefined;

        progressiveRevealTimerRef.current = setInterval(() => {
            setProgressiveVisibleCount((prev) => {
                const next = Math.min(filteredLocations.length, prev + 1);
                if (next >= filteredLocations.length && progressiveRevealTimerRef.current) {
                    clearInterval(progressiveRevealTimerRef.current);
                    progressiveRevealTimerRef.current = null;
                }
                return next;
            });
        }, 260);

        return () => {
            if (progressiveRevealTimerRef.current) {
                clearInterval(progressiveRevealTimerRef.current);
                progressiveRevealTimerRef.current = null;
            }
        };
    }, [isProgressiveMarkersMode, filteredLocations.length, filteredLocationsSignature]);

    const focusCameraOnLocation = useCallback((location) => {
        if (!location) return;
        const containerEl = containerRef.current;
        const markerBoundsEl = markerBoundsRef.current;
        if (!containerEl || !markerBoundsEl) return;

        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        window.requestAnimationFrame(() => {
            const { x: xPercent, y: yPercent } = getMarkerPercentPosition(location);
            const containerRect = containerEl.getBoundingClientRect();
            const markerRect = markerBoundsEl.getBoundingClientRect();

            const currentCamera = cameraRef.current || { x: 0, y: 0, scale: 1 };
            const baseScale = currentCamera.scale || 1;
            const baseX = currentCamera.x || 0;
            const baseY = currentCamera.y || 0;

            const markerLeftUnscaled = (markerRect.left - containerRect.left - baseX) / baseScale;
            const markerTopUnscaled = (markerRect.top - containerRect.top - baseY) / baseScale;
            const markerWidthUnscaled = markerRect.width / baseScale;
            const markerHeightUnscaled = markerRect.height / baseScale;

            const targetX = markerLeftUnscaled + (xPercent / 100) * markerWidthUnscaled;
            const targetY = markerTopUnscaled + (yPercent / 100) * markerHeightUnscaled;

            const scale = 1.18;
            const centeredX = (containerRect.width / 2) - (targetX * scale);
            const centeredY = (containerRect.height / 2) - (targetY * scale);
            const next = clampCameraPosition(centeredX, centeredY, scale);

            setCamera({ x: next.x, y: next.y, scale });
            resetTimerRef.current = setTimeout(() => {
                setCamera({ x: 0, y: 0, scale: 1 });
            }, 2400);
        });
    }, [clampCameraPosition, getMarkerPercentPosition]);

    const handleLandmarkSelect = (locationId) => {
        const location = landmarkOptions.find((loc) => loc.id === locationId);
        if (!location) return;

        handleMarkerSelect(location);
        setHoveredLocation(location);
    };

    const adjustCameraZoom = (delta) => {
        setCamera((current) => {
            const containerEl = containerRef.current;
            const currentScale = current?.scale || 1;
            const nextScale = clamp(round1(currentScale + delta), 1, 1.8);
            if (!containerEl) return { ...current, scale: nextScale };
            if (nextScale === currentScale) return current;

            if (nextScale === 1) {
                return { x: 0, y: 0, scale: 1 };
            }

            const width = containerEl.clientWidth;
            const height = containerEl.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;
            const zoomRatio = nextScale / currentScale;

            const nextX = centerX - ((centerX - (current.x || 0)) * zoomRatio);
            const nextY = centerY - ((centerY - (current.y || 0)) * zoomRatio);

            const minX = width - (width * nextScale);
            const minY = height - (height * nextScale);

            return {
                x: clamp(nextX, minX, 0),
                y: clamp(nextY, minY, 0),
                scale: nextScale
            };
        });
    };

    useEffect(() => {
        if (zoomCommand) adjustCameraZoom(zoomCommand.delta);
    }, [zoomCommand]);

    const resetCamera = () => {
        setCamera({ x: 0, y: 0, scale: 1 });
    };

    useEffect(() => {
        setCamera({ x: 0, y: 0, scale: 1 });
    }, [cameraResetNonce]);

    const handleScenePointerDown = (event) => {
        if (!allowDrag) return;
        if (event.button !== 0) return;
        if (event.target?.closest?.('button')) return;

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startCamera: cameraRef.current || { x: 0, y: 0, scale: 1 }
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handleScenePointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const next = clampCameraPosition(
            (drag.startCamera.x || 0) + dx,
            (drag.startCamera.y || 0) + dy,
            drag.startCamera.scale || 1
        );

        setCamera({
            x: next.x,
            y: next.y,
            scale: drag.startCamera.scale || 1
        });
    };

    const handleScenePointerUp = (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    const handleWheelZoom = (event) => {
        if (!enableCameraControls || kidSimpleMode) return;
        if (event.target?.closest?.('button,select,input,textarea')) return;
        if (event.cancelable) event.preventDefault();
        const step = event.deltaY < 0 ? 0.12 : -0.12;
        adjustCameraZoom(step);
    };

    useEffect(() => {
        if (!clickEffect?.id) return undefined;
        const timer = setTimeout(() => {
            setClickEffect((current) => (current?.id === clickEffect.id ? null : current));
        }, 900);
        return () => clearTimeout(timer);
    }, [clickEffect]);

    useEffect(() => {
        if (!focusLocationId) return undefined;

        const loc = scopedLocations.find((l) => l.id === focusLocationId);
        if (!loc) return undefined;

        if (activeCategory !== 'all' && activeCategory !== loc.cat) {
            updateActiveCategory('all');
        }

        const containerEl = containerRef.current;
        const markerBoundsEl = markerBoundsRef.current;
        if (!containerEl || !markerBoundsEl) return undefined;

        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        const frame = window.requestAnimationFrame(() => {
            const { x: xPercent, y: yPercent } = getMarkerPercentPosition(loc);
            const containerRect = containerEl.getBoundingClientRect();
            const markerRect = markerBoundsEl.getBoundingClientRect();

            const currentCamera = cameraRef.current || { x: 0, y: 0, scale: 1 };
            const baseScale = currentCamera.scale || 1;
            const baseX = currentCamera.x || 0;
            const baseY = currentCamera.y || 0;

            // markerBoundsRef is inside the transformed scene; undo current camera so focus remains correct
            const markerLeftUnscaled = (markerRect.left - containerRect.left - baseX) / baseScale;
            const markerTopUnscaled = (markerRect.top - containerRect.top - baseY) / baseScale;
            const markerWidthUnscaled = markerRect.width / baseScale;
            const markerHeightUnscaled = markerRect.height / baseScale;

            const targetX = markerLeftUnscaled + (xPercent / 100) * markerWidthUnscaled;
            const targetY = markerTopUnscaled + (yPercent / 100) * markerHeightUnscaled;

            const scale = 1.18;
            const minX = containerRect.width - containerRect.width * scale;
            const minY = containerRect.height - containerRect.height * scale;

            let nextX = (containerRect.width / 2) - (targetX * scale);
            let nextY = (containerRect.height / 2) - (targetY * scale);

            nextX = clamp(nextX, minX, 0);
            nextY = clamp(nextY, minY, 0);

            setCamera({ x: nextX, y: nextY, scale });

            resetTimerRef.current = setTimeout(() => {
                setCamera({ x: 0, y: 0, scale: 1 });
            }, 2400);

            if (narratorEnabled) {
                speak(loc.name, loc.id, { channel: 'map-hover', profile: 'child' });
            }
        });

        return () => window.cancelAnimationFrame(frame);
    }, [focusLocationId, focusNonce, scopedLocations, activeCategory, narratorEnabled]);

    useEffect(() => () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        dragRef.current = null;
    }, []);

    // Drawing animation variants
    const drawVariant = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
                pathLength: { duration: 2.5, ease: "easeInOut" },
                opacity: { duration: 0.5 }
            }
        }
    };

    const fillVariant = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { delay: 2, duration: 1 }
        }
    };

    const egyptOutline = useMemo(() => {
        // Simple (but recognizable) Egypt outline in lat/lng, projected to the same box as markers.
        const mainland = [
            { lat: 22.0, lng: 25.0 }, // SW (Sudan/Libya)
            { lat: 31.6, lng: 25.0 }, // NW (Sallum)
            // Mediterranean coast + Nile delta bulge
            { lat: 31.55, lng: 26.4 },
            { lat: 31.45, lng: 27.8 },
            { lat: 31.25, lng: 29.4 }, // Alexandria-ish
            { lat: 31.4, lng: 30.4 },
            { lat: 31.55, lng: 31.1 }, // Delta bulge
            { lat: 31.4, lng: 31.9 },
            { lat: 31.3, lng: 32.35 }, // Port Said / Canal North
            // Suez Canal edge (to separate Sinai)
            { lat: 30.7, lng: 32.45 },
            { lat: 29.97, lng: 32.55 }, // Suez
            // Red Sea coast (west side)
            { lat: 29.3, lng: 32.85 },
            { lat: 28.5, lng: 33.2 },
            { lat: 27.7, lng: 33.6 },
            { lat: 26.95, lng: 34.0 },
            { lat: 26.15, lng: 34.4 },
            { lat: 25.2, lng: 34.75 },
            { lat: 24.2, lng: 35.1 },
            { lat: 23.2, lng: 35.55 },
            { lat: 22.25, lng: 35.9 }, // Halaib triangle-ish
            // Southern border back to Libya
            { lat: 22.0, lng: 32.0 },
            { lat: 22.0, lng: 29.0 },
            { lat: 22.0, lng: 27.0 },
            { lat: 22.0, lng: 25.0 }
        ];

        const sinai = [
            { lat: 31.3, lng: 32.35 }, // NW Sinai
            { lat: 31.35, lng: 33.2 },
            { lat: 31.28, lng: 34.2 }, // Rafah
            // Israel border down to Taba
            { lat: 30.7, lng: 34.45 },
            { lat: 30.2, lng: 34.7 },
            { lat: 29.5, lng: 34.9 }, // Taba
            // Gulf of Aqaba down to Ras Mohammed
            { lat: 28.9, lng: 34.75 },
            { lat: 28.25, lng: 34.55 },
            { lat: 27.75, lng: 34.3 }, // Ras Mohammed
            // West coast of Sinai up to Suez (leave gulf water visible)
            { lat: 28.35, lng: 33.95 },
            { lat: 28.95, lng: 33.65 },
            { lat: 29.45, lng: 33.25 },
            { lat: 29.97, lng: 32.55 }, // Suez
            // Back up the canal to close the shape
            { lat: 30.7, lng: 32.45 },
            { lat: 31.3, lng: 32.35 }
        ];

        const canalLine = [
            { lat: 31.3, lng: 32.35 },
            { lat: 30.7, lng: 32.45 },
            { lat: 29.97, lng: 32.55 }
        ];
        

        return {
            mainlandD: buildClosedPath(mainland),
            sinaiD: buildClosedPath(sinai),
            canalD: buildOpenPath(canalLine)
        };
    }, []);

    return (
        <div
            ref={containerRef}
            dir="ltr"
            onWheel={handleWheelZoom}
            className={`magical-map-treasure relative w-full ${mapAspectClass} ${variantTheme.containerClass} rounded-[40px] overflow-hidden border-8 border-white shadow-2xl user-select-none ${cursorClass} ${isInquiryMode ? 'map-inquiry-mode' : ''} ${containerClassName}`}
        >
            <div className="pointer-events-none absolute inset-0 z-[5]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.45),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.3),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.2),transparent_42%)]" />
                {ambientLights.map((light) => (
                    <motion.div
                        key={light.id}
                        className="absolute rounded-full blur-3xl"
                        style={{
                            width: light.size,
                            height: light.size,
                            backgroundColor: light.color,
                            top: light.top,
                            left: light.left,
                            right: light.right,
                            bottom: light.bottom
                        }}
                        animate={{
                            x: [0, light.dx, 0],
                            y: [0, light.dy, 0],
                            opacity: [0.22, 0.48, 0.22]
                        }}
                        transition={{
                            duration: light.duration,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />
                ))}
            </div>

            {(shouldShowAudioControl || shouldShowInquiry || shouldShowCameraControls || shouldShowProgressiveMarkerTool) && (
                <div className="magical-map-controls absolute top-4 left-4 md:top-6 md:left-6 z-40 flex flex-col gap-2 md:gap-3">
                    {shouldShowAudioControl && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                const newState = !isNarratorEnabled;
                                setIsNarratorEnabled(newState);

                                if (!newState) {
                                    stopVoice();
                                    setSpeakingLocation(null);
                                    return;
                                }

                                if (!globalVoiceEnabled) {
                                    setGlobalVoiceEnabled(true);
                                    return;
                                }

                                speakVoice("احسنت جداً! لقد كسبت نقاط إضافية في هذا الموقع الرائع!", {
                                    channel: 'map-intro',
                                    profile: 'child'
                                });
                            }}
                            className={`p-4 rounded-full shadow-2xl transition-all border-4 border-white font-bold text-sm ${narratorEnabled ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white scale-110' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            title={narratorEnabled ? 'أوقف الأصوات' : 'شغّل الأصوات'}
                        >
                            {narratorEnabled ? <SpeakerHigh size={24} weight="fill" /> : <SpeakerSlash size={24} />}
                        </motion.button>
                    )}

                    {/* Satellite toggle */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSatelliteMode(s => !s)}
                        className={`${kidSimpleMode ? 'hidden' : ''} p-4 rounded-full shadow-2xl transition-all border-4 border-white font-bold text-sm ${satelliteMode ? 'bg-amber-500 text-white scale-110' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        title={satelliteMode ? 'إخفاء خريطة القمر الصناعي' : 'عرض خريطة القمر الصناعي'}
                    >
                        🛰️
                    </motion.button>

                    {/* Decorations toggle */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowDecorations(s => !s)}
                        className={`${kidSimpleMode ? 'hidden' : ''} p-4 rounded-full shadow-2xl transition-all border-4 border-white font-bold text-sm ${showDecorations ? 'bg-blue-500 text-white scale-110' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        title={showDecorations ? 'إخفاء الرموز والعناصر' : 'عرض الرموز والعناصر'}
                    >
                        ✨
                    </motion.button>

                    {shouldShowCameraControls && (
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center rounded-2xl overflow-hidden border-3 border-white shadow-2xl bg-gradient-to-br from-white to-blue-50/95 backdrop-blur"
                        >
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => adjustCameraZoom(0.15)}
                                className="px-4 py-3 font-black text-slate-700 hover:bg-blue-100 transition text-xl"
                                title="تكبير الخريطة"
                            >
                                🔍+
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={resetCamera}
                                className="px-4 py-3 font-black text-slate-700 border-x-3 border-slate-300 hover:bg-blue-100 transition"
                                title="إعادة تعيين الكاميرا"
                            >
                                🔄
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => adjustCameraZoom(-0.15)}
                                className="px-4 py-3 font-black text-slate-700 hover:bg-blue-100 transition text-xl"
                                title="تصغير الخريطة"
                            >
                                🔍-
                            </motion.button>
                        </motion.div>
                    )}

                    {shouldShowInquiry && (
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setIsInquiryMode((prev) => {
                                    const next = !prev;
                                    if (next) {
                                        openInquiryCard(MAP_OVERVIEW_INSIGHT);
                                    } else {
                                        setActiveInquiry(null);
                                    }
                                    return next;
                                });
                            }}
                            className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border-3 font-black text-sm shadow-2xl transition-all ${isInquiryMode
                                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-white scale-105'
                                : 'bg-white/95 text-slate-700 border-white hover:bg-slate-100'
                                }`}
                            title={isInquiryMode ? 'أوقف وضع البحث' : 'تفعيل وضع البحث'}
                        >
                            <MagnifyingGlass size={20} weight={isInquiryMode ? 'fill' : 'bold'} />
                            <span>{isInquiryMode ? '🔍 بحث' : '🔍 ابدأ البحث'}</span>
                        </motion.button>
                    )}

                    {shouldShowProgressiveMarkerTool && (
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setIsProgressiveMarkersMode((prev) => !prev);
                            }}
                            className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border-3 font-black text-sm shadow-2xl transition-all ${isProgressiveMarkersMode
                                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-white scale-105'
                                : 'bg-white/95 text-slate-700 border-white hover:bg-slate-100'
                                }`}
                            title={isProgressiveMarkersMode ? 'أوقف الكشف التدريجي' : 'ابدأ الكشف التدريجي'}
                        >
                            <span>{isProgressiveMarkersMode ? '🎯' : '🎯'}</span>
                            <span>{isProgressiveMarkersMode ? 'كشف تدريجي' : 'اكتشف الكل'}</span>
                        </motion.button>
                    )}
                </div>
            )}

            {shouldShowLandmarkPicker && (
                <div className={`magical-map-landmarks absolute z-40 top-14 left-3 right-3 md:top-5 md:left-auto md:w-[230px] md:max-w-[68vw] ${shouldShowCategorySidebar ? 'md:right-20 lg:right-24' : 'md:right-5'}`}>
                <div className="rounded-2xl border-2 border-white/90 bg-white/95 backdrop-blur px-3 py-2 shadow-xl">
                    <div className="text-[11px] font-black text-slate-600 mb-1">اختر الموقع</div>
                    <select
                        defaultValue=""
                        onChange={(event) => {
                            const nextId = event.target.value;
                            if (nextId) handleLandmarkSelect(nextId);
                            event.target.value = '';
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-sky-300"
                    >
                        <option value="">اختر موقعاً من الخريطة</option>
                        {landmarkOptions.map((location) => (
                            <option key={location.id} value={location.id}>
                                {location.emoji} {location.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            )}

            {shouldShowCategoryChips && (
                <div className="magical-map-categories magical-map-mini-filter absolute top-3 left-3 right-3 md:top-4 md:left-auto md:right-4 z-40 md:max-w-[560px]">
                    <div className="rounded-2xl border border-white/80 bg-white/88 backdrop-blur px-2 py-1.5 shadow-lg">
                        <div className="text-[11px] font-black text-slate-500 mb-2">اختر فئة الاستكشاف</div>
                        <div
                            ref={categoryScrollerRef}
                            className="magical-map-filter-scroll flex flex-nowrap gap-1.5 overflow-x-auto"
                            dir="rtl"
                        >
                            <button
                                type="button"
                                data-category-id="all"
                                onClick={() => handleCategoryQuickSelect('all')}
                                className={`px-2.5 py-1 rounded-full text-[11px] md:text-xs font-black border transition active:scale-95 ${activeCategory === 'all'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                الكل {categoryCounts.all}
                            </button>
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={`quick-cat-${cat.id}`}
                                    type="button"
                                    data-category-id={cat.id}
                                    onClick={() => handleCategoryQuickSelect(cat.id)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] md:text-xs font-black border transition active:scale-95 ${activeCategory === cat.id
                                        ? `${cat.color} text-white border-transparent`
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {cat.label} {categoryCounts[cat.id] || 0}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {shouldShowMapLegend && (
                <motion.aside
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                    className="absolute z-40 left-3 top-24 md:left-4 md:top-24 w-[220px] md:w-[250px] max-w-[68vw]"
                    dir="rtl"
                >
                    <div className="rounded-3xl border-2 border-white/90 bg-white/95 backdrop-blur-md shadow-2xl p-3 text-right">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-black text-slate-800">الدرس الحالي</p>
                                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                                    {lessonTitle || 'استكشف ثروات مصر'}
                                </p>
                            </div>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white text-sm shadow">
                                📚
                            </span>
                        </div>

                        <div className="mt-2.5 grid gap-1.5">
                            {legendCategoryItems.map((cat) => (
                                <div key={`legend-cat-${cat.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex h-3 w-3 rounded-full border border-white shadow ${cat.color}`} />
                                        <span className="text-[11px] font-black text-slate-700">{cat.icon} {cat.label}</span>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-500">{categoryCounts[cat.id] || 0}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-2.5 grid gap-1">
                            {legendSymbolItems.map((symbol) => (
                                <p key={symbol.id} className="text-[11px] font-bold text-slate-600 leading-relaxed">
                                    {symbol.emoji} {symbol.label}
                                </p>
                            ))}
                        </div>

                        <div className="mt-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-2">
                            <p className="text-[10px] font-black text-indigo-700 mb-1">الخطوات المهمة</p>
                            <div className="grid gap-1">
                                {kidFlowSteps.map((step) => (
                                    <p key={`legend-step-${step.id}`} className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                        {step.emoji} {step.title}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {(normalizedLessonStats.length > 0 || normalizedLessonHighlights.length > 0) && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100">
                                {normalizedLessonStats.length > 0 && (
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {normalizedLessonStats.map((stat) => (
                                            <div key={stat.id} className="rounded-xl border border-sky-100 bg-sky-50/70 px-2 py-1.5">
                                                <p className="text-[10px] font-black text-sky-700">{stat.emoji} {stat.label}</p>
                                                <p className="text-[11px] font-black text-slate-700 mt-0.5">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {normalizedLessonHighlights.length > 0 && (
                                    <div className="mt-2 grid gap-1">
                                        {normalizedLessonHighlights.map((line, index) => (
                                            <p key={`legend-highlight-${index}`} className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                                 {line}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.aside>
            )}

            {!compactMode && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="magical-map-tip-wrap hidden md:block absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                >
                    <div className="magical-map-tip rounded-3xl bg-white/90 backdrop-blur border-2 border-white shadow-lg px-3 py-2.5 min-w-[240px] sm:min-w-[320px] max-w-[560px]">
                        {shouldShowKidHelper && (
                            <div className="mb-2 flex items-center justify-center gap-1.5 flex-wrap">
                                {kidFlowSteps.map((step) => (
                                    <span
                                        key={`tip-step-${step.id}`}
                                        className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700"
                                    >
                                        {step.emoji} {step.title}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-xs md:text-sm font-black text-slate-700 text-center leading-relaxed">
                            {isInquiryMode
                                ? 'استكشف كل موقع! انقر على أي علامة لتكتشف معلومات أكثر!'
                                : allowDrag
                                    ? 'اسحب الخريطة! يمكنك استكشاف جميع المواقع بحرية كاملة!'
                                    : kidGuideMessage}
                        </p>
                    </div>
                </motion.div>
            )}

            <motion.div
                ref={sceneRef}
                className="absolute inset-0 z-10"
                onPointerDown={handleScenePointerDown}
                onPointerMove={handleScenePointerMove}
                onPointerUp={handleScenePointerUp}
                onPointerCancel={handleScenePointerUp}
                animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
                transition={{ type: 'spring', stiffness: 160, damping: 20, mass: 0.9 }}
                style={{ transformOrigin: '0 0', touchAction: 'none' }}
            >
                {/* 🎨 Layer 1: Animated Geography (SVG) */}
                {basemapUrl ? <img src={basemapUrl} alt="خريطة تعليمية لمصر والدول المجاورة" className="absolute inset-0 w-full h-full pointer-events-none" /> : (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
                    preserveAspectRatio="none"
                    onClick={() => {
                        if (isInquiryMode) {
                            openInquiryCard(MAP_OVERVIEW_INSIGHT);
                        }
                    }}
                >

                {/* Satellite imagery background (if available) */}
                {satelliteMode && (
                    <image
                        href={satelliteImagePath}
                        x="0"
                        y="0"
                        width={VIEWBOX.width}
                        height={VIEWBOX.height}
                        preserveAspectRatio="xMidYMid slice"
                        style={{ pointerEvents: 'none' }}
                    />
                )}

                {/* 🌊 Sea Pattern */}
                <pattern id="seaPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 0 10 Q 5 5 10 10 T 20 10" fill="none" stroke={variantTheme.seaWave} strokeOpacity="0.45" strokeWidth="1" />
                </pattern>
                <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="url(#seaPattern)" />

                {/* 🗺️ Egypt Borders (Drawn) */}
                {/* Mainland fill */}
                <motion.path
                    d={egyptOutline.mainlandD}
                    fill={variantTheme.landFill}
                    stroke="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7 }}
                />

                {/* Mainland border (soft shadow) */}
                <motion.path
                    d={egyptOutline.mainlandD}
                    fill="none"
                    stroke={variantTheme.landBorderSoft}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.18"
                    initial={{ pathLength: 0, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ pathLength: { duration: 2.6, ease: "easeInOut", delay: 0.05 } }}
                />

                {/* Mainland border */}
                <motion.path
                    d={egyptOutline.mainlandD}
                    fill="none"
                    stroke={variantTheme.landBorderMain}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ pathLength: { duration: 2.6, ease: "easeInOut", delay: 0.1 } }}
                />

                {/* Sinai fill */}
                <motion.path
                    d={egyptOutline.sinaiD}
                    fill={variantTheme.landFill}
                    stroke="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.05 }}
                />

                {/* Sinai border (soft shadow) */}
                <motion.path
                    d={egyptOutline.sinaiD}
                    fill="none"
                    stroke={variantTheme.landBorderSoft}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.18"
                    initial={{ pathLength: 0, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ pathLength: { duration: 2.4, ease: "easeInOut", delay: 0.1 } }}
                />

                {/* Sinai border */}
                <motion.path
                    d={egyptOutline.sinaiD}
                    fill="none"
                    stroke={variantTheme.landBorderMain}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ pathLength: { duration: 2.4, ease: "easeInOut", delay: 0.15 } }}
                />

                {/* Suez Canal (hint line) */}
                <motion.path
                    d={egyptOutline.canalD}
                    fill="none"
                    stroke={variantTheme.canal}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.55"
                    strokeDasharray="10 10"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 1.1, duration: 1.8, ease: "easeOut" }}
                />

                {/* 💙 The Nile River - Animated Flow */}
                <motion.path
                    d="M 250 380 Q 260 280 240 200 Q 245 150 250 120 L 220 50 M 250 120 L 280 50"
                    fill="none"
                    stroke={variantTheme.nile}
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { pathLength: 0 },
                        visible: { pathLength: 1, transition: { delay: 1, duration: 2, ease: "easeOut" } }
                    }}
                />

                {/* 🌿 Nile Valley Greenery - Fades in */}
                <motion.path
                    d="
                    M 250 380
                    Q 260 280 240 200
                    Q 245 150 250 120
                    L 220 50
                    L 280 50
                    L 250 120
                    "
                    fill="none"
                    stroke={variantTheme.valley}
                    strokeWidth="16"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 2.5, duration: 1 }}
                />

                {/* Child-friendly geography labels. Opt-in so lesson maps keep their current layout. */}
                {detailLevel !== 'none' && (
                    <motion.g
                        className={`kid-map-geography kid-map-geography-${detailLevel}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.65, duration: 0.45 }}
                        pointerEvents="none"
                        aria-hidden="true"
                    >
                        {KID_GEOGRAPHY_LABELS.basic.map((label) => (
                            <g
                                key={label.id}
                                className={`kid-map-label kid-map-label-${label.tone}`}
                                transform={`translate(${label.x} ${label.y}) rotate(${label.rotate || 0})`}
                            >
                                <rect x={-label.width / 2} y="-13" width={label.width} height="26" rx="13" />
                                <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" direction="rtl">
                                    {label.label}
                                </text>
                            </g>
                        ))}

                        <AnimatePresence>
                            {detailLevel === 'expanded' && detailStyle !== 'pictures' && (
                                <motion.g
                                    className="kid-map-expanded-labels"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.28 }}
                                >
                                    {KID_GEOGRAPHY_LABELS.expanded.map((label) => (
                                        <g
                                            key={label.id}
                                            className={`kid-map-label kid-map-label-${label.tone}`}
                                            transform={`translate(${label.x} ${label.y}) rotate(${label.rotate || 0})`}
                                        >
                                            <rect x={-label.width / 2} y="-13" width={label.width} height="26" rx="13" />
                                            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" direction="rtl">
                                                {label.label}
                                            </text>
                                        </g>
                                    ))}

                                    <g className="kid-map-compass" transform="translate(43 333)">
                                        <circle r="28" />
                                        <path d="M 0 -19 L 7 3 L 0 -1 L -7 3 Z" />
                                        <text x="0" y="14" textAnchor="middle">شمال</text>
                                    </g>
                                </motion.g>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {detailLevel === 'expanded' && detailStyle !== 'labels' && (
                                <motion.g
                                    className="kid-map-visual-details"
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ transformOrigin: '250px 200px' }}
                                >
                                    {KID_VISUAL_DETAILS.map((item) => (
                                        <g
                                            key={item.id}
                                            className="kid-map-visual-item"
                                            transform={`translate(${item.x} ${item.y})`}
                                        >
                                            <circle cx="0" cy="-2" r="16" />
                                            <text className="kid-map-visual-emoji" x="0" y="-1" textAnchor="middle" dominantBaseline="middle">{item.emoji}</text>
                                            <text className="kid-map-visual-caption" x="0" y="23" textAnchor="middle" direction="rtl">{item.label}</text>
                                        </g>
                                    ))}
                                </motion.g>
                            )}
                        </AnimatePresence>
                    </motion.g>
                )}

                {/*  TOPOGRAPHY & INFRASTRUCTURE (New Layer)  */}
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: kidSimpleMode ? 0 : 1 }} transition={{ delay: kidSimpleMode ? 0 : 3.2 }} pointerEvents={kidSimpleMode ? 'none' : 'auto'}>

                    {/* ⛰️ Mountains: Red Sea Range */}
                    <path
                        d="M 350 200 L 360 180 L 370 210 L 380 190 L 390 220"
                        fill="none"
                        stroke="#8D6E63"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="cursor-pointer hover:stroke-amber-700"
                        onClick={(event) => handleSceneInquiry('redSeaMountains', event)}
                    />

                    {/* ⛰️ Mountains: Sinai (St. Catherine) */}
                    <path
                        d="M 370 130 L 385 100 L 400 130"
                        fill="#A1887F"
                        stroke="#5D4037"
                        strokeWidth="2"
                        className="cursor-pointer hover:scale-110 transition-transform origin-bottom"
                        onClick={(event) => handleSceneInquiry('saintCatherine', event)}
                    />

                    {/* ⛰️ Mountains: Uwainat (South West) */}
                    <path
                        d="M 110 340 L 125 310 L 140 340"
                        fill="#A1887F"
                        stroke="#5D4037"
                        strokeWidth="2"
                        className="cursor-pointer hover:scale-110 transition-transform origin-bottom"
                        onClick={(event) => handleSceneInquiry('uwainat', event)}
                    />

                    {/* 🏜️ Plateaus: Gilf Kebir */}
                    <path
                        d="M 150 280 Q 170 270 190 280 L 180 300 Q 160 310 140 300 Z"
                        fill="#E0C389"
                        stroke="#D7B165"
                        strokeWidth="2"
                        className="cursor-pointer hover:brightness-110"
                        onClick={(event) => handleSceneInquiry('gilfKebir', event)}
                    />

                    {/* ⬇️ Depressions: Qattara */}
                    <path
                        d="M 160 100 Q 180 120 200 100 Q 180 80 160 100 Z"
                        fill="#E6EE9C"
                        opacity="0.6"
                        stroke="#C0CA33"
                        strokeWidth="1"
                        strokeDasharray="4 2"
                        className="cursor-pointer"
                        onClick={(event) => handleSceneInquiry('qattara', event)}
                    />

                    {/* 🏜️ Western Desert Dunes Pattern */}
                    <g opacity="0.4" stroke="#D7B165" strokeWidth="2" fill="none">
                        <path d="M 120 150 Q 130 140 140 150" />
                        <path d="M 140 170 Q 150 160 160 170" />
                        <path d="M 110 200 Q 120 190 130 200" />
                    </g>


                    {/* 🛣️ Roads: Coastal Road */}
                    <path
                        d="M 100 60 Q 250 50 350 70"
                        fill="none"
                        stroke="#546E7A"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        opacity="0.6"
                    />
                    {/* 🛣️ Roads: Nile Valley Road */}
                    <path
                        d="M 260 120 L 260 350"
                        fill="none"
                        stroke="#546E7A"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        opacity="0.6"
                    />

                </motion.g>

                {/*  DECORATIONS (Animated Appearance - Smaller & Toggleable)  */}
                <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: !kidSimpleMode && showDecorations ? 1 : 0, scale: 1 }} transition={{ delay: kidSimpleMode ? 0 : 3.5, type: 'spring', opacity: { duration: 0.4 } }} pointerEvents={kidSimpleMode ? 'none' : 'auto'}>

                    {/* 🌞 Sun */}
                    <g className="animate-spin-slow origin-center" style={{ transformBox: 'fill-box' }} onClick={(event) => handleSceneInquiry('sun', event)}>
                        <text x="420" y="40" fontSize="28" className="cursor-pointer hover:scale-125 transition-transform">☀️</text>
                    </g>

                    {/* 🐦 Birds */}
                    <g className="animate-cloud" style={{ animationDuration: '20s' }}>
                        <text x="120" y="80" fontSize="14">🕊️</text>
                        <text x="150" y="90" fontSize="11">🕊️</text>
                    </g>

                    {/* 🌴 Palm Trees */}
                    <g className="animate-sway origin-bottom cursor-pointer" onClick={(event) => handleSceneInquiry('palms', event)}>
                        <text x="230" y="160" fontSize="13">🌴</text>
                        <text x="260" y="220" fontSize="11">🌴</text>
                        <text x="240" y="300" fontSize="13">🌴</text>
                        <text x="220" y="80" fontSize="10">🌴</text>
                    </g>

                    {/* 🚤 Boats */}
                    <g className="animate-boat cursor-pointer" onClick={(event) => handleSceneInquiry('nileBoats', event)}>
                        <text x="240" y="240" fontSize="13">🚤</text>
                    </g>
                    <g className="animate-boat" style={{ animationDelay: '3s' }}>
                        <text x="350" y="60" fontSize="11">🚤</text>
                    </g>

                    {/* 🗺️ Landmarks */}
                    <g className="cursor-pointer hover:scale-110 transition-transform" onClick={(event) => handleSceneInquiry('pyramids', event)}>
                        <text x="230" y="130" fontSize="18">🔺</text>
                        <text x="215" y="135" fontSize="14">🏛️</text>
                    </g>

                    <g className="cursor-pointer" onClick={(event) => handleSceneInquiry('zaafaranaWind', event)}>
                        <text x="340" y="180" fontSize="16" className="animate-spin-slow origin-center" style={{ transformBox: 'fill-box' }}>💨</text>
                        <rect x="348" y="190" width="2" height="15" fill="#555" />
                    </g>

                    <g className="cursor-pointer hover:scale-105 transition-transform" onClick={(event) => handleSceneInquiry('highDam', event)}>
                        <rect x="235" y="320" width="30" height="8" fill="#555" rx="2" className="drop-shadow-md" />
                        <text x="240" y="335" fontSize="12" className="animate-pulse">💧</text>
                    </g>

                    <g className="cursor-pointer" onClick={(event) => handleSceneInquiry('deltaIndustry', event)}>
                        <text x="260" y="70" fontSize="13">🏭</text>
                        <circle cx="272" cy="65" r="1" fill="#AAA" className="animate-ping" />
                    </g>

                    <g className="cursor-pointer" onClick={(event) => handleSceneInquiry('sukariMine', event)}>
                        <text x="360" y="320" fontSize="13" className="animate-bounce">⛏️</text>
                        <text x="375" y="320" fontSize="10">💎</text>
                    </g>

                    <g className="cursor-pointer" onClick={(event) => handleSceneInquiry('bahariyaOases', event)}>
                        <text x="160" y="200" fontSize="14">🌴</text>
                    </g>

                    <g className="animate-pulse-soft cursor-pointer" onClick={(event) => handleSceneInquiry('coralReefs', event)}>
                        <text x="380" y="340" fontSize="11">🪸</text>
                        <text x="390" y="360" fontSize="11">🐚</text>
                    </g>

                </motion.g>
            </svg>
                )}

            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                {ambientMovers.map((mover) => (
                    <motion.span
                        key={mover.id}
                        className="absolute select-none drop-shadow-sm"
                        style={{
                            left: mover.left,
                            top: mover.top,
                            fontSize: mover.size
                        }}
                        animate={{
                            x: [0, mover.dx, 0],
                            y: [0, mover.dy, 0],
                            rotate: [0, mover.rotate, 0],
                            opacity: [0.28, 0.72, 0.32]
                        }}
                        transition={{
                            delay: mover.delay,
                            duration: mover.duration,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    >
                        {mover.emoji}
                    </motion.span>
                ))}

                {!kidSimpleMode && AMBIENT_SPARKLE_POINTS.map((spark) => (
                    <motion.span
                        key={spark.id}
                        className="absolute w-1.5 h-1.5 rounded-full bg-white/85"
                        style={{ left: spark.left, top: spark.top }}
                        animate={{ opacity: [0.12, 0.62, 0.12], scale: [0.8, 1.22, 0.8] }}
                        transition={{
                            delay: spark.delay,
                            duration: spark.duration,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />
                ))}
            </div>

            {/* Interactive Markers - Fade In Last */}
            <motion.div
                ref={markerBoundsRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: MAP_REVEAL_DELAY }}
                className={`absolute inset-0 ${markerInsetClass} z-30 pointer-events-none`}
            >
                {resourceMarkerPositions && <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} preserveAspectRatio="none" aria-hidden="true">
                    {displayedLocations.map((loc) => {
                        const base = lngLatToSvg(loc);
                        const placed = resourceMarkerPositions.get(loc.id);
                        if (!placed || Math.hypot(placed.x - base.x / 5, placed.y - base.y / 4) < 1) return null;
                        return <g key={loc.id} opacity=".8"><line x1={base.x} y1={base.y} x2={placed.x * 5} y2={placed.y * 4} stroke="white" strokeWidth="1.2" strokeDasharray="2 2"/><circle cx={base.x} cy={base.y} r="2.3" fill="#fff" stroke="#1769a9" strokeWidth=".8"/></g>;
                    })}
                </svg>}
                <div className="relative w-full h-full pointer-events-auto">
                    <AnimatePresence>
                        {displayedLocations.map((loc, i) => {
                            let { x, y } = getMarkerPercentPosition(loc);
                            
                            // تعديل المواضع لتجنب التداخل - تحسين التنظيم
                            const MIN_DISTANCE = kidSimpleMode ? 3.2 : 4.5; // الحد الأدنى للمسافة بين العلامات (بالنسبة المئوية)
                            const adjustedPositions = displayedLocations.slice(0, i).reduce((acc, prevLoc, prevIdx) => {
                                const prevPos = getMarkerPercentPosition(prevLoc);
                                const dx = x - prevPos.x;
                                const dy = y - prevPos.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance < MIN_DISTANCE && distance > 0) {
                                    // إذا كانت العلامات قريبة جداً، نحركها قليلاً
                                    const angle = Math.atan2(dy, dx);
                                    const pushDistance = (MIN_DISTANCE - distance) / 2;
                                    acc.x += Math.cos(angle) * pushDistance;
                                    acc.y += Math.sin(angle) * pushDistance;
                                }
                                return acc;
                            }, { x, y });
                            
                            x = clamp(adjustedPositions.x, 2, 98);
                            y = clamp(adjustedPositions.y, 2, 98);
                            const decluttered = resourceMarkerPositions?.get(loc.id);
                            if (decluttered) { x = decluttered.x; y = decluttered.y; }

                            const isHovered = hoveredLocation?.id === loc.id;
                            const isSpeaking = speakingLocation === loc.id;
                            const isHighlighted = highlightLocation === loc.id;
                            const isResourceMatch = Array.isArray(emphasizedLocationIds) && emphasizedLocationIds.includes(loc.id);
                            const dimmed = Array.isArray(emphasizedLocationIds) ? !isResourceMatch : highlightLocation && !isHighlighted;
                            const markerGlow = CATEGORY_GLOW[loc.cat] || 'rgba(148, 163, 184, 0.35)';
                            const appearance = markerAppearance?.(loc);
                            const markerSymbol = appearance?.symbol || (kidSimpleMode ? (CATEGORY_MARKER_SYMBOL[loc.cat] || '●') : loc.emoji);
                            const markerAnimation = kidSimpleMode
                                ? { scale: 1, opacity: dimmed ? 0.45 : 1, y: 0 }
                                : { scale: 1, opacity: dimmed ? 0.45 : 1, y: [0, -10, 0] };
                            const markerTransition = kidSimpleMode
                                ? {
                                    delay: i * MAP_MARKER_STAGGER + MAP_REVEAL_DELAY,
                                    type: 'spring',
                                    stiffness: 180,
                                    damping: 18
                                }
                                : {
                                    delay: i * MAP_MARKER_STAGGER + MAP_REVEAL_DELAY,
                                    type: 'spring',
                                    stiffness: 180,
                                    damping: 16,
                                    y: {
                                        duration: 2.8 + (i % 6) * 0.3,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                        delay: MAP_REVEAL_DELAY + i * MAP_MARKER_STAGGER
                                    }
                                };

                            return (
                                <motion.div
                                    key={loc.id}
                                    initial={{ scale: 0, opacity: 0, y: 20 }}
                                    animate={markerAnimation}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={markerTransition}
                                    className={`absolute ${dimmed ? 'resource-marker-dimmed' : ''} ${isResourceMatch ? 'resource-marker-emphasized' : ''}`} data-location-id={loc.id}
                                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                                >
                                    <motion.button
                                        type="button"
                                        onMouseEnter={() => handleLocationHover(loc)}
                                        onMouseLeave={() => setHoveredLocation(null)}
                                        onClick={() => handleMarkerSelect(loc)}
                                        whileHover={kidSimpleMode ? { scale: 1.12, zIndex: 50 } : { scale: 1.25, rotate: [0, -5, 5, 0], zIndex: 50 }}
                                        whileTap={{ scale: 0.9 }}
                                        aria-label={`معلومات عن ${loc.name}`}
                                        className={`map-marker-chip ${renderMarker ? 'atlas-resource-marker' : ''} touch-manipulation relative ${markerButtonPaddingClass} ${kidSimpleMode ? 'min-w-[32px] min-h-[32px] md:min-w-[36px] md:min-h-[36px] lg:min-w-[40px] lg:min-h-[40px]' : 'min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] lg:min-w-[48px] lg:min-h-[48px]'} rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] border-2 md:border-[3px] border-white transition-all ${CATEGORIES.find(c => c.id === loc.cat)?.color || 'bg-slate-400'} ${isSpeaking ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${isHighlighted ? 'ring-2 ring-fuchsia-300 ring-offset-1 ring-offset-white animate-pulse-glow' : ''} ${kidSimpleMode ? 'map-marker-chip-simple' : ''}`}
                                        style={{ backgroundColor: appearance?.color, boxShadow: `0 4px 12px rgba(15,23,42,0.25), 0 0 16px ${markerGlow}, 0 2px 6px rgba(0,0,0,0.1)` }}
                                    >
                                        {renderMarker ? renderMarker(loc) : <span className={`${markerEmojiClass} ${kidSimpleMode ? 'leading-none' : 'animate-bounce-slow'} inline-block filter drop-shadow-lg`}>{markerSymbol}</span>}
                                        {!kidSimpleMode && <div className="absolute inset-0 rounded-full animate-ping opacity-50 bg-inherit" />}
                                        {(isHovered || isHighlighted) && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute -top-4 -right-4 text-2xl"
                                            >
                                                ?
                                            </motion.div>
                                        )}
                                    </motion.button>
                                    {renderMarkerAccessory?.(loc)}
                                    {/* Tooltip Logic (Same as before) */}
                                    <AnimatePresence>
                                        {(isHovered || isHighlighted) && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.9, rotateX: 90 }}
                                                animate={{ opacity: 1, y: -62, scale: 1, rotateX: 0 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                                                className="map-marker-tooltip absolute bottom-full left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-xl shadow-xl border-2 border-indigo-200 z-50 flex flex-col items-center gap-1 pointer-events-none min-w-[120px] max-w-[180px]"
                                            >
                                                <div className="text-center">
                                                    <p className="font-black text-slate-800 text-sm md:text-base leading-snug">{loc.name}</p>
                                                    <div className="flex items-center justify-center gap-1 mt-1">
                                                        <span className="text-[10px] md:text-xs bg-indigo-100 px-2 py-0.5 rounded-full font-black text-indigo-700 border border-indigo-200">{loc.governorate}</span>
                                                    </div>
                                                </div>
                                                {narratorEnabled && (
                                                    <div className="mt-1 flex gap-1 justify-center">
                                                        <span className="animate-bounce delay-75 bg-slate-400 w-1 h-1 rounded-full"></span>
                                                        <span className="animate-bounce delay-100 bg-slate-400 w-1 h-1 rounded-full"></span>
                                                        <span className="animate-bounce delay-150 bg-slate-400 w-1 h-1 rounded-full"></span>
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b-2 border-r-2 border-indigo-200" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredLocations.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-5 py-3 rounded-2xl bg-white/95 border-2 border-white shadow-xl text-sm font-black text-slate-700">
                                لم نجد أي موقع في هذه الفئة!
                            </div>
                        </div>
                    )}

                    {isProgressiveMarkersMode && filteredLocations.length > 0 && displayedLocations.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-5 py-3 rounded-2xl bg-white/95 border-2 border-white shadow-xl text-sm font-black text-slate-700">
                                جاري الكشف عن المواقع...
                            </div>
                        </div>
                    )}

                    {highlightedMarkerPosition && (
                        <motion.div
                            className="absolute pointer-events-none"
                            style={{
                                left: `${highlightedMarkerPosition.x}%`,
                                top: `${highlightedMarkerPosition.y}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                            initial={{ opacity: 0.2, scale: 0.7 }}
                            animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.95, 1.25, 0.95] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <div className="w-20 h-20 rounded-full border-4 border-white/75 shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {clickEffect && (
                            <motion.div
                                key={clickEffect.id}
                                className="absolute pointer-events-none"
                                style={{
                                    left: `${clickEffect.x}%`,
                                    top: `${clickEffect.y}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                initial={{ opacity: 0.8, scale: 0.35 }}
                                animate={{ opacity: 0, scale: 2.2 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.85, ease: 'easeOut' }}
                            >
                                <div
                                    className="w-28 h-28 rounded-full border-4"
                                    style={{
                                        borderColor: clickEffect.color,
                                        boxShadow: `0 0 24px ${clickEffect.color}`
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            </motion.div>

            <AnimatePresence>
                {showInquiryCard && activeInquiry && (
                    <motion.div
                        key={activeInquiry.id}
                        initial={{ opacity: 0, y: 14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                        className="absolute z-40 bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-auto md:w-[320px] lg:w-[340px]"
                    >
                        <div className="map-inquiry-card rounded-3xl border-4 border-white bg-white/95 px-3.5 py-3 shadow-2xl">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{activeInquiry.emoji || '📍'}</span>
                                        <h3 className="font-black text-slate-800 text-base leading-tight">{activeInquiry.title}</h3>
                                    </div>
                                    {activeInquiry.subtitle && (
                                        <p className="mt-1 text-[11px] font-black text-indigo-600">{activeInquiry.subtitle}</p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveInquiry(null)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition font-black"
                                    title="إغلاق"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mt-2 space-y-2 max-h-[34vh] overflow-y-auto pr-1">
                                {(activeInquiry.details || []).map((item, index) => (
                                    <p key={`${activeInquiry.id}-detail-${index}`} className="text-[13px] font-bold text-slate-700 leading-relaxed">
                                         {item}
                                    </p>
                                ))}
                                {activeInquiry.miniMission && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-2">
                                        <p className="text-[11px] font-black text-amber-700">📋 مهمة إضافية</p>
                                        <p className="text-[12px] font-bold text-slate-700 mt-1 leading-relaxed">{activeInquiry.miniMission}</p>
                                    </div>
                                )}
                                {activeInquiry.challengeQuestion && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                                        <p className="text-[11px] font-black text-emerald-700">❓ سؤال التحدي</p>
                                        <p className="text-[12px] font-bold text-slate-700 mt-1 leading-relaxed">{activeInquiry.challengeQuestion}</p>
                                        {activeInquiry.challengeHint && (
                                            <p className="text-[11px] font-bold text-emerald-700 mt-1">💡 {activeInquiry.challengeHint}</p>
                                        )}
                                    </div>
                                )}
                                {!!activeInquiry.facts?.length && (
                                <div className="grid grid-cols-1 gap-2">
                                    {activeInquiry.facts.map((fact, index) => (
                                        <div key={`${activeInquiry.id}-fact-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                                            <p className="text-[11px] font-black text-indigo-600">{fact.label}</p>
                                            <p className="text-[13px] font-bold text-slate-700 leading-relaxed mt-1">{fact.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                                {activeInquiry.rewardMessage && (
                                    <p className="text-[12px] font-black text-fuchsia-700 leading-relaxed">
                                        ? {activeInquiry.rewardMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category Sidebar */}
            {shouldShowCategorySidebar && (
                <div className="magical-map-sidebar absolute right-3 bottom-3 md:bottom-auto md:top-6 md:right-6 flex flex-wrap md:flex-col justify-end gap-2 z-30 max-w-[82vw] md:max-w-none">
                <button
                    onClick={() => updateActiveCategory('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all shadow-lg border-2 ${activeCategory === 'all' ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white scale-105 border-white/60' : 'bg-white/90 text-slate-600 border-white hover:bg-slate-50'}`}
                >
                    🌍 اعرض الكل
                </button>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => updateActiveCategory(cat.id)}
                        className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all shadow-lg border-2 ${activeCategory === cat.id ? `${cat.color} text-white scale-105 border-white/70` : 'bg-white/90 text-slate-600 border-white hover:bg-slate-50'}`}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>
            )}

            {/* Compass - Fade In */}
            {shouldShowCompass && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 4 }} className="magical-map-compass absolute bottom-6 left-6 flex items-center gap-4 z-10 pointer-events-none">
                <div className="w-20 h-20 bg-white/50 backdrop-blur-sm rounded-full border-4 border-slate-400/30 flex items-center justify-center animate-spin-slow shadow-lg">
                    <span className="text-4xl">🧭</span>
                </div>
            </motion.div>
            )}

            {/* Ziko The Guide */}
            <AnimatePresence>
                {shouldShowNarratorGuide && (
                    <motion.div
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        className="magical-map-guide absolute bottom-24 left-6 z-20 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl max-w-[250px] border-l-4 border-purple-500"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-3xl">👋</div>
                            <div className="text-xs font-black text-purple-600">دليل الخريطة</div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">
                            {kidGuideMessage}
                        </p>
                        {activeKidLocation && (
                            <p className="mt-2 text-[11px] font-black text-indigo-700 leading-relaxed">
                                🎯 تركيزك على: {activeKidLocation.emoji} {activeKidLocation.name}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            {shouldShowSignature && (
                <div className="magical-map-signature absolute bottom-6 right-8 text-sm font-black text-slate-800/80 select-none z-10 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-white/60 shadow-sm">
                ✨ اكتشف ثروات مصر مع صديقك العم! 🗺️
            </div>
            )}
        </div>
    );
}



import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { CURRICULUM_DATA } from '../data/curriculumData';
import MediaViewer from '../components/MediaViewer';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'svg'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
const YOUTUBE_HOST_PATTERN = /(?:youtube\.com|youtu\.be)/i;
const VIDEO_FALLBACK_SRC = '/lesson-media/lesson2_nile_delta.webm';
const IMAGE_FALLBACK_SRC = '/lesson-media/egypt_map.svg';
const getPathExtension = (path = '') => {
  const normalized = String(path || '').trim().split('?')[0].split('#')[0];
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return normalized.slice(dotIndex + 1).toLowerCase();
};
const normalizePathForCompare = (path = '') => {
  const raw = String(path || '').replace(/\\/g, '/');
  if (!raw) return '';
  const clean = raw.split('#')[0].split('?')[0];
  try {
    return decodeURIComponent(clean).toLowerCase();
  } catch {
    return clean.toLowerCase();
  }
};
const isImagePath = (path = '') => IMAGE_EXTENSIONS.includes(getPathExtension(path));
const isVideoPath = (path = '') => VIDEO_EXTENSIONS.includes(getPathExtension(path));
const isAudioPath = (path = '') => AUDIO_EXTENSIONS.includes(getPathExtension(path));
const isRemotePath = (path = '') => /^https?:\/\//i.test(String(path || '').trim());
const getYouTubeVideoId = (path = '') => {
  const value = String(path || '').trim();
  if (!value || !YOUTUBE_HOST_PATTERN.test(value)) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host.includes('youtu.be')) {
      const directId = url.pathname.split('/').filter(Boolean)[0];
      return directId || null;
    }

    const searchId = url.searchParams.get('v');
    if (searchId) return searchId;

    const embedMatch = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?#&]+)/i);
    if (embedMatch && embedMatch[1]) return embedMatch[1];
    return null;
  } catch {
    const quickMatch = value.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return quickMatch?.[1] || null;
  }
};
const isYouTubePath = (path = '') => Boolean(getYouTubeVideoId(path));
const getYouTubeThumbnail = (path = '') => {
  const videoId = getYouTubeVideoId(path);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
};
const getMediaDisplayType = (media) => {
  if (!media) return null;
  const explicitType = String(media.type || '').toLowerCase();
  const fileName = getMediaFileName(media.path);
  if (explicitType === 'audio' || isAudioPath(media.path) || fileName.includes('تسجيل صوتى') || fileName.includes('فويس')) return 'audio';
  if (explicitType === 'video' || isVideoPath(media.path) || isYouTubePath(media.path)) return 'video';
  if (explicitType === 'image' || isImagePath(media.path)) return 'image';
  return null;
};

const getMediaFileName = (path = '') => {
  const cleanPath = String(path || '').split('?')[0].split('#')[0].replace(/\\/g, '/');
  const rawName = cleanPath.slice(cleanPath.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(rawName).toLowerCase();
  } catch {
    return rawName.toLowerCase();
  }
};

const MEDIA_TEXT_BY_FILE = {
  'lesson1_gold_mine.webm': {
    title: 'منجم السكري - استخراج الذهب',
    description: 'فيديو قصير من منجم السكري يوضح استخراج الذهب في الصحراء الشرقية.'
  },
  'lesson1_oil_gas.webm': {
    title: 'استخراج الغاز الطبيعي',
    description: 'فيديو يشرح رحلة استخراج الغاز الطبيعي ووصوله للاستخدام اليومي.'
  },
  'lesson1_phosphate.jpg': {
    title: 'فوسفات أبو طرطور - صورة توضيحية',
    description: 'صورة توضح خام الفوسفات المستخدم في صناعة الأسمدة الزراعية.'
  },
  'lesson1_solar_station.webm': {
    title: 'محطة بنبان للطاقة الشمسية',
    description: 'فيديو يوضح ألواح الطاقة الشمسية وكيف تتحول أشعة الشمس إلى كهرباء.'
  },
  'lesson1_wind_farm.webm': {
    title: 'مزرعة رياح لتوليد الكهرباء',
    description: 'لقطات لتوربينات الرياح وهي تولد طاقة نظيفة.'
  },
  'lesson1_sukari.jpg': {
    title: 'منجم السكري - صورة توضيحية',
    description: 'صورة من منطقة منجم السكري، أحد أهم مناجم الذهب في مصر.'
  },
  'موارد المياة فويس.mp3': {
    title: 'موارد المياه في مصر - ملف صوتي',
    description: 'ملف صوتي يشرح مصادر المياه في مصر وأهميتها للحياة والزراعة.'
  },
  'تسجيل صوتى نهر النييل وفرعيه وبحيرة ناصر.mov': {
    title: 'نهر النيل وفرعاه وبحيرة ناصر - ملف صوتي',
    description: 'شرح صوتي عن نهر النيل وفرعيه وبحيرة ناصر ودورها في موارد المياه.'
  },
  'تسجيل صوتى للأمطار الشتوية.mov': {
    title: 'الأمطار الشتوية - ملف صوتي',
    description: 'ملف صوتي يشرح أهمية الأمطار الشتوية كمصدر من مصادر المياه.'
  },
  '2019-637015848439981881-998.jpg': {
    title: 'النحاس بعد التصنيع - صورة توضيحية',
    description: 'صورة توضح لفائف النحاس بعد تجهيزها لاستخدامها في الصناعة.'
  },
  'lesson2_lake_nasser.webm': {
    title: 'بحيرة ناصر والسد العالي',
    description: 'فيديو يوضح بحيرة ناصر ودورها في تخزين مياه النيل وحماية مصر.'
  },
  'lesson2_desalination.webm': {
    title: 'محطة تحلية مياه البحر',
    description: 'فيديو يوضح كيف تتحول مياه البحر المالحة إلى مياه صالحة للاستخدام.'
  },
  'lesson2_nile_delta.webm': {
    title: 'دلتا النيل وموارد المياه',
    description: 'فيديو قصير يوضح أهمية دلتا النيل ومناطق المياه والزراعة.'
  },
  'صورة للمياه.jfif': {
    title: 'المياه العذبة والمياه المالحة',
    description: 'صورة تساعد الطفل يفرق بين مصادر المياه العذبة والمياه المالحة.'
  },
  'a0eea397-80b9-462e-9b8a-1d443f848550.jfif': {
    title: 'خريطة موارد المياه في مصر',
    description: 'خريطة توضح توزيع موارد المياه وأماكنها على الخريطة.'
  },
  '1645433828_550_644005_2-1536x1087.jpg': {
    title: 'العاصمة الإدارية الجديدة - مدينة المستقبل',
    description: 'صورة توضح ملامح العاصمة الإدارية كمشروع عمراني حديث.',
    path: '/lesson-media/lesson3_new_capital.jpg'
  },
  'clipart-cartoon-robot-256x256-1cd8.png': {
    title: 'وزارة البيئة في العاصمة الإدارية',
    description: 'صورة محلية لمبنى حكومي حديث داخل العاصمة الإدارية الجديدة.',
    path: '/lesson-media/lesson3_ministry_env.jpg'
  },
  '1645433996_431_682236_7-1536x1087.jpg': {
    title: 'مشروع توشكى الخير',
    description: 'صورة توضح الزراعة والاستصلاح في مشروع توشكى الخير.',
    path: '/lesson-media/lesson3_toshka.jpg'
  },
  'lesson3_toshka.jpg': {
    title: 'مشروع توشكى الخير',
    description: 'صورة توضح الزراعة والاستصلاح في مشروع توشكى الخير.'
  },
  'lesson3_new_capital.jpg': {
    title: 'العاصمة الإدارية الجديدة',
    description: 'صورة توضح أحد مشروعات المدن الجديدة في مصر.'
  },
  'lesson3_ministry_env.jpg': {
    title: 'وزارة البيئة في العاصمة الإدارية',
    description: 'صورة محلية لمبنى حكومي حديث داخل العاصمة الإدارية الجديدة.'
  },
  'lesson3_new_capital_build.webm': {
    title: 'العاصمة الإدارية الجديدة - فيديو',
    description: 'فيديو قصير يوضح أعمال البناء والتطوير في العاصمة الإدارية.'
  }
};

const getAccurateMediaText = (media = {}, lesson = {}) => {
  const fileName = getMediaFileName(media.path);
  const override = MEDIA_TEXT_BY_FILE[fileName] || {};
  const title = override.title || media.title || `من درس ${lesson.title || 'تعليمي'}`;
  const description = override.description || media.description || `محتوى يوضح: ${title}`;
  const path = override.path || media.path;
  return { title, description, path };
};
const isPresentationPath = (path = '') => {
  const normalized = normalizePathForCompare(path);
  if (!normalized) return false;
  if (normalized.includes('/presentation.pptx')) return true;
  if (normalized.includes('اشكال جيدة لل presentation')) return true;
  return /presentation\/.*1536x1087/i.test(normalized);
};
const isPreviewNoise = (path = '') => isPresentationPath(path);
const hasArabicChars = (text = '') => /[\u0600-\u06FF]/.test(String(text || ''));
const hasLatinChars = (text = '') => /[A-Za-z]/.test(String(text || ''));

const getDisplayTitle = (media, fallback = 'وسيط تعليمي') => {
  if (!media) return fallback;
  let t = media.title;
  if (!t) {
    const path = media.path || '';
    try {
      const last = decodeURIComponent(path.split('/').pop() || '');
      t = last.replace(/\.[^/.]+$/, '');
    } catch {
      t = fallback;
    }
  }
  const noisy = /\d{3,}.*1536x1087/i;
  const numericSlug = /^[0-9._-]+$/;
  if (noisy.test(t) || numericSlug.test(t)) {
    return media.type === 'video' ? 'فيديو تعليمي' : 'صورة تعليمية';
  }
  const cleanedTitle = String(t || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanedTitle) return fallback;
  if (hasLatinChars(cleanedTitle) && !hasArabicChars(cleanedTitle)) return fallback;
  return cleanedTitle;
};

const lessonCardStyle = (color) => ({
  background: `linear-gradient(145deg, ${color}1a 0%, #FFFFFF 65%)`,
  borderColor: `${color}33`
});

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1 }
};

const LESSON_DISPLAY_MODES = [
  {
    id: 'cards',
    label: 'بطاقات مرحة',
    emoji: '',
    hint: 'بطاقات مفصلة تجمع أهداف الدرس ووسائطه في شكل واضح.'
  },
  {
    id: 'timeline',
    label: 'مسار الدروس',
    emoji: '',
    hint: 'مسار متدرج يوضح ترتيب الدروس خطوة خطوة بشكل حيوي.'
  },
  {
    id: 'bubbles',
    label: 'فقاعات التعلم',
    emoji: '',
    hint: 'فقاعات مرحة بأشكال مختلفة تدي تجربة أكثر متعة للأطفال.'
  }
];

const LESSON_SHAPE_PRESETS = [
  {
    cardRadius: '42px 24px 40px 22px',
    bubbleRadius: '52px 34px 48px 32px',
    objectiveIcon: '',
    ribbonClass: 'from-rose-500 to-orange-500',
    keyChipClass: 'bg-rose-50 text-rose-700 border-rose-100',
    mediaCardClass: 'from-white via-[#FFF1F7] to-[#FFE9E6]'
  },
  {
    cardRadius: '26px 46px 26px 44px',
    bubbleRadius: '44px 52px 38px 48px',
    objectiveIcon: '',
    ribbonClass: 'from-sky-500 to-cyan-500',
    keyChipClass: 'bg-sky-50 text-sky-700 border-sky-100',
    mediaCardClass: 'from-white via-[#EFFBFF] to-[#E8F4FF]'
  },
  {
    cardRadius: '34px 34px 20px 50px',
    bubbleRadius: '48px 44px 56px 36px',
    objectiveIcon: '',
    ribbonClass: 'from-violet-500 to-fuchsia-500',
    keyChipClass: 'bg-violet-50 text-violet-700 border-violet-100',
    mediaCardClass: 'from-white via-[#F4F2FF] to-[#FCEEFF]'
  }
];

const LESSON_THEME_MAP = {
  'lesson-1': 'sun',
  'lesson-2': 'sea',
  'lesson-3': 'garden'
};

const LESSON_THEME_STYLES = {
  sun: {
    className: 'lesson-theme-sun',
    cardBackground: 'linear-gradient(150deg, #FFF4D6 0%, #FFE3F1 45%, #FFF9EC 100%)',
    borderColor: '#F7B7C6',
    shadowColor: 'rgba(232, 106, 154, 0.22)',
    insetColor: 'rgba(237, 141, 79, 0.12)',
    blobColor: 'rgba(255, 191, 120, 0.45)',
    ribbonClass: 'from-rose-500 to-orange-500'
  },
  sea: {
    className: 'lesson-theme-sea',
    cardBackground: 'linear-gradient(150deg, #EAF8FF 0%, #E1F3FF 45%, #F2FEFF 100%)',
    borderColor: '#9DD9F8',
    shadowColor: 'rgba(41, 148, 208, 0.22)',
    insetColor: 'rgba(55, 132, 193, 0.12)',
    blobColor: 'rgba(114, 196, 246, 0.42)',
    ribbonClass: 'from-sky-500 to-cyan-500'
  },
  garden: {
    className: 'lesson-theme-garden',
    cardBackground: 'linear-gradient(150deg, #ECFBEA 0%, #E9FFF7 48%, #F6FFF4 100%)',
    borderColor: '#A8E2B3',
    shadowColor: 'rgba(73, 162, 93, 0.22)',
    insetColor: 'rgba(60, 141, 91, 0.12)',
    blobColor: 'rgba(149, 221, 150, 0.42)',
    ribbonClass: 'from-emerald-500 to-lime-500'
  },
  violet: {
    className: 'lesson-theme-violet',
    cardBackground: 'linear-gradient(150deg, #F4EEFF 0%, #FBEFFF 45%, #FFF6FD 100%)',
    borderColor: '#CFB8FF',
    shadowColor: 'rgba(130, 92, 206, 0.22)',
    insetColor: 'rgba(128, 87, 202, 0.12)',
    blobColor: 'rgba(182, 144, 246, 0.4)',
    ribbonClass: 'from-violet-500 to-fuchsia-500'
  }
};

const LESSON_THEME_FALLBACK_ORDER = ['sun', 'sea', 'garden', 'violet'];

const resolveLessonTheme = (lessonId, index) => {
  const mappedKey = LESSON_THEME_MAP[lessonId];
  if (mappedKey && LESSON_THEME_STYLES[mappedKey]) return LESSON_THEME_STYLES[mappedKey];
  const fallbackKey = LESSON_THEME_FALLBACK_ORDER[index % LESSON_THEME_FALLBACK_ORDER.length];
  return LESSON_THEME_STYLES[fallbackKey];
};

const LESSON_MEDIA_FILTERS = [
  { id: 'all', label: 'كل الوسائط' },
  { id: 'image', label: 'صور' },
  { id: 'video', label: 'فيديو' },
  { id: 'audio', label: 'صوت' }
];

const COLLAPSED_MEDIA_LIMIT = 6;

const LESSON_PAGE_DETAIL_BOOST = {
  'lesson-1': {
    objectives: [
      'يربط بين الموارد المعدنية والصناعات الموجودة حوله في الحياة اليومية.',
      'يميز بين مصادر الطاقة النظيفة ومصادر الطاقة التقليدية.'
    ],
    keyPoints: [
      'منجم السكري مثال واضح للثروة المعدنية في الصحراء الشرقية.',
      'محطات الطاقة الشمسية والرياح تساعد في إنتاج كهرباء نظيفة.',
      'الفوسفات يدخل في صناعة الأسمدة ويدعم الزراعة.'
    ],
    vocabulary: [
      { term: 'ثروة معدنية', meaning: 'موارد موجودة في باطن الأرض مثل الذهب والفوسفات.' },
      { term: 'طاقة نظيفة', meaning: 'طاقة لا تلوث البيئة مثل الشمس والرياح.' }
    ],
    practiceQuestions: [
      {
        question: 'لماذا نستخدم الطاقة الشمسية والرياح في مصر؟',
        options: ['لأنها طاقة نظيفة ومتجددة', 'لأنها توقف الصناعة', 'لأنها غير مفيدة', 'لأنها تزيد التلوث'],
        correctIndex: 0,
        hint: 'فكر في الهواء والشمس وتأثيرهما على البيئة.'
      },
      {
        question: 'أي مورد يساعد المزارع في زيادة الإنتاج؟',
        options: ['الفوسفات', 'الرمال فقط', 'الملح فقط', 'لا شيء'],
        correctIndex: 0,
        hint: 'يدخل في صناعة الأسمدة الزراعية.'
      }
    ],
    funFacts: [
      'مصر من الدول الغنية بمصادر الطاقة الشمسية بسبب عدد ساعات السطوع الكبير.',
      'المعادن اللي بنستخرجها بتدخل في صناعات يومية زي الأجهزة والأسلاك.'
    ],
    secrets: [
      { title: 'كنز الصحراء', content: 'الصحراء الشرقية فيها مواقع تعدينية مهمة جدا لمصر.' },
      { title: 'طاقة المستقبل', content: 'كل محطة شمسية جديدة بتقلل الاعتماد على الوقود التقليدي.' }
    ]
  },
  'lesson-2': {
    objectives: [
      'يوضح الفرق بين المياه العذبة والمياه المالحة بطريقة بسيطة.',
      'يفهم أهمية ترشيد استهلاك المياه في البيت والمدرسة.'
    ],
    keyPoints: [
      'نهر النيل المصدر الأساسي للمياه العذبة في مصر.',
      'تحلية مياه البحر تفتح مصادر جديدة للمياه في المدن الساحلية.',
      'ترشيد المياه مسؤولية مشتركة للحفاظ على المستقبل.'
    ],
    vocabulary: [
      { term: 'تحلية', meaning: 'تحويل مياه البحر المالحة إلى مياه صالحة للاستخدام.' },
      { term: 'ترشيد', meaning: 'استخدام الموارد بشكل ذكي بدون إهدار.' }
    ],
    practiceQuestions: [
      {
        question: 'ما فائدة محطات تحلية المياه؟',
        options: ['توفر مصدر جديد للمياه', 'تقلل الزراعة تماما', 'تمنع الأمطار', 'تغلق البحار'],
        correctIndex: 0,
        hint: 'تفيد المدن القريبة من البحر.'
      },
      {
        question: 'أي سلوك يساعد على ترشيد المياه؟',
        options: ['غلق الصنبور بعد الاستخدام', 'ترك الماء مفتوحا', 'هدر مياه الري', 'استخدام زائد بدون داعي'],
        correctIndex: 0,
        hint: 'سلوك بسيط نعمله يوميا في البيت.'
      }
    ],
    funFacts: [
      'مصر بتنشئ محطات جديدة لتحلية المياه لدعم المدن الجديدة والساحلية.',
      'كل قطرة ماء يتم توفيرها تساعد في الزراعة والغذاء.'
    ],
    secrets: [
      { title: 'شريان الحياة', content: 'النيل كان وسيظل أساس الحياة في مصر عبر التاريخ.' },
      { title: 'مياه ذكية', content: 'تكنولوجيا التحلية الحديثة تجعل الاستفادة من مياه البحر أسهل.' }
    ]
  },
  'lesson-3': {
    objectives: [
      'يتعرف على دور الشبكة القومية للطرق في تسهيل النقل والتجارة.',
      'يفهم كيف تدعم المشروعات القومية فرص العمل وتحسين الخدمات.'
    ],
    keyPoints: [
      'مشروعات النقل والطرق تقلل زمن الرحلة بين المحافظات.',
      'المدن الذكية تعتمد على التكنولوجيا لإدارة الخدمات بكفاءة.',
      'التوسع الزراعي في توشكى والدلتا الجديدة يدعم الأمن الغذائي.'
    ],
    vocabulary: [
      { term: 'مدينة ذكية', meaning: 'مدينة تستخدم التكنولوجيا لإدارة المرور والطاقة والخدمات.' },
      { term: 'أمن غذائي', meaning: 'توافر الغذاء بشكل كافٍ وآمن لكل المواطنين.' }
    ],
    practiceQuestions: [
      {
        question: 'ما الهدف الأساسي من إنشاء مدن جديدة في مصر؟',
        options: ['تقليل فرص العمل', 'تقليل التكدس وتوفير خدمات أفضل', 'إلغاء النقل', 'إغلاق المناطق القديمة'],
        correctIndex: 1,
        hint: 'المدن الجديدة تساعد في توزيع السكان والخدمات.'
      },
      {
        question: 'كيف تؤثر مشروعات الطاقة الجديدة على حياة الناس؟',
        options: ['تزيد انقطاع الكهرباء', 'توفر طاقة أكثر للمنازل والمصانع', 'تمنع التطور', 'تقلل التعليم'],
        correctIndex: 1,
        hint: 'الطاقة أساس تشغيل البيوت والمدارس والمصانع.'
      }
    ],
    funFacts: [
      'شبكة الطرق الجديدة في مصر خلت التنقل بين محافظات كتير أسرع بفرق واضح.',
      'المشروعات الزراعية الجديدة بتستخدم تقنيات ري حديثة لتوفير المياه.'
    ],
    secrets: [
      { title: 'المدن الذكية', content: 'المدن الجديدة فيها أنظمة رقمية لمتابعة المرافق والخدمات لحظيًا.' },
      { title: 'طرق ومحاور', content: 'المحاور الجديدة بتربط مناطق كانت بعيدة وتساعد الحركة التجارية.' }
    ]
  }
};

const LESSON_PAGE_MEDIA_BOOST = {
  'lesson-1': [],
  'lesson-2': [],
  'lesson-3': [
    {
      title: 'العاصمة الإدارية الجديدة - تصوير جوي',
      type: 'video',
      path: '/lesson-media/lesson3_new_capital_build.webm',
      description: 'يوضح مراحل التطوير والبناء في العاصمة الإدارية الجديدة.'
    },
    {
      title: 'القاهرة والقاهرة الجديدة - مقطع تعليمي',
      type: 'video',
      path: '/lesson-media/lesson3_cairo_newcairo.webm',
      description: 'مقارنة بصرية بين القاهرة التقليدية ومناطق التوسع الحديثة.'
    },
    {
      title: 'المشروعات القومية - نظرة بصرية',
      type: 'video',
      path: '/videos/egypt_new_capital.webm',
      description: 'دعم مرئي إضافي لموضوع التوسع العمراني والمشروعات القومية.'
    },
    {
      title: 'مشروع طاقة الرياح - جبل الزيت',
      type: 'video',
      path: '/videos/wind_farm_video.webm',
      description: 'يوضح كيف تسهم طاقة الرياح في إنتاج كهرباء نظيفة.'
    },
    {
      title: 'محطة الطاقة الشمسية - عرض ثلاثي الأبعاد',
      type: 'video',
      path: '/videos/solar_power_station_3d.webm',
      description: 'يشرح فكرة محطات الطاقة الشمسية ضمن مشروعات التنمية.'
    },
    {
      title: 'العاصمة الإدارية الجديدة - صورة',
      type: 'image',
      path: '/lesson-media/lesson3_new_capital.jpg',
      description: 'صورة توضح معالم بارزة من العاصمة الإدارية الجديدة.'
    },
    {
      title: 'مجلس النواب - العاصمة الجديدة',
      type: 'image',
      path: '/lesson-media/lesson3_house_rep.jpg',
      description: 'صورة لمبنى مؤسسي مهم داخل العاصمة الجديدة.'
    },
    {
      title: 'وزارة البيئة - العاصمة الجديدة',
      type: 'image',
      path: '/lesson-media/lesson3_ministry_env.jpg',
      description: 'صورة داعمة لموضوع انتقال المؤسسات الحكومية للمناطق الحديثة.'
    },
    {
      title: 'مشروع توشكى - صورة',
      type: 'image',
      path: '/lesson-media/lesson3_toshka.jpg',
      description: 'صورة من مشروع توشكى ضمن مشروعات التنمية القومية.'
    },
    {
      title: 'خريطة مصر - سياق المشروعات',
      type: 'image',
      path: '/lesson-media/egypt_map.svg',
      description: 'خريطة تساعد الطلاب على ربط المشروعات القومية بمواقعها.'
    }
  ]
};

const LESSON_SEARCH_LINKS = [
  {
    title: 'معالم مصر',
    url: 'https://www.youtube.com/results?search_query=%D9%85%D8%B9%D8%A7%D9%84%D9%85+%D9%85%D8%B5%D8%B1'
  },
  {
    title: 'معالم مصر للأطفال',
    url: 'https://www.youtube.com/results?search_query=%D9%85%D8%B9%D8%A7%D9%84%D9%85+%D9%85%D8%B5%D8%B1+%D9%84%D9%84%D8%A3%D8%B7%D9%81%D8%A7%D9%84'
  },
  {
    title: 'معالم مصر السياحية',
    url: 'https://www.youtube.com/results?search_query=Egypt+tourism+landmarks'
  },
  {
    title: 'جولة افتراضية في مصر',
    url: 'https://www.youtube.com/results?search_query=Egypt+virtual+tour'
  },
  {
    title: 'شرح الأهرامات',
    url: 'https://www.youtube.com/results?search_query=%D8%A7%D9%84%D8%A3%D9%87%D8%B1%D8%A7%D9%85%D8%A7%D8%AA+%D8%B4%D8%B1%D8%AD'
  },
  {
    title: 'جولة الأقصر في مصر',
    url: 'https://www.youtube.com/results?search_query=Luxor+Egypt+tour'
  },
  {
    title: 'تحدث مع الخريطة',
    url: 'https://talk-with-map.vercel.app/'
  }
];

const CURRICULUM_SCOPE = {
  gradeLabel: CURRICULUM_DATA.grade?.label || 'الصف الخامس الابتدائي',
  termLabel: CURRICULUM_DATA.term?.label || 'الفصل الدراسي الأول',
  unitNumber: CURRICULUM_DATA.unit?.number || 1,
  unitTitle: CURRICULUM_DATA.unit?.title || 'الوحدة التعليمية'
};

const stripExtension = (filename = '') => filename.replace(/\.[^/.]+$/, '');

const cleanFileBaseName = (filename = '') =>
  stripExtension(filename)
    .replace(/-\d{2,4}x\d{2,4}/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const looksLikeHashOrSlug = (text = '') => {
  const t = (text || '').trim();
  if (!t) return true;
  if (/^[0-9\s._-]+$/.test(t)) return true;
  if (/^[0-9a-f]{16,}$/i.test(t)) return true;
  if (/[0-9]/.test(t) && /[a-z]/i.test(t) && t.length > 20) return true;
  return false;
};

const getResourceSectionLabel = (ancestors = []) => {
  const joined = (ancestors || []).join(' ');
  if (/الدرس\s*الثان|الثانى|الثاني/.test(joined)) return 'الدرس الثاني';
  if (/الدرسالاول|الدرس\s*(الأول|الاول|لاول)/.test(joined)) return 'الدرس الأول';
  if (/الخلفيات/.test(joined)) return 'خلفيات';
  if (/الروبوتات|الشات/.test(joined)) return 'روبوتات';
  if (/presentation/i.test(joined)) return 'عناصر العرض';
  return '';
};

const getFriendlyResourceTitle = (node, ancestors = []) => {
  const ext = (node.extension || '').toLowerCase();
  const base = cleanFileBaseName(node.name || '');
  const lastFolder = ancestors[ancestors.length - 1] || '';
  const section = getResourceSectionLabel(ancestors);

  if (ext === 'pptx' && /presentation/i.test(node.name || '')) return 'العرض التقديمي';

  if (section === 'خلفيات') {
    if (/trips/i.test(base) && /aswan/i.test(base)) return 'مشهد سياحي في أسوان';
    if (/water/i.test(base) && /nile/i.test(base)) return 'نهر النيل في مصر';
  }

  if (section === 'روبوتات') {
    const lower = base.toLowerCase();
    if (/artificial|ai/.test(lower)) return 'أيقونات الذكاء الاصطناعي';
    if (/industrial/.test(lower)) return 'روبوت صناعي';
    if (/friendly|waving/.test(lower)) return 'روبوت ودود (يلوح)';
    if (/cartoon|clipart/.test(lower)) return 'روبوت كرتوني';
    if (/robot/.test(lower)) return 'شكل روبوت';
  }

  if (/النحاس|copper|cooper/i.test(base)) return 'النحاس';
  if (/dolche|Fischschwanz/i.test(base)) return 'أداة أثرية (سلاح قديم)';

  if (section === 'عناصر العرض' && looksLikeHashOrSlug(base)) {
    const name = node.name || '';
    const m = name.match(/(?:_|-)(\d+)(?:-\d{2,4}x\d{2,4})?\.[^.]+$/);
    if (m) return `قالب شرائح (${m[1]})`;
    return 'قالب شرائح';
  }
  if (lastFolder.includes('درس الكتاب') && /^\d+$/.test(base)) return `صفحة ${base} من الكتاب المدرسي`;
  if (/^\d+$/.test(base)) {
    if (base.length <= 3) return `صورة رقم ${base}`;
    return section ? `صورة داعمة - ${section}` : 'صورة داعمة';
  }
  if (looksLikeHashOrSlug(base) || /^hq\d+$/i.test(base) || /^(image|unnamed)$/i.test(base)) {
    return section ? `صورة داعمة - ${section}` : 'صورة داعمة';
  }

  return base || (node.name || 'وسيط تعليمي');
};

const buildResourceDetailPoints = (node, ancestors = []) => {
  const ext = (node.extension || '').toLowerCase();
  const isVideo = VIDEO_EXTENSIONS.includes(ext);
  const contentWord = isVideo ? 'فيديو تعليمي' : 'صورة تعليمية';
  const base = cleanFileBaseName(node.name || '');
  const section = getResourceSectionLabel(ancestors);
  const lastFolder = ancestors[ancestors.length - 1] || '';
  const points = [];

  const fallbackTopic = section === 'الدرس الأول'
    ? 'الموارد الطبيعية (معادن وطاقة)'
    : section === 'الدرس الثاني'
      ? 'المياه والزراعة والطاقة'
      : section === 'خلفيات'
        ? 'الدرس'
        : section === 'روبوتات'
          ? 'الذكاء الاصطناعي والروبوتات'
          : section === 'عناصر العرض'
            ? 'العروض التقديمية'
            : 'الفكرة';

  if (section === 'الدرس الثاني') {
    if (/المياه\s*المالحة/.test(base)) {
      points.push('توضح مفهوم المياه المالحة وأين توجد (البحار والمحيطات).');
      points.push('قارن بينها وبين المياه العذبة من حيث الاستخدام في الشرب والزراعة.');
      points.push('سؤال سريع: لماذا نحتاج لتحلية المياه في بعض المناطق؟');
    } else if (/الأراض/i.test(base) && /الزراع/i.test(base)) {
      points.push('تُظهر الأراضي الزراعية وكيف ترتبط بمصادر المياه والري.');
      points.push('اربطها بنهر النيل ودوره في زيادة الإنتاج الزراعي في مصر.');
      points.push('نشاط: حدّد عناصر نجاح الزراعة (ماء، تربة، مناخ).');
    } else if (/مصادر\s*الطاقة/.test(base)) {
      points.push('تلخص مصادر الطاقة (متجددة وغير متجددة) مع أمثلة بسيطة.');
      points.push('توضح كيف نستخدم الطاقة في الحياة اليومية والصناعة.');
      points.push('سؤال: اذكر مصدر طاقة متجدد ومصدر غير متجدد.');
    } else if (/تلويث\s*الماء|تلوث\s*الماء|أسباب\s*تلوث\s*الماء/.test(base)) {
      points.push('محتوى توعوي عن تلوث المياه وأهم مظاهره.');
      points.push('تُذكّر بأسبابه وآثاره على الإنسان والكائنات الحية.');
      points.push('مهمة: اقترح 3 طرق لحماية المياه من التلوث.');
    } else if (lastFolder.includes('درس الكتاب') && /^\d+$/.test(base)) {
      points.push('صفحة من الكتاب المدرسي تعرض جزءًا من شرح الدرس.');
      points.push('استخدمها للمراجعة السريعة قبل حل النشاط.');
      points.push('اطلب من الطلاب استخراج الكلمات المفتاحية من الصفحة.');
    }
  }

  if (section === 'الدرس الأول') {
    if (/التعدين/.test(base)) {
      points.push('توضح أعمال التعدين واستخراج المعادن من الصخور.');
      points.push('اربط الصورة بثروات مصر المعدنية وأهميتها للاقتصاد.');
      points.push('سؤال: ما فوائد التعدين؟ وكيف نقلل أضراره؟');
    } else if (/منجم/.test(base) && /السكرى|السكري/.test(base)) {
      points.push(`${isVideo ? 'فيديو' : 'صورة'} عن منجم ذهب السكري كمثال على الثروة المعدنية في مصر.`);
      points.push('توضح دور المناجم في دعم الاقتصاد وتوفير فرص عمل.');
      points.push('نشاط: اذكر خطوات استخراج معدن (بشكل مبسط).');
    } else if (/حقل/.test(base) && /الغاز/.test(base)) {
      points.push('توضح حقل غاز طبيعي كمصدر مهم للطاقة.');
      points.push('اربطها بتوليد الكهرباء وتشغيل المصانع واحتياجات المنازل.');
      points.push('سؤال: لماذا يُعد الغاز أنظف من بعض أنواع الوقود؟');
    } else if (/ظهر/.test(base) && /الغاز/.test(base)) {
      points.push('حقل ظهر مثال لأكبر اكتشافات الغاز في مصر.');
      points.push('يوضح أثر الاكتشافات على الطاقة والاقتصاد.');
      points.push('سؤال: كيف تؤثر موارد الطاقة على التنمية؟');
    } else if (/النحاس|copper|cooper/i.test(base)) {
      points.push('توضح معدن النحاس واستخداماته القديمة والحديثة.');
      points.push('اربطه بالصناعات (أسلاك كهرباء، أدوات) وبالحضارة المصرية.');
      points.push('نشاط: اذكر استخدامين للنحاس في حياتك اليومية.');
    } else if (/dolche|Fischschwanz/i.test(base)) {
      points.push('أداة/سلاح أثري يوضح تطور استخدام المعادن عبر العصور.');
      points.push('اربطه بفكرة: كيف غيّرت المعادن حياة الإنسان؟');
      points.push('سؤال: ما الفائدة من دراسة الآثار لفهم التاريخ؟');
    }
  }

  if (section === 'خلفيات') {
    if (/aswan/i.test(base) || /أسوان/.test(base)) {
      points.push('خلفية بصرية لمشهد من أسوان تساعد على جذب الانتباه.');
      points.push('استخدمها لفتح نقاش: ماذا تعرف عن أسوان ومعالمها؟');
      points.push('نشاط سريع: اذكر 3 أشياء تميز جنوب مصر.');
    } else if (/nile/i.test(base) || /النيل/.test(base)) {
      points.push('خلفية توضح نهر النيل وأهميته لمصر.');
      points.push('اربطها بالمياه والزراعة والنقل عبر التاريخ.');
      points.push('سؤال: لماذا يُسمى النيل شريان الحياة؟');
    } else {
      points.push('خلفية بصرية تجهّز الطالب لأجواء الدرس وتشد الانتباه.');
      points.push('اطلب من الطلاب وصف الخلفية ثم ربطها بعنوان الدرس.');
      points.push('نشاط: اكتب 3 كلمات تصف المشهد.');
    }
  }

  if (section === 'روبوتات') {
    points.push('أيقونة/شخصية روبوت تُستخدم في الشرح والتفاعل داخل المنصة.');
    points.push('مناسبة لشرح فكرة الذكاء الاصطناعي وكيف يساعدنا في التعلم.');
    points.push('سؤال: اذكر مثالًا لاستخدام الروبوتات في الحياة اليومية.');
  }

  if (section === 'عناصر العرض') {
    if (/الطاقة\s*الكهرومائية/.test(base)) {
      points.push('توضح مفهوم الطاقة الكهرومائية (السدود والمياه الجارية).');
      points.push('اربطها بسد أسوان وتوليد الكهرباء من حركة المياه.');
      points.push('سؤال: ما ميزة الطاقة المتجددة مقارنة بغير المتجددة؟');
    } else {
      points.push('قالب/شكل جاهز للشرائح يساعد على تنظيم العنوان والنقاط.');
      points.push('استخدمه لعرض: فكرة  مثال  سؤال سريع للطلاب.');
      points.push('نصيحة: اجعل النص قصيرًا واستخدم صورة توضيحية.');
    }
  }

  if (points.length === 0) {
    points.push(`${contentWord} داعمة تساعد على فهم ${fallbackTopic} بشكل بصري.`);
    points.push('استخدمها لشرح الفكرة بسرعة: وصف  ملاحظة  استنتاج.');
    points.push('سؤال للطلاب: ما الفكرة الأساسية التي يعبر عنها هذا المحتوى؟');
  }

  return points.slice(0, 3);
};

const isLessonMediaCandidate = (media) => {
  if (!media) return false;
  if (isRemotePath(media.path)) return false;
  const explicitType = String(media.type || '').toLowerCase();
  if (explicitType === 'image') return isImagePath(media.path);
  if (explicitType === 'video') return isVideoPath(media.path);
  if (explicitType === 'audio') return isAudioPath(media.path) || getMediaFileName(media.path).includes('تسجيل صوتى') || getMediaFileName(media.path).includes('فويس');
  return isImagePath(media.path) || isVideoPath(media.path);
};

const isTrustedLocalMediaPath = (path = '') => {
  const normalized = normalizePathForCompare(path);
  return normalized.startsWith('/lesson-media/') || normalized.startsWith('/videos/');
};

const toArabicNumber = (value) => Number(value || 0).toLocaleString('ar-EG');
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const estimateLessonMinutes = (lesson = {}, mediaCount = 0) => {
  const objectivesCount = ensureArray(lesson.objectives).length;
  const keyPointsCount = ensureArray(lesson.keyPoints).length;
  const vocabularyCount = ensureArray(lesson.vocabulary).length;
  const questionsCount = ensureArray(lesson.practiceQuestions).length;
  const rawEstimate = (objectivesCount * 2) + keyPointsCount + Math.ceil(vocabularyCount / 2) + (questionsCount * 2) + Math.ceil(mediaCount / 2);
  return Math.max(8, Math.min(35, rawEstimate));
};

const lessonNumberFromMeta = (lesson = {}) => {
  const byOrder = Number(lesson.order);
  if (Number.isFinite(byOrder) && byOrder > 0) return byOrder;
  const match = String(lesson.id || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const matchesLessonFolder = (lesson, folderNameOrPath = '') => {
  const target = normalizePathForCompare(folderNameOrPath);
  const lessonNumber = lessonNumberFromMeta(lesson);
  if (lessonNumber === 1) return /الدرسالاول|الدرس\s*الاول|الدرس\s*الأول/i.test(target);
  if (lessonNumber === 2) return /الدرس\s*الثان|الثانى|الثاني/i.test(target);
  if (!lessonNumber) return false;
  return new RegExp(`lesson\\s*0*${lessonNumber}`, 'i').test(target);
};

const collectMediaFromResourceNode = (entry, ancestors = []) => {
  if (!entry) return [];

  if (entry.type === 'directory') {
    if (isPresentationPath(entry.path || entry.name || '')) return [];
    const nextAncestors = [...ancestors, entry.name];
    return (entry.children || []).flatMap((child) => collectMediaFromResourceNode(child, nextAncestors));
  }

  const ext = (entry.extension || getPathExtension(entry.path)).toLowerCase();
  const isImageFile = IMAGE_EXTENSIONS.includes(ext);
  const isVideoFile = VIDEO_EXTENSIONS.includes(ext);
  if (!isImageFile && !isVideoFile) return [];
  if (isPreviewNoise(entry.path)) return [];

  return [{
    title: getFriendlyResourceTitle(entry, ancestors),
    type: isVideoFile ? 'video' : 'image',
    path: entry.path,
    description: entry.description?.trim() || buildResourceDetailPoints(entry, ancestors).join('  ')
  }];
};

const PUBLIC_STATIC_MEDIA_PATHS = [
  '/lesson-media/lesson1_gold_mine.webm',
  '/lesson-media/lesson1_oil_gas.webm',
  '/lesson-media/lesson1_solar_station.webm',
  '/lesson-media/lesson1_wind_farm.webm',
  '/lesson-media/lesson1_sukari.jpg',
  '/lesson-media/lesson1_phosphate.jpg',
  '/lesson-media/lesson2_desalination.webm',
  '/lesson-media/lesson2_nile_delta.webm',
  '/lesson-media/lesson2_lake_nasser.webm',
  '/lesson-media/lesson2_aswan.jpg',
  '/lesson-media/lesson3_new_capital_build.webm',
  '/lesson-media/lesson3_cairo_newcairo.webm',
  '/lesson-media/lesson3_new_capital.jpg',
  '/lesson-media/lesson3_house_rep.jpg',
  '/lesson-media/lesson3_ministry_env.jpg',
  '/lesson-media/lesson3_toshka.jpg',
  '/lesson-media/egypt_map.svg',
  '/videos/wind_farm_video.webm',
  '/videos/solar_power_station_3d.webm',
  '/videos/nile_delta_day_night.webm',
  '/videos/gold_mine_timeline.webm',
  '/videos/egypt_new_capital.webm'
];

const resolveLessonIdForPublicPath = (path = '') => {
  const normalized = normalizePathForCompare(path);
  if (!normalized || isPresentationPath(normalized)) return null;
  if (normalized.includes('egypt_map.svg')) return 'all';

  if (/lesson[\s_-]*1|lesson1|gold|sukari|oil|gas|phosphate|wind_farm|solar_station/.test(normalized)) {
    return 'lesson-1';
  }
  if (/lesson[\s_-]*2|lesson2|nile|delta|aswan|lake_nasser|desalination/.test(normalized)) {
    return 'lesson-2';
  }
  if (/lesson[\s_-]*3|lesson3|new_capital|newcairo|toshka|house_rep|ministry_env|egypt_new_capital/.test(normalized)) {
    return 'lesson-3';
  }
  return null;
};

const buildStaticPublicMediaPool = () => (
  PUBLIC_STATIC_MEDIA_PATHS
    .map((path) => {
      if (isPreviewNoise(path)) return null;
      const displayType = isVideoPath(path) ? 'video' : isImagePath(path) ? 'image' : null;
      if (!displayType) return null;
      const fallbackTitle = displayType === 'video' ? 'فيديو من المجلد العام' : 'صورة من المجلد العام';
      return {
        title: getDisplayTitle({ path, type: displayType }, fallbackTitle),
        type: displayType,
        path,
        description: displayType === 'video'
          ? 'فيديو داعم إضافي من المجلد العام.'
          : 'صورة داعمة إضافية من المجلد العام.'
      };
    })
    .filter(Boolean)
);

export default function LessonsPage() {
  const navigate = useNavigate();
  const { completedLessons } = useGameStore();
  const { speak, enabled: voiceEnabled } = useVoiceNarration();
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedLessonFilter, setSelectedLessonFilter] = useState('all');
  const [lessonDisplayMode, setLessonDisplayMode] = useState('cards');
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [expandedLessonIds, setExpandedLessonIds] = useState({});
  const [expandedMediaByLesson, setExpandedMediaByLesson] = useState({});
  const [mediaFilterByLesson, setMediaFilterByLesson] = useState({});

  const allLessons = CURRICULUM_DATA.lessons || [];
  const lessonOptions = useMemo(
    () => ([
      { id: 'all', label: 'كل الدروس', emoji: '' },
      ...allLessons.map((lesson) => ({
        id: lesson.id,
        label: lesson.title,
        emoji: lesson.icon || '',
        color: lesson.color,
        order: lesson.order
      }))
    ]),
    [allLessons]
  );
  const filteredLessons = useMemo(
    () => (
      selectedLessonFilter === 'all'
        ? allLessons
        : allLessons.filter((lesson) => lesson.id === selectedLessonFilter)
    ),
    [allLessons, selectedLessonFilter]
  );
  const selectedLessonMeta = useMemo(
    () => allLessons.find((lesson) => lesson.id === selectedLessonFilter) || null,
    [allLessons, selectedLessonFilter]
  );
  const selectedDisplayModeMeta = useMemo(
    () => LESSON_DISPLAY_MODES.find((mode) => mode.id === lessonDisplayMode) || LESSON_DISPLAY_MODES[0],
    [lessonDisplayMode]
  );
  const visibleFunFacts = useMemo(
    () => filteredLessons.flatMap((lesson) => {
      const boost = LESSON_PAGE_DETAIL_BOOST[lesson.id] || {};
      return [...ensureArray(lesson.funFacts), ...ensureArray(boost.funFacts)];
    }),
    [filteredLessons]
  );
  const lessonMediaById = useMemo(() => {
    const staticPublicMedia = buildStaticPublicMediaPool();

    return new Map(
      allLessons.map((lesson) => {
        const existingLessonMedia = ensureArray(lesson.media);
        const boostedMedia = ensureArray(LESSON_PAGE_MEDIA_BOOST[lesson.id]);
        const publicMediaForLesson = staticPublicMedia.filter((media) => (
          resolveLessonIdForPublicPath(media.path) === lesson.id
        ));

        const mergedMedia = [...existingLessonMedia, ...boostedMedia, ...publicMediaForLesson];
        const baseMedia = mergedMedia
          .filter((media) => isLessonMediaCandidate(media))
          .filter((media) => isTrustedLocalMediaPath(getAccurateMediaText(media, lesson).path))
          .map((media) => {
            const accurateText = getAccurateMediaText(media, lesson);
            const isVideoMedia = String(media.type || '').toLowerCase() === 'video'
              || isVideoPath(accurateText.path);
            const isAudioMedia = String(media.type || '').toLowerCase() === 'audio'
              || isAudioPath(accurateText.path);

            return {
              ...media,
              path: accurateText.path,
              title: accurateText.title,
              description: accurateText.description,
              type: isAudioMedia ? 'audio' : isVideoMedia ? 'video' : 'image'
            };
          });

        const dedupedBaseMedia = [];
        const localMediaSeen = new Set();
        baseMedia.forEach((media) => {
          const key = normalizePathForCompare(media.path) || `${media.type}-${media.title || ''}`;
          if (!key || localMediaSeen.has(key)) return;
          localMediaSeen.add(key);
          dedupedBaseMedia.push(media);
        });

        return [lesson.id, dedupedBaseMedia];
      })
    );
  }, [allLessons]);

  useEffect(() => {
    if (selectedLessonFilter === 'all') return;
    setExpandedLessonIds((prev) => (prev[selectedLessonFilter]
      ? prev
      : { ...prev, [selectedLessonFilter]: true }));
    setExpandedMediaByLesson((prev) => (prev[selectedLessonFilter]
      ? prev
      : { ...prev, [selectedLessonFilter]: true }));
  }, [selectedLessonFilter]);

  const overviewMetrics = useMemo(() => {
    const totals = filteredLessons.reduce((acc, lesson) => {
      const boost = LESSON_PAGE_DETAIL_BOOST[lesson.id] || {};
      const objectives = [...ensureArray(lesson.objectives), ...ensureArray(boost.objectives)];
      const keyPoints = [...ensureArray(lesson.keyPoints), ...ensureArray(boost.keyPoints)];
      const vocabulary = [...ensureArray(lesson.vocabulary), ...ensureArray(boost.vocabulary)];
      const practiceQuestions = [...ensureArray(lesson.practiceQuestions), ...ensureArray(boost.practiceQuestions)];
      const mediaItems = lessonMediaById.get(lesson.id) || [];
      acc.media += mediaItems.length;
      acc.objectives += objectives.length;
      acc.vocabulary += vocabulary.length;
      acc.questions += practiceQuestions.length;
      acc.minutes += estimateLessonMinutes({ objectives, keyPoints, vocabulary, practiceQuestions }, mediaItems.length);
      if (completedLessons.includes(lesson.id)) acc.completed += 1;
      return acc;
    }, {
      media: 0,
      objectives: 0,
      vocabulary: 0,
      questions: 0,
      minutes: 0,
      completed: 0
    });

    const completionPercent = filteredLessons.length
      ? Math.round((totals.completed / filteredLessons.length) * 100)
      : 0;

    return {
      ...totals,
      completionPercent
    };
  }, [completedLessons, filteredLessons, lessonMediaById]);

  const toggleLessonDetails = (lessonId) => {
    setExpandedLessonIds((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  const toggleLessonMedia = (lessonId) => {
    setExpandedMediaByLesson((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  const setLessonMediaFilter = (lessonId, filterId) => {
    setMediaFilterByLesson((prev) => ({ ...prev, [lessonId]: filterId }));
  };

  const openLessonMedia = (mediaItem, fallbackTitle = 'وسيط تعليمي', fallbackDescription = '') => {
    if (!mediaItem) return;

    if (isYouTubePath(mediaItem.path)) {
      window.open(mediaItem.path, '_blank', 'noopener,noreferrer');
      return;
    }

    const mediaType = getMediaDisplayType(mediaItem) || 'image';
    setSelectedMedia({
      title: fallbackTitle || mediaItem.title,
      type: mediaType,
      path: mediaItem.path,
      description: fallbackDescription || mediaItem.description
    });
  };

  return (
    <div data-tts-root className="kid-learning-hub lessons-theme-root min-h-screen p-4 md:p-8 relative overflow-hidden" style={{backgroundImage: 'linear-gradient(45deg, #98FB98 0%, #FFE4B5 18%, #87CEEB 36%, #DDA0DD 54%, #FF69B4 72%, #FFD700 90%, #FF7F50 100%)'}}>
      <div className="lessons-page-shell max-w-5xl mx-auto relative z-10 px-2 sm:px-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lessons-hero-board relative overflow-hidden bg-gradient-to-br from-[#FFF5D7] via-[#FFE4F2] to-[#DFF1FF] rounded-3xl p-6 mb-6 shadow-2xl text-center border border-white/70 gradient-border interactive-card hover-lift"
        >
          <div className="absolute -top-16 -left-16 w-40 h-40 bg-pink-200/40 rounded-full blur-3xl animate-float-kids" />
          <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-sky-200/40 rounded-full blur-3xl animate-spin-kids" />
          <h1 className="text-4xl font-black mb-2 animate-slide-up"> الدروس التعليمية</h1>
          <p className="text-lg md:text-xl text-gray-600">الوحدة {CURRICULUM_SCOPE.unitNumber}: {CURRICULUM_SCOPE.unitTitle}</p>
          <p className="mt-3 text-sm md:text-base text-slate-600 font-semibold">
            هنا هتلاقي ملخص واضح لكل درس، مع أهدافه وأهم النقاط والصور والفيديوهات الداعمة علشان الفهم يكون أسرع وأسهل.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
              الصف: {CURRICULUM_SCOPE.gradeLabel}
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
              الفصل: {CURRICULUM_SCOPE.termLabel}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black">
              الدروس الظاهرة: {filteredLessons.length} / {allLessons.length}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lessons-study-board mb-10 bg-gradient-to-br from-[#FFF9E7] via-[#FFE9F4] to-[#F2FBFF] backdrop-blur-md rounded-[32px] p-6 md:p-8 border-2 border-white shadow-lg text-right"
        >
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3">خطة مذاكرة سريعة</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-700 font-bold">
            <motion.div whileHover={{ y: -4 }} className="lessons-study-step bg-gradient-to-br from-white to-[#FFE6F5] rounded-2xl p-4 border border-pink-100 shadow-sm">
              <h4 className="font-black text-slate-800 mb-1">شاهد الوسائط</h4>
              <p>ابدأ بالصور والفيديوهات علشان تفهم الفكرة بسرعة.</p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="lessons-study-step bg-gradient-to-br from-white to-[#E6F4FF] rounded-2xl p-4 border border-sky-100 shadow-sm">
              <h4 className="font-black text-slate-800 mb-1">راجع النقاط</h4>
              <p>اقرأ أهم النقاط والمصطلحات قبل الاختبار.</p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="lessons-study-step bg-gradient-to-br from-white to-[#FFF2D9] rounded-2xl p-4 border border-amber-100 shadow-sm">
              <h4 className="font-black text-slate-800 mb-1">اختبر نفسك</h4>
              <p>حل أسئلة سريعة واحصل على نقاط إضافية.</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lessons-kids-guide mb-8 rounded-[28px] border-2 border-white bg-white/85 p-4 md:p-5 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-black text-slate-800">ابدأ بسهولة في 3 خطوات</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedLessonFilter('all');
                  setLessonDisplayMode('cards');
                }}
                className="px-3 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition kid-button"
              >
                عرض الكل
              </button>
              <button
                type="button"
                onClick={() => setLessonDisplayMode('timeline')}
                className="px-3 py-2 rounded-2xl bg-white text-slate-700 border border-slate-200 text-xs font-black hover:bg-slate-50 transition kid-button"
              >
                مسار الدروس
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 px-3 py-2.5">
              <p className="text-xs font-black text-rose-700">1) اختر الدرس</p>
              <p className="mt-1 text-[12px] font-bold text-slate-600">اضغط على بطاقة الدرس المناسبة لك.</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 px-3 py-2.5">
              <p className="text-xs font-black text-sky-700">2) شاهد الوسائط</p>
              <p className="mt-1 text-[12px] font-bold text-slate-600">افتح الصور والفيديوهات لفهم الفكرة بسرعة.</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 px-3 py-2.5">
              <p className="text-xs font-black text-amber-700">3) اختبر نفسك</p>
              <p className="mt-1 text-[12px] font-bold text-slate-600">جرّب سؤال سريع قبل دخول صفحة الدرس.</p>
            </div>
          </div>
        </motion.div>

        {/* زر المشروعات القومية في المنتصف */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowAllLessons(!showAllLessons);
              if (voiceEnabled) {
                speak(showAllLessons ? 'تم إغلاق قائمة الدروس' : 'تم فتح قائمة جميع الدروس', {
                  channel: 'ui-action',
                  profile: 'child'
                });
              }
            }}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-xl border-2 border-white hover:shadow-2xl transition-all kid-button"
          >
            <span className="text-xl font-black">المشروعات القومية</span>
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-2xl">
              ❓
            </div>
          </motion.button>
        </motion.div>

        {/* عرض كل الدروس عند الفتح */}
        <AnimatePresence>
          {showAllLessons && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-10 bg-white/90 backdrop-blur-md rounded-[32px] p-6 border-2 border-green-200 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-slate-800">جميع الدروس</h3>
                <button
                  type="button"
                  onClick={() => setShowAllLessons(false)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black transition kid-button"
                >
                  ✕
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {allLessons.map((lesson) => (
                  <motion.button
                    key={lesson.id}
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(`/lesson/${lesson.id}`);
                      setShowAllLessons(false);
                      if (voiceEnabled) {
                        speak(`فتحت ${lesson.title}`, { channel: 'ui-action', profile: 'child' });
                      }
                    }}
                    className="text-right rounded-2xl p-4 bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-green-300 shadow-md hover:shadow-lg transition-all kid-button"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-3xl">{lesson.icon}</span>
                      <span className="text-xs font-black text-slate-500">الدرس {toArabicNumber(lesson.order || 1)}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-1">{lesson.title}</h4>
                    <p className="text-sm font-bold text-slate-600 line-clamp-2">{lesson.summary}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lessons-filter-board mb-10 bg-white/85 backdrop-blur-md rounded-[32px] p-6 border-2 border-white shadow-lg text-right"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-800">تقسيمة الدروس</h2>
              <p className="text-sm font-bold text-slate-600 mt-1">
                فلترة واضحة حسب الوحدة والدرس داخل الصف الخامس - الفصل الدراسي الأول.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
              {selectedLessonMeta ? `الدرس الحالي: ${selectedLessonMeta.title}` : 'عرض كل الدروس'}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {lessonOptions.map((lessonOption) => {
              const selected = selectedLessonFilter === lessonOption.id;
              const hasThemeColor = lessonOption.id !== 'all' && lessonOption.color;
              return (
                <button
                  key={lessonOption.id}
                  type="button"
                  onClick={() => setSelectedLessonFilter(lessonOption.id)}
                  className={`lessons-filter-pill px-4 py-2 rounded-full border text-sm font-black transition kid-button ${selected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {hasThemeColor && (
                      <span
                        className="inline-flex w-2.5 h-2.5 rounded-full border border-white/80 shadow-sm"
                        style={{ backgroundColor: lessonOption.color }}
                      />
                    )}
                    <span>{lessonOption.emoji}</span>
                    <span>
                      {lessonOption.order ? `درس ${toArabicNumber(lessonOption.order)}: ` : ''}
                      {lessonOption.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-black text-slate-500 mb-2">شكل عرض الدروس</p>
            <div className="flex flex-wrap gap-2">
              {LESSON_DISPLAY_MODES.map((mode) => {
                const selected = lessonDisplayMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setLessonDisplayMode(mode.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black border transition kid-button ${selected
                      ? 'bg-gradient-to-r from-slate-900 to-indigo-700 text-white border-slate-900 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {mode.emoji} {mode.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2 inline-flex items-center gap-2">
              <span>{selectedDisplayModeMeta.emoji}</span>
              <span>{selectedDisplayModeMeta.hint}</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-10 rounded-[28px] border-2 border-white bg-white/90 p-5 shadow-lg text-right"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-black text-slate-800">روابط تعليمية جاهزة للدروس</h3>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
              {toArabicNumber(LESSON_SEARCH_LINKS.length)} روابط
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-600">
            افتح أي رابط من دول وهتلاقي فيديوهات وأدوات تفاعلية تساعدك تراجع نفس موضوعات الدروس.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {LESSON_SEARCH_LINKS.map((searchItem) => (
              <a
                key={searchItem.url}
                href={searchItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm md:text-base font-black text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition shadow-md active:scale-95"
              >
                🔗 {searchItem.title}
              </a>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lessons-summary-board mb-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3"
        >
          <div className="rounded-2xl border-2 border-white bg-gradient-to-br from-amber-300 to-amber-400 p-3 md:p-4 text-center shadow-lg hover-lift animate-bounce-scale">
            <p className="text-xs md:text-sm font-black text-amber-950">دروس</p>
            <p className="text-2xl md:text-3xl font-black text-amber-950 mt-2">{toArabicNumber(filteredLessons.length)}</p>
          </div>
          <div className="rounded-2xl border-2 border-white bg-gradient-to-br from-cyan-300 to-cyan-400 p-3 md:p-4 text-center shadow-lg hover-lift animate-pulse-kids">
            <p className="text-xs md:text-sm font-black text-cyan-950">وسائط</p>
            <p className="text-2xl md:text-3xl font-black text-cyan-950 mt-2">{toArabicNumber(overviewMetrics.media)}</p>
          </div>
          <div className="rounded-2xl border-2 border-white bg-gradient-to-br from-purple-300 to-purple-400 p-3 md:p-4 text-center shadow-lg hover-lift animate-float-kids">
            <p className="text-xs md:text-sm font-black text-purple-950">مصطلحات</p>
            <p className="text-2xl md:text-3xl font-black text-purple-950 mt-2">{toArabicNumber(overviewMetrics.vocabulary)}</p>
          </div>
          <div className="rounded-2xl border-2 border-white bg-gradient-to-br from-pink-300 to-pink-400 p-3 md:p-4 text-center shadow-lg hover-lift animate-wiggle-kids">
            <p className="text-xs md:text-sm font-black text-pink-950">أسئلة</p>
            <p className="text-2xl md:text-3xl font-black text-pink-950 mt-2">{toArabicNumber(overviewMetrics.questions)}</p>
          </div>
          <div className="rounded-2xl border-2 border-white bg-gradient-to-br from-green-300 to-green-400 p-3 md:p-4 text-center shadow-lg hover-lift col-span-2 md:col-span-1 animate-bounce-rotate">
            <p className="text-xs md:text-sm font-black text-green-950">التقدم</p>
            <p className="text-2xl md:text-3xl font-black text-green-950 mt-2">{toArabicNumber(overviewMetrics.completionPercent)}%</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lessons-facts-board mb-12 bg-gradient-to-br from-[#F7FBFF] via-[#EEF2FF] to-white/85 backdrop-blur-md rounded-[40px] p-8 border-2 border-white shadow-xl overflow-hidden relative"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-200/30 rounded-full blur-3xl" />
          <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="p-2 bg-yellow-100 rounded-xl"></span>
            حقائق سريعة مذهلة!
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {visibleFunFacts.length === 0 ? (
              <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-600">
                لا توجد حقائق إضافية لهذا الدرس حالياً.
              </div>
            ) : (
              visibleFunFacts.map((fact, i) => (
                <motion.div
                  key={`${selectedLessonFilter}-fact-${i}`}
                  whileHover={{ y: -5 }}
                  className="lessons-fact-card sm:min-w-[280px] min-w-0 bg-gradient-to-br from-indigo-50 to-white p-6 rounded-[30px] border-2 border-indigo-100 shadow-sm flex flex-col justify-between interactive-card"
                >
                  <p className="text-slate-700 font-bold leading-relaxed mb-4">
                    {fact}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-black">كنوز مصر</span>
                    <span className="text-2xl"></span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={`lessons-track-board ${lessonDisplayMode === 'bubbles' ? 'grid grid-cols-1 xl:grid-cols-2 gap-5' : 'space-y-5'} ${lessonDisplayMode === 'timeline' ? 'relative md:pr-8' : ''}`}
        >
          {lessonDisplayMode === 'timeline' && (
            <div className="lessons-timeline-spine hidden md:block absolute right-3 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-pink-300 via-sky-300 to-emerald-300" />
          )}

          {filteredLessons.map((lesson, index) => {
            const visual = LESSON_SHAPE_PRESETS[index % LESSON_SHAPE_PRESETS.length];
            const lessonTheme = resolveLessonTheme(lesson.id, index);
            const isAlternate = index % 2 === 1;
            const isTimeline = lessonDisplayMode === 'timeline';
            const isBubbles = lessonDisplayMode === 'bubbles';
            const lessonOrder = Number(lesson.order) > 0 ? Number(lesson.order) : (index + 1);
            const lessonOrdinalWord = ({
              1: 'الأول',
              2: 'الثاني',
              3: 'الثالث',
              4: 'الرابع',
              5: 'الخامس',
              6: 'السادس'
            })[lessonOrder];
            const lessonPosterTitle = lessonOrdinalWord
              ? `الدرس ${lessonOrdinalWord}`
              : `الدرس رقم ${toArabicNumber(lessonOrder)}`;
            const bubbleOffsetClass = isBubbles
              ? (isAlternate ? 'md:translate-y-3 md:-rotate-1' : 'md:-translate-y-2 md:rotate-1')
              : '';

            const cardStyle = {
              ...lessonCardStyle(lesson.color),
              borderRadius: isBubbles ? visual.bubbleRadius : visual.cardRadius,
              background: lessonTheme.cardBackground,
              borderColor: lessonTheme.borderColor,
              boxShadow: `0 24px 54px ${lessonTheme.shadowColor}, inset 0 -8px 0 ${lessonTheme.insetColor}`
            };
            const lessonMediaItems = lessonMediaById.get(lesson.id) || [];
            const detailBoost = LESSON_PAGE_DETAIL_BOOST[lesson.id] || {};
            const objectives = [...ensureArray(lesson.objectives), ...ensureArray(detailBoost.objectives)];
            const keyPoints = [...ensureArray(lesson.keyPoints), ...ensureArray(detailBoost.keyPoints)];
            const vocabulary = [...ensureArray(lesson.vocabulary), ...ensureArray(detailBoost.vocabulary)];
            const practiceQuestions = [...ensureArray(lesson.practiceQuestions), ...ensureArray(detailBoost.practiceQuestions)];
            const secrets = [...ensureArray(lesson.secrets), ...ensureArray(detailBoost.secrets)];
            const lessonMinutes = estimateLessonMinutes({ objectives, keyPoints, vocabulary, practiceQuestions }, lessonMediaItems.length);
            const isExpanded = Boolean(expandedLessonIds[lesson.id]);
            const isMediaExpanded = Boolean(expandedMediaByLesson[lesson.id] || isExpanded);
            const activeMediaFilter = mediaFilterByLesson[lesson.id] || 'all';
            const imageMediaCount = lessonMediaItems.filter((media) => getMediaDisplayType(media) === 'image').length;
            const videoMediaCount = lessonMediaItems.filter((media) => getMediaDisplayType(media) === 'video').length;
            const audioMediaCount = lessonMediaItems.filter((media) => getMediaDisplayType(media) === 'audio').length;
            const filteredMediaItems = lessonMediaItems.filter((media) => {
              const mediaType = getMediaDisplayType(media);
              if (!mediaType || isPreviewNoise(media.path)) return false;
              if (activeMediaFilter === 'all') return true;
              return mediaType === activeMediaFilter;
            });
            const collapsedMediaLimit = activeMediaFilter === 'all' ? COLLAPSED_MEDIA_LIMIT : 4;
            const visibleMediaItems = isMediaExpanded
              ? filteredMediaItems
              : filteredMediaItems.slice(0, collapsedMediaLimit);
            const hiddenMediaCount = Math.max(0, filteredMediaItems.length - visibleMediaItems.length);
            const firstMediaItem = filteredMediaItems[0] || lessonMediaItems[0] || null;
            const firstMediaText = firstMediaItem ? getAccurateMediaText(firstMediaItem, lesson) : null;

            return (
              <motion.div
                key={lesson.id}
                variants={itemVariants}
                whileHover={isBubbles ? { y: -10, scale: 1.02, rotate: 0 } : { y: -8, scale: 1.01 }}
                whileTap={isBubbles ? { scale: 0.98, rotate: 0 } : { scale: 0.99 }}
                className={`lessons-lesson-card lessons-themed-card ${lessonTheme.className} group p-6 shadow-2xl hover:shadow-3xl transition-all cursor-pointer interactive-card relative overflow-hidden ${isTimeline ? `md:max-w-[88%] ${isAlternate ? 'md:mr-auto' : 'md:ml-auto'}` : ''} ${bubbleOffsetClass}`}
                style={cardStyle}
                onClick={() => navigate(`/lesson/${lesson.id}`)}
              >
                {isTimeline && (
                  <span className={`hidden md:flex absolute top-8 ${isAlternate ? '-right-10' : '-left-10'} w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-xs font-black text-slate-700 items-center justify-center shadow`}>
                    {index + 1}
                  </span>
                )}

                <div
                  className="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-2xl opacity-80"
                  style={{ background: lessonTheme.blobColor }}
                />
                <div className={`lessons-lesson-ribbon absolute top-4 ${isAlternate ? 'left-4' : 'right-4'} px-3 py-1 rounded-full text-white text-xs font-black bg-gradient-to-r ${lessonTheme.ribbonClass || visual.ribbonClass}`}>
                  {lessonPosterTitle}
                </div>

                <div className={`flex flex-col ${isAlternate ? 'md:flex-row-reverse' : 'md:flex-row'} gap-5`}>
                  <div
                    className="lessons-lesson-icon text-6xl animate-bounce-slow shrink-0"
                    style={{ color: lesson.color }}
                  >
                    {lesson.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`lessons-poster-banner ${lessonTheme.className} mb-3`}>
                      <h3 className="lessons-poster-title lessons-poster-main-highlight text-lg md:text-2xl">{lessonPosterTitle}</h3>
                      <p className="lessons-poster-subtitle text-sm md:text-base">{lesson.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="lessons-lesson-id-chip text-xs md:text-sm">
                        الدرس {toArabicNumber(lessonOrder)}
                      </span>
                      <h2 className="lessons-lesson-title text-lg md:text-2xl font-black">{lesson.title}</h2>
                      {completedLessons.includes(lesson.id) && (
                        <span className="text-2xl"></span>
                      )}
                    </div>
                    {(lesson.summary || lesson.description) && (
                      <p className="text-sm text-slate-700 font-bold mb-2 leading-relaxed">
                        {lesson.summary || lesson.description}
                      </p>
                    )}
                    {(lesson.details || lesson.realLife) && (
                      <div className="lessons-intro-panel mb-3 rounded-2xl border border-white/80 bg-white/85 p-3">
                        <p className="text-sm text-slate-600">
                          {lesson.details || lesson.realLife}
                        </p>
                      </div>
                    )}
                    <div className="lessons-metrics-row flex flex-wrap gap-2 text-xs font-black text-slate-700 mb-3">
                      <span className="lessons-metric-chip metric-media interactive-chip">وسائط: {toArabicNumber(lessonMediaItems.length)}</span>
                      <span className="lessons-metric-chip metric-objectives interactive-chip">أهداف: {toArabicNumber(objectives.length)}</span>
                      <span className="lessons-metric-chip metric-points interactive-chip">نقاط: {toArabicNumber(keyPoints.length)}</span>
                      <span className="lessons-metric-chip metric-vocab interactive-chip">مصطلحات: {toArabicNumber(vocabulary.length)}</span>
                      <span className="lessons-metric-chip metric-practice interactive-chip">تدريب: {toArabicNumber(practiceQuestions.length)}</span>
                      <span className="lessons-metric-chip metric-time interactive-chip">مدة متوقعة: {toArabicNumber(lessonMinutes)} دقيقة</span>
                      <span className="lessons-metric-chip metric-secrets interactive-chip">أسرار: {toArabicNumber(secrets.length)}</span>
                    </div>
                    <div className="lessons-card-separator mb-3" />
                    {objectives.length > 0 && (
                      <div className="lessons-section-card lessons-objectives-panel space-y-1">
                        <p className="lessons-section-title">أهداف الدرس</p>
                        {objectives.slice(0, isExpanded ? 6 : 3).map((obj, i) => (
                          <p key={i} className="text-sm text-gray-600">{visual.objectiveIcon} {obj}</p>
                        ))}
                      </div>
                    )}
                    {keyPoints.length > 0 && (
                      <div className="lessons-section-card lessons-keypoints-panel mt-3">
                        <p className="lessons-section-title">أهم النقاط</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                        {keyPoints.slice(0, isExpanded ? 6 : 3).map((point, i) => (
                          <span key={i} className={`px-3 py-1 rounded-full text-xs font-black border ${visual.keyChipClass}`}>
                            {point}
                          </span>
                        ))}
                        </div>
                      </div>
                    )}
                    {vocabulary.length > 0 && (
                      <div className="lessons-section-card lessons-vocab-panel mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3">
                        <p className="text-xs font-black text-cyan-800 mb-2">مصطلحات الدرس</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {vocabulary.slice(0, isExpanded ? 6 : 3).map((item, i) => (
                            <div key={`${lesson.id}-vocab-${i}`} className="rounded-xl border border-cyan-100 bg-white/95 p-2.5">
                              <p className="text-xs font-black text-slate-800">{item.term}</p>
                              <p className="text-[11px] font-bold text-slate-600 mt-1 leading-relaxed">{item.meaning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {practiceQuestions.length > 0 && (
                      <div className="lessons-section-card lessons-practice-panel mt-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 sm:p-4">
                        <p className="text-xs sm:text-sm font-black text-amber-800 mb-2">تدريب سريع من الدرس</p>
                        <div className="space-y-2 sm:space-y-3">
                          {practiceQuestions.slice(0, isExpanded ? 2 : 1).map((item, i) => (
                            <article key={`${lesson.id}-practice-${i}`} className="rounded-xl border border-amber-100 bg-white/95 p-2.5 sm:p-3">
                              <p className="text-xs sm:text-sm font-black text-slate-800 leading-relaxed">{item.question}</p>
                              {item.hint && (
                                <p className="mt-1.5 text-xs font-bold text-slate-600">تلميح: {item.hint}</p>
                              )}
                              <p className="mt-1.5 text-xs font-black text-amber-700">عدد الاختيارات: {toArabicNumber(ensureArray(item.options).length)}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                    {secrets.length > 0 && (
                      <div className="lessons-section-card lessons-secrets-panel mt-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3 sm:p-4">
                        <p className="text-xs sm:text-sm font-black text-violet-800 mb-2">أسرار ومعلومات إضافية</p>
                        <div className="space-y-2 sm:space-y-3">
                          {secrets.slice(0, isExpanded ? 3 : 1).map((secret, i) => (
                            <article key={`${lesson.id}-secret-${i}`} className="rounded-xl border border-violet-100 bg-white/95 p-2.5 sm:p-3">
                              <p className="text-xs sm:text-sm font-black text-slate-800">{secret.title}</p>
                              <p className="mt-1.5 text-xs font-bold text-slate-600 leading-relaxed">{secret.content}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleLessonDetails(lesson.id);
                        }}
                        className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-black hover:bg-slate-50 transition kid-button min-h-[2.5rem]"
                      >
                        {isExpanded ? 'عرض أقل' : 'عرض تفاصيل أكثر'}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/lesson/${lesson.id}`);
                        }}
                        className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border border-indigo-100 bg-indigo-600 text-white text-xs sm:text-sm font-black hover:bg-indigo-700 transition kid-button min-h-[2.5rem]"
                      >
                        ابدأ الدرس
                      </button>
                    </div>
                    {lessonMediaItems.length > 0 && (
                      <>
                        <div className={`lessons-media-toolbar ${lessonTheme.className} mt-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-white/80 bg-white/90 p-2.5 sm:p-3`}>
                          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
                            <p className="text-xs sm:text-sm font-black text-slate-700">
                              الوسائط المتاحة: {toArabicNumber(filteredMediaItems.length)} / {toArabicNumber(lessonMediaItems.length)}
                            </p>
                            <span className="lessons-media-count-pill text-xs sm:text-sm font-black text-sky-700">
                              صور: {toArabicNumber(imageMediaCount)}
                            </span>
                            <span className="lessons-media-count-pill text-xs sm:text-sm font-black text-violet-700">
                              فيديو: {toArabicNumber(videoMediaCount)}
                            </span>
                            <span className="lessons-media-count-pill text-xs sm:text-sm font-black text-emerald-700">
                              صوت: {toArabicNumber(audioMediaCount)}
                            </span>
                          </div>
                          <div className="lessons-media-filter-row flex flex-wrap gap-2">
                            {LESSON_MEDIA_FILTERS.map((filterOption) => {
                              const filterCount = filterOption.id === 'all'
                                ? lessonMediaItems.length
                                : filterOption.id === 'image'
                                  ? imageMediaCount
                                  : filterOption.id === 'video'
                                    ? videoMediaCount
                                    : audioMediaCount;
                              if (filterOption.id !== 'all' && filterCount === 0) return null;
                              const isFilterActive = activeMediaFilter === filterOption.id;
                              return (
                                <button
                                  key={`${lesson.id}-filter-${filterOption.id}`}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setLessonMediaFilter(lesson.id, filterOption.id);
                                  }}
                                  className={`lessons-media-filter-chip px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-black transition kid-button ${isFilterActive
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                  {filterOption.label} ({toArabicNumber(filterCount)})
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {firstMediaItem && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openLessonMedia(
                                    firstMediaText ? { ...firstMediaItem, path: firstMediaText.path } : firstMediaItem,
                                    firstMediaText?.title,
                                    firstMediaText?.description
                                  );
                                }}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-black hover:bg-emerald-700 transition kid-button min-h-[2.5rem]"
                              >
                                افتح أول وسيلة
                              </button>
                            )}
                            {hiddenMediaCount > 0 && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleLessonMedia(lesson.id);
                                }}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs sm:text-sm font-black hover:bg-slate-50 transition kid-button min-h-[2.5rem]"
                              >
                                {isMediaExpanded ? 'عرض أقل' : `عرض كل (${toArabicNumber(hiddenMediaCount)}+)`}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="lessons-media-grid mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                        {visibleMediaItems.map((media, idx) => {
                          const mediaType = getMediaDisplayType(media);
                          if (!mediaType || isPreviewNoise(media.path)) return null;

                          const displayType = mediaType;
                          const img = mediaType === 'image';
                          const audio = mediaType === 'audio';
                          const isYoutubeMedia = !img && isYouTubePath(media.path);
                          const youtubeThumbnail = isYoutubeMedia ? getYouTubeThumbnail(media.path) : '';
                          const { title: friendlyTitle, description: desc, path: displayPath } = getAccurateMediaText(media, lesson);
                          const displayMedia = { ...media, path: displayPath };
                          const isAutoPlayable = false;
                          const detailParts = desc.split('  ');
                          const visibleDetailParts = detailParts.slice(0, isMediaExpanded ? 4 : 2);

                          return (
                            <motion.div
                              key={`${lesson.id}-media-${normalizePathForCompare(media.path) || idx}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openLessonMedia(displayMedia, friendlyTitle, desc);
                              }}
                              whileHover={{ y: -8, scale: 1.01 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                              className={`lessons-media-card ${img ? 'is-image' : audio ? 'is-audio' : 'is-video'} w-full rounded-3xl border-2 border-white/80 bg-gradient-to-br ${visual.mediaCardClass} p-3 text-right shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] cursor-pointer`}
                            >
                              <div className={`lessons-media-frame relative overflow-hidden rounded-xl bg-slate-100 aspect-video ${img ? 'is-image' : audio ? 'is-audio' : 'is-video'} min-h-[180px] sm:min-h-[200px]`}>
                                {img ? (
                                  <img
                                    src={displayPath}
                                    alt={media.title || lesson.title}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                    loading="lazy"
                                    onError={(event) => {
                                      const image = event.currentTarget;
                                      if (image.dataset.fallbackApplied === 'true') return;
                                      image.dataset.fallbackApplied = 'true';
                                      image.src = IMAGE_FALLBACK_SRC;
                                    }}
                                  />
                                ) : isYoutubeMedia ? (
                                  youtubeThumbnail ? (
                                    <img
                                      src={youtubeThumbnail}
                                      alt={media.title || lesson.title}
                                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-700 font-black text-sm">
                                      YouTube
                                    </div>
                                  )
                                ) : audio ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-sky-50 to-indigo-100 text-slate-800">
                                    <span className="text-4xl" aria-hidden="true"></span>
                                    <span className="text-sm font-black">ملف صوتي</span>
                                  </div>
                                ) : (
                                  <video
                                    className="w-full h-full object-cover"
                                    src={displayPath}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    onError={(event) => {
                                      const player = event.currentTarget;
                                      const currentSrc = player.currentSrc || player.src || '';
                                      if (player.dataset.fallbackApplied === 'true' || currentSrc.includes(VIDEO_FALLBACK_SRC)) return;
                                      player.dataset.fallbackApplied = 'true';
                                      player.src = VIDEO_FALLBACK_SRC;
                                      player.load();
                                    }}
                                  />
                                )}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                  <span className={`lessons-media-type-badge ${img ? 'is-image' : audio ? 'is-audio' : 'is-video'}`}>
                                    {img ? ' صورة' : audio ? ' صوت' : isYoutubeMedia ? ' يوتيوب' : ' فيديو'}
                                  </span>
                                  {isAutoPlayable && (
                                    <span className="lessons-media-autoplay-badge">
                                      تشغيل تلقائي
                                    </span>
                                  )}
                                </div>
                                {!img && !audio && (
                                  <span className="lessons-media-play-indicator" aria-hidden="true">
                                    
                                  </span>
                                )}
                                {img && (
                                  <span className="lessons-media-image-indicator" aria-hidden="true">
                                    
                                  </span>
                                )}
                                <span className="lessons-media-open-hint">
                                  {isYoutubeMedia ? 'افتح على يوتيوب' : audio ? 'استمع للصوت' : 'اضغط للتكبير'}
                                </span>
                              </div>
                              <p className={`lessons-media-title mt-2.5 text-sm md:text-base font-black ${img ? 'is-image' : audio ? 'is-audio' : 'is-video'} leading-tight`}>
                                {friendlyTitle}
                              </p>
                              <motion.ul
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ staggerChildren: 0.05 }}
                                className="lessons-media-details mt-2 text-xs sm:text-sm md:text-base bg-white/95 backdrop-blur-sm text-slate-800 font-black px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border-2 border-white shadow-[0_8px_18px_rgba(0,0,0,0.07)] space-y-1.5"
                              >
                                {visibleDetailParts.map((part, i) => (
                                  <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: 6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-start gap-2 leading-relaxed"
                                  >
                                    <span className="text-pink-600 font-black"></span>
                                    <span>{part}</span>
                                  </motion.li>
                                ))}
                              </motion.ul>
                              {detailParts.length > visibleDetailParts.length && (
                                <p className="mt-2 text-xs sm:text-sm font-black text-slate-500">
                                  اضغط لعرض الوصف الكامل
                                </p>
                              )}
                            </motion.div>
                          );
                        })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {selectedMedia && (
            <MediaViewer
              item={selectedMedia}
              onClose={() => setSelectedMedia(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}





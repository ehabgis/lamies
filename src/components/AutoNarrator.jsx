import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CURRICULUM_DATA, MAP_LOCATIONS } from '../data/curriculumData';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

const PROFILE_LABELS = {
  child: 'صوت راجل',
  male: 'صوت راجل',
  female: 'صوت ست'
};

const BOT_NAME = 'المساعد الراجل';
const BOT_INTRO_MESSAGE = 'هاي يا بطل! أنا المساعد الراجل. اسألني أي حاجة في الدروس أو الخريطة، وأنا هشرح لك ببساطة جدًا.';
const GEMINI_API_KEY = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const ASSISTANT_STORAGE_KEY = 'smart-assistant-floating-position-v1';
const ASSISTANT_MARGIN = 12;
const ASSISTANT_DOCK_OFFSET = 16;
const ASSISTANT_BOTTOM_OFFSET = 120;
const ASSISTANT_DEFAULT_WIDTH = 360;
const ASSISTANT_DEFAULT_HEIGHT = 520;
const AUTO_CHAT_INTERVAL_MS = 15000;
const AUTO_CHAT_MIN_GAP_MS = 9000;

// الأسئلة الجاهزة حسب الدرس
const LESSON_READY_QUESTIONS = {
  'lesson-1': [
    'ما هي أهم معادن مصر؟', 'أين تجد الذهب؟', 'لماذا المعادن مهمة؟', 'الفرق بين الذهب والحديد؟',
    'أين الفوسفات؟', 'استخدام الحديد؟', 'كيف نستخرج المعادن؟', 'أهمية المعادن اقتصادياً؟',
    'أين الملح؟', 'معادن ثمينة أم عادية؟', 'الحفاظ على موارد المعادن؟', 'أكبر منجم ذهب؟',
    'الفوسفات في الزراعة؟', 'مراحل استخراج الحديد؟', 'كل المعادن مفيدة؟', 'الحجر الجيري؟',
    'التعدين والبيئة؟', 'أهمية النحاس؟', 'الذهب في جسمنا؟', 'الفوسفات غير الزراعة؟',
    'محاجر الحجر الرملي؟', 'تمييز المعادن الحقيقية؟', 'الكبريت والفوسفور؟', 'المصريون والمعادن؟',
    'معادن مكتشفة حديثاً؟', 'لماذا الذهب غالي؟', 'نفايات المعادن؟', 'دور التعدين؟',
    'أين الفضة؟', 'عدد المعادن بمصر؟', 'المعدن الخام والمنقى؟', 'ألماس ورمل؟',
    'معادن إفريقيا؟', 'الذهب عبر التاريخ؟', 'المعادن والصحة؟', 'اليورانيوم بمصر؟',
    'تكاليف التعدين؟', 'التلوث من التعدين؟', 'الحفاظ على الطبيعة؟', 'معادن الرملية؟',
    'الحديد والصدأ؟', 'النحاس والكهرباء؟', 'الذهب والمجوهرات؟', 'الملح والصناعة؟',
    'معادن نادرة؟', 'الفوسفات العالمي؟', 'دول تعدين عالمية؟', 'استدامة المعادن؟'
  ],
  'lesson-2': [
    'ما مصادر الطاقة في مصر؟', 'متجددة أم غير متجددة؟', 'الطاقة الشمسية كيف؟', 'دور السد العالي؟',
    'توليد كهرباء من الماء؟', 'كيف نحافظ على الطاقة؟', 'أنواع الطاقة المتجددة؟', 'كيفية عمل الشمس؟',
    'فوائد الطاقة النظيفة؟', 'طاقة الرياح كيف تعمل؟', 'أهمية الطاقة النظيفة؟', 'تأثير النفط والغاز؟',
    'دور مصر في الطاقة؟', 'تقليل الكهرباء بالبيت؟', 'محطات الكهرباء؟', 'استخدام الطاقة بحكمة؟',
    'الطاقة الحرارية والكهربائية؟', 'تحويل الحرارة لكهرباء؟', 'أهم مصادر الطاقة؟', 'موارد الطاقة للمستقبل؟',
    'محطات الكهرومائية؟', 'الطاقة الشمسية والأزمة؟', 'أنواع الوقود الأحفوري؟', 'الطاقة الحرارية الأرضية؟',
    'كفاءة المحطات؟', 'المولد الكهربائي؟', 'استهلاك الطاقة والفاتورة؟', 'طاقة الرياح بالتفصيل؟',
    'البحث عن طاقة جديدة؟', 'طاقة البحر والأمواج؟', 'مستقبل الطاقة النظيفة؟', 'التوازن والتنمية؟',
    'الشمس غير الطاقة؟', 'الميثان والغاز؟', 'محطات الفحم؟', 'الطاقة الذرية؟',
    'خلايا شمسية؟', 'بطاريات تخزين؟', 'شبكة الكهرباء؟', 'الكفاءة الطاقية؟',
    'الطاقة والصناعة؟', 'المصانع والكهرباء؟', 'الطاقة والنقل؟', 'السيارات الكهربائية؟',
    'ثورة الطاقة؟', 'مصر والتطور؟', 'التكنولوجيا والطاقة؟', 'الطاقة والمال؟'
  ],
  'lesson-3': [
    'ما أهمية المياه لمصر؟', 'من أين مياه مصر؟', 'ترشيد المياه معناه؟', 'استخدام المياه بحكمة؟',
    'لماذا النيل مهم جداً؟', 'حفظ المياه من الهدر؟', 'كمية المياه المتاحة؟', 'المياه في الزراعة؟',
    'الفرق عذب ومالح؟', 'معالجة مياه الصرف؟', 'محطات تحلية المياه؟', 'مياه الشرب النظيفة؟',
    'أسباب نقص المياه؟', 'المياه الجوفية؟', 'تلوث مياه النيل؟', 'تعليم الأطفال الترشيد؟',
    'دور الحكومة بالمياه؟', 'الفيضانات والنيل؟', 'أهمية المياه للحيوان؟', 'استثمار موارد المياه؟',
    'دورة المياه الطبيعية؟', 'تشكيل الغيوم والأمطار؟', 'أهمية البحيرات؟', 'تنقية المياه من الأملاح؟',
    'ملوثات المياه الرئيسية؟', 'تأثير الزراعة على المياه؟', 'دور الأشجار بالمياه؟', 'مياه الصرف الصناعي؟',
    'التوعية بأهمية المياه؟', 'استخدام الماء بكفاءة؟', 'استهلاك الفرد يومياً؟', 'حماية الآبار؟',
    'أهمية الماء في الصناعة؟', 'خطط استدامة المياه؟', 'الماء والتطور؟', 'النيل والحضارة؟',
    'دول وندرة المياه؟', 'الثلج والجليد؟', 'القطب والمياه؟', 'مياه تحت الأرض؟',
    'مشاريع المياه الجديدة؟', 'التقنيات الحديثة؟', 'إعادة تدوير المياه؟', 'المياه والسياحة؟',
    'النيل والدول الأخرى؟', 'اتفاقيات المياه؟', 'حقوق الماء؟', 'المياه والسلام؟'
  ],
  default: [
    'اشرح الدرس بسيط؟', 'أهم نقطة بالدرس؟', 'مثال من الحياة؟', 'كيف أحفظ المعلومات؟',
    'أسئلة مهمة؟', 'كيف أستخدمها؟', 'اتعلمت إيه؟', 'ما فهمتش حاجة؟',
    'ربط الأجزاء؟', 'أسهل طريقة للفهم؟', 'استذكار قبل الامتحان؟', 'المصطلحات المهمة؟',
    'حل المسائل؟', 'تطبيقات عملية؟', 'ربط بدروس أخرى؟'
  ]
};

const AUTO_CHAT_PROMPTS = {
  default: [
    'أنا معاك يا بطل، نبدأ خطوة خطوة؟',
    'يلا نلعب ونتعلم حاجة جديدة.',
    'عايز شرح أسهل وبسيط أوي؟'
  ],
  home: [
    'دي البداية يا بطل. اختار أول خطوة ونمشي سوا.',
    'نبدأ بالخريطة ولا الدروس؟ اختار وأنا معاك.',
    'كل خطوة صغيرة بتخليك أشطر.'
  ],
  map: [
    'اختار علامة في الخريطة وأنا أحكي لك حكايتها.',
    'تعالى نعرف المكان ده فين وليه مهم.',
    'اضغط على أي معلم وأنا أشرح بسرعة.'
  ],
  lessons: [
    'نبدأ بملخص صغير وبعده مثال لطيف.',
    'تحب شرح سريع ولا سؤال صغير؟',
    'اختار درس وأنا أمشي معاك حتة حتة.'
  ],
  lesson: [
    'ركز في النقطة دي، دي مهمة قوي.',
    'أقدر أحول الدرس لخطوات أسهل جدًا.',
    'يلا سؤال صغير نتأكد بيه إنك فاهم.'
  ],
  awards: [
    'قربت تجيب شارة جديدة، كمّل يا بطل.',
    'تحب خطة سريعة للنقاط؟ أنا جاهز.',
    'شاطر قوي! كل إنجاز صغير يفرق.'
  ],
  quiz: [
    'فكر بهدوء، أنت تقدر تجاوب صح.',
    'بص للكلمات المهمة قبل ما تختار.',
    'لو غلطت عادي، المحاولة الجاية أحسن.'
  ]
};

const resolveAutoChatPrompts = (pathname = '') => {
  if (pathname === '/home') return AUTO_CHAT_PROMPTS.home;
  if (pathname === '/map' || pathname.startsWith('/map/')) return AUTO_CHAT_PROMPTS.map;
  if (pathname === '/lessons') return AUTO_CHAT_PROMPTS.lessons;
  if (pathname.startsWith('/lesson/')) return AUTO_CHAT_PROMPTS.lesson;
  if (pathname === '/awards') return AUTO_CHAT_PROMPTS.awards;
  if (pathname.startsWith('/quiz/')) return AUTO_CHAT_PROMPTS.quiz;
  return AUTO_CHAT_PROMPTS.default;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeArabic = (text) => text
  .toLowerCase()
  .replace(/[إأآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[^\u0600-\u06FF0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (text) => {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];
  return normalized.split(' ').filter((word) => word.length > 2);
};

const buildLessonIndex = () => {
  return CURRICULUM_DATA.lessons.map((lesson) => {
    const raw = [
      lesson.title,
      lesson.summary,
      lesson.description,
      ...(lesson.keyPoints || []),
      ...(lesson.objectives || []),
      ...(lesson.examples || []),
      ...(lesson.vocabulary || []).map((item) => item.term)
    ].filter(Boolean).join(' ');

    const keywords = Array.from(new Set(tokenize(raw)));
    return { lesson, keywords };
  });
};

const LESSON_INDEX = buildLessonIndex();
const LOCATIONS = Object.values(MAP_LOCATIONS).flat();
const CURRICULUM_BRIEF = CURRICULUM_DATA.lessons.map((lesson) => {
  const points = (lesson.keyPoints || []).slice(0, 2).join('، ');
  const vocab = (lesson.vocabulary || []).slice(0, 2).map((item) => item.term).join('، ');
  const summary = lesson.summary || lesson.description || '';
  return `- ${lesson.title}: ${summary}${points ? ` | نقاط: ${points}` : ''}${vocab ? ` | مصطلحات: ${vocab}` : ''}`;
}).join('\n');
const LOCATIONS_BRIEF = LOCATIONS
  .slice(0, 60)
  .map((loc) => `${loc.name} (${loc.governorate || 'مصر'})`)
  .join('، ');

const findBestLesson = (question) => {
  const tokens = tokenize(question);
  if (!tokens.length) return null;
  const normalizedQuestion = normalizeArabic(question);
  let best = null;
  let bestScore = 0;
  for (const entry of LESSON_INDEX) {
    let score = 0;
    entry.keywords.forEach((keyword) => {
      if (tokens.includes(keyword) || normalizedQuestion.includes(keyword)) {
        score += 1;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      best = entry.lesson;
    }
  }
  return bestScore >= 2 ? best : null;
};

const findVocabMatch = (question) => {
  const normalized = normalizeArabic(question);
  for (const lesson of CURRICULUM_DATA.lessons) {
    for (const item of (lesson.vocabulary || [])) {
      const term = normalizeArabic(item.term || '');
      if (term && normalized.includes(term)) {
        return { ...item, lesson: lesson.title };
      }
    }
  }
  return null;
};

const findLocationMatch = (question) => {
  const normalized = normalizeArabic(question);
  return LOCATIONS.find((loc) => {
    const name = normalizeArabic(loc.name || '');
    return name.length > 2 && normalized.includes(name);
  });
};

const buildLessonReply = (lesson) => {
  if (!lesson) return null;
  const summary = lesson.summary || lesson.description || 'الدرس ده مهم جدًا في رحلتنا.';
  const points = (lesson.keyPoints && lesson.keyPoints.length)
    ? lesson.keyPoints.slice(0, 3)
    : (lesson.objectives || []).slice(0, 3);
  const example = (lesson.examples && lesson.examples.length) ? lesson.examples[0] : null;
  const vocab = (lesson.vocabulary && lesson.vocabulary.length) ? lesson.vocabulary[0] : null;

  const steps = [
    `١) الفكرة الأساسية: ${summary}`,
    points.length ? `٢) أهم النقاط: ${points.join('، ')}` : null,
    example ? `٣) مثال بسيط: ${example}` : null,
    vocab ? `٤) مصطلح مهم: ${vocab.term} يعني ${vocab.meaning}` : null
  ].filter(Boolean);

  return `حاضر يا بطل! تعالى نفهم ${lesson.title} واحدة واحدة. ${steps.join(' ')} لو تحب أطلع لك سؤال تدريب سريع دلوقتي قولي: اختبرني.`;
};

const buildVocabReply = (item) => {
  if (!item) return null;
  return `بص يا بطل، كلمة "${item.term}" معناها: ${item.meaning}. وهي من درس: ${item.lesson}. تحب أقولها لك في مثال بسيط من الحياة؟`;
};

const buildLocationReply = (loc) => {
  if (!loc) return null;
  const lessonTitle = CURRICULUM_DATA.lessons.find((l) => l.id === loc.lesson)?.title || 'أحد الدروس';
  const importance = loc.characterDialog?.importance || loc.simpleInfo?.why || 'مكان مهم في رحلتنا.';
  const where = loc.simpleInfo?.where || loc.governorate || 'مكان مميز في مصر';
  return `تمام يا بطل! المكان ده اسمه ${loc.name}. موجود في: ${where}. أهميته: ${importance}. وهو مرتبط بدرس: ${lessonTitle}.`;
};

const buildGeneralHelp = () => {
  return 'اسألني أي سؤال، وأنا هجاوبك ببساطة. لو تحب الإجابة تبقى شرح سريع أو مثال واقعي أو تدريب، قول اللي يناسبك.';
};

const buildCatchAllReply = (question) => {
  const cleanQuestion = String(question || '').replace(/[؟?]/g, '').trim();
  return `سؤالك حلو يا بطل: "${cleanQuestion}". هجاوبك ببساطة، ولو تحب أزود مثال من الواقع أو سؤال تدريب قولي.`;
};

const sanitizeAnswer = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const extractGeminiAnswer = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return sanitizeAnswer(parts.map((part) => part?.text || '').join(' '));
};

const buildHistorySnippet = (messages = []) => (
  messages
    .slice(-6)
    .map((msg) => `${msg.role === 'user' ? 'الطالب' : 'المساعد'}: ${msg.text}`)
    .join('\n')
);

const buildPrompt = (question, historySnippet) => {
  return [
    'أنت مساعد راجل وتعمل كمساعد تعليمي ذكي للأطفال في مصر.',
    'القواعد:',
    '- جاوب باللهجة المصرية البسيطة.',
    '- اتكلم بصيغة راجل بسيطة وبنبرة ودودة.',
    '- استخدم جمل قصيرة وواضحة جدًا، وكلمات سهلة للطفل.',
    '- جاوب على أي سؤال (حتى لو خارج المنهج) بإجابة صحيحة ومختصرة.',
    '- خليك لطيف وواضح، وفي حدود 3 إلى 5 جمل.',
    '- لو السؤال محتاج توضيح، اسأل سؤال متابعة واحد فقط.',
    '',
    'سياق منهج المنصة:',
    CURRICULUM_BRIEF || 'لا يوجد سياق.',
    '',
    'أماكن مهمة على الخريطة:',
    LOCATIONS_BRIEF || 'لا يوجد.',
    historySnippet ? `\nآخر المحادثة:\n${historySnippet}` : '',
    `\nسؤال الطالب: ${question}`
  ].filter(Boolean).join('\n');
};

const requestGeminiReply = async (question, messages = []) => {
  if (!GEMINI_API_KEY || !question) return null;

  const historySnippet = buildHistorySnippet(messages);
  const prompt = buildPrompt(question, historySnippet);
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      topP: 0.9,
      maxOutputTokens: 380
    }
  };

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 13000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini request failed (${response.status})`);
      }

      const data = await response.json();
      const answer = extractGeminiAnswer(data);
      if (answer) return answer;
    } catch (_) {
      // Try next model or fallback
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
};

const localBotAnswer = (question) => {
  const normalized = normalizeArabic(question);

  if (!normalized) return 'اكتب سؤالك تاني يا بطل، وأنا معاك.';

  if (/اهلا|مرحبا|السلام|ازيك|عامل ايه/.test(normalized)) {
    return 'أهلاً يا بطل! أنا صاحبك الصغير. اسأل أي حاجة وأنا أشرحها ببساطة.';
  }

  if (/مين انت|اسمك ايه|انت مين|واحد ولا واحده|واحده ولا واحد|ولد ولا بنت/.test(normalized)) {
    return 'أنا مساعد راجل وبحب أساعدك. قولي عايز نفهم إيه وأنا معاك خطوة خطوة.';
  }

  if (/شكرا|تسلم|مرسي/.test(normalized)) {
    return 'العفو يا بطل! أنا مبسوط إني بساعدك.';
  }

  if (/اختبرني|سؤال سريع|سوال سريع|امتحني/.test(normalized)) {
    return 'يلا بينا! سؤال سريع: اذكر مصدر طاقة متجدد ومصدر طاقة غير متجدد.';
  }

  if (/يعني ايه|ما معنى|معنى/.test(normalized)) {
    const vocab = findVocabMatch(question);
    if (vocab) return buildVocabReply(vocab);
  }

  if (/فين|اين|مكان|موقع/.test(normalized)) {
    const loc = findLocationMatch(question);
    if (loc) return buildLocationReply(loc);
  }

  const lesson = findBestLesson(question);
  if (lesson) return buildLessonReply(lesson);

  return `${buildCatchAllReply(question)} ${buildGeneralHelp()}`;
};

export default function AutoNarrator() {
  const location = useLocation();
  const {
    activeProfile,
    voicesReady,
    speak
  } = useVoiceNarration();
  const [messages, setMessages] = useState([
    { role: 'bot', text: BOT_INTRO_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [assistantPos, setAssistantPos] = useState(null);
  const [hasCustomPosition, setHasCustomPosition] = useState(false);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // المساعد يبدأ مقفول حتى يفتحه المستخدم
  const [isReadyQuestionsOpen, setIsReadyQuestionsOpen] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const introSpokenRef = useRef(false);
  const autoTalkRef = useRef({ lastAt: 0, lastPhrase: '' });
  const handleSendRef = useRef(null);
  const assistantRef = useRef(null);
  const dragRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0
  });

  const pathname = location?.pathname || '';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isMapOrLessonRoute = pathname === '/map'
    || pathname.startsWith('/map/')
    || pathname === '/lessons'
    || pathname.startsWith('/lessons/')
    || pathname.startsWith('/lesson/');
  const assistantClassName = `robot-assistant${isMapOrLessonRoute ? ' robot-assistant-safe-right' : ''}${isDraggingCard ? ' is-dragging' : ''}${!isOpen ? ' robot-assistant-collapsed' : ''}`;

  // الحصول على الأسئلة الجاهزة للدرس الحالي
  const getLessonReadyQuestions = useCallback(() => {
    const lessonMatch = pathname.match(/lesson-\d+/);
    const lessonId = lessonMatch ? lessonMatch[0] : 'default';
    return LESSON_READY_QUESTIONS[lessonId] || LESSON_READY_QUESTIONS.default;
  }, [pathname]);

  const getAssistantSize = useCallback(() => {
    const rect = assistantRef.current?.getBoundingClientRect();
    const widthFallback = Math.min(ASSISTANT_DEFAULT_WIDTH, window.innerWidth - (ASSISTANT_MARGIN * 2));
    return {
      width: rect?.width || widthFallback,
      height: rect?.height || ASSISTANT_DEFAULT_HEIGHT
    };
  }, []);

  const clampAssistantPosition = useCallback((x, y, width, height) => {
    const maxX = Math.max(ASSISTANT_MARGIN, window.innerWidth - width - ASSISTANT_MARGIN);
    const maxY = Math.max(ASSISTANT_MARGIN, window.innerHeight - height - ASSISTANT_MARGIN);
    return {
      x: clamp(x, ASSISTANT_MARGIN, maxX),
      y: clamp(y, ASSISTANT_MARGIN, maxY)
    };
  }, []);

  const computeDockPosition = useCallback((size) => {
    const nextX = isMapOrLessonRoute
      ? window.innerWidth - size.width - ASSISTANT_DOCK_OFFSET
      : ASSISTANT_DOCK_OFFSET;
    const nextY = window.innerHeight - size.height - ASSISTANT_BOTTOM_OFFSET;
    return clampAssistantPosition(nextX, nextY, size.width, size.height);
  }, [clampAssistantPosition, isMapOrLessonRoute]);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(ASSISTANT_STORAGE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
        setAssistantPos({ x: parsed.x, y: parsed.y });
        setHasCustomPosition(true);
      }
    } catch (_) {
      // ignore cache parse errors
    }
  }, []);

  useEffect(() => {
    const syncPosition = () => {
      const size = getAssistantSize();
      setAssistantPos((prev) => {
        if (hasCustomPosition && prev) {
          return clampAssistantPosition(prev.x, prev.y, size.width, size.height);
        }
        return computeDockPosition(size);
      });
    };

    const raf = window.requestAnimationFrame(syncPosition);
    window.addEventListener('resize', syncPosition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', syncPosition);
    };
  }, [clampAssistantPosition, computeDockPosition, getAssistantSize, hasCustomPosition]);

  useEffect(() => {
    if (!hasCustomPosition || !assistantPos) return;
    try {
      window.localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(assistantPos));
    } catch (_) {
      // ignore storage write errors
    }
  }, [assistantPos, hasCustomPosition]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragRef.current.active) return;
      const size = getAssistantSize();
      const nextX = event.clientX - dragRef.current.offsetX;
      const nextY = event.clientY - dragRef.current.offsetY;
      setAssistantPos(clampAssistantPosition(nextX, nextY, size.width, size.height));
    };

    const finishDragging = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setIsDraggingCard(false);
      setHasCustomPosition(true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDragging);
    window.addEventListener('pointercancel', finishDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDragging);
      window.removeEventListener('pointercancel', finishDragging);
    };
  }, [clampAssistantPosition, getAssistantSize]);

  const speakText = useCallback((text, channel = 'assistant-reply') => {
    if (!text) return;
    speak(text, { channel });
  }, [speak]);

  const buildReply = useCallback(async (question, history) => {
    const aiReply = await requestGeminiReply(question, history);
    if (aiReply) return aiReply;
    return localBotAnswer(question);
  }, []);

  const handleSend = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    autoTalkRef.current.lastAt = Date.now();

    const userMessage = { role: 'user', text: trimmed };
    const historySnapshot = [...messages, userMessage];

    setLoading(true);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const reply = await buildReply(trimmed, historySnapshot);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
      speakText(reply, 'assistant-reply');
    } catch (_) {
      const fallback = localBotAnswer(trimmed);
      setMessages((prev) => [...prev, { role: 'bot', text: fallback }]);
      speakText(fallback, 'assistant-reply');
    } finally {
      setLoading(false);
    }
  }, [buildReply, loading, messages, speakText]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (introSpokenRef.current) return;
    introSpokenRef.current = true;
    autoTalkRef.current = { lastAt: Date.now(), lastPhrase: BOT_INTRO_MESSAGE };
    speak(BOT_INTRO_MESSAGE, { channel: 'assistant-reply' });
  }, [speak]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (loading) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (typeof window !== 'undefined' && window.speechSynthesis?.pending) return;

      const now = Date.now();
      if (now - autoTalkRef.current.lastAt < AUTO_CHAT_MIN_GAP_MS) return;

      const promptPool = resolveAutoChatPrompts(pathname);
      const source = promptPool.length ? promptPool : AUTO_CHAT_PROMPTS.default;
      const candidates = source.filter((item) => item !== autoTalkRef.current.lastPhrase);
      const list = candidates.length ? candidates : source;
      const nextPrompt = list[Math.floor(Math.random() * list.length)];
      if (!nextPrompt) return;

      autoTalkRef.current = { lastAt: now, lastPhrase: nextPrompt };
      setMessages((prev) => [...prev, { role: 'bot', text: nextPrompt }].slice(-24));
      speakText(nextPrompt, 'assistant-reply');
    }, AUTO_CHAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loading, pathname, speakText]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setMicError('المتصفح مش داعم الصوت دلوقتي. جرّب Google Chrome أو Microsoft Edge.');
      return;
    }
    setIsSupported(true);
    setMicError('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('الميكروفون مرفوض. افتح الإذن للمتصفح وجرب تاني.');
      } else if (event.error === 'no-speech') {
        setMicError('مافيش صوت واصل. جرّب تقرب الميكروفون أكتر وتتكلم بوضوح.');
      } else {
        setMicError('حصلت مشكلة مؤقتة في الميكروفون. جرّب تاني.');
      }
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((res) => res[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) handleSendRef.current?.(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current = null;
    };
  }, []);

  const ensureMicPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (_) {
      setMicError('لازم تأذن بالميكروفون للأسئلة الصوتية.');
      return false;
    }
  };

  const handleListen = async () => {
    const recognition = recognitionRef.current;
    setMicError('');
    if (!recognition) {
      setMicError('المتصفح مش داعم التعرف الصوتي.');
      return;
    }
    const hasPermission = await ensureMicPermission();
    if (!hasPermission) return;
    try {
      recognition.start();
    } catch (_) {
      // ignore repeated starts
    }
  };

  const handleDragStart = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = assistantRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = assistantPos?.x ?? rect.left;
    const currentY = assistantPos?.y ?? rect.top;
    dragRef.current = {
      active: true,
      offsetX: event.clientX - currentX,
      offsetY: event.clientY - currentY
    };
    setIsDraggingCard(true);
    event.preventDefault();
  };

  const resetAssistantPosition = () => {
    setHasCustomPosition(false);
    try {
      window.localStorage.removeItem(ASSISTANT_STORAGE_KEY);
    } catch (_) {
      // ignore storage cleanup errors
    }
    const size = getAssistantSize();
    setAssistantPos(computeDockPosition(size));
  };

  const openAssistant = useCallback(() => {
    const safeSize = {
      width: Math.min(ASSISTANT_DEFAULT_WIDTH, window.innerWidth - (ASSISTANT_MARGIN * 2)),
      height: ASSISTANT_DEFAULT_HEIGHT
    };

    setAssistantPos((prev) => {
      if (hasCustomPosition && prev) {
        return clampAssistantPosition(prev.x, prev.y, safeSize.width, safeSize.height);
      }
      return computeDockPosition(safeSize);
    });

    setIsOpen(true);
  }, [clampAssistantPosition, computeDockPosition, hasCustomPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(() => {
      const size = getAssistantSize();
      setAssistantPos((prev) => {
        const base = prev || computeDockPosition(size);
        return clampAssistantPosition(base.x, base.y, size.width, size.height);
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, clampAssistantPosition, computeDockPosition, getAssistantSize]);

  const lastBotMessage = [...messages].reverse().find((msg) => msg.role === 'bot');
  const robotImage = encodeURI('/اشكال للروبوتات والشات جى بى تى/clipart-cartoon-robot-256x256-1cd8.png');
  const assistantStyle = assistantPos
    ? {
      left: `${assistantPos.x}px`,
      top: `${assistantPos.y}px`,
      right: 'auto',
      bottom: 'auto'
    }
    : undefined;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="robot-global-launcher"
          onClick={openAssistant}
          title="افتح المرشد الذكي"
          aria-label="افتح المرشد الذكي"
        >
          <span className="robot-toggle-icon"></span>
          <span className="robot-toggle-text">المرشد الذكي</span>
        </button>
      )}

      <div ref={assistantRef} className={assistantClassName} style={assistantStyle}>
        <div className="robot-card">
          {/* المحتوى الرئيسي */}
          {isOpen && (
          <>
        <div className="robot-header robot-drag-handle" onPointerDown={handleDragStart} title="اسحب لتحريك المساعد">
          <div className="robot-avatar-wrap">
            <img src={robotImage} alt="Robot" className="robot-avatar" />
            <span className="robot-pulse" />
          </div>
          <div className="robot-title">
            <h4>{BOT_NAME}</h4>
            <p>شرح بسيط باللهجة المصرية للأطفال</p>
          </div>
          <div className="robot-voice is-on" title="الصوت الحالي: صوت راجل">
             {PROFILE_LABELS[activeProfile] || 'صوت راجل'}
          </div>
          <button
            type="button"
            className="robot-close-btn"
            onClick={() => setIsOpen(false)}
            title="أغلق المساعد"
          >
            
          </button>
        </div>

        <div className="robot-voice-presets">
          <span className="robot-voice-status">النمط الحالي: صوت راجل</span>
          <span className="robot-voice-status">
            {voicesReady ? 'جاهز للصوت ' : 'تحميل الأصوات...'}
          </span>
          <button
            type="button"
            className="robot-ready-toggle"
            onClick={() => setIsReadyQuestionsOpen((value) => !value)}
            title="فتح أو إغلاق الأسئلة الجاهزة"
          >
            {isReadyQuestionsOpen ? ' إخفاء الأسئلة الجاهزة' : ' فتح الأسئلة الجاهزة'}
          </button>
          {!isMobile && (
            <button type="button" className="robot-reset-position" onClick={resetAssistantPosition}>
               رجّعه مكانه
            </button>
          )}
        </div>

        <div className="robot-messages" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={`${msg.role}-${idx}`} className={`robot-bubble ${msg.role}`}>
              <span>{msg.text}</span>
            </div>
          ))}
          {loading && (
            <div className="robot-bubble bot">
              <span>ثانية يا بطل... بفكر لك في أحسن إجابة </span>
            </div>
          )}
          {micError && (
            <div className="robot-error">
              {micError}
            </div>
          )}
          {!isSupported && (
            <div className="robot-error">
              جرّب تفتح الموقع باستخدام متصفح مدعوم أو على HTTPS.
            </div>
          )}
        </div>

        {/* أسئلة جاهزة مقترحة */}
        {isReadyQuestionsOpen && (
          <div className="robot-suggested-questions">
            <p className="robot-suggestions-title"> أسئلة مقترحة جاهزة:</p>
            <div className="robot-suggestions-grid">
              {getLessonReadyQuestions().map((question, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="robot-suggestion-btn"
                  onClick={() => {
                    setInput(question);
                    setTimeout(() => handleSend(question), 100);
                  }}
                  title={question}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="robot-input"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسألني أي سؤال... وأنا هجاوبك ببساطة"
            dir="rtl"
          />
          <button type="submit" disabled={loading}>
            {loading ? '...' : 'اسأل'}
          </button>
        </form>

        <div className="robot-actions">
          <button
            type="button"
            className="robot-action"
            onClick={() => lastBotMessage && speakText(lastBotMessage.text, 'assistant-repeat')}
          >
             اسمع الرد تاني
          </button>
          <button
            type="button"
            className={`robot-action ${isListening ? 'is-listening' : ''}`}
            onClick={handleListen}
          >
            {isListening ? ' سامعك...' : ' اسأل بالصوت'}
          </button>
        </div>
          </>
          )}
        </div>
      </div>
    </>
  );
}


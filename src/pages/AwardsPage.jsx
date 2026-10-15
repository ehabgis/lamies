import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import confetti from 'canvas-confetti';

import { useGameStore } from '../store/gameStore';

import { CURRICULUM_DATA, LEVELS_SYSTEM, MAP_LOCATIONS } from '../data/curriculumData';

const TARGET_QUESTION_COUNT = 4500;

const SESSION_OPTIONS = [10, 20, 50, 100, 2000];

const CHALLENGE_MODES = [
  {
    id: 'adventure',
    label: 'مغامرة متنوعة',
    emoji: '',
    description: 'مزيج كبير من كل أنواع الأسئلة',
    secondsPerQuestion: 0,
    allowedTypes: null
  },
  {
    id: 'speed',
    label: 'سباق السرعة',
    emoji: '',
    description: 'وقت قصير لكل سؤال + نقاط سرعة إضافية',
    secondsPerQuestion: 15,
    allowedTypes: null
  },
  {
    id: 'visual',
    label: 'تحدي الصور',
    emoji: '',
    description: 'رموز وأشكال وتصنيف للأطفال',
    secondsPerQuestion: 0,
    allowedTypes: ['emoji', 'shape', 'odd', 'category']
  },
  {
    id: 'focus',
    label: 'تحدي التركيز',
    emoji: '',
    description: 'اختار مجال واحد وركّز فيه',
    secondsPerQuestion: 0,
    allowedTypes: null
  },
  {
    id: 'quick',
    label: 'صح وغلط سريع',
    emoji: '',
    description: 'جولات قصيرة مناسبة للأطفال الصغار',
    secondsPerQuestion: 12,
    allowedTypes: ['tf', 'kid', 'governorate', 'category']
  }
];

const EMOJI_CHOICES = [
  { label: 'نهر النيل', emoji: '', category: 'water' },
  { label: 'منجم ذهب', emoji: '', category: 'minerals' },
  { label: 'طاقة الشمس', emoji: '', category: 'energy' },
  { label: 'طاقة الرياح', emoji: '', category: 'energy' },
  { label: 'سد عالي', emoji: '', category: 'projects' },
  { label: 'سفينة في قناة', emoji: '', category: 'projects' },
  { label: 'صحراء', emoji: '', category: 'minerals' },
  { label: 'واحة', emoji: '', category: 'water' },
  { label: 'خريطة', emoji: '', category: 'exploration' },
  { label: 'متحف', emoji: '', category: 'culture' }
];

const SHAPE_CHOICES = [
  { label: 'دائرة زرقاء', emoji: '', category: 'exploration' },
  { label: 'دائرة حمراء', emoji: '', category: 'exploration' },
  { label: 'مربع أزرق', emoji: '', category: 'exploration' },
  { label: 'مربع أصفر', emoji: '', category: 'exploration' },
  { label: 'مثلث أحمر', emoji: '', category: 'exploration' },
  { label: 'معين أزرق', emoji: '', category: 'exploration' }
];

const GENERAL_FACTS = [
  { text: 'نهر النيل يمر في مصر.', answer: true, category: 'water' },
  { text: 'الأهرامات موجودة في الجيزة.', answer: true, category: 'culture' },
  { text: 'قناة السويس تربط بين البحرين الأحمر والمتوسط.', answer: true, category: 'projects' },
  { text: 'مصر تقع في قارة أفريقيا.', answer: true, category: 'exploration' },
  { text: 'الذهب من المعادن المهمة في مصر.', answer: true, category: 'minerals' },
  { text: 'الطاقة الشمسية مصدر متجدد.', answer: true, category: 'energy' }
];

const EXTRA_GENERAL_FACTS = [
  { text: 'الماء العذب نستخدمه للشرب والري.', answer: true, category: 'water' },
  { text: 'الماء المالح يوجد غالبًا في البحار.', answer: true, category: 'water' },
  { text: 'الماء المالح يصلح للشرب مباشرة بدون معالجة.', answer: false, category: 'water' },
  { text: 'ترشيد المياه يعني عدم إهدار الماء.', answer: true, category: 'water' },
  { text: 'الشمس مصدر للضوء والحرارة.', answer: true, category: 'energy' },
  { text: 'الرياح يمكن أن تساعد في توليد الكهرباء.', answer: true, category: 'energy' },
  { text: 'الفحم من مصادر الطاقة المتجددة.', answer: false, category: 'energy' },
  { text: 'الذهب معدن لونه أصفر لامع.', answer: true, category: 'minerals' },
  { text: 'الحديد معدن قوي يُستخدم في البناء.', answer: true, category: 'minerals' },
  { text: 'السكر معدن نستخرجه من الأرض.', answer: false, category: 'minerals' },
  { text: 'قناة السويس تمر فيها سفن كثيرة.', answer: true, category: 'projects' },
  { text: 'السد العالي يوجد في أسوان.', answer: true, category: 'projects' },
  { text: 'قناة السويس تقع خارج مصر.', answer: false, category: 'projects' },
  { text: 'الأهرامات من آثار مصر القديمة.', answer: true, category: 'culture' },
  { text: 'المتحف مكان نرى فيه آثارًا قديمة.', answer: true, category: 'culture' },
  { text: 'الأهرامات موجودة في محافظة القاهرة.', answer: false, category: 'culture' },
  { text: 'الخريطة تساعدنا في معرفة أماكن المدن والمواقع.', answer: true, category: 'exploration' },
  { text: 'البوصلة تساعدنا في معرفة الاتجاهات.', answer: true, category: 'exploration' },
  { text: 'مصر تقع في قارة أوروبا.', answer: false, category: 'exploration' },
  { text: 'البحر المتوسط يقع شمال مصر.', answer: true, category: 'exploration' }
];

const ALL_GENERAL_FACTS = [...GENERAL_FACTS, ...EXTRA_GENERAL_FACTS];

const PERSONA_MAP = {
  minerals: { title: 'مستكشف الكنوز', focus: 'المعادن والذهب', color: 'from-amber-500 to-orange-500' },
  energy: { title: 'صديق الطاقة', focus: 'الطاقة النظيفة', color: 'from-yellow-400 to-amber-500' },
  water: { title: 'حارس المياه', focus: 'المياه والنيل', color: 'from-sky-400 to-blue-500' },
  projects: { title: 'باني المستقبل', focus: 'المشروعات القومية', color: 'from-emerald-400 to-teal-500' },
  exploration: { title: 'مستكشف الخريطة', focus: 'الاستكشاف والرحلات', color: 'from-purple-400 to-indigo-500' },
  culture: { title: 'حارس الحضارة', focus: 'التاريخ والتراث', color: 'from-pink-400 to-rose-500' }
};

const shuffleWithSeed = (items, seed = 2025) => {
  const array = [...items];
  let current = array.length;
  let value = seed;
  while (current) {
    value = (value * 9301 + 49297) % 233280;
    const rand = value / 233280;
    const index = Math.floor(rand * current);
    current -= 1;
    [array[current], array[index]] = [array[index], array[current]];
  }
  return array;
};

const buildOptions = (pool, seed, correct) => {
  if (pool.length < 3) {
    return [correct, correct, correct];
  }
  const offset1 = (seed * 7 + 3) % pool.length;
  const offset2 = (seed * 11 + 5) % pool.length;
  let option1 = pool[offset1];
  let option2 = pool[offset2];
  if (option1 === correct) option1 = pool[(offset1 + 1) % pool.length];
  if (option2 === correct || option2 === option1) option2 = pool[(offset2 + 2) % pool.length];
  const options = [correct, option1, option2];
  return shuffleWithSeed(options, seed + 31);
};

const shuffleQuestionOptions = (options, correctIndex, seed) => {
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  if (!safeOptions.length) return { options: [], correctIndex: 0 };
  const correct = safeOptions[correctIndex] ?? safeOptions[0];
  const shuffled = shuffleWithSeed(safeOptions, seed + 91);
  const nextCorrectIndex = shuffled.indexOf(correct);
  return { options: shuffled, correctIndex: nextCorrectIndex >= 0 ? nextCorrectIndex : 0 };
};

const OPTION_TRANSLATIONS = {
  'Nile River': 'نهر النيل',
  'Red Sea': 'البحر الأحمر',
  'Lake Nasser': 'بحيرة ناصر',
  'Suez Canal': 'قناة السويس',
  'Make salty water fresh': 'تحويل المياه المالحة لمياه عذبة',
  'Make water salty': 'تحويل المياه العذبة لمياه مالحة',
  'Clean air': 'تنقية الهواء',
  'Cool water': 'تبريد الماء',
  'Close the tap': 'غلق الصنبور',
  'Leave it open': 'تركه مفتوحًا',
  'Waste water': 'إهدار الماء',
  'Use more water': 'استخدام ماء أكثر',
  'New city': 'مدينة جديدة',
  'Energy station': 'محطة طاقة',
  'Roads & bridges': 'طرق وكباري',
  'All of the above': 'كل ما سبق',
  'Faster travel': 'السفر أسرع',
  'More time': 'وقت أكثر',
  'Harder transport': 'نقل أصعب',
  'Less connection': 'ترابط أقل',
  'Develop economy & services': 'تنمية الاقتصاد والخدمات',
  'Waste resources': 'إهدار الموارد',
  'Stop education': 'إيقاف التعليم',
  'Reduce jobs': 'تقليل الوظائف'
};

const translateOption = (value) => OPTION_TRANSLATIONS[value] || value;

const QUESTION_TYPE_LABELS = {
  mcq: 'اختيار من متعدد',
  tf: 'صح/غلط',
  emoji: 'رموز',
  shape: 'أشكال',
  odd: 'اختلاف',
  vocab: 'معاني الكلمات',
  term: 'مصطلحات',
  example: 'أمثلة',
  keypoint: 'نقطة مهمة',
  objective: 'هدف الدرس',
  secret: 'أسرار',
  funfact: 'معلومة ممتعة',
  media: 'وسائط الدرس',
  'secret-title': 'عنوان السر',
  'funfact-pick': 'اختيار معلومة',
  practice: 'تدريب الدرس',
  'loc-quiz': 'سؤال من الخريطة',
  governorate: 'محافظة',
  category: 'تصنيف',
  kid: 'سؤال سريع'
};

const VISUAL_TYPES = new Set(['emoji', 'shape', 'odd', 'category']);

const CATEGORY_CHOICES = [
  { label: 'المياه', emoji: '', category: 'water' },
  { label: 'المعادن', emoji: '', category: 'minerals' },
  { label: 'الطاقة', emoji: '', category: 'energy' },
  { label: 'المشروعات', emoji: '', category: 'projects' },
  { label: 'الاستكشاف', emoji: '', category: 'exploration' },
  { label: 'الحضارة', emoji: '', category: 'culture' }
];

const KID_QUICK_QUESTIONS = [
  {
    prompt: 'نهر ____ يمر في مصر ويعطينا ماء للشرب والزراعة.',
    options: ['النيل', 'الأمازون', 'الدانوب'],
    correctIndex: 0,
    category: 'water',
    hint: 'هو أطول نهر في مصر.'
  },
  {
    prompt: 'قناة ____ تربط بين البحر الأحمر والبحر المتوسط.',
    options: ['السويس', 'بنما', 'جبل الزيت'],
    correctIndex: 0,
    category: 'projects',
    hint: 'تمر فيها سفن كثيرة.'
  },
  {
    prompt: 'الطاقة الشمسية تأتي من ____.',
    options: ['الشمس', 'الثلج', 'الرمل'],
    correctIndex: 0,
    category: 'energy',
    hint: 'تشرق في السماء كل صباح.'
  },
  {
    prompt: 'من الأمثلة على المعادن في مصر: ____.',
    options: ['الذهب', 'السكر', 'الماء'],
    correctIndex: 0,
    category: 'minerals',
    hint: 'معدن لونه أصفر لامع.'
  },
  {
    prompt: 'ترشيد المياه يعني ____ الماء.',
    options: ['عدم إهدار', 'تلويث', 'زيادة إهدار'],
    correctIndex: 0,
    category: 'water',
    hint: 'نحافظ على كل نقطة.'
  },
  {
    prompt: 'نستخدم الحديد غالبًا في ____.',
    options: ['البناء', 'الطهي', 'الرسم'],
    correctIndex: 0,
    category: 'minerals',
    hint: 'معدن قوي.'
  },
  {
    prompt: 'طاقة الرياح تساعدنا في توليد ____.',
    options: ['الكهرباء', 'الحلوى', 'الثلج'],
    correctIndex: 0,
    category: 'energy',
    hint: 'تشغل اللمبات والأجهزة.'
  },
  {
    prompt: 'المتحف مكان نذهب إليه لنتعلم عن ____.',
    options: ['التاريخ', 'السباحة', 'الطبخ'],
    correctIndex: 0,
    category: 'culture',
    hint: 'فيه آثار وحكايات قديمة.'
  },
  {
    prompt: 'الخريطة تساعدنا على ____ الأماكن.',
    options: ['معرفة', 'إخفاء', 'كسر'],
    correctIndex: 0,
    category: 'exploration',
    hint: 'تُظهر أين نذهب.'
  },
  {
    prompt: 'السد العالي مثال على ____.',
    options: ['مشروع قومي', 'حيوان', 'لعبة'],
    correctIndex: 0,
    category: 'projects',
    hint: 'مشروع كبير مهم لمصر.'
  }
];

const EXTRA_KID_QUICK_QUESTIONS = [
  {
    prompt: 'الأهرامات موجودة في محافظة ____.',
    options: ['الجيزة', 'أسوان', 'بورسعيد'],
    correctIndex: 0,
    category: 'culture',
    hint: 'قريبة من القاهرة.'
  },
  {
    prompt: 'مصر تقع في قارة ____.',
    options: ['أفريقيا', 'أوروبا', 'أستراليا'],
    correctIndex: 0,
    category: 'exploration',
    hint: 'القارة التي تضم السودان وليبيا.'
  },
  {
    prompt: 'الماء المالح يوجد في ____.',
    options: ['البحر', 'النهر', 'المطر'],
    correctIndex: 0,
    category: 'water',
    hint: 'طعمه مالح.'
  },
  {
    prompt: 'بعد استخدام الماء نغلق ____.',
    options: ['الصنبور', 'الكتاب', 'الحقيبة'],
    correctIndex: 0,
    category: 'water',
    hint: 'هذا يوفر الماء.'
  },
  {
    prompt: 'الزراعة تحتاج إلى ____ لكي تنمو النباتات.',
    options: ['ماء', 'دخان', 'ثلج'],
    correctIndex: 0,
    category: 'water',
    hint: 'نسقي الزرع به.'
  },
  {
    prompt: 'الألواح الشمسية تحول ضوء الشمس إلى ____.',
    options: ['كهرباء', 'ملح', 'رمل'],
    correctIndex: 0,
    category: 'energy',
    hint: 'تشغل اللمبات والأجهزة.'
  },
  {
    prompt: 'طاقة الرياح تساعدنا في تشغيل ____ لتوليد كهرباء.',
    options: ['التوربينات', 'السبورة', 'الفرشاة'],
    correctIndex: 0,
    category: 'energy',
    hint: 'تدور مع الهواء.'
  },
  {
    prompt: 'من أمثلة الطاقة المتجددة: ____.',
    options: ['الشمس', 'الفحم', 'البنزين'],
    correctIndex: 0,
    category: 'energy',
    hint: 'لا تنتهي بسرعة.'
  },
  {
    prompt: 'قناة السويس تمر فيها ____.',
    options: ['السفن', 'الدراجات', 'الجمال'],
    correctIndex: 0,
    category: 'projects',
    hint: 'تتحرك في الماء.'
  },
  {
    prompt: 'قناة السويس تربط بين البحر الأحمر والبحر ____.',
    options: ['المتوسط', 'الميت', 'الأسود'],
    correctIndex: 0,
    category: 'projects',
    hint: 'بحر في شمال مصر.'
  },
  {
    prompt: 'السد العالي يساعد في تخزين ____.',
    options: ['المياه', 'الهواء', 'الثلج'],
    correctIndex: 0,
    category: 'projects',
    hint: 'وراء السد توجد بحيرة.'
  },
  {
    prompt: 'الذهب هو ____.',
    options: ['معدن', 'فاكهة', 'حيوان'],
    correctIndex: 0,
    category: 'minerals',
    hint: 'لونه أصفر لامع.'
  },
  {
    prompt: 'معدن قوي نستخدمه في البناء: ____.',
    options: ['الحديد', 'الماء', 'السكر'],
    correctIndex: 0,
    category: 'minerals',
    hint: 'نصنع منه حديد التسليح.'
  },
  {
    prompt: 'معدن يستخدم في صناعة الأسلاك: ____.',
    options: ['النحاس', 'القطن', 'الخشب'],
    correctIndex: 0,
    category: 'minerals',
    hint: 'لونه أحمر مائل للبني.'
  },
  {
    prompt: 'المتحف مكان نرى فيه ____.',
    options: ['آثار', 'ثلج', 'ملاعب'],
    correctIndex: 0,
    category: 'culture',
    hint: 'أشياء قديمة وجميلة.'
  },
  {
    prompt: 'كلمة "تراث" معناها أشياء من ____.',
    options: ['التاريخ', 'المطبخ', 'الملعب'],
    correctIndex: 0,
    category: 'culture',
    hint: 'من زمن قديم.'
  },
  {
    prompt: 'الخريطة تساعدنا في معرفة ____.',
    options: ['الأماكن', 'الألعاب', 'الروائح'],
    correctIndex: 0,
    category: 'exploration',
    hint: 'تُظهر أين نذهب.'
  },
  {
    prompt: 'البوصلة تساعدنا في معرفة ____.',
    options: ['الاتجاهات', 'الألوان', 'الأصوات'],
    correctIndex: 0,
    category: 'exploration',
    hint: 'شمال/جنوب/شرق/غرب.'
  },
  {
    prompt: 'من وسائل توفير الكهرباء: إطفاء ____ عند عدم الحاجة.',
    options: ['الأنوار', 'الكتب', 'الملح'],
    correctIndex: 0,
    category: 'energy',
    hint: 'نطفئ اللمبة.'
  },
  {
    prompt: 'للحفاظ على البيئة لا نرمي ____ في الشارع.',
    options: ['القمامة', 'الورق في الدفتر', 'الألعاب في البيت'],
    correctIndex: 0,
    category: 'exploration',
    hint: 'نضعه في سلة المهملات.'
  },
  {
    prompt: 'البحر المتوسط يوجد في ____ مصر.',
    options: ['شمال', 'جنوب', 'غرب'],
    correctIndex: 0,
    category: 'exploration',
    hint: 'فوق الدلتا.'
  },
  {
    prompt: 'الماء العذب يوجد غالبًا في ____.',
    options: ['النهر', 'البحر', 'الملح'],
    correctIndex: 0,
    category: 'water',
    hint: 'نستخدمه للشرب.'
  }
];

const ALL_KID_QUICK_QUESTIONS = [...KID_QUICK_QUESTIONS, ...EXTRA_KID_QUICK_QUESTIONS];

const getLessonCategory = (lessonId, text = '') => {
  if (lessonId === 'lesson-2') return 'water';
  if (lessonId === 'lesson-3') return 'projects';
  if (lessonId === 'lesson-1') {
    const t = String(text || '');
    return /طاقة|شمس|رياح|غاز|بترول|كهرب|متجددة|توربين|ألواح|energy|solar|wind|gas|oil|electric/i.test(t)
      ? 'energy'
      : 'minerals';
  }
  return 'exploration';
};

const buildQuestionBank = () => {
  const lessons = CURRICULUM_DATA.lessons.map((lesson) => lesson.title);
  const lessonPracticeQuestions = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.practiceQuestions || []).map((q, idx) => ({ ...q, idx, lesson: lesson.title, lessonId: lesson.id }))
  );
  const lessonExamples = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.examples || []).map((example) => ({ example, lesson: lesson.title }))
  );
  const lessonKeyPoints = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.keyPoints || []).map((point) => ({ point, lesson: lesson.title }))
  );
  const lessonObjectives = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.objectives || []).map((objective) => ({ objective, lesson: lesson.title }))
  );
  const lessonSecrets = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.secrets || []).map((secret) => ({ title: secret.title, content: secret.content, lesson: lesson.title }))
  );
  const lessonFunFacts = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.funFacts || []).map((fact) => ({ fact, lesson: lesson.title }))
  );
  const lessonMedia = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.media || []).map((media) => ({ title: media.title, lesson: lesson.title }))
  );
  const vocabItems = CURRICULUM_DATA.lessons.flatMap((lesson) =>
    (lesson.vocabulary || []).map((item) => ({ ...item, lesson: lesson.title, lessonId: lesson.id }))
  );
  const vocabTerms = vocabItems.map((item) => item.term);
  const vocabMeanings = vocabItems.map((item) => item.meaning);
  const mapLocations = Object.values(MAP_LOCATIONS).flat();
  const locations = mapLocations.map((loc) => loc.name);
  const governorates = Array.from(new Set(mapLocations.map((loc) => loc.governorate).filter(Boolean)));
  const locationTypes = Array.from(new Set(mapLocations.map((loc) => loc.type).filter(Boolean)));
  const locationQuizQuestions = mapLocations.flatMap((loc) =>
    (loc.quiz || []).map((q, idx) => ({
      ...q,
      idx,
      location: loc.name,
      locationId: loc.id,
      category: loc.category,
      emoji: loc.emoji,
      governorate: loc.governorate,
      locationType: loc.type
    }))
  );
  const unitTitle = CURRICULUM_DATA.unit.title;
  const questionBank = [];
  const categoryPool = CATEGORY_CHOICES.map((c) => `${c.emoji} ${c.label}`);

  //  أسئلة سريعة للأطفال (خفيفة وممتعة)
  ALL_KID_QUICK_QUESTIONS.forEach((q, index) => {
    const { options, correctIndex } = shuffleQuestionOptions(q.options, q.correctIndex, 1000 + index);
    questionBank.push({
      id: `kid-${index}`,
      type: 'kid',
      prompt: q.prompt,
      options,
      correctIndex,
      category: q.category || 'exploration',
      hint: q.hint
    });
  });

  //  أسئلة تدريب الدروس (Practice) من المنهج
  lessonPracticeQuestions.forEach((q, index) => {
    const translated = (q.options || []).map(translateOption);
    const { options, correctIndex } = shuffleQuestionOptions(translated, q.correctIndex, 2000 + index);
    questionBank.push({
      id: `practice-${q.lessonId}-${q.idx}`,
      type: 'practice',
      prompt: q.question,
      options,
      correctIndex,
      category: getLessonCategory(q.lessonId, `${q.question} ${translated.join(' ')}`),
      hint: q.hint
    });
  });

  //  أسئلة الخريطة الجاهزة (للأطفال) + تلميحات
  locationQuizQuestions.forEach((q, index) => {
    const translated = (q.options || []).map(translateOption);
    const { options, correctIndex } = shuffleQuestionOptions(translated, q.correct, 3000 + index);
    questionBank.push({
      id: `loc-quiz-${q.locationId}-${q.idx}`,
      type: 'loc-quiz',
      prompt: `(${q.location}) ${q.question}`,
      options,
      correctIndex,
      category: q.category || 'exploration',
      hint: q.hint
    });
  });

  //  أسئلة المحافظة ونوع المكان وتصنيفه (بسيطة للأطفال)
  mapLocations.forEach((loc, index) => {
    if (loc.governorate && governorates.length >= 3) {
      const options = buildOptions(governorates, 4000 + index, loc.governorate);
      questionBank.push({
        id: `gov-${loc.id}`,
        type: 'governorate',
        prompt: `في أي محافظة يوجد ${loc.name}؟`,
        options,
        correctIndex: options.indexOf(loc.governorate),
        category: loc.category || 'exploration',
        hint: loc.characterDialog?.location || loc.simpleInfo?.where
      });
    }

    if (loc.type && locationTypes.length >= 3) {
      const options = buildOptions(locationTypes, 5000 + index, loc.type);
      questionBank.push({
        id: `loc-type-${loc.id}`,
        type: 'mcq',
        prompt: `ما نوع "${loc.name}"؟`,
        options,
        correctIndex: options.indexOf(loc.type),
        category: loc.category || 'exploration'
      });
    }

    const categoryChoice = CATEGORY_CHOICES.find((c) => c.category === loc.category);
    if (categoryChoice && categoryPool.length >= 3) {
      const correct = `${categoryChoice.emoji} ${categoryChoice.label}`;
      const options = buildOptions(categoryPool, 6000 + index, correct);
      questionBank.push({
        id: `loc-category-${loc.id}`,
        type: 'category',
        prompt: `${loc.emoji || ''} ${loc.name} يتبع أي قسم؟`,
        options,
        correctIndex: options.indexOf(correct),
        category: loc.category || 'exploration'
      });
    }
  });

  lessons.forEach((lesson, index) => {
    const options = buildOptions(lessons, index, lesson);
    questionBank.push({
      id: `lesson-mcq-${index}`,
      type: 'mcq',
      prompt: `أي درس يتبع وحدة ${unitTitle}؟`,
      options,
      correctIndex: options.indexOf(lesson),
      category: 'exploration'
    });
    questionBank.push({
      id: `lesson-tf-${index}`,
      type: 'tf',
      prompt: `الدرس "${lesson}" ضمن وحدة ${unitTitle}.`,
      options: ['صح', 'غلط'],
      correctIndex: 0,
      category: 'exploration'
    });
  });

  locations.forEach((location, index) => {
    const options = buildOptions(locations, index, location);
    questionBank.push({
      id: `loc-mcq-${index}`,
      type: 'mcq',
      prompt: 'أي موقع موجود على خريطة كنوز مصر؟',
      options,
      correctIndex: options.indexOf(location),
      category: 'exploration'
    });
    questionBank.push({
      id: `loc-tf-${index}`,
      type: 'tf',
      prompt: `الموقع "${location}" جزء من الخريطة التفاعلية.`,
      options: ['صح', 'غلط'],
      correctIndex: 0,
      category: 'exploration'
    });
  });

  EMOJI_CHOICES.forEach((item, index) => {
    const pool = EMOJI_CHOICES.map((choice) => `${choice.emoji} ${choice.label}`);
    const correct = `${item.emoji} ${item.label}`;
    const options = buildOptions(pool, index, correct);
    questionBank.push({
      id: `emoji-${index}`,
      type: 'emoji',
      prompt: `اختار الرمز المناسب لـ ${item.label}`,
      options,
      correctIndex: options.indexOf(correct),
      category: item.category
    });
  });

  SHAPE_CHOICES.forEach((item, index) => {
    const pool = SHAPE_CHOICES.map((choice) => `${choice.emoji} ${choice.label}`);
    const correct = `${item.emoji} ${item.label}`;
    const options = buildOptions(pool, index, correct);
    questionBank.push({
      id: `shape-${index}`,
      type: 'shape',
      prompt: `اختار الشكل الصحيح: ${item.label}`,
      options,
      correctIndex: options.indexOf(correct),
      category: item.category
    });
  });

  vocabItems.forEach((item, index) => {
    if (!item.term || !item.meaning) return;
    const meaningOptions = buildOptions(vocabMeanings, index, item.meaning);
    questionBank.push({
      id: `vocab-meaning-${index}`,
      type: 'vocab',
      prompt: `ما معنى كلمة "${item.term}"؟`,
      options: meaningOptions,
      correctIndex: meaningOptions.indexOf(item.meaning),
      category: 'exploration'
    });
    const termOptions = buildOptions(vocabTerms, index + 10, item.term);
    questionBank.push({
      id: `vocab-term-${index}`,
      type: 'term',
      prompt: `أي مصطلح يناسب التعريف: "${item.meaning}"؟`,
      options: termOptions,
      correctIndex: termOptions.indexOf(item.term),
      category: 'exploration'
    });
  });

  lessonExamples.forEach((item, index) => {
    const options = buildOptions(lessons, index, item.lesson);
    questionBank.push({
      id: `example-${index}`,
      type: 'example',
      prompt: `هذا المثال يخص أي درس؟ ${item.example}`,
      options,
      correctIndex: options.indexOf(item.lesson),
      category: 'exploration'
    });
  });

  lessonKeyPoints.forEach((item, index) => {
    const options = buildOptions(lessons, index, item.lesson);
    questionBank.push({
      id: `keypoint-${index}`,
      type: 'keypoint',
      prompt: `هذه النقطة تخص أي درس؟ ${item.point}`,
      options,
      correctIndex: options.indexOf(item.lesson),
      category: 'exploration'
    });
  });

  lessonObjectives.forEach((item, index) => {
    const options = buildOptions(lessons, index + 5, item.lesson);
    questionBank.push({
      id: `objective-${index}`,
      type: 'objective',
      prompt: `هذا الهدف مرتبط بأي درس؟ ${item.objective}`,
      options,
      correctIndex: options.indexOf(item.lesson),
      category: 'exploration'
    });
  });

  lessonSecrets.forEach((item, index) => {
    const options = buildOptions(lessons, index + 9, item.lesson);
    questionBank.push({
      id: `secret-${index}`,
      type: 'secret',
      prompt: `سر "${item.title}" يخص أي درس؟`,
      options,
      correctIndex: options.indexOf(item.lesson),
      category: 'exploration'
    });
  });

  lessonFunFacts.forEach((item, index) => {
    const options = buildOptions(lessons, index + 13, item.lesson);
    questionBank.push({
      id: `funfact-${index}`,
      type: 'funfact',
      prompt: `هذه المعلومة تخص أي درس؟ ${item.fact}`,
      options,
      correctIndex: options.indexOf(item.lesson),
      category: 'exploration'
    });
  });

  lessonMedia.forEach((item, index) => {
    const options = buildOptions(lessons, index + 17, item.lesson);
    questionBank.push({
      id: `media-${index}`,
      type: 'media',
      prompt: `هذا العنوان يخص أي درس؟ ${item.title}`,
      options,
      correctIndex: options.indexOf(item.lesson),
      category: 'exploration'
    });
  });

  lessonSecrets.forEach((item, index) => {
    const secretTitles = lessonSecrets.map((secret) => secret.title);
    const options = buildOptions(secretTitles, index + 21, item.title);
    questionBank.push({
      id: `secret-title-${index}`,
      type: 'secret-title',
      prompt: `أي عنوان سرّ مرتبط بالدرس "${item.lesson}"؟`,
      options,
      correctIndex: options.indexOf(item.title),
      category: 'exploration'
    });
  });

  lessonFunFacts.forEach((item, index) => {
    const factsPool = lessonFunFacts.map((fact) => fact.fact);
    const options = buildOptions(factsPool, index + 29, item.fact);
    questionBank.push({
      id: `funfact-pick-${index}`,
      type: 'funfact-pick',
      prompt: `اختر المعلومة التي تتبع درس "${item.lesson}"`,
      options,
      correctIndex: options.indexOf(item.fact),
      category: 'exploration'
    });
  });

  const emojiByCategory = EMOJI_CHOICES.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});
  const categories = Object.keys(emojiByCategory);
  categories.forEach((category, index) => {
    const group = emojiByCategory[category] || [];
    const otherCategory = categories[(index + 1) % categories.length];
    const otherGroup = emojiByCategory[otherCategory] || [];
    if (group.length < 3 || otherGroup.length < 1) return;
    const base = [0, 1, 2].map((offset) => group[(index + offset) % group.length]);
    const odd = otherGroup[index % otherGroup.length];
    const optionsPool = [
      ...base.map((item) => `${item.emoji} ${item.label}`),
      `${odd.emoji} ${odd.label}`
    ];
    const options = shuffleWithSeed(optionsPool, index + 77);
    questionBank.push({
      id: `odd-${index}`,
      type: 'odd',
      prompt: 'اختر المختلف من بين الرموز التالية',
      options,
      correctIndex: options.indexOf(`${odd.emoji} ${odd.label}`),
      category
    });
  });

  ALL_GENERAL_FACTS.forEach((fact, index) => {
    questionBank.push({
      id: `fact-true-${index}`,
      type: 'tf',
      prompt: fact.text,
      options: ['صح', 'غلط'],
      correctIndex: fact.answer ? 0 : 1,
      category: fact.category
    });
    questionBank.push({
      id: `fact-false-${index}`,
      type: 'tf',
      prompt: `هل العبارة التالية خاطئة؟ ${fact.text}`,
      options: ['نعم', 'لا'],
      correctIndex: fact.answer ? 1 : 0,
      category: fact.category
    });
  });

  let seed = 0;
  while (questionBank.length < TARGET_QUESTION_COUNT) {
    const lesson = lessons[seed % lessons.length];
    const location = locations[seed % locations.length];
    const mixType = seed % 10;

    if (mixType === 0) {
      const options = buildOptions(lessons, seed, lesson);
      const prompts = [
        `اختر الدرس الصحيح من وحدة ${unitTitle}.`,
        `أي درس من دروس وحدة ${unitTitle}؟`,
        `يا بطل! اختار درس من وحدة ${unitTitle}.`
      ];
      questionBank.push({
        id: `mix-lesson-${seed}`,
        type: 'mcq',
        prompt: prompts[seed % prompts.length],
        options,
        correctIndex: options.indexOf(lesson),
        category: 'exploration'
      });
    } else if (mixType === 1) {
      const options = buildOptions(locations, seed, location);
      const prompts = [
        'حدد موقعًا من مواقع كنوز مصر.',
        'أي اسم مكان موجود على الخريطة؟',
        'يا بطل! اختار مكان من الخريطة.'
      ];
      questionBank.push({
        id: `mix-location-${seed}`,
        type: 'mcq',
        prompt: prompts[seed % prompts.length],
        options,
        correctIndex: options.indexOf(location),
        category: 'exploration'
      });
    } else if (mixType === 2) {
      const useShape = seed % 2 === 0;
      const poolSource = useShape ? SHAPE_CHOICES : EMOJI_CHOICES;
      const choice = poolSource[seed % poolSource.length];
      const pool = poolSource.map((item) => `${item.emoji} ${item.label}`);
      const correct = `${choice.emoji} ${choice.label}`;
      const options = buildOptions(pool, seed, correct);
      questionBank.push({
        id: `mix-visual-${seed}`,
        type: useShape ? 'shape' : 'emoji',
        prompt: `اختر ${useShape ? 'الشكل' : 'الرمز'} الأقرب لمعنى "${choice.label}".`,
        options,
        correctIndex: options.indexOf(correct),
        category: choice.category
      });
    } else if (mixType === 3) {
      const fact = ALL_GENERAL_FACTS[seed % ALL_GENERAL_FACTS.length];
      const askYesNo = seed % 2 === 0;
      questionBank.push({
        id: `mix-fact-${seed}`,
        type: 'tf',
        prompt: askYesNo ? `هل العبارة صحيحة؟ ${fact.text}` : fact.text,
        options: askYesNo ? ['نعم', 'لا'] : ['صح', 'غلط'],
        correctIndex: askYesNo ? (fact.answer ? 0 : 1) : (fact.answer ? 0 : 1),
        category: fact.category
      });
    } else if (mixType === 4) {
      const item = EMOJI_CHOICES[seed % EMOJI_CHOICES.length];
      const categoryChoice = CATEGORY_CHOICES.find((c) => c.category === item.category);
      if (categoryChoice && categoryPool.length >= 3) {
        const correct = `${categoryChoice.emoji} ${categoryChoice.label}`;
        const options = buildOptions(categoryPool, seed, correct);
        questionBank.push({
          id: `mix-category-${seed}`,
          type: 'category',
          prompt: `الرمز ${item.emoji} "${item.label}" يتبع أي قسم؟`,
          options,
          correctIndex: options.indexOf(correct),
          category: item.category
        });
      }
    } else if (mixType === 5) {
      const loc = mapLocations[seed % mapLocations.length];
      if (loc?.governorate && governorates.length >= 3) {
        const options = buildOptions(governorates, seed, loc.governorate);
        questionBank.push({
          id: `mix-gov-${seed}`,
          type: 'governorate',
          prompt: `في أي محافظة يوجد ${loc.name}؟`,
          options,
          correctIndex: options.indexOf(loc.governorate),
          category: loc.category || 'exploration',
          hint: loc.characterDialog?.location || loc.simpleInfo?.where
        });
      }
    } else if (mixType === 6) {
      const item = vocabItems[seed % vocabItems.length];
      if (item?.term && item?.meaning) {
        const options = buildOptions(vocabMeanings, seed, item.meaning);
        questionBank.push({
          id: `mix-vocab-${seed}`,
          type: 'vocab',
          prompt: `ما معنى كلمة "${item.term}"؟`,
          options,
          correctIndex: options.indexOf(item.meaning),
          category: getLessonCategory(item.lessonId, `${item.term} ${item.meaning}`)
        });
      }
    } else if (mixType === 7) {
      const q = lessonPracticeQuestions[seed % lessonPracticeQuestions.length];
      if (q?.question && q?.options?.length) {
        const translated = (q.options || []).map(translateOption);
        const { options, correctIndex } = shuffleQuestionOptions(translated, q.correctIndex, seed + 7000);
        questionBank.push({
          id: `mix-practice-${seed}`,
          type: 'practice',
          prompt: `(${q.lesson}) ${q.question}`,
          options,
          correctIndex,
          category: getLessonCategory(q.lessonId, `${q.question} ${translated.join(' ')}`),
          hint: q.hint
        });
      }
    } else if (mixType === 8) {
      const q = locationQuizQuestions[seed % locationQuizQuestions.length];
      if (q?.question && q?.options?.length) {
        const translated = (q.options || []).map(translateOption);
        const { options, correctIndex } = shuffleQuestionOptions(translated, q.correct, seed + 8000);
        questionBank.push({
          id: `mix-locquiz-${seed}`,
          type: 'loc-quiz',
          prompt: `(${q.location}) ${q.question}`,
          options,
          correctIndex,
          category: q.category || 'exploration',
          hint: q.hint
        });
      }
    } else {
      const category = categories[seed % categories.length];
      const group = emojiByCategory[category] || [];
      const otherCategory = categories[(seed + 1) % categories.length];
      const otherGroup = emojiByCategory[otherCategory] || [];
      if (group.length >= 2 && otherGroup.length >= 1) {
        const base = [0, 1, 2].map((offset) => group[(seed + offset) % group.length]);
        const odd = otherGroup[seed % otherGroup.length];
        const optionsPool = [
          ...base.map((item) => `${item.emoji} ${item.label}`),
          `${odd.emoji} ${odd.label}`
        ];
        const options = shuffleWithSeed(optionsPool, seed + 77);
        questionBank.push({
          id: `mix-odd-${seed}`,
          type: 'odd',
          prompt: 'اختر المختلف من بين الرموز التالية',
          options,
          correctIndex: options.indexOf(`${odd.emoji} ${odd.label}`),
          category
        });
      }
    }
    seed += 1;
  }

  return questionBank.slice(0, TARGET_QUESTION_COUNT);
};

const getProfileFromAnswers = (answers) => {
  if (!answers.length) {
    return { title: 'بطل الاستكشاف', focus: 'ابدأ التحدي لتظهر نتيجتك', color: 'from-slate-400 to-slate-500' };
  }
  const scoreMap = answers.reduce((acc, answer) => {
    const weight = answer.correct ? 2 : 1;
    acc[answer.category] = (acc[answer.category] || 0) + weight;
    return acc;
  }, {});
  const topCategory = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'exploration';
  return PERSONA_MAP[topCategory] || PERSONA_MAP.exploration;
};

const getChallengeModeById = (modeId) => (
  CHALLENGE_MODES.find((mode) => mode.id === modeId) || CHALLENGE_MODES[0]
);



export default function AwardsPage() {

  const { totalPoints, currentLevel, earnedBadges, visitedLocations, playerName } = useGameStore();

  const questionBank = useMemo(() => buildQuestionBank(), []);
  const [challengeMode, setChallengeMode] = useState('adventure');
  const [focusCategory, setFocusCategory] = useState('all');
  const [sessionSize, setSessionSize] = useState(20);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastTimedOut, setLastTimedOut] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const activeMode = useMemo(() => getChallengeModeById(challengeMode), [challengeMode]);
  const questionPool = useMemo(() => {
    let pool = [...questionBank];

    if (Array.isArray(activeMode.allowedTypes) && activeMode.allowedTypes.length) {
      const allowed = new Set(activeMode.allowedTypes);
      pool = pool.filter((question) => allowed.has(question.type));
    }

    if (activeMode.id === 'focus' && focusCategory !== 'all') {
      pool = pool.filter((question) => question.category === focusCategory);
    }

    return pool.length ? pool : questionBank;
  }, [questionBank, activeMode, focusCategory]);

  const hasSessionStarted = sessionQuestions.length > 0;
  const activeQuestions = hasSessionStarted ? sessionQuestions : [];
  const currentQuestion = activeQuestions[currentQuestionIndex];
  const answeredCount = quizAnswers.length;
  const correctCount = quizAnswers.filter((answer) => answer.correct).length;
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const profile = useMemo(() => getProfileFromAnswers(quizAnswers), [quizAnswers]);
  const sessionProgress = activeQuestions.length ? Math.round((currentQuestionIndex / activeQuestions.length) * 100) : 0;



  const currentLevelData = LEVELS_SYSTEM.levels.find(l => l.id === currentLevel) || LEVELS_SYSTEM.levels[0];

  const progress = ((totalPoints - currentLevelData.minPoints) / (currentLevelData.maxPoints - currentLevelData.minPoints)) * 100;



  const triggerCelebration = () => {

    confetti({

      particleCount: 100,

      spread: 70,

      origin: { y: 0.6 }

    });

  };



  const displayName = (playerName && playerName.trim()) ? playerName : 'بطل المنصة';

  const issuedDate = new Date().toLocaleDateString('ar-EG');
  const gradeLabel = CURRICULUM_DATA.grade?.label || 'الصف الخامس الابتدائي';
  const termLabel = CURRICULUM_DATA.term?.label || 'الفصل الدراسي الأول';
  const unitNumber = CURRICULUM_DATA.unit?.number || 3;
  const unitTitle = CURRICULUM_DATA.unit?.title || 'كنوز مصر';
  const unitLabel = `الوحدة ${unitNumber}: ${unitTitle}`;
  const challengeSummary = answeredCount
    ? `نتيجة التحدي: ${quizScore} نقطة | إجابات صحيحة: ${correctCount} من ${answeredCount} | نسبة النجاح: ${accuracy}% | أفضل سلسلة: ${bestStreak}`
    : 'لم يبدأ تحدي الجوائز بعد - ابدأ التحدي لإظهار نتيجة الشهادة.';
  const badgeCount = earnedBadges?.length || 0;

  const handleStartSession = () => {
    const shuffled = shuffleWithSeed(questionPool, Date.now());
    const picked = shuffled.slice(0, Math.min(sessionSize, questionPool.length));
    setSessionQuestions(picked);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizAnswers([]);
    setShowFeedback(false);
    setLastCorrect(null);
    setLastPoints(0);
    setLastTimedOut(false);
    setShowHint(false);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(activeMode.secondsPerQuestion || 0);
  };

  const handleAnswer = (optionIndex, timedOut = false) => {
    if (!currentQuestion || showFeedback) return;
    const isCorrect = !timedOut && optionIndex === currentQuestion.correctIndex;
    let pointsNow = 0;
    setLastCorrect(isCorrect);
    setLastTimedOut(timedOut);
    setShowFeedback(true);
    if (isCorrect) {
      pointsNow = 10;
      if (activeMode.secondsPerQuestion > 0) {
        pointsNow += Math.max(0, Math.min(5, Math.ceil(timeLeft / 3)));
      }
      if (streak >= 2) {
        pointsNow += 5;
      }
      setQuizScore((prev) => prev + pointsNow);
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      confetti({ particleCount: streak + 1 >= 5 ? 90 : 60, spread: 82, origin: { y: 0.6 } });
    } else {
      setStreak(0);
    }
    setLastPoints(pointsNow);
    setQuizAnswers((prev) => [
      ...prev,
      {
        id: currentQuestion.id,
        category: currentQuestion.category,
        correct: isCorrect,
        mode: activeMode.id,
        type: currentQuestion.type
      }
    ]);
    setTimeout(() => {
      setShowFeedback(false);
      setLastCorrect(null);
      setLastTimedOut(false);
      setShowHint(false);
      setTimeLeft(activeMode.secondsPerQuestion || 0);
      setCurrentQuestionIndex((prev) => Math.min(prev + 1, activeQuestions.length));
    }, 760);
  };

  useEffect(() => {
    setShowHint(false);
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (!activeMode.secondsPerQuestion || !currentQuestion) {
      setTimeLeft(0);
      return;
    }
    setTimeLeft(activeMode.secondsPerQuestion);
  }, [activeMode.id, currentQuestion?.id]);

  useEffect(() => {
    if (!activeMode.secondsPerQuestion || !currentQuestion || showFeedback) return;
    if (timeLeft <= 0) {
      handleAnswer(-1, true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, activeMode.secondsPerQuestion, currentQuestion?.id, showFeedback]);

  const sessionFinished = hasSessionStarted && currentQuestionIndex >= activeQuestions.length;



  return (

    <div data-tts-root className="kid-treasure-awards min-h-screen p-4 md:p-8 relative overflow-hidden" style={{backgroundImage: 'linear-gradient(120deg, #FFD700 0%, #FF69B4 20%, #87CEEB 40%, #90EE90 60%, #FFB347 80%, #DDA0DD 100%)'}}>
      <div className="magic-orbs">
        <span className="magic-orb orb-1" />
        <span className="magic-orb orb-2" />
        <span className="magic-orb orb-3" />
        <span className="magic-orb orb-4" />
      </div>

      <div className="awards-shell max-w-5xl mx-auto no-print relative z-10">

        <motion.div

          initial={{ scale: 0.8, opacity: 0 }}

          animate={{ scale: 1, opacity: 1 }}

          className="awards-hero-board bg-white rounded-3xl p-8 mb-6 shadow-2xl text-center gradient-border interactive-card"

        >

          <motion.div

            animate={{ rotate: [0, 10, -10, 10, 0] }}

            transition={{ duration: 2, repeat: Infinity }}

            className="text-8xl mb-4"

          >

            {currentLevelData.emoji}

          </motion.div>

          <h1 className="text-4xl font-black mb-2">{currentLevelData.name}</h1>

          <p className="text-2xl text-gray-600 mb-4">{currentLevelData.description}</p>



          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-4">

            <p className="text-6xl font-black text-white">{totalPoints}</p>

            <p className="text-white text-xl font-bold">نقطة</p>

          </div>



          <div className="progress-bar mb-2">

            <div className="progress-fill" style={{ width: `${progress}%` }} />

          </div>

          <p className="text-sm text-gray-600">

            {Math.round(progress)}% للمستوى التالي

          </p>

        </motion.div>



        {/* Stats */}

        <div className="awards-stats-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <motion.div

            whileHover={{ scale: 1.05 }}

            className="awards-stat-card bg-white rounded-2xl p-6 shadow-lg text-center"

          >

            <div className="text-4xl mb-2"></div>

            <p className="text-3xl font-black">{visitedLocations.length}</p>

            <p className="text-sm text-gray-600">مكان مكتشف</p>

          </motion.div>



          <motion.div

            whileHover={{ scale: 1.05 }}

            className="awards-stat-card bg-white rounded-2xl p-6 shadow-lg text-center"

          >

            <div className="text-4xl mb-2"></div>

            <p className="text-3xl font-black">{earnedBadges.length}</p>

            <p className="text-sm text-gray-600">شارة</p>

          </motion.div>



          <motion.div

            whileHover={{ scale: 1.05 }}

            className="awards-stat-card bg-white rounded-2xl p-6 shadow-lg text-center"

          >

            <div className="text-4xl mb-2"></div>

            <p className="text-3xl font-black">{totalPoints}</p>

            <p className="text-sm text-gray-600">نقطة</p>

          </motion.div>

        </div>



        



        

        













        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="awards-levels-board bg-white/90 backdrop-blur-md rounded-[32px] p-6 md:p-8 mb-8 shadow-xl border-2 border-white"
        >
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 text-right">مستويات الجوائز</h2>
          <div className="grid md:grid-cols-3 gap-4 text-right">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">
              <h4 className="font-black text-slate-800 mb-2">شارات الاستكشاف</h4>
              <p className="text-sm text-slate-600 font-bold">تزور مواقع جديدة على الخريطة وتجمع نقاط.</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">
              <h4 className="font-black text-slate-800 mb-2">شارات الدروس</h4>
              <p className="text-sm text-slate-600 font-bold">تكمل درس وتفهم أهدافه وتحصل على شارة.</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card">
              <h4 className="font-black text-slate-800 mb-2">شارات التفوق</h4>
              <p className="text-sm text-slate-600 font-bold">تحقق نتيجة عالية في الاختبارات.</p>
            </div>
          </div>
        </motion.div>

        {/* Interactive Quiz */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="awards-challenge-board bg-white/95 backdrop-blur-md rounded-[32px] p-6 md:p-8 mb-8 shadow-xl border-2 border-white text-right relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-200/40 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-purple-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-emerald-200/40 rounded-full blur-2xl" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">تحدي الجوائز التفاعلي</h2>
              <p className="text-slate-600 font-bold">
                أكثر من {TARGET_QUESTION_COUNT}+ سؤال بأنواع مختلفة للأطفال. كل إجابة تظهر في شهادتك.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SESSION_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSessionSize(count)}
                  className={`awards-session-chip px-4 py-2 rounded-full text-sm font-black border transition-all interactive-chip ${sessionSize === count
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200'}`}
                >
                  {count === 2000 ? 'تحدي 2000' : `${count} سؤال`}
                </button>
              ))}
              <button
                type="button"
                onClick={handleStartSession}
                className="awards-start-btn px-4 py-2 rounded-full text-sm font-black bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg glow-button kid-button"
              >
                ابدأ {activeMode.label}
              </button>
            </div>
          </div>

          <div className="awards-mode-grid grid md:grid-cols-5 gap-3 mb-5">
            {CHALLENGE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setChallengeMode(mode.id);
                  setSessionQuestions([]);
                  setCurrentQuestionIndex(0);
                  setQuizScore(0);
                  setQuizAnswers([]);
                  setShowFeedback(false);
                  setLastCorrect(null);
                  setLastPoints(0);
                  setLastTimedOut(false);
                  setShowHint(false);
                  setStreak(0);
                  setBestStreak(0);
                  setTimeLeft(mode.secondsPerQuestion || 0);
                }}
                className={`awards-mode-card rounded-2xl border-2 p-3 text-right transition-all ${challengeMode === mode.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-lg'
                  : 'border-white/70 bg-white/80 text-slate-700 hover:border-indigo-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{mode.emoji}</span>
                  {mode.secondsPerQuestion > 0 && (
                    <span className="text-[10px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                      {mode.secondsPerQuestion}ث
                    </span>
                  )}
                </div>
                <p className="text-sm font-black">{mode.label}</p>
                <p className="text-[11px] font-bold opacity-80 mt-1 leading-relaxed">{mode.description}</p>
              </button>
            ))}
          </div>

          {activeMode.id === 'focus' && (
            <div className="awards-focus-bar bg-white/85 rounded-2xl border border-white px-3 py-3 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-600">اختار المجال:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFocusCategory('all');
                    setSessionQuestions([]);
                    setCurrentQuestionIndex(0);
                    setQuizScore(0);
                    setQuizAnswers([]);
                    setShowFeedback(false);
                    setLastCorrect(null);
                    setLastPoints(0);
                    setLastTimedOut(false);
                    setShowHint(false);
                    setStreak(0);
                    setBestStreak(0);
                    setTimeLeft(activeMode.secondsPerQuestion || 0);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-black border transition ${focusCategory === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  كل المجالات
                </button>
                {CATEGORY_CHOICES.map((category) => (
                  <button
                    key={category.category}
                    type="button"
                    onClick={() => {
                      setFocusCategory(category.category);
                      setSessionQuestions([]);
                      setCurrentQuestionIndex(0);
                      setQuizScore(0);
                      setQuizAnswers([]);
                      setShowFeedback(false);
                      setLastCorrect(null);
                      setLastPoints(0);
                      setLastTimedOut(false);
                      setShowHint(false);
                      setStreak(0);
                      setBestStreak(0);
                      setTimeLeft(activeMode.secondsPerQuestion || 0);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-black border transition ${focusCategory === category.category
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {category.emoji} {category.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs font-black text-slate-500 mb-4">
            الوضع الحالي: {activeMode.emoji} {activeMode.label} | بنك الأسئلة المتاح: {questionPool.length} سؤال
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="awards-metric-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card text-center">
              <div className="text-3xl font-black text-slate-800">{answeredCount}</div>
              <div className="text-xs font-bold text-slate-500">عدد الإجابات</div>
            </div>
            <div className="awards-metric-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card text-center">
              <div className="text-3xl font-black text-slate-800">{quizScore}</div>
              <div className="text-xs font-bold text-slate-500">نقاط التحدي</div>
            </div>
            <div className="awards-metric-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card text-center">
              <div className="text-3xl font-black text-slate-800">{accuracy}%</div>
              <div className="text-xs font-bold text-slate-500">نسبة النجاح</div>
            </div>
            <div className="awards-metric-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card text-center">
              <div className="text-3xl font-black text-slate-800">{streak}</div>
              <div className="text-xs font-bold text-slate-500">السلسلة الحالية </div>
            </div>
            <div className="awards-metric-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm interactive-card text-center">
              <div className="text-3xl font-black text-slate-800">{bestStreak}</div>
              <div className="text-xs font-bold text-slate-500">أفضل سلسلة</div>
            </div>
          </div>

          {sessionFinished ? (
            <div className="bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 rounded-3xl p-6 text-center">
              <div className="text-4xl mb-3"></div>
              <h3 className="text-2xl font-black text-emerald-700 mb-2">أحسنت! خلصت التحدي</h3>
              <p className="text-slate-600 font-bold">
                لقبك الآن: <span className="text-slate-900">{profile.title}</span>  تركيزك: {profile.focus}
              </p>
              <p className="text-sm font-black text-slate-500 mt-2">
                وضع الجولة: {activeMode.emoji} {activeMode.label} | أفضل سلسلة: {bestStreak}
              </p>
              <button
                type="button"
                onClick={handleStartSession}
                className="mt-4 px-6 py-2 rounded-full text-sm font-black bg-emerald-500 text-white shadow-lg glow-button kid-button"
              >
                ابدأ جولة جديدة
              </button>
            </div>
          ) : !hasSessionStarted ? (
            <div className="awards-ready-card bg-white/85 border border-white rounded-3xl p-6 text-center">
              <div className="text-5xl mb-3">{activeMode.emoji}</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">جاهز للجولة؟</h3>
              <p className="text-sm md:text-base font-bold text-slate-600 leading-relaxed">
                اختر عدد الأسئلة والطريقة المناسبة لطفلك ثم اضغط "ابدأ {activeMode.label}".
              </p>
              <p className="mt-3 text-xs font-black text-slate-500">
                في هذا الوضع يوجد {questionPool.length} سؤال متاح.
              </p>
            </div>
          ) : (
            currentQuestion && (
              <div className="awards-question-card bg-white rounded-3xl p-6 md:p-8 border-2 border-slate-100 shadow-xl interactive-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-black bg-slate-100 px-3 py-1 rounded-full">
                    سؤال {currentQuestionIndex + 1} من {activeQuestions.length}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="awards-question-chip text-xs font-black text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                      وضع: {activeMode.emoji} {activeMode.label}
                    </span>
                    <span className="awards-question-chip text-xs font-black text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                       سلسلة: {streak}
                    </span>
                    <span className="awards-question-chip text-xs font-black text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                      نوع: {QUESTION_TYPE_LABELS[currentQuestion.type] || 'اختيار'}
                    </span>
                    {activeMode.secondsPerQuestion > 0 && (
                      <span
                        className={`awards-timer-chip text-xs font-black px-3 py-1 rounded-full border ${timeLeft <= 5
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                      >
                         {timeLeft} ث
                      </span>
                    )}
                    {currentQuestion.hint && (
                      <button
                        type="button"
                        onClick={() => setShowHint((prev) => !prev)}
                        className={`awards-hint-btn text-xs font-black px-3 py-1 rounded-full border transition ${showHint ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}
                      >
                        {showHint ? 'إخفاء التلميح' : ' تلميح'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="progress-bar mb-4">
                  <div className="progress-fill" style={{ width: `${sessionProgress}%` }} />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6">{currentQuestion.prompt}</h3>
                {currentQuestion.hint && showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 text-right"
                  >
                    <p className="text-sm font-black text-amber-800"> {currentQuestion.hint}</p>
                  </motion.div>
                )}
                <div className={`grid gap-4 ${VISUAL_TYPES.has(currentQuestion.type) ? 'grid-cols-2 md:grid-cols-4' : 'md:grid-cols-2'}`}>
                  {currentQuestion.options.map((option, index) => {
                    const isVisual = VISUAL_TYPES.has(currentQuestion.type);
                    const emojiSymbol = isVisual ? option.split(' ')[0] : null;
                    const emojiLabel = isVisual ? option.split(' ').slice(1).join(' ') : null;
                    return (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        type="button"
                        onClick={() => handleAnswer(index)}
                        className={`awards-option-button p-4 rounded-2xl border-2 text-right font-black transition-all interactive-card ${showFeedback
                          ? index === currentQuestion.correctIndex
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'}`}
                        disabled={showFeedback}
                      >
                        {isVisual ? (
                          <div className="flex flex-col items-center gap-2 text-center">
                            <span className="text-4xl">{emojiSymbol}</span>
                            <span className="text-sm font-black text-slate-700">{emojiLabel}</span>
                          </div>
                        ) : currentQuestion.type === 'tf' ? (
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{option}</span>
                            <span className="text-2xl">{index === 0 ? '' : ''}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            <span className="text-lg">{['', '', '', '', '', ''][index % 6]}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {showFeedback && (
                  <div className={`mt-4 text-sm font-black ${lastCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {lastCorrect
                      ? `إجابة صحيحة!  +${lastPoints} نقطة`
                      : lastTimedOut
                        ? 'انتهى الوقت  حاول بسرعة في السؤال القادم'
                        : 'حاول مرة تانية في السؤال القادم '}
                  </div>
                )}
              </div>
            )
          )}
        </motion.div>

        {/* Badges */}

        <motion.div

          initial={{ y: 20, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          className="awards-badges-board bg-white rounded-3xl p-6 shadow-2xl"

        >

          <h2 className="text-2xl font-black mb-4"> شاراتي</h2>

          {earnedBadges.length > 0 ? (

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {earnedBadges.map((badgeId, index) => {

                const badge = LEVELS_SYSTEM.badges.find(b => b.id === badgeId) || { name: badgeId, emoji: '' };

                return (

                  <motion.div

                    key={badgeId}

                    initial={{ scale: 0, rotate: -180, opacity: 0 }}

                    animate={{ scale: 1, rotate: 0, opacity: 1 }}

                    transition={{ delay: index * 0.12, type: "spring", stiffness: 120, damping: 18 }}

                    whileHover={{ scale: 1.15, rotate: 10 }}

                    whileTap={{ scale: 0.92 }}

                    className="awards-badge-card bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white text-center cursor-pointer shadow-lg interactive-card glow-button animate-bounce-kids stagger-item"

                    onClick={triggerCelebration}

                  >

                    <motion.div 

                      animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}

                      transition={{ duration: 2, repeat: Infinity }}

                      className="text-5xl mb-2 drop-shadow-lg"

                    >

                      {badge.emoji}

                    </motion.div>

                    <p className="font-black text-sm">{badge.name}</p>

                  </motion.div>

                );

              })}

            </div>

          ) : (

            <div className="text-center py-8 text-gray-400">

              <div className="text-6xl mb-4"></div>

              <p className="text-xl">ابدأ الاستكشاف لتكسب شارات!</p>

            </div>

          )}

        </motion.div>



        {/* Certificate Preview */}

        <motion.div

          initial={{ y: 20, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          className="awards-certificate-board mt-10 bg-white/90 backdrop-blur-md rounded-[32px] p-6 md:p-8 shadow-xl border-2 border-white"

        >

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">

            <div className="text-right">

              <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">شهادة تقدير</h2>

              <p className="text-slate-600 font-bold">اطبع شهادتك باسمك واحتفظ بها كإنجاز.</p>

            </div>

            <button

              onClick={() => window.print()}

              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black shadow-lg hover:shadow-xl transition-all glow-button"

            >

              اطبع الشهادة

            </button>

          </div>

          <div className="relative overflow-hidden rounded-[30px] border-4 border-emerald-200 bg-gradient-to-br from-[#F5FFF7] via-white to-[#F0FBFF] p-6 md:p-8 text-center interactive-card">
            <div className="absolute -top-10 -left-8 w-36 h-36 rounded-full bg-emerald-100/60 blur-2xl" />
            <div className="absolute -bottom-12 -right-8 w-40 h-40 rounded-full bg-sky-100/60 blur-2xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-emerald-200 text-emerald-700 text-sm font-black shadow-sm mb-4">
                <span></span>
                <span>شهادة تقدير - منصة الخرائط التعليمية الذكية</span>
              </div>

              <p className="text-sm font-bold text-slate-500 mb-1">تُمنح للطالبة/للطالب</p>
              <h3 className="text-3xl md:text-4xl font-black text-slate-800 mb-3">{displayName}</h3>
              <p className="text-slate-700 font-bold mb-4 leading-relaxed">
                لإتمام أنشطة {unitLabel} بنجاح واجتياز تحديات المنصة التعليمية.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm font-black text-slate-700 mb-4">
                <span className="bg-white px-4 py-2 rounded-full border border-emerald-100">الصف: {gradeLabel}</span>
                <span className="bg-white px-4 py-2 rounded-full border border-indigo-100">الفصل: {termLabel}</span>
                <span className="bg-white px-4 py-2 rounded-full border border-amber-100">{unitLabel}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs font-black text-slate-500">النقاط الكلية</p>
                  <p className="text-2xl font-black text-slate-800">{totalPoints}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs font-black text-slate-500">المستوى الحالي</p>
                  <p className="text-lg font-black text-slate-800">{currentLevelData.name}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs font-black text-slate-500">عدد الشارات</p>
                  <p className="text-2xl font-black text-slate-800">{badgeCount}</p>
                </div>
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black bg-gradient-to-r ${profile.color} text-white shadow-lg`}>
                <span>لقب التحدي:</span>
                <span>{profile.title}</span>
              </div>
              <p className="mt-3 text-sm font-bold text-slate-600">تركيزك الأقوى: {profile.focus}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{challengeSummary}</p>
              <p className="mt-2 text-xs font-black text-slate-500">تاريخ الإصدار: {issuedDate}</p>
            </div>
          </div>

        </motion.div>

      </div>



      {/* Print-only Certificate */}

      <div id="certificate" className="print-only">

        <div className="certificate-sheet">

          <div className="certificate-border">

            <div className="certificate-corners" aria-hidden>
              <span className="certificate-corner tl"></span>
              <span className="certificate-corner tr"></span>
              <span className="certificate-corner bl"></span>
              <span className="certificate-corner br"></span>
            </div>

            <div className="certificate-ribbon">منصة الخرائط التعليمية الذكية</div>

            <div className="certificate-title">شهادة تقدير</div>

            <div className="certificate-subtitle">تُمنح للطالبة/للطالب</div>

            <div className="certificate-name">{displayName}</div>

            <div className="certificate-text">لإتمام أنشطة {unitLabel} بنجاح واجتياز تحديات المنصة التعليمية.</div>

            <div className="certificate-pill-row">
              <span className="certificate-pill">{gradeLabel}</span>
              <span className="certificate-pill">{termLabel}</span>
              <span className="certificate-pill">{unitLabel}</span>
            </div>

            <div className="certificate-kpis">
              <div className="certificate-kpi">
                <span>النقاط الكلية</span>
                <strong>{totalPoints}</strong>
              </div>
              <div className="certificate-kpi">
                <span>المستوى</span>
                <strong>{currentLevelData.name}</strong>
              </div>
              <div className="certificate-kpi">
                <span>الشارات</span>
                <strong>{badgeCount}</strong>
              </div>
            </div>

            <div className="certificate-meta">

              <span>لقب التحدي: {profile.title}</span>
              <span>تركيزك: {profile.focus}</span>
              <span>تاريخ الإصدار: {issuedDate}</span>

            </div>

            <div className="certificate-text certificate-highlight">{challengeSummary}</div>

            <div className="certificate-signatures">
              <div className="certificate-sign">
                <div className="certificate-sign-line" />
                <div className="certificate-sign-label">معلّم/ة المادة</div>
              </div>
              <div className="certificate-seal"></div>
              <div className="certificate-sign">
                <div className="certificate-sign-line" />
                <div className="certificate-sign-label">إدارة المنصة</div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>

  );

}


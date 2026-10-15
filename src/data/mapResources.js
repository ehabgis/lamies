export const MAP_RESOURCES = [
  { id: 'iron', label: 'الحديد', kind: 'mineral', color: '#426785', description: 'يوجد خام الحديد في مناطق مختلفة من مصر، ومن أهمها الواحات البحرية والصحراء الشرقية.', importance: 'يُستخدم الحديد في صناعة الحديد والصلب، ويدخل في كثير من الصناعات المهمة.', videoTitle: 'كيف نستخرج الحديد من باطن الأرض؟' },
  { id: 'manganese', label: 'المنجنيز', kind: 'mineral', color: '#8e22bf' },
  { id: 'phosphate', label: 'الفوسفات', kind: 'mineral', color: '#349135' },
  { id: 'gold', label: 'الذهب', kind: 'mineral', color: '#e6aa12' },
  { id: 'solar', label: 'الطاقة الشمسية', kind: 'renewable', color: '#edaa10' },
  { id: 'wind', label: 'طاقة الرياح', kind: 'renewable', color: '#0c9bc8' },
  { id: 'hydro', label: 'الطاقة الكهرومائية', kind: 'renewable', color: '#31a573' },
  { id: 'oil', label: 'البترول', kind: 'nonrenewable', color: '#183e73' },
  { id: 'gas', label: 'الغاز الطبيعي', kind: 'nonrenewable', color: '#087bdd' }
];

export const resourceForLocation = (location) => MAP_RESOURCES.find((resource) => location?.id?.startsWith(`${resource.id}-`));
export const matchesMapResource = (location, resource) => location?.id?.startsWith(`${resource.id}-`);

export function guideForStage(stage, resource) {
  const name = resource?.label || 'المورد';
  if (stage === 'resource') return { title: 'أحسنت! 👏', text: `أمامك الآن مواقع ${name === 'الحديد' ? 'خام الحديد' : name} في مصر، والمواقع المضيئة توضح أماكن وجوده. اضغط على أحد مواقع ${name} المضيئة لتتعرف عليه أكثر.` };
  if (stage === 'location') return { title: 'رائع يا مستكشف! 🌟', text: `لقد اكتشفت أحد مواقع ${name} في مصر، ويمكنك قراءة المعلومات الموجودة في بطاقة المعلومات. هل تريد مشاهدة فيديو يوضح ${name === 'الحديد' ? 'كيف نستخرج الحديد من باطن الأرض' : 'المزيد عن هذا المورد'}؟` };
  if (stage === 'reading') return { title: 'واصل الاستكشاف! 🌟', text: 'يمكنك قراءة بطاقة المعلومات، أو اختيار موقع آخر على الخريطة. تستطيع العودة للفيديو من رمز الكاميرا في أي وقت.' };
  if (stage === 'watched') return { title: 'أحسنت يا بطل! 👏', text: `لقد تعرفت على أماكن وجود ${name} في مصر، وشاهدت الفيديو التعليمي. هل أنت مستعد لاكتشاف ${resource?.kind === 'mineral' ? 'معدن' : 'مورد'} جديد؟` };
  if (stage === 'explore') return { title: 'هيا نكتشف موردًا جديدًا! 🌟', text: 'رائع! هيا نكتشف موردًا جديدًا. اختر أحد الموارد من مفتاح الخريطة.' };
  return { title: 'مرحبًا يا مستكشف مصر الصغير! 🌟', text: 'أمامك خريطة توضح مواقع الخامات المعدنية ومصادر الطاقة في مصر. هيا نبدأ رحلتنا! اختر أحد الموارد من مفتاح الخريطة لتتعرف على أماكن وجوده.' };
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CaretDown, Compass, GraduationCap, MapPin, Play, Sparkle, User } from 'phosphor-react';
import confetti from 'canvas-confetti';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { useGameStore } from '../store/gameStore';
import '../styles/welcome-entry.css';

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const storedName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);
  const [name, setName] = useState(storedName || '');
  const [term, setTerm] = useState('');
  const [lesson, setLesson] = useState('');
  const [errors, setErrors] = useState({});
  const [imageFailed, setImageFailed] = useState(false);
  const clearError = (field) => setErrors((current) => ({ ...current, [field]: '' }));
  const start = (event) => {
    event.preventDefault();
    const nextErrors = {
      name: name.trim() ? '' : 'اكتب اسمك لنبدأ الرحلة معًا.',
      term: term ? '' : 'اختر الفصل الدراسي أولًا.',
      lesson: lesson ? '' : 'اختر الدرس الذي تريد استكشافه.'
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      const first = Object.keys(nextErrors).find((key) => nextErrors[key]);
      document.getElementById(`entry-${first}`)?.focus();
      return;
    }
    if (!CURRICULUM_DATA.lessons.some((item) => item.id === lesson) || term !== 'term-1') return;
    setPlayerName(name.trim());
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 45, spread: 65, origin: { y: .75 }, colors: ['#ffc83d', '#079cda', '#25bc9a'], disableForReducedMotion: true });
    }
    navigate(`/lesson/${lesson}`);
  };
  return (
    <main className="entry-page" dir="rtl">
      <div className="entry-orb entry-orb-one" aria-hidden="true"/><div className="entry-orb entry-orb-two" aria-hidden="true"/>
      <header className="entry-brand"><span className="entry-brand-mark" aria-hidden="true"><BookOpen size={55} weight="duotone"/><MapPin size={28} weight="fill"/></span><div><h1>الخرائط التعليمية الذكية</h1><p>كل اكتشاف صغير… بداية لحكاية كبيرة</p></div></header>
      <div className="entry-layout">
        <section className="entry-visual" aria-label="مستكشف صغير مع الكرة الأرضية">
          <span className="entry-star entry-star-one" aria-hidden="true">✦</span><span className="entry-star entry-star-two" aria-hidden="true">✧</span>
          <div className="entry-globe-halo" aria-hidden="true"/>
          {!imageFailed ? <img className="entry-explorer-art" src="/welcome/explorer-globe.webp" alt="طفل مستكشف يحمل جهازًا لوحيًا ويشير إلى مصر على الكرة الأرضية" onError={() => setImageFailed(true)}/> : <div className="entry-art-fallback" role="img" aria-label="كرة أرضية وموقع مصر"><span>🌍</span><MapPin size={70} weight="fill"/></div>}
          <div className="entry-discovery-badge"><span><Compass size={24} weight="duotone"/></span><div><strong>مصر مليانة حكايات!</strong><small>اكتشف كنوزها… موقعًا بعد موقع</small></div></div>
        </section>
        <section className="entry-panel" aria-labelledby="entry-welcome-title">
          <span className="entry-eyebrow"><Sparkle size={18} weight="fill"/> رحلة جديدة تنتظرك</span>
          <h2 id="entry-welcome-title">مرحبًا بك<span className="entry-title-dot">!</span></h2>
          <p className="entry-greeting">يا مستكشف مصر الصغير <span aria-hidden="true">🌟</span></p>
          <p className="entry-description">خريطة تفاعلية، كنوز تستحق الاكتشاف،<br/>ومعلم ذكي يرافقك في كل خطوة.</p>
          <form onSubmit={start} noValidate className="entry-form">
            <div className="entry-field"><label htmlFor="entry-name">اسم المستكشف</label><div className={`entry-input-shell ${errors.name ? 'has-error' : ''}`}><User size={23} weight="duotone" aria-hidden="true"/><input id="entry-name" name="playerName" autoComplete="given-name" placeholder="اكتب اسمك هنا" value={name} maxLength={30} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'entry-name-error' : undefined} onChange={(event) => {setName(event.target.value);clearError('name');}}/></div>{errors.name && <p className="entry-error" id="entry-name-error" role="alert">{errors.name}</p>}</div>
            <div className="entry-field"><label htmlFor="entry-term">الفصل الدراسي</label><div className={`entry-input-shell ${errors.term ? 'has-error' : ''}`}><GraduationCap size={25} weight="duotone" aria-hidden="true"/><select id="entry-term" value={term} aria-invalid={Boolean(errors.term)} aria-describedby={errors.term ? 'entry-term-error' : undefined} onChange={(event) => {setTerm(event.target.value);setLesson('');clearError('term');clearError('lesson');}}><option value="" disabled>اختر الفصل الدراسي</option><option value="term-1">الفصل الدراسي الأول</option></select><CaretDown size={18} className="entry-select-arrow" aria-hidden="true"/></div>{errors.term && <p className="entry-error" id="entry-term-error" role="alert">{errors.term}</p>}</div>
            <div className="entry-field"><label htmlFor="entry-lesson">درس اليوم</label><div className={`entry-input-shell ${errors.lesson ? 'has-error' : ''}`}><BookOpen size={24} weight="duotone" aria-hidden="true"/><select id="entry-lesson" value={lesson} disabled={!term} aria-invalid={Boolean(errors.lesson)} aria-describedby={errors.lesson ? 'entry-lesson-error' : undefined} onChange={(event) => {setLesson(event.target.value);clearError('lesson');}}><option value="" disabled>{term ? 'اختر الدرس' : 'اختر الفصل الدراسي أولًا'}</option>{CURRICULUM_DATA.lessons.map((item,index) => <option key={item.id} value={item.id}>الدرس {['الأول','الثاني','الثالث'][index]}: {item.title}</option>)}</select><CaretDown size={18} className="entry-select-arrow" aria-hidden="true"/></div>{errors.lesson && <p className="entry-error" id="entry-lesson-error" role="alert">{errors.lesson}</p>}</div>
            <button className="entry-start" type="submit"><span>ابدأ رحلتك</span><span className="entry-start-icon"><Play size={22} weight="fill"/></span></button>
          </form>
          <p className="entry-grade"><GraduationCap size={18}/>الصف الخامس الابتدائي <span>•</span> الوحدة الثالثة: كنوز مصر</p>
        </section>
      </div>
      <footer className="entry-footer"><span><MapPin size={16} weight="fill"/> نكتشف مصر… ونتعلّم بحب</span><span>خطوتك الأولى تبدأ بالفضول <Sparkle size={15}/></span></footer>
    </main>
  );
}

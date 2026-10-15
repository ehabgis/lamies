import { useEffect, useRef, useState } from 'react';
import { CornersOut, Play, X } from 'phosphor-react';

export default function ResourceVideoModal({ video, onClose, onWatched }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();
    const keyboard = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled),video[controls],a[href]')];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keyboard, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);
  const play = async () => {
    try { await videoRef.current?.play(); setNotice(''); }
    catch { setNotice('تعذّر التشغيل. جرّب زر التشغيل داخل الفيديو أو تحقق من اتصال الإنترنت.'); }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (dialogRef.current?.requestFullscreen) await dialogRef.current.requestFullscreen();
      else setNotice('التكبير غير متاح في هذا المتصفح.');
    } catch { setNotice('تعذّر التكبير في هذا المتصفح.'); }
  };
  return <div className="resource-video-backdrop" onClick={onClose}>
    <section ref={dialogRef} className="resource-video-modal" role="dialog" aria-modal="true" aria-labelledby="resource-video-title" onClick={(event) => event.stopPropagation()} dir="rtl">
      <header><h2 id="resource-video-title">🎥 {video.title}</h2><button type="button" onClick={onClose} aria-label="إغلاق الفيديو"><X size={24}/></button></header>
      {video.url && !failed ? <video ref={videoRef} src={video.url} poster={video.poster || undefined} controls playsInline preload="metadata" onError={() => setFailed(true)} onEnded={() => { if (!completed) {setCompleted(true);onWatched();} }} aria-label={video.title}/> : <div className="resource-video-unavailable" role="status"><span>🎬</span><h3>الفيديو غير متاح حاليًا</h3><p>يمكنك متابعة استكشاف الخريطة وقراءة بطاقة المورد.</p></div>}
      <footer><button type="button" onClick={play} disabled={!video.url || failed}><Play size={19} weight="fill"/>تشغيل الفيديو</button><button type="button" onClick={fullscreen}><CornersOut size={22}/>تكبير</button><button type="button" onClick={onClose}>العودة للخريطة</button></footer>
      {completed && <p className="resource-video-completed" role="status">أحسنت! انتهى الفيديو. عُد إلى الخريطة لاكتشاف مورد آخر.</p>}
      {notice && <p role="status">{notice}</p>}
      {video.credit && <small className="resource-video-credit">المصدر: {video.credit}</small>}
    </section>
  </div>;
}

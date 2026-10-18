import { useEffect, useRef, useState } from "react";
import { X, VideoCamera, CornersOut, ArrowClockwise } from "phosphor-react";
export default function MapVideoPanel({ resource, location, onClose }) {
  // The chosen place's own video comes first, then the resource's video.
  const src = location?.media?.video || resource.media?.video;
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [message, setMessage] = useState("");
  const close = useRef(null),
    video = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus({ preventScroll: true });
    const escape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  async function expand() {
    try {
      if (video.current?.requestFullscreen)
        await video.current.requestFullscreen();
      else setMessage("ملء الشاشة غير متاح؛ يمكنك استخدام أدوات المشغل.");
    } catch {
      setMessage("تعذّر فتح ملء الشاشة. يمكنك متابعة العرض هنا.");
    }
  }
  return (
    <section
      className="map-video-panel"
      role="dialog"
      aria-label={`فيديو ${resource.label}`}
    >
      <header>
        <div>
          <VideoCamera size={24} />
          <div>
            <h2>اكتشف {resource.label} بالفيديو</h2>
            <p>{location?.name || "فيديو المورد"}</p>
          </div>
        </div>
        <button ref={close} aria-label="إغلاق فيديو المورد" onClick={onClose}>
          <X size={23} />
        </button>
      </header>
      <div className="map-video-stage">
        {src && !failed ? (
          <video
            ref={video}
            key={retry}
            src={src}
            poster={resource.media.image || undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            onLoadedMetadata={(e) => e.currentTarget.videoWidth === 0 && setFailed(true)}
          />
        ) : (
          <div className="map-video-placeholder">
            <VideoCamera size={46} weight="duotone" />
            <h3>{failed ? "تعذّر تحميل الفيديو" : "الفيديو قيد الإضافة"}</h3>
            <p>
              {failed
                ? "قد تكون صيغة الفيديو غير مدعومة في المتصفح. استخدم ملف MP4 بترميز H.264 (يمكن تحويله ببرنامج HandBrake المجاني)، ثم أعد المحاولة."
                : "لا يوجد فيديو مرفق لهذا المورد بعد. يمكنك متابعة استكشاف الخريطة وقراءة بطاقته."}
            </p>
            {failed && (
              <button
                onClick={() => {
                  setFailed(false);
                  setRetry((n) => n + 1);
                }}
              >
                <ArrowClockwise size={18} />
                إعادة المحاولة
              </button>
            )}
          </div>
        )}
      </div>
      <footer>
        <span>التشغيل باختيارك · تظل الخريطة في موقعها</span>
        <button disabled={!resource.media?.video || failed} onClick={expand}>
          <CornersOut size={18} />
          تكبير الفيديو
        </button>
      </footer>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

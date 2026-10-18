import { useState } from "react";
import { ImageSquare, VideoCamera } from "phosphor-react";

// Photos (with thumbnails) and a short video for the chosen place. Sound
// never starts by itself: the video waits for the child to press play.
export default function SiteMedia({ images, video, label }) {
  // A video added for this place is the first thing the child sees.
  const [tab, setTab] = useState(video ? "video" : "photos");
  const [current, setCurrent] = useState(0);
  const [broken, setBroken] = useState({});
  const [videoFailed, setVideoFailed] = useState(false);
  const shown = images.filter((img) => !broken[img.src]);
  const hasVideo = !!video;
  const photo = shown[Math.min(current, shown.length - 1)];

  if (!shown.length && !hasVideo)
    return (
      <div className="site-media is-empty">
        <ImageSquare size={34} aria-hidden="true" />
        <p>لم تُضف صورة أو فيديو لهذا الموقع بعد.</p>
      </div>
    );
  return (
    <div className="site-media">
      {shown.length > 0 && hasVideo && (
        <div className="site-media-tabs" role="tablist" aria-label="الوسائط">
          <button type="button" role="tab" aria-selected={tab === "photos"} onClick={() => setTab("photos")}>
            <ImageSquare size={18} aria-hidden="true" /> الصور ({shown.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === "video"} onClick={() => setTab("video")}>
            <VideoCamera size={18} aria-hidden="true" /> الفيديو
          </button>
        </div>
      )}
      {(tab === "photos" || !hasVideo) && photo ? (
        <figure className="site-media-photo">
          <img
            key={photo.src}
            src={photo.src}
            alt={`${label} — صورة ${current + 1}`}
            onError={() => setBroken((b) => ({ ...b, [photo.src]: true }))}
          />
          {photo.credit && <figcaption>{photo.credit}</figcaption>}
          {shown.length > 1 && (
            <div className="site-media-thumbs" role="group" aria-label="اختر صورة">
              {shown.map((img, i) => (
                <button
                  type="button"
                  key={img.src}
                  aria-pressed={img === photo}
                  aria-label={`الصورة ${i + 1}`}
                  onClick={() => setCurrent(i)}
                >
                  <img src={img.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </figure>
      ) : videoFailed ? (
        <div className="site-media is-empty" role="alert">
          <VideoCamera size={34} aria-hidden="true" />
          <p>
            تعذّر تشغيل هذا الفيديو في المتصفح. استخدم ملف MP4 بترميز H.264 وحجم أصغر (يمكن تحويله ببرنامج HandBrake
            المجاني).
          </p>
        </div>
      ) : (
        <figure className="site-media-video">
          <video
            src={video}
            controls
            playsInline
            preload="metadata"
            poster={shown[0]?.src}
            aria-label={`فيديو عن ${label}`}
            onError={() => setVideoFailed(true)}
            // Unsupported codecs (e.g. H.265 from phones) often load with no picture.
            onLoadedMetadata={(e) => e.currentTarget.videoWidth === 0 && setVideoFailed(true)}
          />
        </figure>
      )}
    </div>
  );
}

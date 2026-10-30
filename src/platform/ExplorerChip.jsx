import { useEffect, useState } from "react";
import { Star, SpeakerHigh, SpeakerSlash } from "phosphor-react";
import { isMuted, onMuteChange, play, setMuted } from "./sfx";
import ParentLinkButton from "./ParentLinkButton";

// The explorer's name at the top of the lesson, with stars earned in this
// lesson and the sound-effects switch.
export default function ExplorerChip({ name, solved = 0, total = 0 }) {
  const [muted, setLocalMuted] = useState(isMuted());
  useEffect(() => onMuteChange(setLocalMuted), []);
  const initial = [...(name || "م").trim()][0];
  return (
    <div className="explorer-chip">
      <span className="explorer-avatar" aria-hidden="true">
        {initial}
      </span>
      <span className="explorer-text">
        <small>المستكشف</small>
        <strong>{name}</strong>
      </span>
      <ParentLinkButton />
      {total > 0 && (
        <span className="explorer-stars" title="الأسئلة والأنشطة التي أنجزتها">
          <Star size={18} weight="fill" aria-hidden="true" />
          <bdi>{solved}</bdi>
          <span className="sr-only"> من {total}</span>
        </span>
      )}
      <button
        type="button"
        className="explorer-sound"
        aria-pressed={!muted}
        aria-label={muted ? "تشغيل المؤثرات الصوتية" : "إيقاف المؤثرات الصوتية"}
        title={muted ? "تشغيل المؤثرات الصوتية" : "إيقاف المؤثرات الصوتية"}
        onClick={() => {
          setMuted(!muted);
          if (muted) setTimeout(() => play("select"), 0);
        }}
      >
        {muted ? <SpeakerSlash size={22} weight="bold" /> : <SpeakerHigh size={22} weight="bold" />}
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  SpeakerHigh,
  SpeakerSlash,
} from "phosphor-react";
import * as narrator from "./narrator";

// Play / pause / replay / mute / volume for the robot's voice.
export default function NarrationControls({ text, spoken, compact = false }) {
  const [s, setS] = useState(narrator.getSettings());
  useEffect(() => narrator.subscribe(setS), []);
  if (!s.available)
    return <p className="narration-unavailable">الشرح الصوتي غير متاح على هذا المتصفح؛ النص ظاهر للقراءة.</p>;
  const speaking = s.state === "speaking";
  return (
    <div className={`narration-controls ${compact ? "is-compact" : ""}`} role="group" aria-label="الشرح الصوتي">
      <button
        type="button"
        disabled={s.muted}
        aria-label={speaking ? "إيقاف مؤقت للشرح" : s.state === "paused" ? "استئناف الشرح" : "استمع للشرح"}
        title={speaking ? "إيقاف مؤقت" : s.state === "paused" ? "استئناف" : "استمع"}
        onClick={() =>
          speaking ? narrator.pause() : s.state === "paused" ? narrator.resume() : narrator.speak(text, spoken)
        }
      >
        {speaking ? <Pause size={20} weight="bold" /> : <Play size={20} weight="fill" />}
        {!compact && <span>{speaking ? "إيقاف" : s.state === "paused" ? "استئناف" : "استمع"}</span>}
      </button>
      <button
        type="button"
        disabled={s.muted}
        aria-label="أعد الشرح"
        title="أعد الشرح"
        onClick={() => narrator.speak(text, spoken)}
      >
        <ArrowCounterClockwise size={20} weight="bold" />
      </button>
      <button
        type="button"
        aria-pressed={s.muted}
        aria-label={s.muted ? "تشغيل الصوت" : "كتم الصوت"}
        title={s.muted ? "تشغيل الصوت" : "كتم الصوت"}
        onClick={() => narrator.update({ muted: !s.muted })}
      >
        {s.muted ? <SpeakerSlash size={20} weight="bold" /> : <SpeakerHigh size={20} weight="bold" />}
      </button>
      {!compact && (
        <label className="narration-volume">
          <span className="sr-only">مستوى الصوت</span>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.1"
            value={s.volume}
            disabled={s.muted}
            onChange={(e) => narrator.update({ volume: Number(e.target.value) })}
          />
        </label>
      )}
    </div>
  );
}

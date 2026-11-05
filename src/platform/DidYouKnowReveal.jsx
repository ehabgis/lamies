import { useEffect, useState } from "react";
import { ArrowCounterClockwise, Lightbulb, SpeakerHigh } from "phosphor-react";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./did-you-know.css";

// «هل تعلم؟» on a resource card: first the kid and a yellow button; a tap
// shows the fact in a bubble beside the kid and reads it once (the tap is the
// child's own, so the voice is never automatic). «أعد الاستماع» reads it
// again; with more than one fact, «معلومة أخرى» shows the next.
export default function DidYouKnowReveal({ facts }) {
  const [at, setAt] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => narrator.subscribe((s) => setSpeaking(s.state === "speaking")), []);
  if (!facts?.length) return null;
  const fact = facts[at];
  const show = (i) => {
    play("star");
    setAt(i);
    narrator.speak(`هل تعلم؟ ${facts[i]}`);
  };

  return (
    <section className={`dyk ${fact ? "is-open" : ""}`} aria-label="هل تعلم؟">
      <img className="dyk-kid" src="/welcome/kid-face.webp" alt="" aria-hidden="true" />
      {fact ? (
        <div className="dyk-bubble" role="status">
          <b>
            <Lightbulb size={20} weight="fill" aria-hidden="true" /> هل تعلم؟
          </b>
          <p>{fact}</p>
          <div className="dyk-actions">
            <button type="button" aria-pressed={speaking} onClick={() => (speaking ? narrator.stop() : narrator.speak(`هل تعلم؟ ${fact}`))}>
              <SpeakerHigh size={18} aria-hidden="true" /> {speaking ? "إيقاف" : "أعد الاستماع"}
            </button>
            {facts.length > 1 && (
              <button type="button" onClick={() => show((at + 1) % facts.length)}>
                <ArrowCounterClockwise size={18} aria-hidden="true" /> معلومة أخرى
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="dyk-ask">
          <p>
            <b>هل تعلم؟</b> اضغط لتكتشف معلومة جديدة
          </p>
          <button type="button" className="dyk-go" onClick={() => show(0)}>
            <Lightbulb size={20} weight="fill" aria-hidden="true" /> اضغط لتكتشف
          </button>
        </div>
      )}
    </section>
  );
}

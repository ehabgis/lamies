import { useEffect, useState } from "react";
import { ArrowCounterClockwise, HandPointing, SpeakerHigh } from "phosphor-react";
import * as narrator from "./narrator";
import { play } from "./sfx";
import "./did-you-know.css";

// «هل تعلم؟» on a resource card, as in the reference card (2026-11-05):
// a light blue box with the title, «اضغط لتكتشف معلومة جديدة» and a yellow
// «اضغط لتكتشف» beside the kid. A tap turns the text into a bubble with the
// fact and reads it once (the child's own tap, never automatic);
// «أعد الاستماع» reads it again, «معلومة أخرى» shows the next fact.
export default function DidYouKnowReveal({ facts }) {
  const [at, setAt] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => narrator.subscribe((s) => setSpeaking(s.state === "speaking")), []);
  // The fact stops with the card.
  useEffect(() => () => narrator.stop(), []);
  if (!facts?.length) return null;
  const fact = facts[at];
  const show = (i) => {
    play("star");
    setAt(i);
    narrator.speak(`هل تعلم؟ ${facts[i]}`);
  };

  return (
    <section className={`dyk ${fact ? "is-open" : ""}`} aria-labelledby="dyk-title">
      <img className="dyk-kid" src="/welcome/kid-explorer.webp" alt="" aria-hidden="true" />
      <div className="dyk-main">
        <h3 id="dyk-title">هل تعلم؟</h3>
        {fact ? (
          <>
            <div className="dyk-bubble" role="status">
              <p>{fact}</p>
            </div>
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
          </>
        ) : (
          <>
            <p className="dyk-ask">اضغط لتكتشف معلومة جديدة</p>
            <button type="button" className="dyk-go" onClick={() => show(0)}>
              <HandPointing size={24} weight="duotone" aria-hidden="true" /> اضغط لتكتشف
            </button>
          </>
        )}
      </div>
    </section>
  );
}

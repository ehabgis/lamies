import { useEffect, useState } from "react";
import L from "leaflet";
import { SpeakerHigh, ArrowRight, CheckCircle, XCircle } from "phosphor-react";
import { api } from "./api";
import * as narrator from "./narrator";
import { play } from "./sfx";
import RobotGuide from "../components/Map/RobotGuide";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import "./capital-tour.css";

// «استكشف العاصمة الإدارية الجديدة» (lesson 3): from Egypt to the capital on
// the same map, then the scene tilts into 3D in the map's place (Site3DView
// inline) with a small card beside it.
export const CAPITAL_ID = "new-administrative-capital";
const CAIRO = [30.0444, 31.2357]; // city centre, for the line to the capital
export const CAPITAL_QUESTION = "book-l3-capital-where";
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 1–2: Cairo and the capital with a dashed line between them, then a calm
// flight to the capital. `onArrive` gets the zoom the 3D scene starts from.
export function CapitalApproach({ map, site, onArrive }) {
  useEffect(() => {
    if (!map.getPane("capital-approach")) {
      map.createPane("capital-approach");
      map.getPane("capital-approach").style.zIndex = "640";
    }
    const target = [site.lat, site.lng];
    const group = L.layerGroup().addTo(map);
    L.polyline([CAIRO, target], {
      pane: "capital-approach",
      color: "#ffffff",
      weight: 3,
      dashArray: "8 8",
      interactive: false,
    }).addTo(group);
    L.circleMarker(CAIRO, {
      pane: "capital-approach",
      radius: 9,
      color: "#ffffff",
      weight: 4,
      fillColor: "#0b2a5b",
      fillOpacity: 1,
      interactive: false,
    })
      .bindTooltip("القاهرة", { permanent: true, direction: "top", offset: [0, -10], className: "ct-label" })
      .addTo(group);
    let timer;
    const done = () => onArrive(map.getZoom());
    const landed = () => (timer = setTimeout(done, 400));
    if (reducedMotion()) {
      map.setView(target, 12, { animate: false });
      timer = setTimeout(done, 1500);
    } else {
      map.flyToBounds([CAIRO, target], { padding: [120, 120], maxZoom: 10, duration: 1.4 });
      timer = setTimeout(() => {
        map.flyTo(target, 12.5, { duration: 1.6 });
        map.once("moveend", landed);
      }, 2400);
    }
    return () => {
      clearTimeout(timer);
      map.off("moveend", landed);
      map.removeLayer(group);
    };
  }, [map, site.lat, site.lng]);
  return null;
}

// 4: the card beside the scene: a short definition, «استمع للمعلومة», the
// question (graded on the server) and «عودة للخريطة».
export function CapitalCard({ resource, lessonId, question, onBack }) {
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => narrator.stop(), []);
  async function answer(option) {
    if (busy || result?.correct) return;
    setBusy(true);
    setPicked(option);
    try {
      const r = await api(`/demo/lessons/${lessonId}/answers`, {
        method: "POST",
        body: { questionId: question.id, answer: option, attempt },
      });
      setResult(r);
      if (!r.correct) setAttempt((n) => n + 1);
      play(r.correct ? "correct" : "wrong");
    } catch (e) {
      setResult({ correct: false, hint: e.message });
    } finally {
      setBusy(false);
    }
  }
  const summary = resource.description.split("، وهي")[0].replace(/\.$/, "") + ".";
  return (
    <aside className="ct-card" aria-label={resource.label}>
      <section className="ct-info">
        <h2>
          <LessonSymbol resource={resource} />
          {resource.label}
        </h2>
        <p>{summary}</p>
        <button type="button" onClick={() => narrator.speak(`${resource.label}. ${resource.description}`)}>
          <SpeakerHigh size={20} aria-hidden="true" /> استمع للمعلومة
        </button>
        <button type="button" onClick={onBack}>
          <ArrowRight size={20} aria-hidden="true" /> عودة للخريطة
        </button>
      </section>
      {question && (
        <section className="ct-question" aria-live="polite">
          <span className="ct-robot" aria-hidden="true">
            <RobotGuide />
          </span>
          <p>{question.prompt}</p>
          <div role="group" aria-label="اختر الإجابة">
            {question.options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={picked === o}
                className={picked === o && result ? (result.correct ? "is-right" : "is-wrong") : ""}
                disabled={busy || result?.correct}
                onClick={() => answer(o)}
              >
                {o}
              </button>
            ))}
          </div>
          {result && (
            <p className={`ct-feedback ${result.correct ? "is-right" : "is-wrong"}`}>
              {result.correct ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : <XCircle size={20} weight="fill" aria-hidden="true" />}
              {result.correct ? `أحسنت! ${result.explanation || ""}` : result.hint || "حاول مرة أخرى."}
            </p>
          )}
        </section>
      )}
    </aside>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Train, Play, Pause, ArrowCounterClockwise, ArrowLeft, CheckCircle, MapPin, Info } from "phosphor-react";
import { RAIL_LINES, RAIL_NOTE } from "./railLines";
import { play } from "./sfx";
import "./rail-journey.css";

const TRIP_MS = 18000; // a whole line, start to end, without stops
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TRAIN_ICON = L.divIcon({
  className: "rj-train",
  html: renderToStaticMarkup(<Train weight="fill" />),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});
// Teacher photos, used only when the files exist in public/lesson-media/sites/:
// the real train in the card (high-speed-rail.jpg, the same photo as its place on
// the map) and a side view on a clear background for the moving marker
// (train-marker.png).
const PHOTO_EXTS = ["jpg", "png", "webp", "jpeg"];
const MARKER_SRC = "/lesson-media/sites/train-marker.png";
const photoIcon = L.divIcon({
  className: "rj-train-photo",
  html: `<img src="${MARKER_SRC}" alt="">`,
  iconSize: [96, 32],
  iconAnchor: [48, 16],
});
// The station the train stopped at: a ring of light that pulses out.
const BURST = L.divIcon({ className: "rj-burst", html: "<i></i><i></i><b></b>", iconSize: [130, 130], iconAnchor: [65, 65] });
// The card shows the real train photo if added, else the train drawing.
function TrainPhoto({ small }) {
  const [i, setI] = useState(0);
  const src = i < PHOTO_EXTS.length ? `/lesson-media/sites/high-speed-rail.${PHOTO_EXTS[i]}` : i === PHOTO_EXTS.length ? MARKER_SRC : null;
  if (!src) return null;
  return (
    <img
      className={`rj-photo ${src === MARKER_SRC ? "is-drawing" : ""} ${small ? "is-small" : ""}`}
      src={src}
      alt="القطار الكهربائي السريع"
      onError={() => setI(i + 1)}
    />
  );
}

// «رحلة القطار السريع» on the lesson-3 map, after the train is chosen in the key:
// choose a line → see it with its stations → «ابدأ الرحلة»: a small train runs
// along it, the map follows, it stops at each main station with a short fact,
// and at the end «أحسنت!» with «إعادة الرحلة» or «اختر خطًا آخر».
export default function RailJourney({ map }) {
  const [lineId, setLineId] = useState(null);
  const [phase, setPhase] = useState("choose"); // choose | route | running | paused | station | done
  const [stop, setStop] = useState(0); // index of the station reached last
  const line = RAIL_LINES.find((l) => l.id === lineId);
  const layers = useRef(null);
  const train = useRef(null);
  const stationDots = useRef([]);
  const burst = useRef(null);
  const strip = useRef(null);
  const run = useRef({ d: 0, frame: 0, last: 0 });

  // Distances along the path, so the train moves at an even speed.
  const geo = useMemo(() => {
    if (!line) return null;
    const cum = [0];
    for (let i = 1; i < line.path.length; i++) cum.push(cum[i - 1] + map.distance(line.path[i - 1], line.path[i]));
    return { cum, total: cum[cum.length - 1] };
  }, [line, map]);
  const segment = (d) => {
    let i = 1;
    while (i < geo.cum.length - 1 && geo.cum[i] < d) i++;
    return i;
  };
  const at = (d) => {
    const { cum } = geo;
    const i = segment(d);
    const t = cum[i] === cum[i - 1] ? 0 : (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
    const [a, b] = [line.path[i - 1], line.path[i]];
    return [a[0] + (b[0] - a[0]) * Math.min(Math.max(t, 0), 1), a[1] + (b[1] - a[1]) * Math.min(Math.max(t, 0), 1)];
  };

  // Draw the chosen line, its stations and the train at the start.
  useEffect(() => {
    if (!line) return undefined;
    if (!map.getPane("rail-journey")) {
      map.createPane("rail-journey");
      map.getPane("rail-journey").style.zIndex = "640";
      // The light of a stopped station shines over the names too.
      map.createPane("rail-burst");
      map.getPane("rail-burst").style.zIndex = "660";
      map.getPane("rail-burst").style.pointerEvents = "none";
    }
    const group = L.layerGroup().addTo(map);
    // Light along the whole line: a wide soft halo, the bright line, and a
    // light that runs along it (still under reduced motion).
    const glow = line.glow || line.color;
    L.polyline(line.path, { pane: "rail-journey", color: glow, weight: 26, opacity: 0.5, interactive: false, className: "rj-halo" }).addTo(group);
    L.polyline(line.path, { pane: "rail-journey", color: glow, weight: 9, opacity: 1, interactive: false, className: "rj-line" }).addTo(group);
    L.polyline(line.path, { pane: "rail-journey", color: "#ffffff", weight: 3, opacity: 0.95, interactive: false }).addTo(group);
    L.polyline(line.path, { pane: "rail-journey", color: "#ffffff", weight: 5, opacity: 0.9, dashArray: "1 26", lineCap: "round", interactive: false, className: "rj-flow" }).addTo(group);
    // Labels alternate sides (left/right on a north–south line, above/below on
    // an east–west one), so close stations stay readable.
    const lats = line.path.map((p) => p[0]),
      lngs = line.path.map((p) => p[1]);
    const upright = Math.max(...lats) - Math.min(...lats) > Math.max(...lngs) - Math.min(...lngs);
    const side = (i) =>
      line.stations[i].side || (upright ? (i % 2 ? "left" : "right") : i % 2 ? "bottom" : "top");
    const nudge = { top: [0, -8], bottom: [0, 8], left: [-10, 0], right: [10, 0] };
    stationDots.current = line.stations.map((s, i) =>
      L.circleMarker(line.path[s.at], {
        pane: "rail-journey",
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: line.glow || line.color,
        fillOpacity: 1,
        interactive: false,
        className: "rj-station",
      })
        .bindTooltip(s.name, {
          permanent: true,
          direction: side(i),
          offset: nudge[side(i)],
          className: "rj-station-label",
        })
        .addTo(group),
    );
    train.current = L.marker(line.path[0], { icon: TRAIN_ICON, pane: "rail-journey", interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(group);
    train.current.getElement()?.style.setProperty("--line", line.color);
    // A realistic train for the marker, if the teacher added one.
    const probe = new Image();
    probe.onload = () => {
      train.current?.setIcon(photoIcon);
      face(run.current.d);
    };
    probe.src = MARKER_SRC;
    burst.current = L.marker(line.path[0], { icon: BURST, pane: "rail-burst", interactive: false, keyboard: false, zIndexOffset: 1100, opacity: 0 }).addTo(group);
    burst.current.getElement()?.style.setProperty("--line", "#ffd23f");
    layers.current = group;
    frame(line);
    return () => {
      cancelAnimationFrame(run.current.frame);
      map.removeLayer(group);
    };
  }, [line, map]);

  // The station where the train stopped lights up with a pulsing ring; the
  // stations already passed stay white, the ones ahead keep the line colour.
  useEffect(() => {
    if (!line) return;
    const lit = phase === "station" || phase === "done";
    stationDots.current.forEach((dot, i) => {
      const here = lit && i === stop;
      dot.setStyle({
        radius: here ? 13 : 8,
        fillColor: here ? "#ffd23f" : i < stop ? "#ffffff" : line.glow || line.color,
        color: "#ffffff",
        weight: here ? 4 : 3,
      });
      dot.getElement()?.classList.toggle("is-current", here);
      dot.getTooltip()?.getElement()?.classList.toggle("is-current", here);
    });
    if (burst.current) {
      burst.current.setLatLng(line.path[line.stations[stop].at]);
      burst.current.setOpacity(lit ? 1 : 0);
    }
  }, [phase, stop, line]);

  // Move the train toward the next station while the trip runs.
  useEffect(() => {
    if (phase !== "running" || !geo) return undefined;
    const target = geo.cum[line.stations[stop + 1].at];
    const speed = geo.total / TRIP_MS;
    const arrive = () => {
      run.current.d = target;
      train.current?.setLatLng(at(target));
      progress();
      setStop((s) => s + 1);
      const last = stop + 1 === line.stations.length - 1;
      setPhase(last ? "done" : "station");
      play(last ? "star" : "select");
      if (last) frame(line);
    };
    if (reducedMotion()) {
      arrive();
      return undefined;
    }
    let panning = false;
    const onMoveEnd = () => (panning = false);
    map.on("moveend", onMoveEnd);
    run.current.last = 0;
    const step = (t) => {
      const dt = run.current.last ? t - run.current.last : 0;
      run.current.last = t;
      run.current.d = Math.min(run.current.d + speed * dt, target);
      const pos = at(run.current.d);
      train.current?.setLatLng(pos);
      face(run.current.d);
      progress();
      // The map follows calmly: it pans only when the train nears the edge.
      if (!panning && !map.getBounds().pad(-0.22).contains(pos)) {
        panning = true;
        map.panTo(pos, { animate: true, duration: 1.2, easeLinearity: 0.5 });
      }
      if (run.current.d >= target) arrive();
      else run.current.frame = requestAnimationFrame(step);
    };
    run.current.frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(run.current.frame);
      map.off("moveend", onMoveEnd);
    };
  }, [phase, stop, geo]);

  // The train drawing points along the line (its nose leads; mirrored when
  // the line runs leftward on screen).
  function face(d) {
    const img = train.current?.getElement()?.querySelector("img");
    if (!img) return;
    const i = segment(d);
    const a = map.latLngToLayerPoint(line.path[i - 1]),
      b = map.latLngToLayerPoint(line.path[i]);
    const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    img.style.transform = b.x >= a.x ? `rotate(${deg}deg)` : `rotate(${deg + 180}deg) scaleX(-1)`;
  }
  // The strip under the map: the train between the stations.
  function progress() {
    if (strip.current) strip.current.style.setProperty("--done", `${(run.current.d / geo.total) * 100}%`);
  }
  // The whole line in view, clear of the side card and the line buttons.
  function frame(l) {
    const narrow = window.innerWidth <= 850;
    map.flyToBounds(l.path, {
      paddingTopLeft: narrow ? [24, 160] : [60, 190],
      paddingBottomRight: narrow ? [24, 250] : [380, 110],
      maxZoom: 7,
      animate: !reducedMotion(),
      duration: 0.8,
    });
  }
  function choose(id) {
    play("select");
    run.current.d = 0;
    setStop(0);
    setLineId(id);
    setPhase("route");
  }
  function restart() {
    play("open");
    cancelAnimationFrame(run.current.frame);
    run.current.d = 0;
    setStop(0);
    train.current?.setLatLng(line.path[0]);
    face(0);
    progress();
    map.panTo(line.path[0], { animate: !reducedMotion() });
    setPhase("running");
  }
  const start = line?.stations[0].name;
  const end = line?.stations[line.stations.length - 1].name;
  const here = line?.stations[stop];
  const next = line?.stations[stop + 1];

  return (
    <div className="rj" dir="rtl">
      {(phase === "choose" || phase === "route") && (
        <div className="rj-lines" role="radiogroup" aria-label="خطوط القطار الكهربائي السريع">
          <b>استكشف خطوط القطار السريع</b>
          <div>
            {RAIL_LINES.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={lineId === l.id}
                style={{ "--line": l.color }}
                onClick={() => choose(l.id)}
              >
                <i aria-hidden="true" /> {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {line && phase !== "done" && (
        <section className="rj-card" style={{ "--line": line.color }} aria-live="polite">
          <header>
            <span className="rj-card-icon" aria-hidden="true">
              <Train weight="fill" />
            </span>
            <span>
              <b>{line.name}</b>
              <small>
                {start} — {end}
              </small>
            </span>
          </header>
          <TrainPhoto small={phase === "station"} />
          {phase === "route" && (
            <>
              <p>شاهد المسار ومحطاته على الخريطة، ثم ابدأ الرحلة.</p>
              <button type="button" className="rj-main" onClick={() => (play("open"), setPhase("running"))}>
                <Play size={22} weight="fill" aria-hidden="true" /> ابدأ الرحلة
              </button>
            </>
          )}
          {(phase === "running" || phase === "paused") && (
            <>
              <p className="rj-status">
                <Train size={20} aria-hidden="true" /> {phase === "running" ? "الرحلة جارية" : "الرحلة متوقفة مؤقتًا"}
              </p>
              <p>
                المحطة القادمة: <b>{next?.name}</b>
              </p>
            </>
          )}
          {phase === "station" && (
            <>
              <p className="rj-status">
                <MapPin size={20} weight="fill" aria-hidden="true" /> المحطة الحالية
              </p>
              <h3>{here.name}</h3>
              <p>{here.info}</p>
              <button type="button" className="rj-main" onClick={() => (play("open"), setPhase("running"))}>
                المحطة التالية <ArrowLeft size={20} aria-hidden="true" />
              </button>
            </>
          )}
          <small className="rj-note">
            <Info size={16} aria-hidden="true" /> {RAIL_NOTE}
          </small>
        </section>
      )}

      {(phase === "running" || phase === "paused" || phase === "station") && (
        <div className="rj-controls">
          <div
            ref={strip}
            className="rj-strip"
            style={{ "--line": line.glow || line.color, "--done": `${(run.current.d / geo.total) * 100}%` }}
            aria-hidden="true"
          >
            {line.stations.map((s, i) => (
              <i key={s.name} className={i <= stop ? "is-passed" : ""} style={{ insetInlineStart: `${(geo.cum[s.at] / geo.total) * 100}%` }} />
            ))}
            <img src={MARKER_SRC} alt="" />
          </div>
          {phase !== "station" && (
            <button type="button" onClick={() => setPhase(phase === "running" ? "paused" : "running")}>
              {phase === "running" ? <Pause size={20} weight="fill" aria-hidden="true" /> : <Play size={20} weight="fill" aria-hidden="true" />}
              {phase === "running" ? "إيقاف مؤقت" : "استكمال"}
            </button>
          )}
          <button type="button" onClick={restart}>
            <ArrowCounterClockwise size={20} aria-hidden="true" /> إعادة الرحلة
          </button>
        </div>
      )}

      {phase === "done" && (
        <section className="rj-done" role="status" style={{ "--line": line.color }}>
          <CheckCircle size={64} weight="fill" aria-hidden="true" />
          <h3>أحسنت!</h3>
          <p>
            استكشفت مسار <b>{line.name}</b>
          </p>
          <div>
            <button type="button" className="rj-main" onClick={restart}>
              <ArrowCounterClockwise size={20} aria-hidden="true" /> إعادة الرحلة
            </button>
            <button type="button" onClick={() => (setLineId(null), setPhase("choose"))}>
              اختر خطًا آخر
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

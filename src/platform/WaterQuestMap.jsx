import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createSatelliteMap } from "./ExpeditionMap";
import { prepareNileDraw } from "./nileDraw";
import "./map-motion.css";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SEA_LABELS = [
  { id: "med-sea", name: "البحر المتوسط", lat: 31.85, lng: 28.6 },
  { id: "red-sea", name: "البحر الأحمر", lat: 25.3, lng: 35.15 },
];
const SEA_ID = { "البحر الأحمر": "red-sea", "البحر المتوسط": "med-sea" };

const pointIcon = (type, state = "") =>
  L.divIcon({
    className: `wq-point wq-point-${type} ${state}`,
    html: `<span aria-hidden="true">${type === "rain" ? "☁" : ""}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

// Water-source map for «رحلة المياه».
//  targets: public target list from the server (points for groundwater/rain)
//  active: true while the child is choosing (step «ابحث على الخريطة»)
//  onPick(targetId) · wrong: targetId to flash once
//  focus: {lat,lng,radiusKm} soft ring from the second hint
//  found: {target, label, at, draw, points} after a correct choice
export default function WaterQuestMap({ targets, active, onPick, wrong, wrongTick, focus, found, onDrawn }) {
  const host = useRef(null);
  const map = useRef(null);
  const layers = useRef({});
  const pick = useRef(onPick);
  pick.current = active ? onPick : null;
  const drawn = useRef(onDrawn);
  drawn.current = onDrawn;
  const [offline, setOffline] = useState(false);
  const [geo, setGeo] = useState({});

  useEffect(() => {
    const { map: m, dispose } = createSatelliteMap(host.current, () => setOffline(true));
    map.current = m;
    const controller = new AbortController();
    Promise.all(
      ["egypt-nile", "egypt-seas"].map((f) =>
        fetch(`/geodata/${f}.geojson`, { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      ),
    )
      .then(([nile, seas]) => setGeo({ nile, seas }))
      .catch(() => {});
    return () => {
      controller.abort();
      dispose();
    };
  }, []);

  // Base water layers: always the same so nothing hints at the answer.
  useEffect(() => {
    const m = map.current;
    if (!m || !geo.nile || !geo.seas || !targets) return;
    const group = L.layerGroup().addTo(m);
    const press = (id) => (e) => {
      L.DomEvent.stop(e);
      pick.current?.(id);
    };
    const seas = {};
    L.geoJSON(geo.seas, {
      // Invisible but pressable: the imagery already shows the sea, and the
      // clipped polygons leave hairlines over land when filled or outlined.
      style: { stroke: false, fillColor: "#3aa7ff", fillOpacity: 0.002 },
      onEachFeature: (f, layer) => {
        const id = SEA_ID[f.properties?.name_ar];
        if (!id) return;
        seas[id] = layer;
        layer.on("click", press(id));
      },
    }).addTo(group);
    // The visible river is thin like on the map; a wide invisible band around
    // it makes it easy for small fingers to choose.
    L.geoJSON(geo.nile, {
      interactive: false,
      style: { color: "#58b9ff", weight: 3, opacity: 0.75 },
    }).addTo(group);
    const nileHit = L.geoJSON(geo.nile, {
      style: { color: "#000", weight: 34, opacity: 0.01, lineCap: "round" },
    }).addTo(group);
    nileHit.on("click", press("nile"));
    const labels = {};
    SEA_LABELS.forEach((l) => {
      labels[l.id] = L.marker([l.lat, l.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "wq-sea-label", html: `<span>${l.name}</span>`, iconSize: [120, 28], iconAnchor: [60, 14] }),
      }).addTo(group);
    });
    const points = {};
    for (const [id, t] of Object.entries(targets)) {
      if (!t.points) continue;
      points[id] = t.points.map((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: pointIcon(t.type), keyboard: false }).addTo(group);
        marker.on("click", press(id));
        return marker;
      });
    }
    layers.current = { group, seas, nileHit, points, labels };
    m.fitBounds(
      [
        [22, 24.8],
        [31.9, 35.6],
      ],
      { animate: false, padding: [8, 8] },
    );
    return () => m.removeLayer(group);
  }, [geo, targets]);

  useEffect(() => {
    host.current?.classList.toggle("is-choosing", !!active);
  }, [active]);

  // A wrong press flashes the chosen source in a calm orange.
  useEffect(() => {
    if (!wrong) return;
    const { seas = {}, points = {}, nileHit } = layers.current;
    const els = [];
    if (seas[wrong]) {
      seas[wrong].setStyle({ fillColor: "#ffb44d", fillOpacity: 0.35 });
      setTimeout(() => seas[wrong].setStyle({ fillColor: "#3aa7ff", fillOpacity: 0.002 }), 1300);
    }
    if (wrong === "nile" && nileHit) {
      nileHit.setStyle({ color: "#ffb44d", opacity: 0.35, weight: 18 });
      setTimeout(() => nileHit.setStyle({ color: "#000", opacity: 0.01, weight: 34 }), 1300);
    }
    (points[wrong] || []).forEach((mk) => els.push(mk.getElement()));
    els.forEach((el) => el?.classList.add("is-wrong"));
    const t = setTimeout(() => els.forEach((el) => el?.classList.remove("is-wrong")), 1300);
    return () => clearTimeout(t);
  }, [wrong, wrongTick]);

  // Second hint: a soft dashed ring around the right area (not on the answer).
  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    const ring = L.circle([focus.lat, focus.lng], {
      radius: focus.radiusKm * 1000,
      interactive: false,
      className: "wq-focus",
      color: "#ffe066",
      weight: 3,
      dashArray: "10 10",
      fillColor: "#ffe066",
      fillOpacity: 0.08,
    }).addTo(m);
    return () => m.removeLayer(ring);
  }, [focus?.lat, focus?.lng, focus?.radiusKm]);

  // Correct choice: light the source up, then name it with a check mark.
  useEffect(() => {
    const m = map.current;
    if (!m || !found || !geo.nile) return;
    const animate = !reduced();
    if (!m.getPane("wq-glow")) {
      m.createPane("wq-glow");
      m.getPane("wq-glow").style.zIndex = "450";
      m.getPane("wq-glow").style.pointerEvents = "none";
    }
    const group = L.layerGroup().addTo(m);
    let wait = animate ? 900 : 0;
    if (found.draw === "nile") {
      const isBranch = (f) => /Branch/.test(f.properties?.name || "");
      const style = (base) => (f) => ({
        ...base,
        className: `nile-draw ${isBranch(f) ? "nile-draw-branch" : "nile-draw-main"}`,
      });
      L.geoJSON(geo.nile, { pane: "wq-glow", interactive: false, style: style({ color: "white", weight: 10, opacity: 0.85 }) }).addTo(group);
      L.geoJSON(geo.nile, { pane: "wq-glow", interactive: false, style: style({ color: "#2fd2ff", weight: 5, opacity: 1 }) }).addTo(group);
      L.geoJSON(geo.nile, {
        pane: "wq-glow",
        interactive: false,
        style: { color: "#d9f6ff", weight: 2.4, opacity: 0.95, className: "nile-flow" },
      }).addTo(group);
      requestAnimationFrame(() => prepareNileDraw(m.getPane("wq-glow")));
      if (animate) wait = 4300;
      m.flyToBounds(
        [
          [22, 28.5],
          [31.6, 34.5],
        ],
        { animate, duration: 0.8, padding: [8, 8] },
      );
    } else if (found.draw === "red-sea" || found.draw === "med-sea") {
      // A soft glowing ring on the sea; its own name label steps aside.
      layers.current.labels?.[found.draw]?.setOpacity(0);
      if (found.at)
        L.circle([found.at.lat, found.at.lng], {
          pane: "wq-glow",
          interactive: false,
          radius: 170000,
          stroke: true,
          color: "#2fd2ff",
          weight: 3,
          fillColor: "#2fd2ff",
          fillOpacity: 0.22,
          className: "wq-sea-found",
        }).addTo(group);
      if (animate) wait = 1200;
    } else if (found.points) {
      // The pins the child chose light up and show their names.
      (layers.current.points?.[found.target] || []).forEach((mk, i) => {
        const el = mk.getElement();
        if (!el) return;
        el.classList.add("is-found");
        const name = document.createElement("b");
        name.className = "wq-pin-name";
        name.textContent = found.points[i]?.name || "";
        el.append(name);
      });
      if (animate) wait = 1300;
    }
    const at = found.at || found.points?.[1];
    const timer = setTimeout(() => {
      if (at)
        L.marker([at.lat, at.lng], {
          pane: "wq-glow",
          interactive: false,
          icon: L.divIcon({
            className: "wq-found-label",
            html: `<span><i aria-hidden="true">✓</i>${found.label}</span>`,
            iconSize: [150, 40],
            iconAnchor: [75, 48],
          }),
        }).addTo(group);
      drawn.current?.();
    }, wait);
    return () => {
      clearTimeout(timer);
      m.removeLayer(group);
      layers.current.labels?.[found.draw]?.setOpacity(1);
      (layers.current.points?.[found.target] || []).forEach((mk) => {
        const el = mk.getElement();
        el?.classList.remove("is-found");
        el?.querySelector(".wq-pin-name")?.remove();
      });
    };
  }, [found?.target, geo.nile]);

  return (
    <div className="exp-map wq-map">
      <div ref={host} className="exp-map-host" aria-label="خريطة مصر بالأقمار الصناعية ومصادر المياه" />
      {offline && (
        <p className="exp-map-offline" role="status">
          تعذر تحميل صور الأقمار الصناعية؛ نعرض خريطة مصر المحلية. النشاط يعمل كما هو.
        </p>
      )}
    </div>
  );
}

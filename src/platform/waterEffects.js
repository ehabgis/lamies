import L from "leaflet";
import { prepareNileDraw } from "./nileDraw";

// Lesson 2: what the map does for a few seconds after a water resource is
// chosen — the Nile is drawn, rain falls, wells rise, seas and lakes ripple.
// After EFFECT_MS the motion stops and a calm highlight stays; «إعادة المشاهدة»
// plays it again. Under reduced motion only the calm highlight is drawn.
export const EFFECT_MS = 6500;

const KIND = {
  "nile-river": "river",
  "nile-delta": "branches",
  "mediterranean-sea": "sea",
  "red-sea": "sea",
  "rain-harvesting-matrouh": "rain",
  groundwater: "wells",
  "lake-nasser": "ripples",
  "northern-lakes": "ripples",
  desalination: "ripples",
  "bahr-el-baqar": "ripples",
};
export const hasWaterEffect = (id) => Boolean(KIND[id]);

// Map view that shows the whole effect (the card covers part of the map).
export const EFFECT_VIEW = {
  "nile-river": [
    [22, 29.5],
    [31.7, 34.2],
  ],
  "nile-delta": [
    [29.8, 29.6],
    [31.7, 32.6],
  ],
  "mediterranean-sea": [
    [29.9, 24.8],
    [33.4, 34.6],
  ],
  "rain-harvesting-matrouh": [
    [29.4, 24.8],
    [32.4, 34.6],
  ],
  "red-sea": [
    [21.9, 31.8],
    [30.2, 37.2],
  ],
  groundwater: [
    [24.6, 24.9],
    [29.8, 31.2],
  ],
  "northern-lakes": [
    [30.6, 29.4],
    [31.7, 33.6],
  ],
};

const ARROW =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#0a62d6" stroke-width="2"/><path d="M9.5 7l5.5 5-5.5 5" fill="none" stroke="#0a62d6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const SEA_NAME = { "mediterranean-sea": "البحر المتوسط", "red-sea": "البحر الأحمر" };

// Clouds sit just inland of the north coast, from Salloum to El Arish: a
// drawing of the winter-rain belt the book describes, not measured rainfall.
const RAIN_BELT = [
  [31.45, 25.3],
  [31.2, 26.6],
  [31.15, 27.9],
  [30.95, 29.2],
  [31.05, 30.3],
  [31.3, 31.4],
  [31.15, 32.4],
  [31.05, 33.6],
];

const icon = (className, html, size) =>
  L.divIcon({ className, html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

function pane(map) {
  if (!map.getPane("water-effects")) {
    map.createPane("water-effects");
    map.getPane("water-effects").style.zIndex = "460";
  }
  return map.getPane("water-effects");
}

// One SVG pattern of moving waves, shared by both seas.
function addWavePattern(paneEl) {
  const svg = paneEl.querySelector("svg");
  if (!svg || svg.querySelector("#wfx-waves")) return;
  const ns = "http://www.w3.org/2000/svg";
  const defs = svg.querySelector("defs") || svg.insertBefore(document.createElementNS(ns, "defs"), svg.firstChild);
  defs.innerHTML = `<pattern id="wfx-waves" patternUnits="userSpaceOnUse" width="56" height="24">
    <path d="M0 12q14-9 28 0t28 0" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="2.4"/>
    <animateTransform class="wfx-wave-move" attributeName="patternTransform" type="translate" from="0 0" to="56 0" dur="2.6s" repeatCount="indefinite"/>
  </pattern>`;
}

export function playWaterEffect(map, { id, river, seas, sites, color, reduced }) {
  const kind = KIND[id];
  if (!kind) return () => {};
  const paneEl = pane(map);
  const group = L.layerGroup().addTo(map);
  const container = map.getContainer();
  const timers = [];
  container.classList.toggle("wfx-play", !reduced);
  const svgOf = () => paneEl.querySelector("svg");

  if ((kind === "river" || kind === "branches") && river) {
    const isBranch = (f) => /Branch/.test(f.properties?.name || "");
    const data = { ...river, features: river.features.filter((f) => (kind === "branches" ? isBranch(f) : true)) };
    // Branches on their own are drawn at once, not after the main river.
    const cls = (f) => `nile-draw ${isBranch(f) && kind === "river" ? "nile-draw-branch" : "nile-draw-main"}`;
    L.geoJSON(data, {
      pane: "water-effects",
      interactive: false,
      style: (f) => ({ color: "#ffffff", weight: 11, opacity: 0.8, className: `${cls(f)} wfx-river-glow` }),
    }).addTo(group);
    L.geoJSON(data, {
      pane: "water-effects",
      interactive: false,
      style: (f) => ({ color: "#0a7bff", weight: 5.5, opacity: 1, className: cls(f) }),
      attribution: "Nile geometry · Natural Earth",
    }).addTo(group);
    L.geoJSON(data, {
      pane: "water-effects",
      interactive: false,
      style: { color: "#d8f0ff", weight: 2.4, opacity: 0.95, className: "nile-flow wfx-flow" },
    }).addTo(group);
    if (!reduced) requestAnimationFrame(() => prepareNileDraw(paneEl));
    // Arrows along the water, pointing the way it flows (south → north).
    for (const f of data.features) {
      const lines = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
      for (const line of lines) {
        // One arrow about every degree and a half of river (less on branches).
        const gap = kind === "branches" ? 0.45 : 1.4;
        let run = 0;
        for (let i = 1; i < line.length - 2; i++) {
          run += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
          if (run < gap) continue;
          run = 0;
          const a = map.latLngToLayerPoint([line[i][1], line[i][0]]);
          const b = map.latLngToLayerPoint([line[i + 2][1], line[i + 2][0]]);
          const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          L.marker([line[i][1], line[i][0]], {
            pane: "water-effects",
            interactive: false,
            keyboard: false,
            icon: icon("wfx-arrow", `<span style="--r:${deg}deg;--d:${(i / line.length) * 2.6}s">${ARROW}</span>`, 24),
          }).addTo(group);
        }
      }
    }
  }

  if (kind === "sea" && seas) {
    const feature = seas.features.find((f) => f.properties.name_ar === SEA_NAME[id]);
    if (feature) {
      L.geoJSON(feature, {
        pane: "water-effects",
        interactive: false,
        style: { color: "#bff3ff", weight: 3, fillColor: color, fillOpacity: 0.35, className: "wfx-sea-tint" },
      }).addTo(group);
      L.geoJSON(feature, {
        pane: "water-effects",
        interactive: false,
        style: { stroke: false, fillOpacity: 1, className: "wfx-sea-waves" },
      }).addTo(group);
      addWavePattern(paneEl);
      if (reduced) svgOf()?.pauseAnimations?.();
      else svgOf()?.unpauseAnimations?.();
    }
  }

  // Rain keeps falling while the resource stays chosen (not only during the
  // first few seconds); under reduced motion the drops stay still.
  if (kind === "rain") {
    RAIN_BELT.forEach(([lat, lng], i) => {
      const drops = Array.from(
        { length: 6 },
        (_, k) => `<i style="--x:${10 + k * 9}px;--d:${((k * 0.37 + i * 0.21) % 1).toFixed(2)}s"></i>`,
      ).join("");
      L.marker([lat + 0.32, lng], {
        pane: "water-effects",
        interactive: false,
        keyboard: false,
        icon: icon(`wfx-cloud ${reduced ? "" : "is-raining"}`, `<b></b>${drops}`, 60),
      }).addTo(group);
    });
  }

  if (kind === "wells" || kind === "ripples") {
    for (const s of sites.filter((s) => s.resource.id === id))
      L.marker([s.lat, s.lng], {
        pane: "water-effects",
        interactive: false,
        keyboard: false,
        icon: icon(`wfx-ripple ${kind === "wells" ? "is-well" : ""}`, "<i></i><i></i><i></i>", 90),
      })
        .addTo(group)
        .getElement()
        ?.style.setProperty("--c", color);
    if (kind === "wells") container.classList.add("wfx-wells");
  }

  timers.push(
    setTimeout(() => {
      container.classList.remove("wfx-play", "wfx-wells");
      svgOf()?.pauseAnimations?.();
    }, EFFECT_MS),
  );
  return () => {
    timers.forEach(clearTimeout);
    container.classList.remove("wfx-play", "wfx-wells");
    map.removeLayer(group);
  };
}

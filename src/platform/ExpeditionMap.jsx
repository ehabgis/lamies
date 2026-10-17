import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EGYPT_BOUNDS } from "./mapBasemaps";

const IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pinHtml = (state, label = "") =>
  `<span class="exp-pin exp-pin-${state}" aria-hidden="true"><span></span></span>${
    label ? `<span class="exp-pin-label">${label}</span>` : ""
  }`;

// Props:
//  teach: [{lat,lng,name}] highlighted with names (step «شاهد واكتشف»)
//  candidates: [{id,lat,lng}] identical pins, no names (step «ابحث على الخريطة»)
//  found: {[siteId]: name} confirmed sites (named, green)
//  wrong: siteId to shake once
//  onPick(siteId)
export default function ExpeditionMap({ teach = [], candidates = [], found = {}, wrong, onPick, fitPadding }) {
  const host = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const m = L.map(host.current, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 4,
      maxZoom: 14,
      zoomSnap: 0.25,
      keyboard: true,
      maxBounds: [
        [17, 20],
        [36, 42],
      ],
    });
    m.zoomControl.setPosition("topleft");
    m.attributionControl.setPrefix(false);
    m.fitBounds(EGYPT_BOUNDS, { padding: [12, 12], animate: false });
    map.current = m;
    let loaded = 0;
    let errors = 0;
    const tiles = L.tileLayer(IMAGERY, {
      maxZoom: 18,
      attribution: "Tiles © Esri — Esri, Vantor, Earthstar Geographics",
      crossOrigin: true,
    })
      .on("tileload", () => loaded++)
      .on("tileerror", () => {
        errors++;
        if (!loaded && errors >= 3) fallBack();
      })
      .addTo(m);
    const timer = setTimeout(() => !loaded && fallBack(), 9000);
    let fell = false;
    function fallBack() {
      if (fell) return;
      fell = true;
      m.removeLayer(tiles);
      setOffline(true);
      fetch("/geodata/egypt-governorates.geojson")
        .then((r) => r.json())
        .then((g) =>
          L.geoJSON(g, {
            interactive: false,
            style: { color: "#9b7a4e", weight: 1, fillColor: "#ead8b4", fillOpacity: 1 },
            attribution: "Natural Earth",
          }).addTo(m),
        )
        .catch(() => {});
    }
    layer.current = L.layerGroup().addTo(m);
    const ro = new ResizeObserver(() => m.invalidateSize({ pan: false }));
    ro.observe(host.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      m.remove();
    };
  }, []);

  // Draw pins for the current step.
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const add = (p, state, label, clickable) => {
      const marker = L.marker([p.lat, p.lng], {
        keyboard: clickable,
        interactive: clickable,
        icon: L.divIcon({
          className: "exp-marker",
          html: pinHtml(state, label),
          iconSize: [44, 44],
          iconAnchor: [22, 40],
        }),
      }).addTo(g);
      const el = marker.getElement();
      if (clickable && el) {
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", "موقع على الخريطة؛ اضغط لاختياره");
        marker.on("click", () => pick.current?.(p.id));
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick.current?.(p.id);
          }
        });
      }
      return marker;
    };
    teach.forEach((p) => add(p, "teach", p.name, false));
    candidates.forEach((p) => {
      const name = found[p.id];
      add(p, name ? "found" : p.id === wrong ? "wrong" : "plain", name || "", !name);
    });
    const points = [...teach, ...candidates];
    const animate = !reduced();
    if (teach.length === 1) {
      m.flyTo([teach[0].lat, teach[0].lng], 6.5, { animate, duration: 1.1 });
    } else if (points.length) {
      m.flyToBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])).pad(0.35), {
        animate,
        duration: 1,
        maxZoom: 6.5,
        ...(fitPadding || {}),
      });
    } else {
      m.flyToBounds(EGYPT_BOUNDS, { animate, duration: 1 });
    }
  }, [JSON.stringify(teach), JSON.stringify(candidates), JSON.stringify(found), wrong]);

  return (
    <div className="exp-map">
      <div ref={host} className="exp-map-host" aria-label="خريطة مصر بالأقمار الصناعية" />
      {offline && (
        <p className="exp-map-offline" role="status">
          تعذر تحميل صور الأقمار الصناعية؛ نعرض خريطة مصر المحلية. المواقع والأسئلة تعمل كما هي.
        </p>
      )}
    </div>
  );
}

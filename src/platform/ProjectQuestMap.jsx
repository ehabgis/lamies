import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createSatelliteMap } from "./ExpeditionMap";
import ResourcePin from "../components/Map/ResourcePin";

const SEA_LABELS = [
  { name: "البحر المتوسط", lat: 32.05, lng: 28.4 },
  { name: "البحر الأحمر", lat: 25.6, lng: 35.3 },
];
export const TYPE_LABEL = {
  agriculture: "مشروع زراعي (القمح)",
  "fish-farming": "مشروع سمكي",
  "solar-energy": "مشروع طاقة شمسية",
};

// Map of «نكتشف مشروعات مصر»: the three project symbols, always all shown.
//  active: the child is choosing · onPick(id) · wrong/wrongTick: flash once
//  focus: {lat,lng,radiusKm} soft ring after «تلميح» (an area, not the symbol)
//  found: {target,label,lat,lng} lights the right symbol and names it
//  compact: small map beside the question; zooms to the found project
export default function ProjectQuestMap({ targets, active, onPick, wrong, wrongTick, focus, found, compact = false }) {
  const host = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const [els, setEls] = useState({});
  const [offline, setOffline] = useState(false);
  const pick = useRef(onPick);
  pick.current = active ? onPick : null;

  useEffect(() => {
    const { map: m, dispose } = createSatelliteMap(host.current, () => setOffline(true));
    map.current = m;
    if (import.meta.env.DEV) window.__projectMap = m;
    m.fitBounds(
      [
        [22, 24.8],
        [31.9, 35.6],
      ],
      { animate: false, padding: [8, 8] },
    );
    SEA_LABELS.forEach((l) =>
      L.marker([l.lat, l.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "wq-sea-label", html: `<span>${l.name}</span>`, iconSize: [120, 28], iconAnchor: [60, 14] }),
      }).addTo(m),
    );
    const next = {};
    for (const t of targets) {
      const mk = L.marker([t.lat, t.lng], {
        keyboard: true,
        icon: L.divIcon({ className: "pq-marker", html: "", iconSize: [46, 58], iconAnchor: [23, 54] }),
      }).addTo(m);
      mk.on("click", () => pick.current?.(t.id));
      const el = mk.getElement();
      // Named by kind only, like the map key, so the label is not the answer.
      el.setAttribute("aria-label", `رمز ${TYPE_LABEL[t.type]}`);
      el.setAttribute("role", "button");
      el.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          mk.fire("click");
        }
      });
      markers.current[t.id] = mk;
      next[t.id] = el;
    }
    setEls(next);
    return dispose;
  }, []);

  useEffect(() => {
    host.current?.classList.toggle("is-choosing", !!active);
    for (const mk of Object.values(markers.current)) {
      const el = mk.getElement();
      el?.setAttribute("tabindex", active ? "0" : "-1");
      el?.setAttribute("aria-disabled", String(!active));
    }
  }, [active]);

  useEffect(() => {
    const el = wrong && markers.current[wrong]?.getElement();
    if (!el) return;
    el.classList.add("is-wrong");
    const t = setTimeout(() => el.classList.remove("is-wrong"), 1300);
    return () => clearTimeout(t);
  }, [wrong, wrongTick]);

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
      fillOpacity: 0.1,
    }).addTo(m);
    return () => m.removeLayer(ring);
  }, [focus?.lat, focus?.lng, focus?.radiusKm]);

  useEffect(() => {
    const m = map.current;
    if (!m || !found) return;
    const label = L.marker([found.lat, found.lng], {
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: "wq-found-label pq-found-label",
        html: `<span><i aria-hidden="true">✓</i>${found.label}</span>`,
        iconSize: [150, 40],
        iconAnchor: [75, 100],
      }),
    }).addTo(m);
    if (compact)
      m.setView([found.lat, found.lng], 6, { animate: false });
    return () => m.removeLayer(label);
  }, [found?.target, compact]);

  // The map box changes size between steps.
  useEffect(() => {
    const m = map.current;
    if (!m || !host.current) return;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(host.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`exp-map wq-map pq-map ${compact ? "is-compact" : ""}`}>
      <div ref={host} className="exp-map-host" aria-label="خريطة مصر بالأقمار الصناعية ورموز المشروعات" />
      {targets.map((t) =>
        els[t.id]
          ? createPortal(
              <span className={`pq-symbol ${found?.target === t.id ? "is-found" : found ? "is-other" : ""}`}>
                <ResourcePin resource={{ id: t.id, iconFamily: t.type }} />
              </span>,
              els[t.id],
              t.id,
            )
          : null,
      )}
      {offline && (
        <p className="exp-map-offline" role="status">
          تعذر تحميل صور الأقمار الصناعية؛ نعرض خريطة مصر المحلية. النشاط يعمل كما هو.
        </p>
      )}
    </div>
  );
}

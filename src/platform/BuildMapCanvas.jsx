import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createSatelliteMap } from "./ExpeditionMap";
import ResourcePin from "../components/Map/ResourcePin";

const SEA_LABELS = [
  { name: "البحر المتوسط", lat: 32.2, lng: 28.6 },
  { name: "البحر الأحمر", lat: 25.3, lng: 35.15 },
];

// Empty map of Egypt for «ابنِ خريطتك». Only the symbols the child placed are
// drawn; names appear after a correct check, so nothing gives the place away.
//  placed: {[itemId]: {lat, lng, state: "placed"|"wrong"|"locked", name?}}
//  items:  {[itemId]: {label, resource}}
//  onPlace(itemId, {lat,lng}) · onTapMap({lat,lng}) · onDropItem(itemId, {lat,lng})
export default function BuildMapCanvas({ placed, items, selected, cursor, onTapMap, onMove, onDropItem, mapRef }) {
  const host = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const [els, setEls] = useState({});
  const [offline, setOffline] = useState(false);
  const cb = useRef({});
  cb.current = { onTapMap, onMove, onDropItem };

  useEffect(() => {
    const { map: m, dispose } = createSatelliteMap(host.current, () => setOffline(true));
    map.current = m;
    if (mapRef) mapRef.current = m;
    // Lets browser tests press exact places; development builds only.
    if (import.meta.env.DEV) window.__buildMap = m;
    m.fitBounds(
      [
        [22, 24.8],
        [31.9, 35.6],
      ],
      { animate: false, padding: [6, 6] },
    );
    SEA_LABELS.forEach((l) =>
      L.marker([l.lat, l.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "bm-sea-label", html: `<span>${l.name}</span>`, iconSize: [120, 26], iconAnchor: [60, 13] }),
      }).addTo(m),
    );
    m.on("click", (e) => cb.current.onTapMap?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    // Drag from the symbols box straight onto the map.
    const el = host.current;
    const over = (e) => {
      if (e.dataTransfer?.types?.includes("text/plain")) e.preventDefault();
    };
    const drop = (e) => {
      const id = e.dataTransfer?.getData("text/plain");
      if (!id) return;
      e.preventDefault();
      const ll = m.mouseEventToLatLng(e);
      cb.current.onDropItem?.(id, { lat: ll.lat, lng: ll.lng });
    };
    el.addEventListener("dragover", over);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragover", over);
      el.removeEventListener("drop", drop);
      dispose();
    };
  }, []);

  // Keep one Leaflet marker per placed symbol; React draws the icon inside it.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const next = {};
    for (const [id, p] of Object.entries(placed)) {
      let mk = markers.current[id];
      const locked = p.state === "locked";
      if (!mk) {
        mk = L.marker([p.lat, p.lng], {
          draggable: !locked,
          keyboard: false,
          icon: L.divIcon({ className: "bm-marker", html: "", iconSize: [56, 70], iconAnchor: [28, 64] }),
        }).addTo(m);
        mk.on("dragend", () => {
          const ll = mk.getLatLng();
          cb.current.onMove?.(id, { lat: ll.lat, lng: ll.lng });
        });
        mk.on("click", (e) => L.DomEvent.stopPropagation(e));
        markers.current[id] = mk;
      } else {
        const ll = mk.getLatLng();
        if (Math.abs(ll.lat - p.lat) > 1e-6 || Math.abs(ll.lng - p.lng) > 1e-6) mk.setLatLng([p.lat, p.lng]);
      }
      if (locked) mk.dragging?.disable();
      else mk.dragging?.enable();
      next[id] = mk.getElement();
    }
    for (const [id, mk] of Object.entries(markers.current))
      if (!placed[id]) {
        m.removeLayer(mk);
        delete markers.current[id];
      }
    setEls((old) => {
      const same = Object.keys(next).length === Object.keys(old).length && Object.entries(next).every(([k, v]) => old[k] === v);
      return same ? old : next;
    });
  }, [placed]);

  useEffect(() => {
    host.current?.classList.toggle("is-placing", !!selected);
  }, [selected]);

  // Keyboard placing: a crosshair the arrow keys move around the map.
  useEffect(() => {
    const m = map.current;
    if (!m || !cursor) return;
    const mk = L.marker([cursor.lat, cursor.lng], {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({ className: "bm-cursor", html: "<span></span>", iconSize: [44, 44], iconAnchor: [22, 22] }),
    }).addTo(m);
    return () => m.removeLayer(mk);
  }, [cursor?.lat, cursor?.lng]);

  return (
    <div className="bm-map">
      <div ref={host} className="bm-map-host" aria-label="خريطة مصر بالأقمار الصناعية بدون رموز" />
      {Object.entries(els).map(([id, el]) => {
        const p = placed[id];
        const item = items[id];
        if (!el || !p || !item) return null;
        return createPortal(
          <span className={`bm-symbol is-${p.state}`}>
            <ResourcePin resource={item.resource} />
            {p.state === "locked" && <b className="bm-symbol-name">{p.name}</b>}
            {p.state === "locked" && <i className="bm-symbol-star" aria-hidden="true">★</i>}
          </span>,
          el,
          id,
        );
      })}
      {offline && (
        <p className="exp-map-offline" role="status">
          تعذر تحميل صور الأقمار الصناعية؛ نعرض خريطة مصر المحلية. النشاط يعمل كما هو.
        </p>
      )}
    </div>
  );
}

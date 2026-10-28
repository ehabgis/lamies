import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X, ArrowsClockwise, Pause, Cube } from "phosphor-react";

// Tilted 3D view of a selected site: real Esri satellite imagery draped on
// AWS terrain tiles, with OpenStreetMap buildings (via OpenFreeMap) extruded to
// their mapped heights. Loaded only when opened (React.lazy in LessonPage).
const STYLE = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imagery © Esri, Vantor, Earthstar Geographics",
    },
    elevation: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 13,
      attribution: "Terrain: AWS Terrain Tiles",
    },
    buildings: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution:
        '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: "imagery", type: "raster", source: "imagery" },
    {
      id: "buildings-3d",
      type: "fill-extrusion",
      source: "buildings",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": "#f4ead6",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 9],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.92,
      },
    },
  ],
  terrain: { source: "elevation", exaggeration: 1.5 },
};

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// After the fly-in and a short orbit, the site's photo takes the same place
// (lesson 3). Touching the scene keeps the 3D view open.
const PHOTO_AFTER_MS = 9000;

export default function Site3DView({ site, photo, onClose }) {
  const host = useRef(null);
  const mapRef = useRef(null);
  const closeRef = useRef(null);
  const touched = useRef(false);
  const [failed, setFailed] = useState(false);
  const [orbiting, setOrbiting] = useState(!reducedMotion());
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({
        container: host.current,
        style: STYLE,
        center: [site.lng, site.lat],
        zoom: reducedMotion() ? 14.6 : 11.5,
        pitch: reducedMotion() ? 60 : 0,
        bearing: reducedMotion() ? -25 : 0,
        maxPitch: 75,
        attributionControl: { compact: true },
      });
    } catch {
      setFailed(true);
      return undefined;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.on("error", () => {});
    map.once("load", () => {
      // Keep the credits collapsed to the (i) button so they don't cover the scene.
      host.current
        ?.querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
      new maplibregl.Marker({ color: site.resource?.color || "#d61f26" })
        .setLngLat([site.lng, site.lat])
        .addTo(map);
      if (!reducedMotion())
        map.flyTo({ zoom: 14.6, pitch: 62, bearing: -25, duration: 3200, essential: false });
    });
    const stop = () => {
      touched.current = true;
      setOrbiting(false);
    };
    map.on("mousedown", stop);
    map.on("touchstart", stop);
    map.on("wheel", stop);
    closeRef.current?.focus({ preventScroll: true });
    return () => map.remove();
  }, [site.lat, site.lng, site.resource?.color]);

  // Slow orbit after the fly-in; any touch on the map stops it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !orbiting) return undefined;
    let frame = 0;
    let last = 0;
    const spin = (t) => {
      if (!map.isMoving() && last) map.setBearing(map.getBearing() + (t - last) * 0.004);
      last = t;
      frame = requestAnimationFrame(spin);
    };
    const start = setTimeout(() => (frame = requestAnimationFrame(spin)), 3400);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(frame);
    };
  }, [orbiting]);

  useEffect(() => {
    if (!photo || showPhoto) return undefined;
    const t = setTimeout(() => !touched.current && setShowPhoto(true), failed ? 0 : reducedMotion() ? 5000 : PHOTO_AFTER_MS);
    return () => clearTimeout(t);
  }, [photo?.src, showPhoto, failed]);

  useEffect(() => {
    if (!showPhoto) mapRef.current?.resize();
  }, [showPhoto]);

  // Subscribed once: re-subscribing on every render could drop the Escape
  // that triggered the render (listeners removed mid-dispatch never fire).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="site-3d-panel" role="dialog" aria-label={`عرض ثلاثي الأبعاد: ${site.resource?.label}`}>
      <header>
        <div>
          <h2>{site.resource?.label}</h2>
          <p>{showPhoto ? "صورة الموقع" : "عرض ثلاثي الأبعاد"} · {site.name}</p>
        </div>
        <div className="site-3d-actions">
          {!failed && !showPhoto && (
            <button
              type="button"
              onClick={() => {
                touched.current = true;
                setOrbiting((v) => !v);
              }}
              aria-pressed={orbiting}
              aria-label={orbiting ? "إيقاف الدوران" : "تدوير المشهد"}
              title={orbiting ? "إيقاف الدوران" : "تدوير المشهد"}
            >
              {orbiting ? <Pause weight="bold" /> : <ArrowsClockwise weight="bold" />}
            </button>
          )}
          <button type="button" ref={closeRef} onClick={onClose} aria-label="إغلاق العرض ثلاثي الأبعاد">
            <X weight="bold" />
          </button>
        </div>
      </header>
      {showPhoto && (
        <figure className="site-3d-photo">
          <img src={photo.src} alt={`${site.resource?.label} — ${site.name}`} />
          {photo.credit && <figcaption>{photo.credit}</figcaption>}
          <button
            type="button"
            onClick={() => {
              touched.current = true;
              setShowPhoto(false);
            }}
          >
            <Cube weight="duotone" aria-hidden="true" /> العرض ثلاثي الأبعاد مرة أخرى
          </button>
        </figure>
      )}
      {failed ? (
        <p className="site-3d-fallback">
          لا يدعم هذا الجهاز العرض ثلاثي الأبعاد. يمكنك متابعة الموقع على الخريطة.
        </p>
      ) : (
        <div ref={host} className="site-3d-map" hidden={showPhoto} />
      )}
      <p className="site-3d-note" hidden={showPhoto}>
        اسحب لتحريك المشهد، واستعمل إصبعين لتدويره. صور أقمار صناعية وتضاريس حقيقية؛ المباني من OpenStreetMap وقد ينقص بعضها.
      </p>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-motion.css";
import "./water-effects.css";
import {
  SquaresFour,
  X,
  Plus,
  Minus,
  Compass,
  ArrowClockwise,
  MapTrifold,
  Stack,
  CornersOut,
  ArrowCounterClockwise,
  Check,
  SpeakerHigh,
} from "phosphor-react";
import { LessonSymbol, hasWaterSymbol, WATER_SYMBOLS } from "../components/Map/WaterSymbol";
import { playWaterEffect, hasWaterEffect, EFFECT_VIEW } from "./waterEffects";
import SelectField from "./SelectField";
import * as narrator from "./narrator";
import "./governorates.css";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
import { prepareNileDraw } from "./nileDraw";
import { BASEMAPS, EGYPT_BOUNDS, EGYPT_FIT, readBasemap } from "./mapBasemaps";
const textNode = (text) => {
  const node = document.createElement("span");
  node.textContent = text;
  return node;
};
const safeText = (value) => {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
};
function GalleryThumbnail({ basemap }) {
  const [failed, setFailed] = useState(false);
  return basemap.thumbnail && !failed ? (
    <img
      loading="lazy"
      src={basemap.thumbnail}
      alt={`معاينة ${basemap.label}`}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={`basemap-thumb thumb-${basemap.id}`}>
      <MapTrifold size={30} />
      {failed && <small>المعاينة غير متاحة</small>}
    </span>
  );
}
export default function EsriLessonMap({
  sites,
  activeResourceId,
  selectedLocationId,
  showNames,
  onSelect,
  onVideo,
  resetKey = 0,
  focusRequest,
  waterLesson = false,
  railLesson = false,
  spotlight = null,
  onReset,
  onToolOpen,
  onToggleNames,
  hideRail = false,
  railKey = false,
  hideTools = false,
  overlay,
}) {
  const host = useRef(null),
    mapRef = useRef(null),
    root = useRef(null),
    galleryButton = useRef(null),
    governorateButton = useRef(null),
    governorateSearchInput = useRef(null),
    focusSite = useRef(null),
    [ready, setReady] = useState(false),
    [basemap, setBasemap] = useState(readBasemap),
    [gallery, setGallery] = useState(false),
    [governorates, setGovernorates] = useState(false),
    [features, setFeatures] = useState(null),
    [river, setRiver] = useState(null),
    [seas, setSeas] = useState(null),
    // Lesson 2 now draws each water source when it is chosen (see waterEffects).
    [waterHighlights, setWaterHighlights] = useState(false),
    [replay, setReplay] = useState(0),
    [rail, setRail] = useState(null),
    [showRail, setShowRail] = useState(true),
    [dataError, setDataError] = useState(""),
    [selectedGovernorate, setSelectedGovernorate] = useState(""),
    [governorateQuery, setGovernorateQuery] = useState(""),
    [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0),
    [notice, setNotice] = useState("");
  const [textbookMeta, setTextbookMeta] = useState(null);
  const galleryItems = BASEMAPS.filter((b) => !b.image || textbookMeta);
  const chosen = BASEMAPS.find((b) => b.id === basemap) || BASEMAPS[0];
  const usingLocal = basemap === "local" || status === "error";
  const callback = useRef({ onSelect, onVideo });
  callback.current = { onSelect, onVideo };
  useEffect(() => {
    const map = L.map(host.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      minZoom: 4,
      maxZoom: 17,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      maxBounds: [
        [18, 20],
        [36, 42],
      ],
      maxBoundsViscosity: 0.7,
      keyboard: true,
    });
    mapRef.current = map;
    // Lets browser tests read the view; development builds only.
    if (import.meta.env.DEV) window.__lessonMap = map;
    map.fitBounds(EGYPT_BOUNDS, { ...EGYPT_FIT, animate: false });
    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>',
    );
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    observer.observe(host.current);
    setReady(true);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/geodata/egypt-governorates.geojson", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setFeatures)
      .catch((e) => {
        if (e.name !== "AbortError")
          setDataError("تعذر تحميل حدود المحافظات المحلية.");
      });
    fetch("/geodata/egypt-nile.geojson", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRiver)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!waterLesson) return;
    const controller = new AbortController();
    fetch("/geodata/egypt-seas.geojson", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setSeas)
      .catch((e) => {
        if (e.name !== "AbortError")
          setNotice("تعذّر تحميل طبقة البحار؛ علامات المواقع ما زالت متاحة.");
      });
    return () => controller.abort();
  }, [waterLesson]);
  useEffect(() => {
    if (!railLesson) return;
    const controller = new AbortController();
    fetch("/geodata/egypt-fast-train.geojson", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setRail)
      .catch((e) => {
        if (e.name !== "AbortError")
          setNotice("تعذّر تحميل مسار القطار السريع؛ علامات المواقع ما زالت متاحة.");
      });
    return () => controller.abort();
  }, [railLesson]);
  useEffect(() => {
    if (!ready || !railLesson || !showRail || !rail || hideRail) return;
    const map = mapRef.current;
    if (!map.getPane("rail-route")) {
      map.createPane("rail-route");
      map.getPane("rail-route").style.zIndex = "450";
    }
    const group = L.layerGroup().addTo(map);
    const lines = {
      ...rail,
      features: rail.features.filter((f) => f.properties.kind === "line"),
    };
    // Drawn in travel order: New Alamein → Ain Sokhna, then south to Abu
    // Simbel, then the Hurghada branch (see map-motion.css for the timing).
    const draw = (base) => (f) => ({
      ...base,
      className: `rail-draw rail-${f.properties.segment}`,
    });
    L.geoJSON(lines, {
      pane: "rail-route",
      interactive: false,
      style: draw({ color: "#ffffff", weight: 9, opacity: 0.9, lineCap: "round" }),
    }).addTo(group);
    L.geoJSON(lines, {
      pane: "rail-route",
      interactive: false,
      style: draw({ color: "#d61f26", weight: 4, opacity: 1, lineCap: "round" }),
      attribution: "مسار القطار: عن خريطة الكتاب",
    }).addTo(group);
    // Short wide dashes read as railway sleepers.
    L.geoJSON(lines, {
      pane: "rail-route",
      interactive: false,
      style: { color: "#d61f26", weight: 11, opacity: 1, dashArray: "2 16", lineCap: "butt", className: "rail-ties" },
    }).addTo(group);
    for (const f of rail.features.filter((f) => f.properties.kind === "station")) {
      const [lng, lat] = f.geometry.coordinates;
      L.circleMarker([lat, lng], {
        pane: "rail-route",
        radius: 6,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#12365c",
        fillOpacity: 1,
        interactive: false,
        className: `rail-station rail-station-${f.properties.order}`,
      })
        .bindTooltip(textNode(f.properties.name), {
          permanent: true,
          direction: "top",
          offset: [0, -6],
          className: "rail-station-label",
        })
        .addTo(group);
    }
    requestAnimationFrame(() => prepareNileDraw(map.getPane("rail-route"), "path.rail-draw"));
    return () => map.removeLayer(group);
  }, [ready, railLesson, showRail, rail, hideRail]);
  useEffect(() => {
    if (!ready || !waterLesson || !waterHighlights) return;
    const map = mapRef.current;
    if (!map.getPane("water-highlights")) {
      map.createPane("water-highlights");
      map.getPane("water-highlights").style.zIndex = "450";
    }
    const group = L.layerGroup().addTo(map);
    if (seas)
      L.geoJSON(seas, {
        pane: "water-highlights",
        interactive: false,
        style: (f) => ({
          color: f.properties.color,
          weight: 3,
          fillColor: f.properties.color,
          fillOpacity: 0.3,
          className: "water-sea-glow",
        }),
        attribution:
          'Water areas © Natural Earth · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Public domain</a>',
      }).addTo(group);
    if (river) {
      // Drawn south → north (the source geometry runs downstream), main
      // river first, then the Delta branches; a shimmer then keeps flowing north.
      const isBranch = (f) => /Branch/.test(f.properties?.name || "");
      const drawStyle = (base) => (f) => ({
        ...base,
        className: `nile-draw ${isBranch(f) ? "nile-draw-branch" : "nile-draw-main"}`,
      });
      L.geoJSON(river, {
        pane: "water-highlights",
        interactive: false,
        style: drawStyle({ color: "white", weight: 9, opacity: 0.85 }),
      }).addTo(group);
      L.geoJSON(river, {
        pane: "water-highlights",
        interactive: false,
        style: drawStyle({ color: "#0983ff", weight: 5, opacity: 1 }),
        attribution: "Nile geometry · Natural Earth",
      }).addTo(group);
      L.geoJSON(river, {
        pane: "water-highlights",
        interactive: false,
        style: { color: "#bfe6ff", weight: 2.4, opacity: 0.95, className: "nile-flow" },
      }).addTo(group);
      requestAnimationFrame(() => prepareNileDraw(map.getPane("water-highlights")));
    }
    return () => map.removeLayer(group);
  }, [ready, waterLesson, waterHighlights, river, seas]);
  useEffect(() => {
    const textbook = BASEMAPS.find((b) => b.image);
    if (!textbook) return;
    fetch(textbook.meta)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((meta) => {
        if (Array.isArray(meta?.bounds)) setTextbookMeta(meta);
        else throw Error();
      })
      .catch(() => {
        setTextbookMeta(null);
        setBasemap((b) => (b === textbook.id ? BASEMAPS[0].id : b));
      });
  }, []);
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (chosen.image) {
      if (!textbookMeta) return;
      const overlay = L.imageOverlay(chosen.image, textbookMeta.bounds, {
        attribution: safeText(textbookMeta.credit || chosen.credit),
        className: "textbook-basemap",
      }).addTo(map);
      map.getContainer().classList.add("has-textbook-basemap");
      setStatus("ready");
      return () => {
        map.getContainer().classList.remove("has-textbook-basemap");
        map.removeLayer(overlay);
      };
    }
    if (!chosen.url) {
      setStatus("local");
      return;
    }
    let valid = true,
      loaded = 0,
      errors = 0;
    setStatus("loading");
    const layer = L.tileLayer(chosen.url, {
      maxZoom: 18,
      attribution: `Tiles © <a href="${chosen.source}" target="_blank" rel="noopener noreferrer">Esri</a> — ${safeText(chosen.credit)}`,
      crossOrigin: true,
      keepBuffer: 1,
    });
    const timer = setTimeout(() => {
      if (!valid) return;
      if (!loaded) {
        valid = false;
        setStatus("error");
        map.removeLayer(layer);
      } else setStatus("partial");
    }, 12000);
    layer.on("tileload", () => {
      loaded++;
    });
    layer.on("loading", () => {
      if (valid) setStatus("loading");
    });
    layer.on("load", () => {
      if (valid && loaded) {
        clearTimeout(timer);
        setStatus(errors ? "partial" : "ready");
      }
    });
    layer.on("tileerror", () => {
      errors++;
      if (valid && !loaded && errors >= 3) {
        valid = false;
        clearTimeout(timer);
        setStatus("error");
        map.removeLayer(layer);
      } else if (valid && loaded) setStatus("partial");
    });
    layer.addTo(map);
    return () => {
      valid = false;
      clearTimeout(timer);
      map.removeLayer(layer);
    };
  }, [ready, basemap, retry, textbookMeta]);
  useEffect(() => {
    if (!ready || !usingLocal || !features) return;
    const map = mapRef.current;
    const land = L.geoJSON(features, {
      interactive: false,
      style: { fillColor: "#f1d9a4", fillOpacity: 1, stroke: false },
      attribution: "Natural Earth · حدود تعليمية معمّمة",
    }).addTo(map);
    const water = river
      ? L.geoJSON(river, {
          interactive: false,
          style: { color: "#218cca", weight: 2.5, opacity: 1 },
        }).addTo(map)
      : null;
    const labels = L.layerGroup().addTo(map);
    for (const [label, lat, lng] of [
      ["مصر", 26.6, 28.2],
      ["البحر المتوسط", 32.1, 29.5],
      ["البحر الأحمر", 25.3, 35.9],
      ["نهر النيل", 26.5, 31.9],
    ])
      L.marker([lat, lng], {
        interactive: false,
        icon: L.divIcon({
          className: "local-map-label",
          html: safeText(label),
          iconSize: [110, 25],
          iconAnchor: [55, 12],
        }),
      }).addTo(labels);
    return () => {
      map.removeLayer(land);
      if (water) map.removeLayer(water);
      map.removeLayer(labels);
    };
  }, [ready, usingLocal, features, river]);
  useEffect(() => {
    if (!ready || !governorates || !features) return;
    const map = mapRef.current;
    // White borders for all; the chosen one turns yellow, pulses once (CSS)
    // and gets a very light yellow fill. It is drawn last so it sits on top.
    const chosen = (f) => f.id === selectedGovernorate;
    const boundaries = L.geoJSON(features, {
      style: (f) => ({
        color: chosen(f) ? "#ffd21f" : "#ffffff",
        weight: chosen(f) ? 3.5 : 1.6,
        opacity: chosen(f) ? 1 : 0.92,
        fillColor: "#ffd21f",
        fillOpacity: chosen(f) ? 0.14 : 0.02,
        className: chosen(f) ? "governorate-chosen" : "governorate-line",
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(textNode(feature.properties.name_ar), {
          direction: "center",
          className: "governorate-name",
        });
        layer.on("click", () => chooseRef.current(feature.id));
      },
    }).addTo(map);
    boundaries.eachLayer((l) => l.feature.id === selectedGovernorate && l.bringToFront());
    return () => map.removeLayer(boundaries);
  }, [ready, governorates, features, selectedGovernorate]);
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const group = L.layerGroup().addTo(map);
    const placed = [];
    let glowIndex = 0;
    for (const site of sites) {
      if (!Number.isFinite(site.lat) || !Number.isFinite(site.lng)) continue;
      const highlighted = site.resource.id === activeResourceId,
        dim = activeResourceId && !highlighted;
      if (selectedLocationId === site.id)
        L.circleMarker([site.lat, site.lng], {
          radius: 24,
          color: "#ffb12b",
          weight: 3,
          fillColor: "#ffc14d",
          fillOpacity: 0.18,
          interactive: false,
          className: "selected-site-ring",
        }).addTo(group);
      const round = hasWaterSymbol(site.resource);
      const marker = L.marker([site.lat, site.lng], {
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: highlighted ? 500 : 0,
        opacity: dim ? 0.25 : 1,
        icon: L.divIcon({
          className: `esri-resource-marker ${round ? "has-water-symbol" : ""} ${highlighted ? "is-highlighted" : ""} ${selectedLocationId === site.id ? "is-selected" : ""}`,
          html: renderToStaticMarkup(<LessonSymbol resource={site.resource} />),
          // Lesson 2's illustrated pins are a little larger; all stand on their tip.
          iconSize: round ? [42, 49] : [38, 48],
          iconAnchor: round ? [21, 47] : [19, 45],
          tooltipAnchor: round ? [0, -40] : [0, -35],
        }),
      });
      marker.on("click", () => {
        if (marker.getElement() === document.activeElement)
          focusSite.current = site.id;
        focusLocation(site);
        callback.current.onSelect(site);
      });
      marker.bindTooltip(textNode(site.name), {
        permanent: showNames || selectedLocationId === site.id,
        direction: "top",
        className: "resource-map-label",
      });
      marker.addTo(group);
      const element = marker.getElement();
      placed.push({ site, element, fixed: highlighted || selectedLocationId === site.id, base: [parseFloat(element.style.marginLeft) || 0, parseFloat(element.style.marginTop) || 0] });
      element.setAttribute("role", "button");
      element.setAttribute(
        "aria-label",
        `${site.resource.label} — ${site.name}`,
      );
      element.setAttribute(
        "aria-pressed",
        String(selectedLocationId === site.id),
      );
      element.dataset.siteId = site.id;
      element.dataset.resourceId = site.resource.id;
      element.style.setProperty("--glow-color", site.resource.color || "#0983ff");
      element.style.setProperty("--glow-delay", `${(glowIndex++ % 6) * 0.45}s`);
      if (focusSite.current === site.id) {
        element.focus({ preventScroll: true });
        focusSite.current = null;
      }
      element.addEventListener("keydown", (e) => {
        if (e.target === element && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          e.stopPropagation();
          marker.fire("click");
        }
      });
      if (highlighted && site.resource.media?.video) {
        const button = document.createElement("button");
        button.className = "map-video-camera";
        button.type = "button";
        button.setAttribute("aria-label", `فيديو ${site.resource.label}`);
        button.textContent = "▶";
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          focusLocation(site);
          callback.current.onVideo(site);
        });
        element.appendChild(button);
      }
    }
    // Markers closer than about 30px at this zoom are spread on a small ring
    // around their shared spot so each stays visible and tappable; a
    // highlighted or chosen marker stays exactly on its place.
    const declutter = () => {
      const pts = placed.map((p) => ({ ...p, at: map.latLngToContainerPoint([p.site.lat, p.site.lng]) }));
      const done = new Set();
      for (const p of pts) {
        p.element.style.marginLeft = `${p.base[0]}px`;
        p.element.style.marginTop = `${p.base[1]}px`;
      }
      for (const p of pts) {
        if (done.has(p)) continue;
        const near = pts.filter((q) => !done.has(q) && q.at.distanceTo(p.at) < 30);
        near.forEach((q) => done.add(q));
        if (near.length < 2) continue;
        const centre = near.find((q) => q.fixed)?.at ||
          L.point(near.reduce((a, q) => a + q.at.x, 0) / near.length, near.reduce((a, q) => a + q.at.y, 0) / near.length);
        const moving = near.filter((q) => !(q.fixed && q.at === centre));
        const r = 18 + moving.length * 3;
        moving.forEach((q, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / moving.length;
          const dx = centre.x + Math.cos(a) * r - q.at.x;
          const dy = centre.y + Math.sin(a) * r - q.at.y;
          q.element.style.marginLeft = `${q.base[0] + dx}px`;
          q.element.style.marginTop = `${q.base[1] + dy}px`;
        });
      }
    };
    declutter();
    map.on("zoomend", declutter);
    return () => {
      map.off("zoomend", declutter);
      map.removeLayer(group);
    };
  }, [ready, sites, activeResourceId, selectedLocationId, showNames, waterLesson]);
  useEffect(() => {
    if (!gallery) return;
    const escape = (e) => {
      if (e.key === "Escape") {
        setGallery(false);
        galleryButton.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [gallery]);
  useEffect(() => {
    if (!ready) return;
    mapRef.current.stop();
    mapRef.current.fitBounds(EGYPT_BOUNDS, {
      ...EGYPT_FIT,
      animate: false,
    });
    setSelectedGovernorate("");
  }, [ready, resetKey]);
  // Montage spotlight: a glowing ring + name at the place being explained.
  // `side` says where the montage card is, so the place is framed in the
  // other half of the map.
  useEffect(() => {
    if (!ready || !spotlight) return;
    const map = mapRef.current;
    const group = L.layerGroup().addTo(map);
    L.circleMarker([spotlight.lat, spotlight.lng], {
      radius: 26,
      color: "#ffb800",
      weight: 4,
      fillColor: "#ffd34d",
      fillOpacity: 0.25,
      interactive: false,
      className: "montage-spot",
    })
      .bindTooltip(textNode(spotlight.label), {
        permanent: true,
        direction: "top",
        offset: [0, -24],
        className: "montage-spot-label",
      })
      .addTo(group);
    const zoom = spotlight.zoom || 6;
    const size = map.getSize();
    const point = map.project([spotlight.lat, spotlight.lng], zoom);
    if (window.innerWidth > 850)
      point.x += (spotlight.side === "right" ? 1 : -1) * size.x * 0.2;
    else point.y += size.y * 0.17;
    map.stop();
    map.flyTo(map.unproject(point, zoom), zoom, {
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.9,
    });
    return () => map.removeLayer(group);
  }, [ready, spotlight?.lat, spotlight?.lng, spotlight?.label, spotlight?.side]);
  // Lesson 2: the chosen water source plays its effect, then stays highlighted.
  const effectSites = useRef(sites);
  effectSites.current = sites;
  const chosenSite = useRef(selectedLocationId);
  chosenSite.current = selectedLocationId;
  useEffect(() => {
    if (!ready || !waterLesson || !hasWaterEffect(activeResourceId)) return;
    const map = mapRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A tapped site was already framed by focusLocation; a key choice frames all.
    if (EFFECT_VIEW[activeResourceId] && !chosenSite.current) fitEffect(activeResourceId, !reduced);
    return playWaterEffect(map, {
      id: activeResourceId,
      river,
      seas,
      sites: effectSites.current,
      color: WATER_SYMBOLS[activeResourceId]?.color,
      reduced,
    });
  }, [ready, waterLesson, activeResourceId, replay, river, seas]);
  function fitEffect(id, animate) {
    const map = mapRef.current;
    const narrow = window.innerWidth <= 850;
    map.stop();
    map.fitBounds(EFFECT_VIEW[id], {
      // Leave room for the resource card on wide screens; on phones the card
      // waits for the effect, so only the toolbar and bottom bar are avoided.
      paddingTopLeft: narrow ? [16, 110] : [16, 16],
      paddingBottomRight: narrow ? [16, 120] : [460, 90],
      animate,
      duration: 0.6,
    });
  }
  useEffect(() => {
    if (!ready || !focusRequest) return;
    if (focusRequest.resourceId) return fitSites(focusRequest.resourceId);
    const site = sites.find((s) => s.id === focusRequest.siteId);
    if (site) focusLocation(site);
  }, [ready, focusRequest]);
  // A resource chosen from the key: frame all its sites beside the card.
  function fitSites(resourceId) {
    const map = mapRef.current;
    const points = sites.filter((s) => s.resource.id === resourceId).map((s) => [s.lat, s.lng]);
    if (!points.length || (waterLesson && EFFECT_VIEW[resourceId])) return;
    const narrow = window.innerWidth <= 850;
    map.stop();
    map.fitBounds(points, {
      paddingTopLeft: narrow ? [30, 110] : [70, 70],
      paddingBottomRight: narrow ? [30, map.getSize().y * 0.5] : [470, 100],
      maxZoom: 7,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.6,
    });
  }
  function focusLocation(site) {
    const map = mapRef.current;
    // Whole-river, whole-sea and rain-belt sources show all of themselves.
    if (waterLesson && EFFECT_VIEW[site.resource.id] && site.resource.locations?.length === 1)
      return fitEffect(site.resource.id, !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const marine = ["mediterranean-sea", "red-sea"].includes(site.resource.id);
    // National projects zoom closer, ahead of their 3D view.
    const zoom = marine
      ? 6
      : site.resource.kind === "project"
        ? Math.max(map.getZoom(), 11)
        : Math.max(map.getZoom(), 8);
    const point = map.project([site.lat, site.lng], zoom);
    // Keep the chosen site in the part of the map that the resource card leaves
    // visible: above the bottom sheet on phones, beside the side panel in landscape.
    if (window.innerWidth <= 850) {
      const size = map.getSize();
      if (window.innerHeight <= 500) point.x += size.x * 0.23;
      else point.y += size.y * 0.2;
    }
    map.stop();
    map.setView(map.unproject(point, zoom), zoom, {
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.6,
    });
  }
  function selectBasemap(id, close = true) {
    setBasemap(id);
    setRetry((n) => n + 1);
    if (close) setGallery(false);
    try {
      localStorage.setItem("lamis.basemap.v1", id);
    } catch {}
    if (close) galleryButton.current?.focus();
  }
  // Arabic-tolerant matching: ignore diacritics/tatweel and common spelling variants (أ/إ/آ، ى/ي، ة/ه).
  const normalizeSearch = (text) => String(text || "").normalize("NFKD").replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
  const governorateOptions = features?.features || [];
  const filteredGovernorates = governorateOptions.filter(f => normalizeSearch(f.properties.name_ar).includes(normalizeSearch(governorateQuery)));
  const chosenGovernorate = governorateOptions.find(f => f.id === selectedGovernorate);
  useEffect(() => {
    if (!governorates) return;
    governorateSearchInput.current?.focus({ preventScroll: true });
    const escape = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setGovernorates(false);
      governorateButton.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [governorates]);
  // Choosing a governorate: a short move that shows all of it beside the
  // panel, its name in a label, and the teacher's line once per new choice.
  const govName = (f) => `محافظة ${f.properties.name_ar.replace(/^محافظة\s*/, "")}`;
  const govLine = (f) => `دي ${govName(f)}، لاحظ مكانها وحدودها على الخريطة`;
  const spokenGov = useRef("");
  function sideOfPicker() {
    const panel = root.current?.querySelector(".esri-governorates-picker")?.getBoundingClientRect();
    const box = host.current?.getBoundingClientRect();
    if (!panel || !box) return { paddingTopLeft: [28, 28], paddingBottomRight: [28, 28] };
    // A side panel takes the right edge; a bottom sheet (phones) the bottom.
    return panel.width < box.width * 0.6
      ? { paddingTopLeft: [28, 70], paddingBottomRight: [Math.max(28, box.right - panel.left + 20), 28] }
      : { paddingTopLeft: [20, 70], paddingBottomRight: [20, Math.max(28, box.bottom - panel.top + 16)] };
  }
  function showAllGovernorates() {
    setSelectedGovernorate("");
    spokenGov.current = "";
    narrator.stop();
    mapRef.current.flyToBounds(EGYPT_BOUNDS, { ...EGYPT_FIT, animate: !reducedMotion(), duration: 0.6 });
  }
  function chooseGovernorate(id) {
    if (!id) return showAllGovernorates();
    const feature = features?.features.find((f) => f.id === id);
    if (!feature) return;
    setSelectedGovernorate(id);
    mapRef.current.stop();
    mapRef.current.flyToBounds(L.geoJSON(feature).getBounds(), {
      ...sideOfPicker(),
      maxZoom: 8,
      animate: !reducedMotion(),
      duration: 0.8,
    });
    if (spokenGov.current !== id) {
      spokenGov.current = id;
      narrator.speak(govLine(feature));
    }
  }
  const chooseRef = useRef(chooseGovernorate);
  chooseRef.current = chooseGovernorate;
  // The label sits just above the panel when it is a bottom sheet (phones).
  useEffect(() => {
    const panel = root.current?.querySelector(".esri-governorates-picker");
    if (panel) root.current.style.setProperty("--gov-sheet", `${Math.round(panel.offsetHeight)}px`);
  });
  // Opening the panel starts from all of Egypt with every border in white.
  useEffect(() => {
    if (!governorates || !ready) return;
    if (!selectedGovernorate)
      mapRef.current.flyToBounds(EGYPT_BOUNDS, { ...EGYPT_FIT, animate: !reducedMotion(), duration: 0.6 });
  }, [governorates, ready]);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current.requestFullscreen)
        await root.current.requestFullscreen();
      else setNotice("ملء الشاشة غير متاح في هذا المتصفح.");
    } catch {
      setNotice("تعذّر فتح ملء الشاشة.");
    }
  }
  return (
    <section
      ref={root}
      className={`esri-map-surface ${usingLocal ? "has-local-basemap" : ""}`}
      aria-label="خريطة موارد مصر"
    >
      <div
        ref={host}
        className="esri-leaflet-host"
        aria-label="خريطة مصر؛ استخدم أزرار التكبير أو اسحب الخريطة"
      />
      {/* Stacked: أسماء المعالم, المحافظات, then (a little apart) معرض الخرائط.
          The first two switch on and off and show ✓ while on. */}
      <div className="esri-map-toolbar is-stacked" hidden={hideTools}>
        {onToggleNames && (
          <button
            className="map-tool"
            aria-pressed={showNames}
            title="إظهار أو إخفاء أسماء المعالم على الخريطة"
            onClick={onToggleNames}
          >
            <span className="map-label-icon" aria-hidden="true">أ</span>
            <span className="map-tool-text">أسماء المعالم</span>
            {showNames && <Check className="map-tool-check" size={16} weight="bold" aria-hidden="true" />}
          </button>
        )}
        <button
          ref={governorateButton}
          className="map-tool"
          aria-pressed={governorates}
          aria-controls="governorate-tools"
          onClick={() => { if (!governorates) { setGallery(false); onToolOpen?.(); } setGovernorates((v) => !v); setGovernorateQuery(""); }}
        >
          <Stack size={20} aria-hidden="true" />
          <span className="map-tool-text">المحافظات</span>
          {governorates && <Check className="map-tool-check" size={16} weight="bold" aria-hidden="true" />}
        </button>
        <button
          ref={galleryButton}
          className="map-tool is-gallery"
          aria-expanded={gallery}
          aria-controls="basemap-gallery"
          onClick={() => { if (!gallery) { setGovernorates(false); onToolOpen?.(); } setGallery((v) => !v); }}
        >
          <SquaresFour size={21} aria-hidden="true" />
          <span className="map-tool-text">معرض الخرائط</span>
        </button>
      </div>
      <div className="esri-map-zoom" aria-label="أدوات الخريطة">
        <button
          aria-label="تكبير الخريطة"
          onClick={() => mapRef.current.zoomIn()}
        >
          <Plus size={21} />
        </button>
        <button
          aria-label="تصغير الخريطة"
          onClick={() => mapRef.current.zoomOut()}
        >
          <Minus size={21} />
        </button>
        <button
          aria-label="عرض مصر كاملة"
          onClick={() => {
            mapRef.current.fitBounds(EGYPT_BOUNDS, {
              ...EGYPT_FIT,
              animate: false,
            });
            setSelectedGovernorate("");
            onReset?.();
          }}
        >
          <Compass size={22} />
        </button>
        <button aria-label="ملء الشاشة" onClick={fullscreen}>
          <CornersOut size={21} />
        </button>
      </div>
      {waterLesson && hasWaterEffect(activeResourceId) && (
        <button type="button" className="wfx-replay" onClick={() => setReplay((n) => n + 1)}>
          <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> إعادة المشاهدة
        </button>
      )}
      {ready && overlay?.(mapRef.current)}
      {/* The train's key waits until the train is chosen (its journey then
          shows its own); the line itself stays on the lesson map. */}
      {railKey && railLesson && rail && !hideRail && (
        <div className="water-source-key rail-route-key">
          <label>
            <input
              type="checkbox"
              checked={showRail}
              onChange={(e) => setShowRail(e.target.checked)}
            />
            مسار القطار السريع
          </label>
          {showRail && (
            <div>
              <span>
                <i className="rail-route-swatch" />
                خط القطار السريع
              </span>
              <span>
                <i className="rail-station-swatch" />
                محطة رئيسية
              </span>
              <small>من العلمين الجديدة إلى العين السخنة والغردقة وأبو سمبل. المسار مرسوم عن خريطة الكتاب.</small>
            </div>
          )}
        </div>
      )}
      {/* Only loading and problems are announced; the basemap name stays in the gallery. */}
      {(status === "loading" || status === "partial") && !usingLocal && (
        <div className="esri-basemap-state" role="status">
          {status === "loading" ? "جارٍ تحميل الخريطة…" : "بعض أجزاء الخريطة لم تُحمّل"}
        </div>
      )}
      <div className="esri-map-alerts">
        {status === "error" && basemap !== "local" && (
          <div className="esri-map-warning" role="status">
            <span>تعذر تحميل Esri؛ نعرض خريطة محلية وليست صورة قمر صناعي.</span>
            <button onClick={() => setRetry((n) => n + 1)}>
              <ArrowClockwise size={16} aria-hidden="true" />
              إعادة المحاولة
            </button>
          </div>
        )}
        {notice && (
          <div className="esri-map-warning" role="status">
            <span>{notice}</span>
            <button aria-label="إغلاق التنبيه" onClick={() => setNotice("")}>
              <X aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {gallery && (
        <section
          id="basemap-gallery"
          className="basemap-gallery"
          aria-labelledby="gallery-title"
        >
          <header>
            <h2 id="gallery-title">اختر شكل خريطتك</h2>
            <button
              aria-label="إغلاق معرض الخرائط"
              onClick={() => {
                setGallery(false);
                galleryButton.current?.focus();
              }}
            >
              <X size={21} />
            </button>
          </header>
          <div role="radiogroup" aria-label="خرائط الأساس">
            {galleryItems.map((b) => (
              <button
                key={b.id}
                role="radio"
                aria-checked={basemap === b.id}
                tabIndex={basemap === b.id ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    ![
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowDown",
                      "ArrowUp",
                      "Home",
                      "End",
                    ].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const i = galleryItems.findIndex((item) => item.id === b.id),
                    index =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? galleryItems.length - 1
                          : (i +
                              (["ArrowLeft", "ArrowDown"].includes(e.key)
                                ? 1
                                : -1) +
                              galleryItems.length) %
                            galleryItems.length;
                  const buttons =
                    e.currentTarget.parentElement.querySelectorAll(
                      '[role="radio"]',
                    );
                  selectBasemap(galleryItems[index].id, false);
                  buttons[index]?.focus();
                }}
                onClick={() => selectBasemap(b.id)}
              >
                <GalleryThumbnail basemap={b} />
                <strong>{b.label}</strong>
                <small>{b.description}</small>
              </button>
            ))}
          </div>
          <p>
            خدمات Esri العامة تتطلب اتصالًا بالإنترنت وتخضع لشروط المصدر. الصور
            ليست بثًا مباشرًا.
          </p>
        </section>
      )}
      {governorates && chosenGovernorate && (
        <div className="governorate-tag" role="status" key={chosenGovernorate.id}>
          <strong>{govName(chosenGovernorate)}</strong>
          <span>لاحظ مكانها وحدودها على الخريطة</span>
          <button
            type="button"
            aria-label={`أعد الاستماع: ${govName(chosenGovernorate)}`}
            onClick={() => narrator.speak(govLine(chosenGovernorate))}
          >
            <SpeakerHigh size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {governorates && (
        <div className="esri-governorates-picker" id="governorate-tools" role="region" aria-label="البحث واختيار المحافظة">
          <header><strong>المحافظات</strong>{chosenGovernorate && (
            <span className="governorate-tag-inline" role="status">
              <b>{govName(chosenGovernorate)}</b>
              <button type="button" aria-label={`أعد الاستماع: ${govName(chosenGovernorate)}`} onClick={() => narrator.speak(govLine(chosenGovernorate))}>
                <SpeakerHigh size={18} aria-hidden="true" />
              </button>
            </span>
          )}<button aria-label="إغلاق قائمة المحافظات" onClick={() => { setGovernorates(false); governorateButton.current?.focus({ preventScroll: true }); }}><X size={21} /></button></header>
          <label className="governorate-search">
            ابحث عن محافظة
            <input ref={governorateSearchInput} type="search" value={governorateQuery} placeholder="اكتب اسم المحافظة…" disabled={!features} onChange={(e) => setGovernorateQuery(e.target.value)} aria-describedby="governorate-search-status" />
          </label>
          <SelectField label="اختر محافظة" compact value={selectedGovernorate} disabled={!features} onChange={(e) => chooseGovernorate(e.target.value)}>
            <option value="">جميع المحافظات</option>
            {chosenGovernorate && !filteredGovernorates.some(f => f.id === selectedGovernorate) && <option value={chosenGovernorate.id}>المحدد: {chosenGovernorate.properties.name_ar}</option>}
            {filteredGovernorates.map(f => <option key={f.id} value={f.id}>{f.properties.name_ar}</option>)}
            {!filteredGovernorates.length && <option disabled>لا توجد نتائج مطابقة</option>}
          </SelectField>
          <p id="governorate-search-status" className="governorate-search-status" role="status">
            {/* Short words for children: only loading and search results. */}
            {!features ? "جارٍ تحميل المحافظات…" : governorateQuery ? filteredGovernorates.length ? `${filteredGovernorates.length} نتيجة` : "لا توجد نتائج. جرّب اسمًا آخر." : ""}
          </p>
          <button
            type="button"
            className="governorate-all"
            disabled={!selectedGovernorate}
            onClick={showAllGovernorates}
          >
            عرض جميع المحافظات
          </button>
          {dataError && <span role="status">{dataError}</span>}
        </div>
      )}
    </section>
  );
}

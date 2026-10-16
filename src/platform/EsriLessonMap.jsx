import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-motion.css";
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
} from "phosphor-react";
import ResourcePin from "../components/Map/ResourcePin";
import SelectField from "./SelectField";
import { BASEMAPS, EGYPT_BOUNDS, readBasemap } from "./mapBasemaps";
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
// Gives each Nile path its own length so the CSS draw animation can run it
// from its first point (south) to its last; afterwards the dash is cleared so
// zooming (which rewrites the path) never shows a partial river.
function prepareNileDraw(pane) {
  if (!pane) return;
  for (const path of pane.querySelectorAll("path.nile-draw")) {
    const length = Math.ceil(path.getTotalLength?.() || 0);
    if (!length) continue;
    path.style.setProperty("--nile-length", length);
    path.classList.add("is-drawing");
    path.addEventListener(
      "animationend",
      () => path.classList.replace("is-drawing", "is-drawn"),
      { once: true },
    );
  }
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
  onReset,
  onToolOpen,
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
    [waterHighlights, setWaterHighlights] = useState(true),
    [dataError, setDataError] = useState(""),
    [selectedGovernorate, setSelectedGovernorate] = useState(""),
    [governorateQuery, setGovernorateQuery] = useState(""),
    [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0),
    [notice, setNotice] = useState("");
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
      maxBounds: [
        [18, 20],
        [36, 42],
      ],
      maxBoundsViscosity: 0.7,
      keyboard: true,
    });
    mapRef.current = map;
    map.fitBounds(EGYPT_BOUNDS, { padding: [24, 36], animate: false });
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
    if (!ready) return;
    const map = mapRef.current;
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
  }, [ready, basemap, retry]);
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
    const boundaries = L.geoJSON(features, {
      style: (f) => ({
        color: f.id === selectedGovernorate ? "#ffd45b" : "#f9fbff",
        weight: f.id === selectedGovernorate ? 3 : 1,
        fillColor: "#f4d777",
        fillOpacity: f.id === selectedGovernorate ? 0.25 : 0.03,
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(textNode(feature.properties.name_ar), {
          direction: "center",
          className: "governorate-name",
        });
        layer.on("click", () => setSelectedGovernorate(feature.id));
      },
    }).addTo(map);
    return () => map.removeLayer(boundaries);
  }, [ready, governorates, features, selectedGovernorate]);
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const group = L.layerGroup().addTo(map);
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
      const marker = L.marker([site.lat, site.lng], {
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: highlighted ? 500 : 0,
        opacity: dim ? 0.2 : 1,
        icon: L.divIcon({
          className: `esri-resource-marker ${highlighted ? "is-highlighted" : ""} ${selectedLocationId === site.id ? "is-selected" : ""} ${waterLesson && site.resource.kind === "water" ? "water-source-glow" : ""}`,
          html: renderToStaticMarkup(<ResourcePin resource={site.resource} />),
          iconSize: [38, 48],
          iconAnchor: [19, 45],
          tooltipAnchor: [0, -35],
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
    return () => map.removeLayer(group);
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
      padding: [24, 36],
      animate: false,
    });
    setSelectedGovernorate("");
  }, [ready, resetKey]);
  useEffect(() => {
    if (!ready || !focusRequest) return;
    const site = sites.find((s) => s.id === focusRequest.siteId);
    if (site) focusLocation(site);
  }, [ready, focusRequest]);
  function focusLocation(site) {
    const map = mapRef.current;
    const marine = ["mediterranean-sea", "red-sea"].includes(site.resource.id);
    const zoom = marine ? 6 : Math.max(map.getZoom(), 8);
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
  function chooseGovernorate(id) {
    setSelectedGovernorate(id);
    if (!id) {
      mapRef.current.fitBounds(EGYPT_BOUNDS, { padding: [24, 36], animate: false });
      return;
    }
    const feature = features?.features.find((f) => f.id === id);
    if (feature)
      mapRef.current.fitBounds(L.geoJSON(feature).getBounds(), {
        padding: [28, 28],
        maxZoom: 8,
        animate: false,
      });
  }
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
      <div className="esri-map-toolbar">
        <button
          ref={galleryButton}
          aria-expanded={gallery}
          aria-controls="basemap-gallery"
          onClick={() => { if (!gallery) { setGovernorates(false); onToolOpen?.(); } setGallery((v) => !v); }}
        >
          <SquaresFour size={21} />
          <span className="ux-long">معرض الخرائط</span><span className="ux-short" aria-hidden="true">الخرائط</span>
        </button>
        <button
          ref={governorateButton}
          aria-pressed={governorates}
          aria-controls="governorate-tools"
          onClick={() => { if (!governorates) { setGallery(false); onToolOpen?.(); } setGovernorates((v) => !v); setGovernorateQuery(""); }}
        >
          <Stack size={20} />
          المحافظات
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
              padding: [24, 36],
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
      {waterLesson && (
        <div className="water-source-key">
          <label>
            <input
              type="checkbox"
              checked={waterHighlights}
              onChange={(e) => setWaterHighlights(e.target.checked)}
            />
            إبراز مصادر المياه
          </label>
          {waterHighlights && (
            <div>
              <span>
                <i className="nile-water-swatch" />
                نهر النيل · مياه عذبة
              </span>
              <span>
                <i className="med-water-swatch" />
                البحر المتوسط · مياه مالحة
              </span>
              <span>
                <i className="red-water-swatch" />
                البحر الأحمر · مياه مالحة
              </span>
              <small>مياه البحر تحتاج إلى التحلية للشرب.</small>
            </div>
          )}
        </div>
      )}
      <div className="esri-basemap-state" role="status">
        {usingLocal
          ? "الخريطة التعليمية المحلية"
          : status === "loading"
            ? "جارٍ تحميل خريطة Esri…"
            : chosen.label}
        {status === "partial" && " · بعض الصور لم تُحمّل"}
      </div>
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
            {BASEMAPS.map((b) => (
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
                  const i = BASEMAPS.findIndex((item) => item.id === b.id),
                    index =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? BASEMAPS.length - 1
                          : (i +
                              (["ArrowLeft", "ArrowDown"].includes(e.key)
                                ? 1
                                : -1) +
                              BASEMAPS.length) %
                            BASEMAPS.length;
                  const buttons =
                    e.currentTarget.parentElement.querySelectorAll(
                      '[role="radio"]',
                    );
                  selectBasemap(BASEMAPS[index].id, false);
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
      {governorates && (
        <div className="esri-governorates-picker" id="governorate-tools" role="region" aria-label="البحث واختيار المحافظة">
          <header><strong>المحافظات</strong><button aria-label="إغلاق قائمة المحافظات" onClick={() => { setGovernorates(false); governorateButton.current?.focus({ preventScroll: true }); }}><X size={21} /></button></header>
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
            {!features ? "جارٍ تحميل المحافظات…" : governorateQuery ? filteredGovernorates.length ? `${filteredGovernorates.length} نتيجة للبحث · الاختيار الحالي محفوظ حتى تختار محافظة أخرى.` : "لا توجد نتائج. جرّب اسمًا آخر أو امسح البحث." : `${governorateOptions.length} محافظة · اختيار المحافظة يقرّب حدودها على الخريطة.`}
          </p>
          <small>حدود Natural Earth التعليمية المعمّمة.</small>
          {selectedGovernorate && (
            <span role="status">
              المحافظة المختارة:{" "}
              {
                features?.features.find((f) => f.id === selectedGovernorate)
                  ?.properties.name_ar
              }
            </span>
          )}
          {dataError && <span role="status">{dataError}</span>}
        </div>
      )}
    </section>
  );
}

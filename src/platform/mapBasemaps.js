const base = "https://server.arcgisonline.com/ArcGIS/rest/services";
export const BASEMAPS = [
  {
    id: "imagery",
    label: "صور الأقمار الصناعية",
    service: "World_Imagery",
    description: "Esri World Imagery",
    credit: "Esri, Vantor, Earthstar Geographics, and the GIS User Community",
  },
  {
    id: "streets",
    label: "خريطة الشوارع",
    service: "World_Street_Map",
    description: "المدن والطرق والأسماء",
    credit:
      "Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, OpenStreetMap contributors, GIS User Community",
  },
  {
    id: "topographic",
    label: "الخريطة التضاريسية",
    service: "World_Topo_Map",
    description: "التضاريس والأماكن",
    credit:
      "Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), OpenStreetMap contributors, GIS User Community",
  },
  {
    id: "local",
    label: "الخريطة التعليمية",
    description: "بديل محلي دون اتصال",
    credit: "Natural Earth · Public Domain · حدود معمّمة تعليمية",
  },
].map((b) => ({
  ...b,
  url: b.service ? `${base}/${b.service}/MapServer/tile/{z}/{y}/{x}` : null,
  thumbnail: b.service ? `${base}/${b.service}/MapServer/tile/4/6/9` : null,
  source: b.service ? `${base}/${b.service}/MapServer` : null,
}));
// Egypt's own extent (Salloum to Halaib, Sudan border to the coast), so the
// first view is mostly Egypt. The north edge reaches 32.05° to keep the
// offshore Zohr gas field (31.78°N) and its pin inside the view.
export const EGYPT_BOUNDS = [
  [21.9, 24.7],
  [32.05, 36.95],
];
// Room for the map toolbars (top) and the learning bar (bottom), so no part of
// Egypt starts hidden behind them.
export const EGYPT_FIT = {
  get paddingTopLeft() {
    return [8, typeof window !== "undefined" && window.innerWidth <= 850 ? 104 : 56];
  },
  get paddingBottomRight() {
    return [8, typeof window !== "undefined" && window.innerWidth <= 850 ? 112 : 92];
  },
};
export function readBasemap() {
  try {
    const id = localStorage.getItem("lamis.basemap.v1");
    return BASEMAPS.some((b) => b.id === id) ? id : "imagery";
  } catch {
    return "imagery";
  }
}

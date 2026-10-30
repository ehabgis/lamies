import { useEffect } from "react";
import { Leaf, MagnifyingGlass, CornersOut, X, Info } from "phosphor-react";
import RobotGuide from "../components/Map/RobotGuide";
import "./toshka-tour.css";

// «استكشف مشروع توشكى» (lesson 3) on the same map. The views were read off the
// Esri World Imagery tiles (checked 2026-10-30): the irrigated circles lie west
// of the Sheikh Zayed canal, around 22.9–23.25°N, 31.3–31.65°E. They show
// where the fields are in the imagery; they are not an official project
// boundary, which the lesson data does not have, so no outline is drawn.
export const TOSHKA_ID = "toshka-kheir";
const AREA = [
  [22.88, 31.3],
  [23.25, 31.66],
];
const FIELDS = { center: [22.945, 31.405], zoom: 13 };
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Moves the map: the whole area first, then the fields when asked.
export function ToshkaView({ map, view }) {
  useEffect(() => {
    const animate = !reducedMotion();
    if (view.mode === "fields") map.flyTo(FIELDS.center, FIELDS.zoom, { animate, duration: 1.4 });
    else
      map.flyToBounds(AREA, {
        paddingTopLeft: [40, 110],
        paddingBottomRight: [window.innerWidth <= 850 ? 40 : 380, 100],
        animate,
        duration: 1.6,
      });
  }, [map, view.mode, view.nonce]);
  return null;
}

export function ToshkaCard({ resource, view, onFields, onArea, onCloseHint }) {
  return (
    <>
      <aside className="tk-card" aria-label={resource.label}>
        <span className="tk-icon" aria-hidden="true">
          <Leaf size={34} weight="fill" />
        </span>
        <h2>{resource.label}</h2>
        <p>مشروع للتوسع في الزراعة واستصلاح الأراضي الصحراوية.</p>
        <button type="button" className={`tk-main ${view.mode === "fields" ? "is-on" : ""}`} onClick={onFields}>
          استكشف الحقول <MagnifyingGlass size={20} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="tk-soft" onClick={onArea}>
          عرض المنطقة كاملة <CornersOut size={20} aria-hidden="true" />
        </button>
        <small>
          <Info size={14} aria-hidden="true" /> صور أقمار صناعية حقيقية. لا تتوفر حدود موثّقة للمشروع، لذلك لا نرسم إطارًا حوله.
        </small>
      </aside>
      {view.mode === "fields" && view.hint && (
        <div className="tk-hint" role="status">
          <p>
            لاحظ شكل الحقول الخضراء، وقارنها بالصحراء المحيطة.
            <button type="button" aria-label="إخفاء رسالة المعلم" onClick={onCloseHint}>
              <X size={16} weight="bold" />
            </button>
          </p>
          <span aria-hidden="true">
            <RobotGuide />
          </span>
        </div>
      )}
    </>
  );
}

// Ready answers «المعلم الذكي» offers while Toshka is open.
export const TOSHKA_HELPS = [
  {
    q: "ليه بعض الحقول شكلها دوائر؟",
    match: /دوائر|دواير|دائر|مدور/,
    a: "لأن جهاز الري المحوري بيلف حوالين نقطة ثابتة في نص الحقل، فيروي مساحة على شكل دائرة. وده بيوفّر المياه في الأراضي الصحراوية.",
    fields: true,
  },
  {
    q: "ساعدني أميّز الحقول عن الصحراء",
    match: /أميز|اميز|أفرق|افرق|الفرق|الصحراء/,
    a: "الحقول المزروعة لونها أخضر غامق وأشكالها منتظمة: دواير ومستطيلات جنب بعض. أما الصحراء فلونها أصفر فاتح ومن غير أشكال منتظمة. قرّبتلك الخريطة على الحقول؛ جرّب تلاقي حقل أخضر جنب جزء صحراوي.",
    fields: true,
  },
];

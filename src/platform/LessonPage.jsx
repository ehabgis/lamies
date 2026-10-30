import { useEffect, useState, useRef, lazy, Suspense } from "react";
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  Target,
  Stack,
  Star,
  VideoCamera,
  ChatCircle,
  SpeakerHigh,
  Compass,
  MagnifyingGlass,
  Plus,
  Minus,
  MapTrifold,
  ImageSquare,
  X,
  Lightbulb,
  Info,
  Cube,
  MapPin,
  Drop,
  Waves,
  Recycle,
  BookBookmark,
} from "phosphor-react";
import * as narrator from "./narrator";
import Shell, { PlatformNavigation } from "./Shell";
import { useSession } from "./Session";
import { api } from "./api";
import LearningDrawer from "./LearningDrawer";
import EsriLessonMap from "./EsriLessonMap";
import "./map-workspace.css";
import "./map-studio.css";
import "./map-polish.css";
import "./map-ux.css";
import "./map-header.css";
import "./activities.css";
import "./rich-activities.css";
import ActivityPicker, { ActivitySteps, activityMeta } from "./ActivityPicker";
import MapVideoPanel from "./MapVideoPanel";
const Site3DView = lazy(() => import("./Site3DView"));
// The train has its own journey on the map instead of a 3D view.
const has3D = (r) => r?.kind === "project" && r.id !== "high-speed-rail";
import Question from "./Question";
import AIAssistant from "./AIAssistant";
import { LessonSymbol } from "../components/Map/WaterSymbol";
import { hasWaterEffect, EFFECT_MS } from "./waterEffects";
import { iconFamily } from "../components/Map/lessonIcons";
import RobotGuide from "../components/Map/RobotGuide";
import BrandMark from "./BrandMark";
import ExplorerChip from "./ExplorerChip";
import RailJourney from "./RailJourney";
import MapTeacher, { MeasureLine } from "./MapTeacher";
import { CapitalApproach, CapitalCard, CAPITAL_ID, CAPITAL_QUESTION } from "./CapitalTour";
import LessonMontage from "./LessonMontage";
import { buildScenes, SECTIONS } from "./montageScenes";
import { loadGuest } from "./guestProfile";
import SiteMedia from "./SiteMedia";
import "./montage.css";
import "./site-card.css";
import "./lesson-cards.css";
import "./map-compact.css";
import { play, resourceSound } from "./sfx";
const kindNames = {
  mineral: "خام معدني",
  renewable: "طاقة متجددة",
  nonrenewable: "طاقة غير متجددة",
  water: "مورد مائي",
  project: "مشروع قومي",
};
const kindName = (r) =>
  iconFamily(r)?.label || kindNames[r.kind];
export const mapPosition = (l) => ({
  left: `${(75 + ((l.lng - 24) / 12) * 350) / 5}%`,
  top: `${(365 - ((l.lat - 21) / 11) * 330) / 4}%`,
});
// The place's own photos first, then the teacher's preview, then the resource photo.
// Chosen from the key (no site yet): the photos of all its sites, so the
// card shows pictures at once.
function siteImages(resource, location, localPhoto) {
  const places = location ? [location] : resource.locations || [];
  const list = [
    ...places.flatMap((l) => l.media?.images || []).map((src) => ({ src })),
    localPhoto && { src: localPhoto, credit: "معاينة على هذا الجهاز فقط" },
    resource.media?.image && { src: resource.media.image, credit: resource.media.imageCredit },
  ].filter(Boolean);
  return list.filter((img, i) => list.findIndex((x) => x.src === img.src) === i);
}

// Up to two short book facts that mention this resource.
function relatedFacts(content, resource) {
  const extras = content?.legacyExtras || {};
  const stem = resource.label.replace(/^ال/, "");
  const words = (t) => new Set(String(t).replace(/[^\u0600-\u06FF\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));
  const said = words(`${resource.description} ${resource.importance}`);
  // A fact that mostly repeats the card's own sentences adds nothing.
  const isNew = (t) => {
    const w = [...words(t)];
    return w.filter((x) => said.has(x)).length / Math.max(1, w.length) < 0.5;
  };
  return [...(extras.funFacts || []), ...(extras.keyPoints || []), ...(extras.examples || [])]
    .filter((t) => typeof t === "string" && t.includes(stem) && isNew(t))
    .filter((t, i, all) => all.indexOf(t) === i)
    .slice(0, 2);
}

function Photo({ src, label }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className="resource-photo"
      src={src}
      alt={label}
      onError={() => setFailed(true)}
    />
  ) : (
    <p className="media-pending">لم تُضف صورة مرخصة لهذا المورد بعد.</p>
  );
}
export default function LessonPage({ demo = false }) {
  const { id } = useParams();
  const { user } = useSession();
  const [unitTitle, setUnitTitle] = useState("");
  const navigate = useNavigate();
  const [lessonOptions, setLessonOptions] = useState([]);
  const [legendOpen, setLegendOpen] = useState(() => window.innerWidth > 850);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hello, setHello] = useState(true);
  const cardTimer = useRef(null);
  useEffect(() => () => clearTimeout(cardTimer.current), []);
  const [showLocationNames, setShowLocationNames] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [resetMap, setResetMap] = useState(0);
  const [focusRequest, setFocusRequest] = useState(null);
  const [localPhotos, setLocalPhotos] = useState({});
  const photoUrls = useRef(new Set());
  useEffect(
    () => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  useEffect(() => {
    let active = true;
    api(demo ? "/demo/catalog" : "/catalog")
      .then((data) => {
        const current = data.nodes.find(
          (n) => n.kind === "lesson" && (n.id === id || n.demoLessonId === id),
        );
        if (active) {
          setUnitTitle(
            data.nodes.find((n) => n.id === current?.parentId)?.title || "",
          );
          setLessonOptions(
            data.nodes.filter(
              (n) => n.kind === "lesson" && n.parentId === current?.parentId,
            ),
          );
        }
      })
      .catch(() => {
        if (active) {
          setLessonOptions([]);
          setUnitTitle("اسم الوحدة غير متاح حاليًا");
        }
      });
    return () => {
      active = false;
    };
  }, [demo, id]);
  function attachPhoto(file) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      ) ||
      file.size > 8 * 1024 * 1024
    ) {
      setNotice(
        "اختر صورة PNG أو JPG أو WebP أو GIF بحجم لا يتجاوز 8 ميجابايت.",
      );
      return;
    }
    const url = URL.createObjectURL(file);
    photoUrls.current.add(url);
    setLocalPhotos((old) => ({ ...old, [resource.id]: url }));
  }
  useEffect(() => {
    setView3d(null);
    return () => clearTimeout(open3dTimer.current);
  }, [id]);
  function showAll() {
    setView3d(null);
    setResource(null);
    setLocation(null);
    setFull(true);
    setVideoOpen(false);
    setFocusRequest(null);
    setResetMap((n) => n + 1);
  }
  const [search] = useSearchParams();
  const preview = !demo && search.get("preview") === "1";
  const [lesson, setLesson] = useState(null),
    [error, setError] = useState(""),
    [resource, setResource] = useState(null),
    [location, setLocation] = useState(null),
    [mode, setMode] = useState("interactive"),
    [pickActivity, setPickActivity] = useState(true),
    [activityGroup, setActivityGroup] = useState(null),
    [view3d, setView3d] = useState(null),
    // Lesson 3's New Capital: { site, zoom } while the map flies there, then the scene.
    [capital, setCapital] = useState(null),
    // «المعلم الذكي» beside the map, and the distance it measured (drawn on the map).
    [teacher, setTeacher] = useState(false),
    [measured, setMeasured] = useState(null),
    [montage, setMontage] = useState(null),
    [spotlight, setSpotlight] = useState(null),
    open3dTimer = useRef(null),
    [full, setFull] = useState(false),
    [panel, setPanel] = useState(null),
    [modal, setModal] = useState(null),
    [index, setIndex] = useState(0),
    [solved, setSolved] = useState([]),
    [completed, setCompleted] = useState(false),
    [pulse, setPulse] = useState(false),
    [aiMode, setAiMode] = useState("explain"),
    [aiInitial, setAiInitial] = useState(""),
    [aiQuestion, setAiQuestion] = useState(null),
    [assessment, setAssessment] = useState(null),
    [notice, setNotice] = useState(""),
    [stateReady, setStateReady] = useState(false);
  useEffect(() => {
    let active = true;
    setLesson(null);
    setPanel(null);
    setModal(null);
    setIndex(0);
    setFull(false);
    setNotice("");
    setVideoOpen(false);
    setStateReady(false);
    setError("");
    api(`${demo ? "/demo" : ""}/lessons/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!active) return;
        setLesson(data.lesson);
        setSolved(
          data.progress.answers
            .filter((a) => a.correct)
            .map((a) => a.questionId),
        );
        setCompleted(data.progress.completed);
        const state = data.progress.state || {};
        const restoredResource = data.lesson.content.resources?.find(
          (r) => r.id === state.resourceId,
        );
        setResource(restoredResource || null);
        setLocation(
          restoredResource?.locations?.find((l) => l.id === state.locationId) ||
            null,
        );
        // The mode picker was removed from the map key; always open in free exploration.
        setMode("interactive");
        setStateReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, demo]);
  // «شاهد على الخريطة» from the lesson book: open with that resource chosen.
  const pickById = useRef(null);
  const wanted = search.get("resource");
  useEffect(() => {
    if (stateReady && wanted) pickById.current?.(wanted);
  }, [stateReady, wanted]);
  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 2600);
    return () => clearTimeout(t);
  }, [pulse]);
  useEffect(() => {
    if (!stateReady || !lesson || preview || demo) return;
    const timer = setTimeout(() => {
      api(`/lessons/${encodeURIComponent(id)}/state`, {
        method: "PUT",
        body: {
          resourceId: resource?.id || null,
          locationId: location?.id || null,
          mode,
        },
      }).catch(() =>
        setNotice("تعذّر حفظ موضع الخريطة. إجاباتك المحفوظة لن تتأثر."),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [stateReady, lesson, id, resource, location, mode, preview, demo]);
  useEffect(() => {
    // The 3D view handles its own Escape; the card behind it stays open.
    if (modal || videoOpen || view3d || (!infoOpen && !legendOpen && !panel)) return;
    const escape = (e) => {
      if (e.key !== "Escape") return;
      if (panel) {
        const key = panel;
        setPanel(null);
        document.getElementById(`lesson-info-${key}`)?.focus();
      } else if (infoOpen) {
        setInfoOpen(false);
        document.getElementById("show-guide")?.focus();
      } else {
        setLegendOpen(false);
        document.getElementById("show-legend")?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [modal, videoOpen, infoOpen, legendOpen, panel, view3d]);
  if (error)
    return (
      <Shell>
        <div className="p-empty">
          <h1>تعذر فتح الدرس</h1>
          <p role="alert">{error}</p>
          <Link className="p-button" to={demo ? "/explore" : "/journey"}>
            ارجع إلى دروسك
          </Link>
        </div>
      </Shell>
    );
  if (!lesson)
    return (
      <Shell>
        <p className="platform-loading" role="status">
          نفتح خريطتك…
        </p>
      </Shell>
    );
  const content = lesson.content || {},
    resources = (content.resources || []).map((r) => ({
      ...r,
      color:
        iconFamily(r)?.color ||
        r.color ||
        {
          iron: "#426785",
          manganese: "#8e22bf",
          phosphate: "#349135",
          gold: "#d29c13",
          solar: "#dc9b11",
          wind: "#0c9bc8",
          hydro: "#31a573",
          oil: "#183e73",
          gas: "#087bdd",
          coal: "#434b53",
        }[r.id] ||
        "#087bdd",
    })),
    questions = content.questions || [];
  const sites = resources.flatMap((r) =>
    (r.locations || []).map((l) => ({ ...l, resource: r })),
  );
  const discovery = mode === "discover";
  const showSite = (l) => !discovery || full || l.resource.id === resource?.id;
  const listed = questions.filter((q) =>
    modal === "build-map"
      ? q.type === "map"
      : modal === "activities"
        ? // In the demo, single map questions are covered by «ابنِ خريطتك».
          (!["choice", "boolean"].includes(q.type) || q.kind) && !(demo && q.type === "map")
        : ["choice", "boolean"].includes(q.type) && !q.kind,
  );
  // One card per activity type in the picker; opening it walks through that type only.
  const filtered =
    modal === "activities" && !pickActivity && activityGroup
      ? listed.filter((q) => activityMeta(q).title === activityGroup)
      : listed;
  const current = filtered[index];
  const answered = (id) => setSolved((s) => (s.includes(id) ? s : [...s, id]));
  function pick(r) {
    play(resourceSound(r));
    const singleSite =
      ["water", "project"].includes(r.kind) && r.locations?.length === 1;
    // On narrow screens the guide panel covers the map. When the child still
    // needs to tap one of the resource's sites, keep the map visible and guide
    // them from the map caption instead; the card opens once a site is chosen.
    const mustTapSite = !singleSite && Boolean(r.locations?.length);
    const narrow = window.matchMedia("(max-width: 850px)").matches;
    // Lesson 2 on a phone: let the child watch the map effect, then show the card.
    const watch =
      narrow && demo && id === "lesson-2" && hasWaterEffect(r.id) &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearTimeout(cardTimer.current);
    setLegendOpen(false);
    // The card opens straight from the key, as in lesson 2; its site list
    // lets the child move to each place.
    // With «المعلم الذكي» open, its panel explains instead of the info card.
    setInfoOpen(!watch && !teacher && !(demo && id === "lesson-3" && ["high-speed-rail", CAPITAL_ID].includes(r.id)));
    if (watch) cardTimer.current = setTimeout(() => setInfoOpen(true), EFFECT_MS - 1500);
    setVideoOpen(false);
    setResource(r);
    clearTimeout(open3dTimer.current);
    setView3d(null);
    setCapital(null);
    // The train's trip draws its own lines and stations; no single place to open.
    if (demo && id === "lesson-3" && r.id === "high-speed-rail") {
      setLocation(null);
    } else if (demo && id === "lesson-3" && r.id === CAPITAL_ID && r.locations?.length) {
      // The capital: fly there on this map, then tilt into its scene.
      const site = { ...r.locations[0], resource: r };
      setLocation(site);
      setCapital({ site, phase: "approach" });
    } else if (singleSite) {
      const site = { ...r.locations[0], resource: r };
      setLocation(site);
      setFocusRequest({ siteId: site.id, nonce: Date.now() });
      // Same as tapping its marker: the 3D view, then its photo in that place.
      if (has3D(r))
        open3dTimer.current = setTimeout(
          () => setView3d(site),
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750,
        );
    } else {
      setLocation(null);
      if (mustTapSite) setFocusRequest({ resourceId: r.id, nonce: Date.now() });
    }
    setNotice("");
  }
  pickById.current = (rid) => {
    const r = resources.find((x) => x.id === rid);
    if (r) pick(r);
  };
  function another() {
    setResource(null);
    setLocation(null);
    setFull(false);
    setPulse(true);
  }
  function openLearning(kind) {
    play("open");
    setLegendOpen(false);
    setInfoOpen(false);
    setPanel(null);
    setVideoOpen(false);
    setModal(kind);
  }
  function ai(mode, message) {
    setAssessment(null);
    setAiMode(mode);
    setAiInitial(message);
    openLearning("ai");
  }
  function help(q, answer) {
    if (demo) {
      setNotice(q.hint || "راجع بطاقة المورد ثم حاول مرة أخرى.");
      return;
    }
    ai(
      "hint",
      `ساعدني على التفكير في هذا السؤال دون كشف الإجابة: ${q.prompt}. محاولتي: ${JSON.stringify(answer).slice(0, 200)}`,
    );
    setAssessment({
      questionId: q.id,
      attempt: JSON.stringify(answer).slice(0, 1000),
    });
  }
  async function finish() {
    play("star");
    try {
      if (preview || demo) {
        setNotice("هذه تجربة غير معتمدة؛ لا تُحفظ نتائج رسمية أو مكافآت.");
        return;
      }
      const d = await api(`/lessons/${id}/complete`, { method: "POST" });
      setCompleted(true);
      setNotice(
        d.awarded
          ? `أحسنت! أكملت الدرس وحصلت على ${d.awarded} نقطة.`
          : "سبق أن حصلت على مكافأة هذا الدرس. يمكنك مواصلة المراجعة.",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function speak(text) {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-EG";
      speechSynthesis.speak(utterance);
    } else setNotice("الاستماع غير متاح في هذا المتصفح.");
  }
  let guide = location
    ? "قرّبنا موقعك على الخريطة. اقرأ بطاقة المورد أو افتح الفيديو، ثم جرّب سؤالًا سريعًا."
    : resource
      ? `أحسنت! ${resource.locations?.length ? "اضغط على أحد مواقع " + resource.label + " لتعرف المزيد." : "لم تُضف مواقع موثقة لهذا المورد بعد. يمكنك قراءة معلوماته."}`
      : discovery
        ? "اختر موردًا من مفتاح الخريطة؛ ستظهر مواقعه فقط."
        : GREETING;
  // Lesson 3: the high-speed train opens «رحلة القطار السريع» on the map itself.
  const railTrip = demo && id === "lesson-3" && resource?.id === "high-speed-rail";
  const resourceDetails = resource && (
      <section className="classroom-resource site-card" aria-labelledby="site-card-title">
        <header className="site-card-head">
          <LessonSymbol resource={resource} />
          <div>
            <h2 id="site-card-title">{resource.label}</h2>
            <span className="site-card-kind">{kindName(resource)}</span>
          </div>
        </header>
        {location && (
          <p className="site-card-place">
            <MapPin size={20} weight="fill" aria-hidden="true" />
            <span>
              <small>الموقع المختار</small>
              <b>{location.name}</b>
            </span>
          </p>
        )}
        {resource.water && <WaterType water={resource.water} place={location?.name || resource.label} />}
        <SiteMedia
          key={`${resource.id}-${location?.id || ""}-${localPhotos[resource.id] || ""}`}
          label={location?.name || resource.label}
          images={siteImages(resource, location, localPhotos[resource.id])}
          video={location?.media?.video || resource.media?.video || (!location && resource.locations?.find((l) => l.media?.video)?.media.video)}
        />
        <div className="site-card-facts">
          <section>
            <h3>
              <MapPin size={18} aria-hidden="true" /> أين يوجد؟
            </h3>
            <p>{resource.description}</p>
          </section>
          {resource.importance && (
            <section>
              <h3>
                <Star size={18} aria-hidden="true" /> لماذا هو مهم؟
              </h3>
              <p>{resource.importance}</p>
            </section>
          )}
        </div>
        {resource.locationNote && (
          <p className="site-card-note">
            <Info size={18} aria-hidden="true" /> {resource.locationNote}
          </p>
        )}
        {relatedFacts(content, resource).map((fact, i) => (
          <p className="site-card-fact" key={i}>
            <Lightbulb size={20} weight="duotone" aria-hidden="true" />
            <span>
              <b>هل تعلم؟ </b>
              {fact}
            </span>
          </p>
        ))}
        {resource.locations?.length > (location ? 1 : 0) && (
          <section className="site-card-others" aria-label={`${location ? "مواقع أخرى" : "مواقع"} ${resource.label}`}>
            <h3>{location ? `مواقع أخرى لـ${resource.label}` : `أين نجد ${resource.label}؟ اختر موقعًا`}</h3>
            <div>
              {resource.locations
                .filter((l) => l.id !== location?.id)
                .map((l) => (
                  <button
                    type="button"
                    key={l.id}
                    onClick={() => {
                      play(resourceSound(resource));
                      setLocation({ ...l, resource });
                      setFocusRequest({ siteId: l.id, nonce: Date.now() });
                    }}
                  >
                    <MapPin size={16} aria-hidden="true" /> {l.name}
                  </button>
                ))}
            </div>
          </section>
        )}
        <div className="site-card-actions">
          <button
            className="p-secondary"
            onClick={() =>
              narrator.speak(
                [resource.label, location?.name, resource.description, resource.importance]
                  .filter(Boolean)
                  .join(". "),
              )
            }
          >
            <SpeakerHigh size={20} aria-hidden="true" /> استمع
          </button>
          <button className="p-secondary" onClick={() => setVideoOpen(true)}>
            <VideoCamera size={20} aria-hidden="true" /> الفيديو
          </button>
          {location && has3D(resource) && (
            <button className="p-secondary" onClick={() => setView3d({ ...location, resource })}>
              <Cube size={20} weight="duotone" aria-hidden="true" /> ثلاثي الأبعاد
            </button>
          )}
          <button
            className="p-secondary"
            onClick={() => ai("explain", `اشرح لي ببساطة معلومة عن ${resource.label}`)}
          >
            <ChatCircle size={20} aria-hidden="true" /> اشرح لي ببساطة
          </button>
        </div>
        <button
          className="p-button site-card-quiz"
          onClick={() => {
            setIndex(0);
            openLearning("questions");
          }}
        >
          اختبر معلوماتك
        </button>
        <details className="site-card-more">
          <summary>تفاصيل إضافية للمعلم</summary>
          {location && (
            <p>
              الإحداثيات التعليمية التقريبية: {Number(location.lat).toFixed(2)}° ش ·{" "}
              {Number(location.lng).toFixed(2)}° ق
            </p>
          )}
          <label className="resource-photo-attach">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              aria-describedby="resource-photo-attach-help"
              onChange={(e) => {
                attachPhoto(e.target.files[0]);
                e.target.value = "";
              }}
            />
            <span className="resource-photo-attach-button">
              <ImageSquare size={20} aria-hidden="true" />
              {localPhotos[resource.id] ? "استبدل صورة المعاينة" : "إرفاق صورة للمعاينة"}
            </span>
          </label>
          <small id="resource-photo-attach-help" className="resource-photo-note">
            معاينة مؤقتة على هذا الجهاز فقط؛ لحفظ الصورة للجميع ارفعها من محرر المورد بالإدارة.
          </small>
          {resource.legacyDetails && (
            <>
              <p className="legacy-content-notice">بيانات منقولة من النسخة القديمة تحتاج مراجعة المعلم</p>
              {resource.legacyDetails.governorate && <p>المحافظة: {resource.legacyDetails.governorate}</p>}
              {Object.values(resource.legacyDetails.description || {}).map((text, i) => (
                <p key={`d${i}`}>{text}</p>
              ))}
              {Object.values(resource.legacyDetails.dialog || {}).map((text, i) => (
                <p key={`g${i}`}>{text}</p>
              ))}
            </>
          )}
          <p>
            <b>ملخص الدرس: </b>
            {content.summary || content.intro}
          </p>
          <button
            className="p-secondary"
            onClick={() => ai("question", `اختر سؤالًا إضافيًا من بنك الدرس عن ${resource.label}`)}
          >
            سؤال إضافي من المعلم الذكي
          </button>
        </details>
        <button className="p-text-link" onClick={showAll}>
          العودة إلى جميع الموارد
        </button>
      </section>
    );
  const scenes = montage ? buildScenes(id, content, montage.section) : [];
  const openSection = (key) => {
    setPanel(null);
    setInfoOpen(false);
    setLegendOpen(false);
    setModal(null);
    play("open");
    setMontage({ section: key, start: 0 });
  };
  const currentLessonIndex = Math.max(
    0,
    lessonOptions.findIndex((n) => n && (n.id === id || n.demoLessonId === id)),
  );
  return (
    <Shell mapPage>
      <h1 className="studio-page-title">{lesson.title}</h1>
      <div className="studio-titlebar map-header-v2">
        <div className="map-brand">
          <BrandMark size={48} className="map-brand-logo" />
          <span className="map-brand-text">
            <strong>الخرائط التعليمية الذكية</strong>
            <small>{unitTitle || "الوحدة: جارٍ التحميل…"}</small>
          </span>
        </div>
        <div
          className={`map-top-button-cluster lesson-switcher lesson-color-${currentLessonIndex + 1}`}
        >
        <nav className="lesson-number-buttons" aria-label="دروس الوحدة">
          {[0, 1, 2].map((i) => {
            const next = lessonOptions[i];
            const selected =
              next && (next.id === id || next.demoLessonId === id);
            const title =
              next?.title ||
              (i === 0 ? lesson.title : "لم يُضف درس لهذا الموضع بعد");
            return (
              <div
                className={`lesson-button-wrap lesson-color-${i + 1}`}
                key={i}
              >
                <button
                  aria-label={`${["الدرس الأول", "الدرس الثاني", "الدرس الثالث"][i]}: ${title}`}
                  aria-current={selected ? "page" : undefined}
                  aria-disabled={!next || next.available === false}
                  aria-describedby={`lesson-title-${i}`}
                  onClick={() => {
                    if (!next || next.available === false) {
                      setNotice("هذا الدرس غير متاح بعد.");
                      return;
                    }
                    setPanel(null);
                    setInfoOpen(false);
                    navigate(
                      demo
                        ? `/demo/${next.demoLessonId || next.id}`
                        : `/classroom/${next.id}${preview ? "?preview=1" : ""}`,
                    );
                  }}
                >
                  <span className="lesson-tab-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="lesson-tab-text">
                    <b>{["الدرس الأول", "الدرس الثاني", "الدرس الثالث"][i]}</b>
                    <small>
                      {next?.available === false
                        ? "قيد التجهيز"
                        : title
                            .replace(/^الدرس\s+\S+\s*[:：]\s*/, "")
                            .replace(/\s*\(.*\)\s*$/, "")}
                    </small>
                  </span>
                </button>
                <span
                  role="tooltip"
                  id={`lesson-title-${i}`}
                  className="lesson-name-tooltip"
                >
                  {title}
                  {next?.available === false ? " · قيد التجهيز" : ""}
                </span>
              </div>
            );
          })}
        </nav>
        <div className="lesson-top-actions" role="group" aria-labelledby="lesson-sub-label">
          <span className="lesson-sub-label" id="lesson-sub-label">
            داخل {["الدرس الأول", "الدرس الثاني", "الدرس الثالث"][currentLessonIndex]}:
          </span>
          {[
            ["objectives", "أهداف الدرس", Target, "orange"],
            ["concepts", "مفاهيم الدرس", Lightbulb, "teal"],
            ["intro", "معلومات الدرس", Info, "indigo"],
          ].map(([key, title, Icon, tone]) => (
            <button
              key={key}
              id={`lesson-info-${key}`}
              aria-expanded={montage?.section === key || panel === key}
              onClick={() =>
                // Each button opens its own card over the map; pressing it again closes it.
                montage?.section === key ? setMontage(null) : openSection(key)
              }
            >
              <span className={`info-tab-icon tone-${tone}`} aria-hidden="true">
                <Icon weight="duotone" />
              </span>
              <b>{title}</b>
            </button>
          ))}
        </div>
        </div>
        <ExplorerChip
          name={user?.name || user?.username || loadGuest().name || "مستكشف زائر"}
          solved={solved.length}
          total={questions.length}
        />
      </div>
      <div
        className={`classroom-workspace studio-workspace ${videoOpen ? "has-video" : ""} ${view3d ? "has-3d" : ""} ${legendOpen ? "" : "legend-hidden"} ${infoOpen ? "" : "guide-hidden"}`}
      >
        {panel && (
          <section
            id="lesson-information-panel"
            role="region"
            aria-label="تفاصيل الدرس المختار"
            className="classroom-disclosure lesson-floating-information"
          >
            <button
              className="p-close-text"
              aria-label="إغلاق تفاصيل الدرس"
              onClick={() => {
                const key = panel;
                setPanel(null);
                document.getElementById(`lesson-info-${key}`)?.focus();
              }}
            >
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
            {(demo || preview) && (
              <p className="legacy-content-notice">
                محتوى تجريبي يحتاج مراجعة المعلم
              </p>
            )}
            {panel === "objectives" ? (
              <>
                <h2>أهداف الدرس</h2>
                <ol>
                  {(content.objectives || []).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
              </>
            ) : panel === "concepts" ? (
              <>
                <h2>مفاهيم الدرس</h2>
                {(content.concepts || []).map((c, i) => (
                  <article key={i}>
                    <h3>{c.term}</h3>
                    <p>{c.definition}</p>
                    {c.image && <Photo src={c.image} label={c.term} />}
                    <button
                      className="p-secondary"
                      onClick={() => speak(`${c.term}: ${c.definition}`)}
                    >
                      <SpeakerHigh />
                      استمع للمفهوم
                    </button>
                  </article>
                ))}
              </>
            ) : (
              <>
                <h2>هيا نبدأ الاستكشاف</h2>
                {content.legacyExtras?.bookMap && (
                  <figure className="lesson-book-map">
                    <img
                      src={content.legacyExtras.bookMap.src}
                      alt={content.legacyExtras.bookMap.caption}
                      loading="lazy"
                    />
                    <figcaption>
                      {content.legacyExtras.bookMap.caption}
                      <small>{content.legacyExtras.bookMap.credit}</small>
                    </figcaption>
                  </figure>
                )}
                <p>{content.intro}</p>
                <h3>ملخص الدرس</h3>
                <p>{content.summary}</p>
                {content.legacyExtras && (
                  <div className="legacy-lesson-information">
                    <p className="legacy-content-notice">
                      بيانات من النسخة القديمة · تحتاج مراجعة المعلم
                    </p>
                    <h3>أهم النقاط</h3>
                    <ul>
                      {content.legacyExtras.keyPoints.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <h3>أمثلة من حياتنا</h3>
                    <ul>
                      {content.legacyExtras.examples.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <p>{content.legacyExtras.realLife}</p>
                    <h3>معلومات إضافية</h3>
                    <ul>
                      {content.legacyExtras.funFacts.map((t, i) => (
                        <li key={i}>
                          {typeof t === "string"
                            ? t
                            : `${t.title}: ${t.content}`}
                        </li>
                      ))}
                    </ul>
                    {content.legacyExtras.secrets.map((t, i) => (
                      <p key={i}>
                        <strong>{t.title}</strong> {t.content}
                      </p>
                    ))}
                    <h3>وسائط النسخة القديمة</h3>
                    <ul>
                      {content.legacyExtras.media.map((m, i) => (
                        <li key={i}>
                          {m.title} —{" "}
                          {m.available ? (
                            <a href={m.path} target="_blank" rel="noreferrer">
                              فتح الملف
                            </a>
                          ) : (
                            "الملف غير موجود حاليًا"
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <div className="map-sidebar-handles" aria-label="القوائم الجانبية">
          <div className="map-handle-group">
          <button
            id="show-legend"
            aria-controls="lesson-legend"
            aria-expanded={legendOpen}
            onClick={() => {
              setLegendOpen((v) => !v);
              setInfoOpen(false);
            }}
          >
            <BookOpen size={21} />
            <span className="ux-long">المفتاح والأدوات</span><span className="ux-short" aria-hidden="true">المفتاح</span>
          </button>
          <button className="map-reset-all" onClick={showAll} title="عرض جميع الموارد وإعادة الخريطة إلى مصر كاملة">
            <Compass size={21} /><span className="ux-long">عرض الجميع</span><span className="ux-short" aria-hidden="true">الكل</span>
          </button>
          </div>
        </div>
        <aside
          id="lesson-legend"
          hidden={!legendOpen}
          className={`classroom-legend ${pulse ? "legend-focus" : ""} ${legendOpen ? "mobile-open" : ""}`}
          aria-label="مفتاح الخريطة"
        >
          <button
            className="mobile-panel-close"
            aria-label="إغلاق مفتاح الخريطة"
            onClick={() => {
              setLegendOpen(false);
              document.getElementById("show-legend")?.focus();
            }}
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
          <h2>
            <BookOpen />
            مفتاح الخريطة
          </h2>
          <h3 className="map-menu-heading">الموارد الطبيعية</h3>
          {resources.map((r) => (
            <button
              key={r.id}
              aria-pressed={resource?.id === r.id}
              className={resource?.id === r.id ? "is-picked" : ""}
              style={{ "--glow-color": r.color }}
              onClick={() => pick(r)}
            >
              <LessonSymbol resource={r} />
              <span>
                {r.label}
                <small>{kindName(r)}</small>
              </span>
              <i className="key-radio" aria-hidden="true" />
            </button>
          ))}
          {user && <div className="map-menu-navigation"><PlatformNavigation hideHome /></div>}
        </aside>
        <section className="classroom-map-region" aria-label="خريطة موارد مصر">
          <EsriLessonMap
            sites={sites.filter((s) => showSite(s) && !(railTrip && s.resource.id === "high-speed-rail"))}
            activeResourceId={resource?.id}
            selectedLocationId={location?.id}
            showNames={showLocationNames}
            onToggleNames={() => setShowLocationNames((v) => !v)}
            resetKey={resetMap}
            focusRequest={focusRequest}
            waterLesson={demo && id === "lesson-2"}
            railLesson={demo && id === "lesson-3"}
            hideRail={railTrip || Boolean(capital)}
            overlay={(map) => (
              <>
                {railTrip && <RailJourney map={map} />}
                {capital?.phase === "approach" && (
                  <CapitalApproach
                    map={map}
                    site={capital.site}
                    onArrive={(zoom) => setCapital((c) => c && { ...c, phase: "scene", zoom })}
                  />
                )}
                {teacher && measured && <MeasureLine map={map} {...measured} />}
              </>
            )}
            spotlight={montage ? spotlight : null}
            onReset={showAll}
            onToolOpen={() => { setLegendOpen(false); setInfoOpen(false); setPanel(null); }}
            onSelect={(site) => {
              if (demo && id === "lesson-3" && site.resource.id === CAPITAL_ID) return pick(site.resource);
              play(resourceSound(site.resource));
              clearTimeout(open3dTimer.current);
              setView3d(null);
              if (has3D(site.resource))
                open3dTimer.current = setTimeout(
                  () => setView3d(site),
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750,
                );
              setModal(null);
              setResource(site.resource);
              setLocation(site);
              setPanel(null);
              setInfoOpen(true);
              setVideoOpen(false);
              setLegendOpen(false);
            }}
            onVideo={(site) => {
              setResource(site.resource);
              setLocation(site);
              setPanel(null);
              setVideoOpen(true);
            }}
          />
          {hello && !resource && !montage && !modal && !infoOpen && !videoOpen && !teacher && (
            <div className="map-teacher-hint" role="status">
              <RobotGuide />
              <p>
                {GREETING}
                <button type="button" aria-label="إخفاء رسالة المعلم" onClick={() => setHello(false)}>
                  <X size={16} weight="bold" aria-hidden="true" />
                </button>
              </p>
            </div>
          )}
          {montage && (
            <LessonMontage
              key={montage.section}
              lessonId={id}
              scenes={scenes}
              section={montage.section}
              sectionTitle={SECTIONS[montage.section].title}
              sectionInfo={SECTIONS[montage.section]}
              nextSection={
                SECTIONS[montage.section].next && {
                  label: SECTIONS[montage.section].nextLabel,
                  go: () => openSection(SECTIONS[montage.section].next),
                }
              }
              startAt={montage.start}
              onSpotlight={setSpotlight}
              onClose={() => setMontage(null)}
            />
          )}
          {view3d && (
            <Suspense fallback={<div className="site-3d-panel site-3d-loading" role="status">جارٍ تجهيز العرض ثلاثي الأبعاد…</div>}>
              <Site3DView
                key={view3d.id}
                site={view3d}
                photo={siteImages(view3d.resource, view3d, localPhotos[view3d.resource.id])[0]}
                onClose={() => {
                  setView3d(null);
                  document.querySelector(".resource-3d-button")?.focus({ preventScroll: true });
                }}
              />
            </Suspense>
          )}
          {teacher && (
            <MapTeacher
              name={(user?.name || loadGuest().name || "مستكشف").trim().split(/\s+/)[0]}
              lessonId={id}
              lessonTitle={content.title}
              demo={demo}
              resources={resources}
              resource={resource}
              location={location}
              kindName={kindName}
              keyOpen={legendOpen}
              onFocusSite={(site) => {
                setResource(site.resource);
                setLocation(site);
                setFocusRequest({ siteId: site.id, nonce: Date.now() });
              }}
              onOpenKey={() => setLegendOpen(true)}
              onMeasure={setMeasured}
              onClose={() => {
                setTeacher(false);
                setMeasured(null);
              }}
            />
          )}
          {capital?.phase === "scene" && (
            <>
              <Suspense fallback={<div className="site-3d-inline site-3d-loading" role="status">نجهّز المشهد…</div>}>
                <Site3DView inline site={capital.site} startZoom={capital.zoom - 1} onClose={() => setCapital(null)} />
              </Suspense>
              <CapitalCard
                resource={capital.site.resource}
                lessonId={id}
                question={questions.find((q) => q.id === CAPITAL_QUESTION)}
                onBack={() => {
                  setCapital(null);
                  setFocusRequest({ siteId: capital.site.id, nonce: Date.now() });
                }}
              />
            </>
          )}
          {videoOpen && resource && (
            <MapVideoPanel
              resource={resource}
              location={location}
              onClose={() => setVideoOpen(false)}
            />
          )}
        </section>
        <aside
          id="lesson-guide"
          hidden={!infoOpen}
          className={`classroom-guide ${infoOpen ? "mobile-open" : ""} ${resourceDetails ? "has-site-card" : ""}`}
          aria-label="المعلم ومعلومات المورد"
        >
          <button
            className="mobile-panel-close"
            aria-label="إغلاق معلومات المورد"
            onClick={() => {
              setInfoOpen(false);
              document.getElementById("show-guide")?.focus();
            }}
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
          <span className={`studio-status ${location ? "is-quiet" : ""}`}>
            {demo
              ? "تجربة · دون نقاط رسمية"
              : preview
                ? "معاينة تحريرية"
                : `${solved.length} / ${questions.length} سؤال متقن`}
          </span>
          {!resource ? (
            <section className="guide-speech">
              <RobotGuide />
              <h2>هيا نستكشف!</h2>
              <p aria-live="polite">{guide}</p>
            </section>
          ) : null}
          {resourceDetails}
          {discovery &&
            resource &&
            !location &&
            resource.kind !== "mineral" && (
              <button
                className="p-button"
                onClick={() => {
                  const q = questions.find(
                    (q) =>
                      q.id === "solar-classification" ||
                      q.resourceId === resource.id,
                  );
                  if (q) {
                    setIndex(
                      Math.max(
                        0,
                        questions
                          .filter((q) => ["choice", "boolean"].includes(q.type))
                          .findIndex((x) => x.id === q.id),
                      ),
                    );
                    openLearning("questions");
                  }
                }}
              >
                ابدأ سؤال التصنيف
              </button>
            )}
          <button className="p-secondary" onClick={() => speak(guide)}>
            <SpeakerHigh size={20} />
            استمع للتوجيه
          </button>
        </aside>
        <div className="floating-learning-dock">
          <button
            aria-controls="lesson-learning-drawer"
            aria-expanded={modal === "questions"}
            onClick={() => {
              setIndex(0);
              openLearning("questions");
            }}
          >
            <Target />
            <span className="ux-long">أسئلة الدرس</span><span className="ux-short" aria-hidden="true">الأسئلة</span>
          </button>
          {demo && (
            <button
              className="dock-book"
              onClick={() => {
                play("open");
                navigate(`/demo/${id}/book`);
              }}
            >
              <BookBookmark />
              <span className="ux-long">كتابي التفاعلي</span><span className="ux-short" aria-hidden="true">الكتاب</span>
            </button>
          )}
          <button
            aria-controls="lesson-learning-drawer"
            aria-expanded={modal === "activities"}
            onClick={() => {
              setIndex(0);
              setPickActivity(true);
              openLearning("activities");
            }}
          >
            <Stack />
            <span className="ux-long">الأنشطة التفاعلية</span><span className="ux-short" aria-hidden="true">الأنشطة</span>
          </button>
          <button
            className="p-button"
            aria-pressed={teacher}
            onClick={() => {
              play("open");
              setModal(null);
              setInfoOpen(false);
              setTeacher((v) => !v);
            }}
          >
            <RobotGuide style={{ width: 38, height: 42 }} />
            <span>
              المعلم الذكي<small>اسأل الخريطة</small>
            </span>
          </button>
          <button
            className="dock-finish"
            disabled={solved.length < questions.length || !questions.length}
            aria-describedby={questions.length ? "dock-finish-hint" : undefined}
            title={solved.length < questions.length ? "أنهِ جميع الأسئلة والأنشطة ليُفتح هذا الزر" : undefined}
            onClick={finish}
          >
            <Star weight="fill" />
            <span>
              {completed ? "راجع إنجازك" : "أكملت درسي"}
              {questions.length > 0 && (
                <small className="dock-progress" id="dock-finish-hint">
                  {solved.length < questions.length ? (
                    <>
                      <span className="sr-only">أنجزت </span>
                      <bdi dir="ltr">{solved.length}/{questions.length}</bdi>
                      <span className="sr-only"> من الأسئلة والأنشطة</span>
                    </>
                  ) : (
                    "جاهز للإكمال"
                  )}
                </small>
              )}
            </span>
            {questions.length > 0 && (
              <span className="dock-progress-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((solved.length / questions.length) * 100)}%` }} />
              </span>
            )}
          </button>
        </div>
        {modal && (
          <LearningDrawer
            title={
              modal === "ai"
                ? "المعلم الذكي"
                : modal === "activities"
                  ? "الأنشطة التفاعلية"
                  : modal === "build-map"
                    ? "اصنع خريطتك"
                    : "أسئلة الدرس"
            }
            className={
              modal === "activities"
                ? `is-activities ${!pickActivity && ["drag", "match", "order"].includes(current?.type) ? "is-rich" : ""}`
                : ""
            }
            onClose={() => setModal(null)}
          >
            {modal === "ai" ? (
              <AIAssistant
                demo={demo || preview}
                reviewReady={Boolean(content.sources?.some((s) => s.approved))}
                assessment={assessment}
                lessonTitle={lesson.title}
                lessonId={id}
                resource={resource}
                location={location}
                mode={aiMode}
                initial={aiInitial}
                onQuestion={(q) => {
                  setAiQuestion(q);
                  setModal("extra");
                }}
              />
            ) : modal === "extra" && aiQuestion ? (
              <Question
                key={aiQuestion.id}
                question={aiQuestion}
                lessonId={id}
                solved={solved.includes(aiQuestion.id)}
                onSolved={answered}
                onHelp={help}
                preview={preview}
                demo={demo}
              />
            ) : (
              <>
                {modal === "activities" && pickActivity ? (
                  <ActivityPicker
                    expedition={
                      {
                        "lesson-1": { href: "/demo/lesson-1/expedition", title: "رحلة كنوز مصر", text: "اكتشف المعادن ومصادر الطاقة خطوة بخطوة على الخريطة" },
                        "lesson-2": { href: "/demo/lesson-2/expedition", title: "رحلة المياه", text: "ساعد المزرعة والواحة والمدينة الساحلية في العثور على المياه" },
                        "lesson-3": { href: "/demo/lesson-3/expedition", title: "نكتشف مشروعات مصر", text: "زر الدلتا الجديدة وبركة غليون وبنبان" },
                      }[id] || null
                    }
                    activities={filtered}
                    solved={solved}
                    buildMapHref={demo ? `/demo/${id}/build-map` : null}
                    traceHref={demo && id === "lesson-2" ? `/demo/${id}/trace` : null}
                    hasBuildMap={!demo && questions.some((q) => q.type === "map")}
                    onBuildMap={() => {
                      setIndex(0);
                      setPickActivity(false);
                      openLearning("build-map");
                    }}
                    onPick={(group) => {
                      setActivityGroup(group);
                      setIndex(0);
                      setPickActivity(false);
                    }}
                  />
                ) : current ? (
                  <>
                    {["activities", "build-map"].includes(modal) ? (
                      <ActivitySteps
                        activities={filtered}
                        index={index}
                        solved={solved}
                        title={
                          modal === "build-map"
                            ? "اصنع خريطتك"
                            : activityMeta(current).title
                        }
                        onStep={setIndex}
                        onAll={() => {
                          setPickActivity(true);
                          openLearning("activities");
                        }}
                      />
                    ) : (
                      <>
                        <div className="question-progress">
                          <span className="question-count">
                            السؤال <bdi>{index + 1}</bdi> من <bdi>{filtered.length}</bdi>
                          </span>
                          <span className="question-type">
                            {current.type === "boolean" ? "صح أم خطأ" : "اختر الإجابة"}
                          </span>
                          <span className="question-mastered">
                            <Star weight="fill" aria-hidden="true" />
                            أتقنت <bdi>{filtered.filter((q) => solved.includes(q.id)).length}</bdi>
                          </span>
                          <span
                            className="question-progress-bar"
                            role="progressbar"
                            aria-label="الأسئلة المتقنة"
                            aria-valuemin={0}
                            aria-valuemax={filtered.length}
                            aria-valuenow={filtered.filter((q) => solved.includes(q.id)).length}
                          >
                            <span
                              style={{
                                width: `${(filtered.filter((q) => solved.includes(q.id)).length / filtered.length) * 100}%`,
                              }}
                            />
                          </span>
                        </div>
                      </>
                    )}
                    <Question
                      key={current.id}
                      question={current}
                      presentation={modal === "build-map" ? "place" : undefined}
                      onNext={
                        index < filtered.length - 1
                          ? () => setIndex((i) => i + 1)
                          : undefined
                      }
                      lessonId={id}
                      solved={solved.includes(current.id)}
                      onSolved={answered}
                      onHelp={help}
                      preview={preview}
                      demo={demo}
                      resources={resources}
                    />
                    {filtered.length > 1 && (
                    <div className="p-actions">
                      <button
                        disabled={!index}
                        className="p-secondary"
                        onClick={() => setIndex((i) => i - 1)}
                      >
                        {modal === "questions" ? "السؤال السابق" : "النشاط السابق"}
                      </button>
                      <button
                        className="p-secondary"
                        disabled={index >= filtered.length - 1}
                        onClick={() => setIndex((i) => i + 1)}
                      >
                        {modal === "questions" ? "السؤال التالي" : "النشاط التالي"}
                      </button>
                    </div>
                    )}
                  </>
                ) : (
                  <p>لم تُضف أسئلة لهذا القسم بعد.</p>
                )}
              </>
            )}
          </LearningDrawer>
        )}
      </div>
      {notice && (
        <div className="classroom-notice p-feedback" role="status">
          {notice}
          <button aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </Shell>
  );
}

const GREETING = "مرحبًا يا مستكشف! اختر عنصرًا من مفتاح الخريطة لتكتشف أماكن وجوده في مصر.";

// «عذبة أم مالحة؟» on a water card; lakes and oases name the chosen place.
const WATER_KIND = {
  fresh: { label: "عذبة", Icon: Drop },
  salt: { label: "مالحة", Icon: Waves },
  change: { label: "مالحة ← صالحة للاستخدام", Icon: Drop },
  reuse: { label: "إعادة استخدام", Icon: Recycle },
};
function WaterType({ water, place }) {
  const kind = WATER_KIND[water.type] || WATER_KIND.fresh;
  return (
    <section className={`site-card-water is-${water.type}`}>
      <kind.Icon size={26} weight="duotone" aria-hidden="true" />
      <div>
        <h3>
          عذبة أم مالحة؟ <span className="water-badge">{kind.label}</span>
        </h3>
        <p>{water.note.replace("{place}", place)}</p>
      </div>
    </section>
  );
}

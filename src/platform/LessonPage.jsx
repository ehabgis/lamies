import { useEffect, useState, useRef } from "react";
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
} from "phosphor-react";
import Shell, { PlatformNavigation } from "./Shell";
import SelectField from "./SelectField";
import { useSession } from "./Session";
import { api } from "./api";
import LearningDrawer from "./LearningDrawer";
import EsriLessonMap from "./EsriLessonMap";
import "./map-workspace.css";
import "./map-studio.css";
import "./map-polish.css";
import MapVideoPanel from "./MapVideoPanel";
import Question from "./Question";
import AIAssistant from "./AIAssistant";
import ResourcePin from "../components/Map/ResourcePin";
import RobotGuide from "../components/Map/RobotGuide";
const kindNames = {
  mineral: "خام معدني",
  renewable: "طاقة متجددة",
  nonrenewable: "طاقة غير متجددة",
  water: "مورد مائي",
  project: "مشروع قومي",
};
export const mapPosition = (l) => ({
  left: `${(75 + ((l.lng - 24) / 12) * 350) / 5}%`,
  top: `${(365 - ((l.lat - 21) / 11) * 330) / 4}%`,
});
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
  function showAll() {
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
        setMode(state.mode === "discover" ? "discover" : "interactive");
        setStateReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, demo]);
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
    if (modal || videoOpen || (!infoOpen && !legendOpen && !panel)) return;
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
  }, [modal, videoOpen, infoOpen, legendOpen, panel]);
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
  const filtered = questions.filter((q) =>
    modal === "build-map"
      ? q.type === "map"
      : modal === "activities"
        ? !["choice", "boolean"].includes(q.type)
        : ["choice", "boolean"].includes(q.type),
  );
  const current = filtered[index];
  const answered = (id) => setSolved((s) => (s.includes(id) ? s : [...s, id]));
  function pick(r) {
    const singleSite =
      ["water", "project"].includes(r.kind) && r.locations?.length === 1;
    // On narrow screens the guide panel covers the map. When the child still
    // needs to tap one of the resource's sites, keep the map visible and guide
    // them from the map caption instead; the card opens once a site is chosen.
    const mustTapSite = !singleSite && Boolean(r.locations?.length);
    const narrow = window.matchMedia("(max-width: 850px)").matches;
    setLegendOpen(false);
    setInfoOpen(!(narrow && mustTapSite));
    setVideoOpen(false);
    setResource(r);
    if (singleSite) {
      setLocation({ ...r.locations[0], resource: r });
      setFocusRequest({ siteId: r.locations[0].id, nonce: Date.now() });
    } else setLocation(null);
    setNotice("");
  }
  function another() {
    setResource(null);
    setLocation(null);
    setFull(false);
    setPulse(true);
  }
  function openLearning(kind) {
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
        : "مرحبًا يا مستكشف مصر الصغير! اختر موردًا من مفتاح الخريطة لنكتشف أماكن وجوده.";
  const resourceDetails = resource &&
    (location || !resource.locations?.length) && (
      <section className="classroom-resource">
        <h2>
          <ResourcePin resource={resource} />
          {resource.label}
        </h2>
        {location && (
          <p className="selected-location">الموقع المختار: {location.name}</p>
        )}
        {resource.locationNote && (
          <p className="resource-photo-note">{resource.locationNote}</p>
        )}
        <Photo
          key={localPhotos[resource.id] || resource.media?.image || resource.id}
          src={localPhotos[resource.id] || resource.media?.image}
          label={`صورة ${resource.label}`}
        />
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
        {!localPhotos[resource.id] && (
          <small id="resource-photo-attach-help" className="resource-photo-note">
            معاينة مؤقتة على هذا الجهاز فقط؛ لا تُرفع إلى الخادم.
          </small>
        )}
        {localPhotos[resource.id] && (
          <small id="resource-photo-attach-help" className="resource-photo-note">
            معاينة مؤقتة على هذا الجهاز. لحفظ الصورة للمستخدمين، ارفعها من محرر
            المورد بالإدارة.
          </small>
        )}
        <dl className="site-facts">
          <div>
            <dt>النوع</dt>
            <dd>{kindNames[resource.kind]}</dd>
          </div>
          {location && (
            <div>
              <dt>الإحداثيات</dt>
              <dd>
                {Number(location.lat).toFixed(2)}° ش ·{" "}
                {Number(location.lng).toFixed(2)}° ق
                <small>تعليمية تقريبية</small>
              </dd>
            </div>
          )}
        </dl>
        <h3>أماكن وجوده</h3>
        <p>{resource.description}</p>
        <h3>أهميته</h3>
        <p>{resource.importance}</p>
        <button
          className="p-button resource-video-button"
          onClick={() => setVideoOpen(true)}
        >
          <VideoCamera size={20} />
          افتح الفيديو على الخريطة
        </button>
        {resource.legacyDetails && (
          <details className="site-lesson-summary">
            <summary>معلومات من النسخة القديمة</summary>
            <p className="legacy-content-notice">
              بيانات منقولة تحتاج مراجعة المعلم
            </p>
            {resource.legacyDetails.governorate && (
              <p>المحافظة: {resource.legacyDetails.governorate}</p>
            )}
            {Object.values(resource.legacyDetails.description || {}).map(
              (text, i) => (
                <p key={i}>{text}</p>
              ),
            )}
            {Object.values(resource.legacyDetails.dialog || {}).map(
              (text, i) => (
                <p key={i}>{text}</p>
              ),
            )}
          </details>
        )}
        <details className="site-lesson-summary">
          <summary>ملخص الدرس</summary>
          <p>{content.summary || content.intro}</p>
        </details>
        <div className="p-actions">
          <button
            className="p-secondary"
            onClick={() =>
              ai("explain", `اشرح لي ببساطة معلومة عن ${resource.label}`)
            }
          >
            اشرح لي ببساطة
          </button>
          <button
            className="p-secondary"
            onClick={() =>
              ai(
                "question",
                `اختر سؤالًا إضافيًا من بنك الدرس عن ${resource.label}`,
              )
            }
          >
            سؤال إضافي
          </button>
          <button
            className="p-secondary"
            onClick={() => {
              setIndex(0);
              openLearning("questions");
            }}
          >
            اختبر معلوماتك
          </button>
        </div>
        <button className="p-text-link" onClick={showAll}>
          العودة إلى جميع الموارد
        </button>
      </section>
    );
  return (
    <Shell mapPage>
      <h1 className="studio-page-title">{lesson.title}</h1>
      <div className="studio-titlebar">
        <div className="map-top-button-cluster">
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
                  aria-label={
                    ["الدرس الأول", "الدرس الثاني", "الدرس الثالث"][i]
                  }
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
                  {["الدرس الأول", "الدرس الثاني", "الدرس الثالث"][i]}
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
        <div className="lesson-top-actions" aria-label="تفاصيل الدرس">
          {[
            ["objectives", "أهداف الدرس", Target],
            ["concepts", "مفاهيم الدرس", BookOpen],
            ["intro", "معلومات الدرس", BookOpen],
          ].map(([key, title, Icon]) => (
            <button
              key={key}
              id={`lesson-info-${key}`}
              aria-expanded={panel === key}
              aria-controls="lesson-information-panel"
              onClick={() => {
                setPanel(panel === key ? null : key);
                setInfoOpen(false);
              }}
            >
              <Icon size={18} />
              {title}
            </button>
          ))}
        </div>
        </div>
        <div className="map-header-identity">
          <span className="map-unit-name">
            {unitTitle || "الوحدة: جارٍ التحميل…"}
          </span>
          <span className="map-student-name">
            {user?.name || user?.username || "مستكشف زائر"}
          </span>
        </div>
      </div>
      <div
        className={`classroom-workspace studio-workspace ${videoOpen ? "has-video" : ""} ${legendOpen ? "" : "legend-hidden"} ${infoOpen ? "" : "guide-hidden"}`}
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
              إغلاق ×
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
            <span>المفتاح والأدوات</span>
          </button>
          <button className="map-reset-all" onClick={showAll} title="عرض جميع الموارد وإعادة الخريطة إلى مصر كاملة">
            <Compass size={21} /><span>عرض الجميع</span>
          </button>
          </div>
          <div className="map-handle-group">
          <button aria-pressed={showLocationNames} aria-label={showLocationNames ? "إخفاء أسماء المواقع" : "إظهار أسماء المواقع"} title="إظهار أو إخفاء أسماء المواقع على الخريطة" onClick={() => setShowLocationNames(v => !v)}>
            <span className="map-label-icon" aria-hidden="true">أ</span><span>الأسماء</span>
          </button>
          <button
            id="show-guide"
            aria-controls="lesson-guide"
            aria-expanded={infoOpen}
            onClick={() => {
              setInfoOpen((v) => !v);
              setLegendOpen(false);
            }}
          >
            <ChatCircle size={21} />
            <span>المعلم والمورد</span>
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
            إغلاق ×
          </button>
          <h2>
            <BookOpen />
            مفتاح الخريطة
          </h2>
          <details
            className="map-settings"
            open={!window.matchMedia("(max-width: 850px)").matches}
          >
            <summary>إعدادات العرض</summary>
            <div className="studio-select-tools">
              <SelectField label="وضع الخريطة" compact value={mode}
                onChange={(e) => { setMode(e.target.value); showAll(); }}>
                <option value="interactive">الاستكشاف الحر</option>
                <option value="discover">اكتشف الرموز</option>
              </SelectField>
            </div>
          </details>
          <h3 className="map-menu-heading">الموارد الطبيعية</h3>
          {resources.map((r) => (
            <button
              key={r.id}
              aria-pressed={resource?.id === r.id}
              onClick={() => pick(r)}
            >
              <ResourcePin resource={r} />
              <span>
                {r.label}
                <small>{kindNames[r.kind]}</small>
              </span>
            </button>
          ))}
          {user && <div className="map-menu-navigation"><PlatformNavigation hideHome /></div>}
        </aside>
        <section className="classroom-map-region" aria-label="خريطة موارد مصر">
          <div className="classroom-map-meta">
            <span>
              {resource && !location && resource.locations?.length
                ? `اضغط أحد مواقع ${resource.label} على الخريطة`
                : resource
                ? `المورد المختار: ${resource.label}`
                : discovery && !full
                  ? "اختر رمزًا لتظهر مواقعه"
                  : "جميع الموارد"}
            </span>
            <span>شمال ↑</span>
          </div>
          <EsriLessonMap
            sites={sites.filter(showSite)}
            activeResourceId={resource?.id}
            selectedLocationId={location?.id}
            showNames={showLocationNames}
            resetKey={resetMap}
            focusRequest={focusRequest}
            waterLesson={demo && id === "lesson-2"}
            onReset={showAll}
            onToolOpen={() => { setLegendOpen(false); setInfoOpen(false); setPanel(null); }}
            onSelect={(site) => {
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
          className={`classroom-guide ${infoOpen ? "mobile-open" : ""}`}
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
            إغلاق المعلومات ×
          </button>
          <span className="studio-status">
            {demo
              ? "تجربة · دون نقاط رسمية"
              : preview
                ? "معاينة تحريرية"
                : `${solved.length} / ${questions.length} سؤال متقن`}
          </span>
          {!location ? (
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
            أسئلة الدرس
          </button>
          <button
            aria-controls="lesson-learning-drawer"
            aria-expanded={modal === "activities"}
            onClick={() => {
              setIndex(0);
              openLearning("activities");
            }}
          >
            <Stack />
            الأنشطة التفاعلية
          </button>
          <button
            className="p-button"
            aria-controls="lesson-learning-drawer"
            aria-expanded={modal === "ai"}
            onClick={() => ai("explain", "")}
          >
            <RobotGuide style={{ width: 38, height: 42 }} />
            <span>
              المعلم الذكي<small>اسأل الخريطة</small>
            </span>
          </button>
          <button
            disabled={solved.length < questions.length || !questions.length}
            onClick={finish}
          >
            <Star weight="fill" />
            {completed ? "راجع إنجازك" : "أكملت درسي"}
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
                {modal === "activities" && (
                  <div className="activity-selector">
                    <button
                      onClick={() => {
                        setIndex(0);
                        openLearning("build-map");
                      }}
                    >
                      اصنع خريطتك
                    </button>
                    {filtered.map((q, i) => (
                      <button
                        className={i === index ? "active" : ""}
                        key={q.id}
                        onClick={() => setIndex(i)}
                      >
                        {q.type === "map"
                          ? "اكتشف الموقع"
                          : q.type === "drag"
                            ? "صنّف الموارد"
                            : q.type === "match"
                              ? "صل المورد باستخدامه"
                              : q.type === "order"
                                ? "رتّب الخطوات"
                                : q.type === "blank"
                                  ? "أكمل الفراغ"
                                  : "طابق الرموز"}
                        {solved.includes(q.id) ? " ✓" : ""}
                      </button>
                    ))}
                  </div>
                )}
                {current ? (
                  <>
                    <div className="learning-progress-summary">
                      <span>
                        السؤال {index + 1} من {filtered.length}
                      </span>
                      <span>
                        أتقنت{" "}
                        {filtered.filter((q) => solved.includes(q.id)).length} /{" "}
                        {filtered.length}
                      </span>
                    </div>
                    <progress
                      value={index + 1}
                      max={filtered.length}
                      aria-label="موضع السؤال"
                    />
                    <Question
                      key={current.id}
                      question={current}
                      presentation={modal === "build-map" ? "place" : undefined}
                      lessonId={id}
                      solved={solved.includes(current.id)}
                      onSolved={answered}
                      onHelp={help}
                      preview={preview}
                      demo={demo}
                    />
                    <div className="p-actions">
                      <button
                        disabled={!index}
                        className="p-secondary"
                        onClick={() => setIndex((i) => i - 1)}
                      >
                        السؤال السابق
                      </button>
                      <button
                        className="p-secondary"
                        disabled={index >= filtered.length - 1}
                        onClick={() => setIndex((i) => i + 1)}
                      >
                        السؤال التالي
                      </button>
                    </div>
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

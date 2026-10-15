import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Robot,
  Target,
  Stack,
  Star,
  VideoCamera,
  ChatCircle,
  SpeakerHigh,
  ArrowLeft,
  Compass,
  MagnifyingGlass,
  Plus,
  Minus,
  MapTrifold,
} from "phosphor-react";
import Shell from "./Shell";
import { api } from "./api";
import Modal from "./Modal";
import EsriLessonMap from "./EsriLessonMap";
import "./map-workspace.css";
import Question from "./Question";
import AIAssistant from "./AIAssistant";
import ResourcePin from "../components/Map/ResourcePin";
import RobotGuide from "../components/Map/RobotGuide";
const kindNames = {
  mineral: "خام معدني",
  renewable: "طاقة متجددة",
  nonrenewable: "طاقة غير متجددة",
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
    [stateReady, setStateReady] = useState(false),
    [videoFailed, setVideoFailed] = useState(false),
    [mobilePanel, setMobilePanel] = useState(null),
    [detailTab, setDetailTab] = useState("summary");
  useEffect(() => {
    setVideoFailed(false);
  }, [resource?.id, location?.id]);
  function changeDetailTab(tab, focus = false) {
    setDetailTab(tab);
    if (focus)
      requestAnimationFrame(() =>
        document.getElementById(`site-tab-${tab}`)?.focus(),
      );
  }
  function detailKeys(e) {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      changeDetailTab(
        e.key === "Home"
          ? "video"
          : e.key === "End"
            ? "summary"
            : detailTab === "summary"
              ? "video"
              : "summary",
        true,
      );
    }
  }
  useEffect(() => {
    setLesson(null);
    setStateReady(false);
    setError("");
    api(`${demo ? "/demo" : ""}/lessons/${encodeURIComponent(id)}`)
      .then((data) => {
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
      .catch((e) => setError(e.message));
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
    setVideoFailed(false);
  }, [modal, resource?.id]);
  useEffect(() => {
    if (!mobilePanel || modal) return;
    const escape = (e) => {
      if (e.key === "Escape") {
        setMobilePanel(null);
        document.getElementById(`show-${mobilePanel}`)?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [mobilePanel, modal]);
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
    setMobilePanel(null);
    setDetailTab("summary");
    setResource(r);
    setLocation(null);
    setNotice("");
  }
  function another() {
    setResource(null);
    setLocation(null);
    setFull(false);
    setPulse(true);
  }
  function ai(mode, message) {
    if (demo) {
      setNotice(
        "المساعد المتصل بـ OpenAI غير مفعّل في التجربة. استخدم تلميحات الأسئلة المكتوبة، فهذه ليست إجابات مولدة.",
      );
      return;
    }
    setAssessment(null);
    setAiMode(mode);
    setAiInitial(message);
    setModal("ai");
  }
  function help(q, answer) {
    if (demo) {
      setNotice(q.hint || "راجع بطاقة المورد ثم حاول مرة أخرى.");
      window.alert(q.hint || "راجع بطاقة المورد ثم حاول مرة أخرى.");
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
    ? "قرّبنا موقعك على الخريطة. افتح تبويب الملخص أو الفيديو، ثم جرّب سؤالًا سريعًا."
    : resource
      ? `أحسنت! ${resource.locations?.length ? "اضغط على أحد مواقع " + resource.label + " لتعرف المزيد." : "لم تُضف مواقع موثقة لهذا المورد بعد. يمكنك قراءة معلوماته."}`
      : discovery
        ? "اختر موردًا من مفتاح الخريطة؛ ستظهر مواقعه فقط."
        : "مرحبًا يا مستكشف مصر الصغير! اختر موردًا من مفتاح الخريطة لنكتشف أماكن وجوده.";
  return (
    <Shell mapPage>
      <div className="classroom-heading">
        <div>
          <Link to={demo ? "/explore" : "/journey"}>
            {demo ? "اختيار الدروس" : "دروسي"} <ArrowLeft />
          </Link>
          <h1>{lesson.title}</h1>
        </div>
        <span className="lesson-status">
          {demo
            ? "تجربة غير معتمدة · النتائج مؤقتة"
            : preview
              ? "معاينة تحريرية · لا تُحفظ النتائج"
              : completed
                ? "درس مكتمل ✓"
                : `${solved.length} / ${questions.length} سؤال متقن`}
        </span>
      </div>
      {(preview || demo) && (
        <p className="p-feedback">
          {demo
            ? "نسخة للتجربة تحتاج مراجعة المعلم؛ ليست منهجًا معتمدًا ولا تُحفظ نتائجها."
            : "مسودة تحتاج مراجعة تربوية وتوثيق المصادر؛ ليست إثباتًا لمطابقة المنهج الرسمي."}
        </p>
      )}
      <div className="classroom-toolbar">
        <div className="p-tabs" role="group" aria-label="وضع الخريطة">
          <button
            aria-pressed={!discovery}
            onClick={() => {
              setMode("interactive");
              another();
            }}
          >
            الخريطة التفاعلية الذكية
          </button>
          <button
            aria-pressed={discovery}
            onClick={() => {
              setMode("discover");
              another();
            }}
          >
            اكتشف رموز الخريطة
          </button>
        </div>
        <div className="classroom-tools">
          {[
            ["objectives", "أهداف الدرس", Target],
            ["intro", "معلومات الدرس", BookOpen],
            ["concepts", "مفاهيم الدرس", BookOpen],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              aria-expanded={panel === key}
              className={panel === key ? "active" : ""}
              onClick={() => setPanel(panel === key ? null : key)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </div>
      </div>
      {panel && (
        <section className="classroom-disclosure">
          <button className="p-close-text" onClick={() => setPanel(null)}>
            إغلاق ×
          </button>
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
            </>
          )}
        </section>
      )}
      <div className="classroom-mobile-switcher" aria-label="لوحات الخريطة">
        <button
          id="show-legend"
          aria-expanded={mobilePanel === "legend"}
          aria-controls="lesson-legend"
          onClick={() =>
            setMobilePanel(mobilePanel === "legend" ? null : "legend")
          }
        >
          <BookOpen size={19} />
          مفتاح الخريطة
        </button>
        <button
          id="show-guide"
          aria-expanded={mobilePanel === "guide"}
          aria-controls="lesson-guide"
          onClick={() =>
            setMobilePanel(mobilePanel === "guide" ? null : "guide")
          }
        >
          <ChatCircle size={19} />
          {location ? "معلومات المورد" : "المعلم والمعلومات"}
        </button>
      </div>
      <div className="classroom-workspace">
        <aside
          id="lesson-legend"
          className={`classroom-legend ${pulse ? "legend-focus" : ""} ${mobilePanel === "legend" ? "mobile-open" : ""}`}
          aria-label="مفتاح الخريطة"
        >
          <button
            className="mobile-panel-close"
            aria-label="إغلاق مفتاح الخريطة"
            onClick={() => {
              setMobilePanel(null);
              document.getElementById("show-legend")?.focus();
            }}
          >
            إغلاق ×
          </button>
          <h2>
            <BookOpen />
            مفتاح الخريطة
          </h2>
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
          <button
            className="show-map-all"
            onClick={() => {
              setFull(true);
              setResource(null);
              setLocation(null);
            }}
          >
            عرض الخريطة كاملة
          </button>
        </aside>
        <section className="classroom-map-region" aria-label="خريطة موارد مصر">
          <div className="classroom-map-meta">
            <span>
              {resource
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
            showNames={discovery}
            onSelect={(site) => {
              setResource(site.resource);
              setLocation(site);
              setDetailTab("summary");
              setMobilePanel("guide");
            }}
            onVideo={(site) => {
              setResource(site.resource);
              setLocation(site);
              setDetailTab("video");
              setMobilePanel("guide");
            }}
          />
        </section>
        <aside
          id="lesson-guide"
          className={`classroom-guide ${mobilePanel === "guide" ? "mobile-open" : ""}`}
          aria-label="المعلم ومعلومات المورد"
        >
          <button
            className="mobile-panel-close"
            aria-label="إغلاق معلومات المورد"
            onClick={() => {
              setMobilePanel(null);
              document.getElementById("show-guide")?.focus();
            }}
          >
            العودة للخريطة ×
          </button>
          {!location ? (
            <section className="guide-speech">
              <RobotGuide />
              <h2>هيا نستكشف!</h2>
              <p aria-live="polite">{guide}</p>
            </section>
          ) : null}
          {resource && (location || !resource.locations?.length) && (
            <section className="classroom-resource">
              <h2>
                <ResourcePin resource={resource} />
                {resource.label}
              </h2>
              {location && (
                <p className="selected-location">
                  الموقع المختار: {location.name}
                </p>
              )}
              <div
                className="site-detail-tabs"
                role="tablist"
                aria-label="محتوى الموقع"
                onKeyDown={detailKeys}
              >
                <button
                  id="site-tab-video"
                  role="tab"
                  aria-selected={detailTab === "video"}
                  aria-controls="site-panel-video"
                  tabIndex={detailTab === "video" ? 0 : -1}
                  onClick={() => changeDetailTab("video")}
                >
                  <VideoCamera size={19} />
                  الفيديو
                </button>
                <button
                  id="site-tab-summary"
                  role="tab"
                  aria-selected={detailTab === "summary"}
                  aria-controls="site-panel-summary"
                  tabIndex={detailTab === "summary" ? 0 : -1}
                  onClick={() => changeDetailTab("summary")}
                >
                  <BookOpen size={19} />
                  الملخص والخصائص
                </button>
              </div>
              {detailTab === "video" && (
                <div
                  id="site-panel-video"
                  role="tabpanel"
                  tabIndex={0}
                  aria-labelledby="site-tab-video"
                  className="site-detail-panel"
                >
                  {resource.media?.video ? (
                    <>
                      <h3>شاهد وتعلّم عن {resource.label}</h3>
                      {videoFailed ? (
                        <p role="status">
                          تعذّر تشغيل الفيديو. يمكنك قراءة الملخص أو إعادة
                          المحاولة.
                        </p>
                      ) : (
                        modal !== "video" && (
                          <video
                            key={`${resource.id}-${location?.id}`}
                            src={resource.media.video}
                            controls
                            playsInline
                            preload="metadata"
                            onError={() => setVideoFailed(true)}
                          />
                        )
                      )}
                      <div className="p-actions">
                        {videoFailed && (
                          <button
                            className="p-secondary"
                            onClick={() => setVideoFailed(false)}
                          >
                            إعادة المحاولة
                          </button>
                        )}
                        <button
                          className="p-secondary"
                          disabled={videoFailed}
                          onClick={(e) => {
                            e.currentTarget
                              .closest(".site-detail-panel")
                              .querySelector("video")
                              ?.pause();
                            setModal("video");
                          }}
                        >
                          عرض أكبر للفيديو
                        </button>
                      </div>
                      <p className="site-media-note">
                        ابدأ التشغيل بنفسك. يمكنك الرجوع للملخص دون تغيير موقع
                        الخريطة.
                      </p>
                    </>
                  ) : (
                    <div className="site-video-empty">
                      <VideoCamera size={38} weight="duotone" />
                      <h3>الفيديو غير متاح حاليًا</h3>
                      <p>
                        لم يُضف فيديو لهذا المورد بعد. يمكنك استكشاف موقعه
                        وقراءة ملخصه الآن.
                      </p>
                      <button
                        className="p-button"
                        onClick={() => changeDetailTab("summary", true)}
                      >
                        اقرأ الملخص والخصائص
                      </button>
                    </div>
                  )}
                </div>
              )}
              {detailTab === "summary" && (
                <div
                  id="site-panel-summary"
                  role="tabpanel"
                  tabIndex={0}
                  aria-labelledby="site-tab-summary"
                  className="site-detail-panel"
                >
                  <dl className="site-facts">
                    <div>
                      <dt>نوع المورد</dt>
                      <dd>{kindNames[resource.kind]}</dd>
                    </div>
                    {location && (
                      <div>
                        <dt>الموقع على الخريطة</dt>
                        <dd>
                          {Number(location.lat).toFixed(2)}° شمالًا ·{" "}
                          {Number(location.lng).toFixed(2)}° شرقًا
                          <small>إحداثيات تعليمية تقريبية</small>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {resource.media?.image && (
                    <Photo
                      key={resource.id}
                      src={resource.media?.image}
                      label={`خامات ${resource.label}`}
                    />
                  )}
                  <h3>أماكن وجوده</h3>
                  <p>{resource.description}</p>
                  <h3>أهميته</h3>
                  <p>{resource.importance}</p>
                  <div className="p-actions">
                    <button
                      className="p-secondary"
                      onClick={() =>
                        ai(
                          "explain",
                          `اشرح لي ببساطة معلومة عن ${resource.label}`,
                        )
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
                  </div>
                  <details className="site-lesson-summary">
                    <summary>ملخص الدرس كاملًا</summary>
                    <p>{content.summary || content.intro}</p>
                  </details>
                  <button
                    className="p-secondary"
                    onClick={() => {
                      const relevant = questions.find(
                        (q) =>
                          q.resourceId === resource.id &&
                          ["choice", "boolean"].includes(q.type),
                      );
                      setIndex(
                        Math.max(
                          0,
                          questions
                            .filter((q) =>
                              ["choice", "boolean"].includes(q.type),
                            )
                            .findIndex((q) => q.id === relevant?.id),
                        ),
                      );
                      setModal("questions");
                    }}
                  >
                    سؤال سريع
                  </button>
                  <button className="p-text-link" onClick={another}>
                    اكتشف رمزًا آخر
                  </button>
                </div>
              )}
            </section>
          )}
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
                    setModal("questions");
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
      </div>
      <div className="classroom-bottom">
        <button
          onClick={() => {
            setIndex(0);
            setModal("questions");
          }}
        >
          <Target />
          أسئلة الدرس
        </button>
        <button
          onClick={() => {
            setIndex(0);
            setModal("activities");
          }}
        >
          <Stack />
          الأنشطة التفاعلية
        </button>
        <button className="p-button" onClick={() => ai("explain", "")}>
          <ChatCircle />
          اسأل الخريطة
        </button>
        <button
          disabled={solved.length < questions.length || !questions.length}
          onClick={finish}
        >
          <Star weight="fill" />
          {completed ? "راجع إنجازك" : "أكملت درسي"}
        </button>
      </div>
      {notice && (
        <div className="classroom-notice p-feedback" role="status">
          {notice}
          <button aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "ai"
              ? "اسأل الخريطة"
              : modal === "video"
                ? `فيديو: ${resource?.label}`
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
          ) : modal === "video" ? (
            <>
              {!videoFailed ? (
                <video
                  src={resource?.media?.video}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                />
              ) : (
                <p role="status" className="p-feedback">
                  تعذّر تشغيل الفيديو. يمكنك متابعة قراءة بطاقة المورد والعودة
                  للخريطة.
                </p>
              )}
              <button
                className="p-secondary"
                disabled={videoFailed}
                onClick={(e) =>
                  e.currentTarget.previousElementSibling.requestFullscreen?.()
                }
              >
                تكبير الفيديو
              </button>
              <p>أغلق النافذة للعودة إلى نفس الموقع.</p>
            </>
          ) : (
            <>
              {modal === "activities" && (
                <div className="activity-selector">
                  <button
                    onClick={() => {
                      setIndex(0);
                      setModal("build-map");
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
                  <p>
                    السؤال {index + 1} من {filtered.length}
                  </p>
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
        </Modal>
      )}
    </Shell>
  );
}

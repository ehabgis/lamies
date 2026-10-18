import { Link } from "react-router-dom";
import {
  Compass,
  MapPin,
  LinkSimple,
  ListNumbers,
  PencilSimple,
  Tray,
  ImageSquare,
  MapTrifold,
  CheckCircle,
  ArrowRight,
  Question as QuestionIcon,
  CheckSquare,
  House,
  Scales,
} from "phosphor-react";

// What each activity type asks the child to do, in one short line.
const META = {
  map: { title: "اكتشف الموقع", hint: "اختر مكان المورد على الخريطة", Icon: MapPin, tone: "blue" },
  drag: { title: "صنّف الموارد", hint: "ضع كل مورد في مجموعته", Icon: Tray, tone: "green" },
  match: { title: "صِل المتشابهين", hint: "اختر لكل عنصر ما يناسبه", Icon: LinkSimple, tone: "purple" },
  order: { title: "رتّب الخطوات", hint: "ضع الخطوات بالترتيب الصحيح", Icon: ListNumbers, tone: "orange" },
  blank: { title: "أكمل الفراغ", hint: "اكتب الكلمة الناقصة", Icon: PencilSimple, tone: "teal" },
  "image-match": { title: "طابق الرموز", hint: "صِل كل رمز بمعناه", Icon: ImageSquare, tone: "pink" },
  choice: { title: "اختر الإجابة", hint: "اقرأ السؤال واختر الإجابة الصحيحة", Icon: QuestionIcon, tone: "blue" },
  boolean: { title: "صواب أم خطأ؟", hint: "احكم على العبارة", Icon: CheckSquare, tone: "teal" },
  life: { title: "موقف من الحياة", hint: "اختر المورد المناسب للموقف", Icon: House, tone: "green" },
  compare: { title: "قارن بين موردين", hint: "اكتشف الفرق الأهم بينهما", Icon: Scales, tone: "purple" },
};
const FALLBACK = { title: "نشاط", hint: "أجب ثم اضغط تحقق", Icon: PencilSimple, tone: "blue" };

// The question itself tells two activities of the same type apart.
const brief = (t = "") => {
  const s = String(t).replace(/^أكمل:\s*/, "").trim();
  return s.length > 48 ? s.slice(0, 46).trimEnd() + "…" : s;
};

export const activityMeta = (q) => META[q?.kind] || META[q?.type] || FALLBACK;

export default function ActivityPicker({ activities, solved, hasBuildMap, onPick, onBuildMap, expedition, buildMapHref }) {
  const done = activities.filter((q) => solved.includes(q.id)).length;
  return (
    <section className="activity-picker" aria-labelledby="activity-picker-title">
      <header>
        <h3 id="activity-picker-title">اختر نشاطًا</h3>
        <p>
          أنجزت <bdi>{done}</bdi> من <bdi>{activities.length}</bdi> أنشطة
        </p>
      </header>
      {expedition && (
        <Link to={expedition.href} className="activity-card activity-expedition tone-blue">
          <span className="activity-card-icon" aria-hidden="true">
            <Compass weight="duotone" />
          </span>
          <span className="activity-card-text">
            <small>رحلة الاستكشاف</small>
            <strong>{expedition.title}</strong>
            <small>{expedition.text}</small>
          </span>
        </Link>
      )}
      {buildMapHref && (
        <Link to={buildMapHref} className="activity-card activity-expedition activity-build-map tone-indigo">
          <span className="activity-card-icon" aria-hidden="true">
            <MapTrifold weight="duotone" />
          </span>
          <span className="activity-card-text">
            <small>نشاط الخريطة</small>
            <strong>ابنِ خريطتك</strong>
            <small>ضع رموز الموارد في أماكنها على خريطة مصر</small>
          </span>
        </Link>
      )}
      <ul className="activity-cards">
        {hasBuildMap && (
          <li>
            <button type="button" className="activity-card tone-indigo" onClick={onBuildMap}>
              <span className="activity-card-icon" aria-hidden="true">
                <MapTrifold weight="duotone" />
              </span>
              <span className="activity-card-text">
                <strong>اصنع خريطتك</strong>
                <small>ضع رمز المورد في مكانه</small>
              </span>
            </button>
          </li>
        )}
        {activities.map((q, i) => {
          const meta = activityMeta(q);
          const isDone = solved.includes(q.id);
          return (
            <li key={q.id}>
              <button
                type="button"
                className={`activity-card tone-${meta.tone} ${isDone ? "is-done" : ""}`}
                onClick={() => onPick(i)}
                aria-label={`${meta.title}${isDone ? " — أنجزته" : ""}`}
              >
                <span className="activity-card-icon" aria-hidden="true">
                  <meta.Icon weight="duotone" />
                </span>
                <span className="activity-card-text">
                  <strong>{meta.title}</strong>
                  <small>{brief(q.prompt) || meta.hint}</small>
                </span>
                {isDone && (
                  <span className="activity-card-done" aria-hidden="true">
                    <CheckCircle weight="fill" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ActivitySteps({ activities, index, solved, title, onStep, onAll }) {
  return (
    <div className="activity-steps">
      <button type="button" className="activity-back" onClick={onAll}>
        <ArrowRight aria-hidden="true" />
        كل الأنشطة
      </button>
      <div className="activity-steps-main">
        <strong>{title}</strong>
        {activities.length > 1 && (
          <ol aria-label="الأنشطة">
            {activities.map((q, i) => (
              <li key={q.id}>
                <button
                  type="button"
                  className={`${i === index ? "is-current" : ""} ${solved.includes(q.id) ? "is-done" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`${activityMeta(q).title}${solved.includes(q.id) ? " — أنجزته" : ""}`}
                  onClick={() => onStep(i)}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Diamond, Drop, Buildings } from "phosphor-react";
import { Frame } from "./ExpeditionPage";
import TripPhoto from "./TripPhoto";
import "./expedition.css";
import "./water-quest.css";

const TRIPS = [
  { photo: "trip-kunuz", Icon: Diamond, lesson: "الدرس الأول", title: "رحلة كنوز مصر", text: "المعادن ومصادر الطاقة", href: "/demo/lesson-1/expedition" },
  { photo: "trip-water", Icon: Drop, lesson: "الدرس الثاني", title: "رحلة المياه", text: "ري المزرعة، مياه الواحة، المدينة الساحلية", href: "/demo/lesson-2/expedition" },
  { photo: "trip-projects", Icon: Buildings, lesson: "الدرس الثالث", title: "نكتشف مشروعات مصر", text: "الدلتا الجديدة، بركة غليون، بنبان", href: "/demo/lesson-3/expedition" },
];

export default function TripsPage() {
  return (
    <Frame title="رحلات الاستكشاف" lessonPath="/explore" back={false}>
      <section className="trips" aria-labelledby="trips-title">
        <h1 id="trips-title">اختر رحلة الاستكشاف</h1>
        <ul>
          {TRIPS.map((t) => (
            <li key={t.title}>
              {t.href ? (
                <Link to={t.href} className="trip-card">
                  <TripPhoto name={t.photo} Icon={t.Icon} />
                  <small>{t.lesson}</small>
                  <b>{t.title}</b>
                  <span>{t.text}</span>
                  <em>
                    ابدأ الرحلة <ArrowLeft size={18} aria-hidden="true" />
                  </em>
                </Link>
              ) : (
                <div className="trip-card is-soon" aria-disabled="true">
                  <span className="trip-icon" aria-hidden="true">
                    <t.Icon weight="duotone" />
                  </span>
                  <small>{t.lesson}</small>
                  <b>{t.title}</b>
                  <span>
                    <Lock size={16} weight="fill" aria-hidden="true" /> {t.text}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Frame>
  );
}


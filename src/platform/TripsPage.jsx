import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "phosphor-react";
import { Frame } from "./ExpeditionPage";
import "./expedition.css";
import "./water-quest.css";

const TRIPS = [
  { lesson: "الدرس الأول", title: "رحلة كنوز مصر", text: "المعادن ومصادر الطاقة", href: "/demo/lesson-1/expedition", image: "/lesson-media/book/lesson1_resources_map.jpg" },
  { lesson: "الدرس الثاني", title: "رحلة المياه", text: "ري المزرعة، مياه الواحة، المدينة الساحلية", href: "/demo/lesson-2/expedition", image: "/lesson-media/book/lesson2_water_map.jpg" },
  { lesson: "الدرس الثالث", title: "نكتشف مشروعات مصر", text: "الدلتا الجديدة، بركة غليون، بنبان", href: "/demo/lesson-3/expedition", image: "/lesson-media/book/lesson3_projects_map.jpg" },
];

export default function TripsPage() {
  return (
    <Frame title="رحلات الاستكشاف" lessonPath="/explore">
      <section className="trips" aria-labelledby="trips-title">
        <h1 id="trips-title">اختر رحلة الاستكشاف</h1>
        <ul>
          {TRIPS.map((t) => (
            <li key={t.title}>
              {t.href ? (
                <Link to={t.href} className="trip-card">
                  <img src={t.image} alt="" loading="lazy" />
                  <small>{t.lesson}</small>
                  <b>{t.title}</b>
                  <span>{t.text}</span>
                  <em>
                    ابدأ الرحلة <ArrowLeft size={18} aria-hidden="true" />
                  </em>
                </Link>
              ) : (
                <div className="trip-card is-soon" aria-disabled="true">
                  <img src={t.image} alt="" loading="lazy" />
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

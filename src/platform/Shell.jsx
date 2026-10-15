import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Compass, SignOut, Star, Gear } from "phosphor-react";
import { useSession } from "./Session";
export default function Shell({
  children,
  mapPage = false,
  journeyPage = false,
}) {
  const { user } = useSession();
  return (
    <div
      className={`lamis-platform ${mapPage ? "map-shell" : ""} ${journeyPage ? "journey-shell" : ""}`}
      dir="rtl"
    >
      <a className="platform-skip" href="#platform-main">
        تخطّ إلى المحتوى
      </a>
      {!mapPage && (
        <header className="platform-header">
          <Link className="platform-brand" to={user ? "/journey" : "/"}>
            <span>
              <BookOpen size={30} weight="duotone" />
            </span>
            <div>الخرائط التعليمية الذكية</div>
          </Link>
          <PlatformNavigation />
        </header>
      )}
      <main id="platform-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="platform-footer">
        تعلّم بهدوء، وحاول مرة أخرى دائمًا.{" "}
        <Link to="/legacy">النسخة السابقة</Link>
        <span>
          {user
            ? "نتائج الحساب منفصلة عن التجربة · لا نطلب اسمك الحقيقي"
            : "تجربة دون حساب · لا تُحفظ نتائج رسمية"}
        </span>
      </footer>
    </div>
  );
}

export function PlatformNavigation() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  return (
    <nav aria-label="تنقل المنصة">
      <Link to={user ? "/journey" : "/"}>
        <Compass size={21} />
        {user ? "رحلتي" : "صفحة البداية"}
      </Link>
      {user && (
        <Link to="/my-progress">
          <Star size={21} />
          إنجازاتي
        </Link>
      )}
      {user &&
        ["super_admin", "content_admin", "teacher"].includes(user.role) && (
          <Link to="/admin">
            <Gear size={21} />
            الإدارة
          </Link>
        )}
      {user && (
        <button
          onClick={async () => {
            try {
              await logout();
              navigate("/");
            } catch (e) {
              window.alert(e.message);
            }
          }}
        >
          <SignOut size={21} />
          خروج
        </button>
      )}
    </nav>
  );
}

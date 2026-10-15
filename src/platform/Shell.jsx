import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Compass, SignOut, Star, Gear } from "phosphor-react";
import { useSession } from "./Session";
export default function Shell({ children }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  return (
    <div className="lamis-platform" dir="rtl">
      <a className="platform-skip" href="#platform-main">
        تخطّ إلى المحتوى
      </a>
      <header className="platform-header">
        <Link className="platform-brand" to="/journey">
          <span>
            <BookOpen size={30} weight="duotone" />
          </span>
          <div>
            الخريطة التعليمية الذكية<small>لميس · نكتشف مصر معًا</small>
          </div>
        </Link>
        <nav aria-label="تنقل المنصة">
          <Link to="/journey">
            <Compass size={21} />
            رحلتي
          </Link>
          <Link to="/my-progress">
            <Star size={21} />
            إنجازاتي
          </Link>
          {user &&
            ["super_admin", "content_admin", "teacher"].includes(user.role) && (
              <Link to="/admin">
                <Gear size={21} />
                الإدارة
              </Link>
            )}
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
        </nav>
      </header>
      <main id="platform-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="platform-footer">
        تعلّم بهدوء، وحاول مرة أخرى دائمًا.{" "}
        <Link to="/legacy">النسخة السابقة</Link>
        <span>تُحفظ النتائج في حسابك · لا نطلب اسمك الحقيقي</span>
      </footer>
    </div>
  );
}

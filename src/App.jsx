import { Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import MagicalNavbar from "./components/MagicalNavbar";
import ScrollToTop from "./components/ScrollToTop";
import GlobalVoiceToggleButton from "./components/GlobalVoiceToggleButton";
import {
  VoiceNarrationProvider,
  useVoiceNarration,
} from "./context/VoiceNarrationContext";
import { preloadLikelyNextRoutes, routeLoaders } from "./utils/routePreload";
import "./styles/index.css";
import "./platform/platform.css";
import { SessionProvider, AccountGuard, useSession } from "./platform/Session";
import Shell from "./platform/Shell";
const EntryPage = lazy(() => import("./platform/EntryPage"));
const JourneyPage = lazy(() => import("./platform/JourneyPage"));
const ClassroomPage = lazy(() => import("./platform/LessonPage"));
const TripRoute = lazy(() => import("./platform/TripRoute"));
const AchievementsPage = lazy(() => import("./platform/AchievementsPage"));
const TraceMapPage = lazy(() => import("./platform/TraceMapPage"));
const TripsPage = lazy(() => import("./platform/TripsPage"));
const BuildMapPage = lazy(() => import("./platform/BuildMapPage"));
const StudentProgress = lazy(() => import("./platform/ProgressPage"));
const AdminPage = lazy(() => import("./platform/AdminPage"));
function AdminRoute() {
  const { user } = useSession();
  return (
    <Shell>
      <AdminPage user={user} />
    </Shell>
  );
}

const WelcomeScreen = lazy(routeLoaders.welcome);
const HomePage = lazy(routeLoaders.home);
const MapExplorer = lazy(routeLoaders.map);
const LessonsPage = lazy(routeLoaders.lessons);
const LessonDashboard = lazy(routeLoaders.lesson);
const AwardsPage = lazy(routeLoaders.awards);
const QuizPage = lazy(routeLoaders.quiz);

const getRouteGreeting = (pathname = "/") => {
  if (pathname === "/map" || pathname.startsWith("/map/")) {
    return "أهلا بيك في الخريطة. اختار أي مكان وأنا أحكيلك عنه.";
  }
  if (pathname === "/lessons" || pathname.startsWith("/lesson/")) {
    return "أهلا بيك في الدروس. اختار درس وأنا أشرح لك ببساطة.";
  }
  return "أهلا بيك يا بطل. أنا معاك خطوة بخطوة.";
};

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-200 via-emerald-100 to-amber-100 p-6">
      <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-4 text-center font-black text-slate-700 shadow-xl">
        جاري التحميل...
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const { setRoutePathname, speak, speechSupported } = useVoiceNarration();
  const announcedPathRef = useRef("");
  const isWelcomeRoute =
    location.pathname === "/" || location.pathname === "/legacy";
  const isPlatformRoute =
    ["/", "/explore", "/journey", "/my-progress", "/admin"].includes(
      location.pathname,
    ) ||
    location.pathname.startsWith("/classroom/") ||
    location.pathname.startsWith("/demo/") ||
    location.pathname.startsWith("/achievements");
  const isSimpleHomeRoute = location.pathname === "/home";
  const isFocusedMapRoute =
    location.pathname === "/map" || location.pathname === "/lesson/lesson-1";
  const isQuietRoute =
    isWelcomeRoute || isSimpleHomeRoute || isFocusedMapRoute || isPlatformRoute;

  useEffect(() => {
    setRoutePathname(location.pathname);
  }, [location.pathname, setRoutePathname]);

  useEffect(() => {
    document.body.classList.toggle("quiet-fullscreen-route", isQuietRoute);
    return () => document.body.classList.remove("quiet-fullscreen-route");
  }, [isQuietRoute]);

  useEffect(
    () => preloadLikelyNextRoutes(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (isWelcomeRoute || isFocusedMapRoute || isPlatformRoute)
      return undefined;
    if (announcedPathRef.current === location.pathname) return undefined;

    announcedPathRef.current = location.pathname;
    const timer = window.setTimeout(() => {
      speak(getRouteGreeting(location.pathname), {
        channel: "page-greeting",
        profile: "child",
      });
    }, 420);

    return () => window.clearTimeout(timer);
  }, [isWelcomeRoute, isFocusedMapRoute, location.pathname, speak]);

  return (
    <div className="relative">
      {!speechSupported && !isPlatformRoute && (
        <div className="fixed top-0 left-0 w-full bg-red-200 text-red-800 text-center p-2 z-[14000] font-bold">
          عذرًا، المتصفح لا يدعم تشغيل الصوت. حاول متصفحًا آخر لميزة الترجمة
          الصوتية.
        </div>
      )}
      {!isQuietRoute && <GlobalVoiceToggleButton />}
      <ScrollToTop />
      <div className="relative z-10">
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<EntryPage />} />
            <Route path="/explore" element={<JourneyPage demo />} />
            <Route path="/legacy" element={<WelcomeScreen />} />
            <Route path="/demo/:id" element={<ClassroomPage demo />} />
            <Route path="/demo/:id/expedition" element={<TripRoute />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/achievements/certificate" element={<AchievementsPage />} />
            <Route path="/demo/trips" element={<TripsPage />} />
            <Route path="/demo/:id/build-map" element={<BuildMapPage />} />
            <Route path="/demo/:id/trace" element={<TraceMapPage />} />
            <Route element={<AccountGuard />}>
              <Route path="/journey" element={<JourneyPage />} />
              <Route path="/my-progress" element={<StudentProgress />} />
              <Route path="/classroom/:id" element={<ClassroomPage />} />
            </Route>
            <Route element={<AccountGuard admin />}>
              <Route path="/admin" element={<AdminRoute />} />
            </Route>
            <Route
              path="*"
              element={
                <main dir="rtl" className="platform-loading">
                  <h1>الصفحة غير موجودة</h1>
                  <a href="/">العودة إلى البداية</a>
                </main>
              }
            />
            <Route path="/home" element={<HomePage />} />
            <Route path="/map" element={<MapExplorer />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lesson/lesson-1" element={<MapExplorer />} />
            <Route
              path="/lesson/:lessonId/details"
              element={<LessonDashboard />}
            />
            <Route path="/lesson/:lessonId" element={<LessonDashboard />} />
            <Route path="/awards" element={<AwardsPage />} />
            <Route path="/quiz/:locationId" element={<QuizPage />} />
          </Routes>
        </Suspense>
        {!isPlatformRoute && <MagicalNavbar />}
      </div>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <VoiceNarrationProvider>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AppContent />
        </BrowserRouter>
      </VoiceNarrationProvider>
    </SessionProvider>
  );
}

export default App;

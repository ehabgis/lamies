export const routeLoaders = {
  welcome: () => import('../pages/WelcomeScreen'),
  home: () => import('../pages/HomePage'),
  map: () => import('../pages/MapExplorer'),
  lessons: () => import('../pages/LessonsPage'),
  lesson: () => import('../pages/LessonDashboard'),
  awards: () => import('../pages/AwardsPage'),
  quiz: () => import('../pages/QuizPage')
};

const loaderForPath = (pathname = '') => {
  if (pathname === '/') return routeLoaders.welcome;
  if (pathname === '/home') return routeLoaders.home;
  if (pathname === '/map' || pathname === '/lesson/lesson-1') return routeLoaders.map;
  if (pathname === '/lessons') return routeLoaders.lessons;
  if (pathname.startsWith('/lesson/')) return routeLoaders.lesson;
  if (pathname === '/awards') return routeLoaders.awards;
  if (pathname.startsWith('/quiz/')) return routeLoaders.quiz;
  return null;
};

export const preloadRoute = (pathname) => {
  const loader = loaderForPath(pathname);
  return loader ? loader() : Promise.resolve();
};

export const preloadLikelyNextRoutes = (pathname) => {
  const nextPaths = ['/home', '/map', '/lessons', '/awards', '/lesson/preload', '/quiz/preload']
    .filter((path) => path !== pathname);

  const run = () => nextPaths.forEach((path) => preloadRoute(path));
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(run, { timeout: 900 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(run, 350);
  return () => window.clearTimeout(id);
};

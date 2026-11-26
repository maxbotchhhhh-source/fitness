import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Privacy from './pages/Privacy';
import Thanks from './pages/Thanks';

const AdminApp = lazy(() => import('./admin/AdminApp')); // админка грузится отдельным файлом

/** Прокрутка к якорю (#about) и к началу страницы при смене страницы. */
function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<p className="container">Загрузка…</p>}><AdminApp /></Suspense>} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/thanks" element={<Thanks />} />
          <Route path="*" element={<Privacy notFound />} />
        </Route>
      </Routes>
    </>
  );
}

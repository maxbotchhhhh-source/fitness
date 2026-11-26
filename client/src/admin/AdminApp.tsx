import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { usePageMeta } from '../hooks';
import type { AuthUser } from '../types';
import AuditPage from './AuditPage';
import CrudPage from './CrudPage';
import { CRUD } from './crudConfigs';
import LeadsPage from './LeadsPage';
import Login from './Login';

interface Flash { msg: string; type: 'ok' | 'err' }
interface AdminCtx {
  user: AuthUser | null;
  perms: string[];
  setSession: (u: AuthUser | null, p: string[]) => void;
  flash: (msg: string, type?: 'ok' | 'err') => void;
  can: (p: string) => boolean;
}
const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = (): AdminCtx => useContext(Ctx) as AdminCtx;

const MENU: [string, string, string][] = [
  ['leads', 'Заявки', 'leads.view'], ['services', 'Услуги', 'services.edit'], ['tariffs', 'Тарифы', 'tariffs.edit'],
  ['reviews', 'Отзывы', 'reviews.edit'], ['users', 'Пользователи', 'users.edit'], ['audit', 'Журнал действий', 'audit.view'],
];

export default function AdminApp() {
  usePageMeta('Панель администратора', 'Панель администратора', true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [flashMsg, setFlashMsg] = useState<Flash | null>(null);

  useEffect(() => {
    api<{ user: AuthUser; permissions: string[] }>('/admin/me')
      .then((r) => { setUser(r.user); setPerms(r.permissions); })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const flash = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => setFlashMsg({ msg, type }), []);
  const value: AdminCtx = {
    user, perms, flash,
    setSession: (u, p) => { setUser(u); setPerms(p); },
    can: (p) => perms.includes(p),
  };

  if (!ready) return <p className="container" style={{ padding: 40 }}>Загрузка…</p>;
  return (
    <Ctx.Provider value={value}>
      <div className="admin">
        <Routes>
          <Route path="login" element={user ? <Navigate to="/admin/leads" replace /> : <Shell flash={flashMsg} clear={() => setFlashMsg(null)} title="Вход"><Login /></Shell>} />
          <Route element={user ? <Layout flash={flashMsg} clear={() => setFlashMsg(null)} /> : <Navigate to="/admin/login" replace />}>
            <Route index element={<Navigate to="/admin/leads" replace />} />
            <Route path="leads" element={<Guard perm="leads.view" title="Заявки"><LeadsPage /></Guard>} />
            <Route path="services" element={<Guard perm="services.edit" title="Услуги"><CrudPage cfg={CRUD.services} /></Guard>} />
            <Route path="tariffs" element={<Guard perm="tariffs.edit" title="Тарифы"><CrudPage cfg={CRUD.tariffs} /></Guard>} />
            <Route path="reviews" element={<Guard perm="reviews.edit" title="Отзывы"><CrudPage cfg={CRUD.reviews} /></Guard>} />
            <Route path="users" element={<Guard perm="users.edit" title="Пользователи"><CrudPage cfg={CRUD.users} /></Guard>} />
            <Route path="audit" element={<Guard perm="audit.view" title="Журнал действий"><AuditPage /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </Ctx.Provider>
  );
}

function Shell({ children, flash, clear, title }: { children: ReactNode; flash: Flash | null; clear: () => void; title: string }) {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="logo" to="/admin"><span>ОРЛОВ<b>FIT</b></span><small className="logo-sub">админ-панель</small></Link>
        </div>
      </header>
      <main className="admin-main container">
        <h1 className="page-title">{title}</h1>
        {flash && <div className={'alert alert-' + flash.type} role="alert" onClick={clear}>{flash.msg}</div>}
        {children}
      </main>
      <footer className="admin-foot container"><a href="/" target="_blank" rel="noopener noreferrer">Открыть сайт</a></footer>
    </>
  );
}

function Layout({ flash, clear }: { flash: Flash | null; clear: () => void }) {
  const { user, can, setSession } = useAdmin();
  const nav = useNavigate();
  const logout = async () => {
    try { await api('/admin/logout', { method: 'POST' }); } finally { setSession(null, []); nav('/admin/login'); }
  };
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="logo" to="/admin/leads"><span>ОРЛОВ<b>FIT</b></span><small className="logo-sub">админ-панель</small></Link>
          <nav className="main-nav admin-nav open-always" aria-label="Разделы панели">
            {MENU.filter(([, , p]) => can(p)).map(([path, label]) => <NavLink key={path} to={`/admin/${path}`}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <span className="whoami">{user?.full_name} · {user?.role_name}</span>
            <button className="btn btn-ghost btn-sm" type="button" onClick={logout}>Выйти</button>
          </div>
        </div>
      </header>
      <main className="admin-main container">
        <FlashBar flash={flash} clear={clear} />
        <Outlet />
      </main>
      <footer className="admin-foot container"><a href="/" target="_blank" rel="noopener noreferrer">Открыть сайт</a></footer>
    </>
  );
}

function FlashBar({ flash, clear }: { flash: Flash | null; clear: () => void }) {
  return flash ? <div className={'alert alert-' + flash.type} role="alert" onClick={clear}>{flash.msg}</div> : null;
}

/** Проверка прав роли (RBAC): без права раздел недоступен. */
function Guard({ perm, title, children }: { perm: string; title: string; children: ReactNode }) {
  const { can, user } = useAdmin();
  if (!can(perm)) return <div className="alert alert-err">У вашей роли («{user?.role_name}») нет доступа к этому разделу.</div>;
  return <><h1 className="page-title">{title}</h1>{children}</>;
}

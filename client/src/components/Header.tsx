import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLead, usePublic } from '../context';
import { goal, telHref } from '../utils';

const NAV: [string, string][] = [
  ['about', 'Обо мне'], ['services', 'Услуги'], ['tariffs', 'Тарифы'],
  ['results', 'Результаты'], ['reviews', 'Отзывы'], ['contacts', 'Контакты'],
];

export default function Header() {
  const { site } = usePublic();
  const { openModal } = useLead();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <Link className="logo" to="/#top" aria-label="Максим Орлов — на главную">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="8" fill="#FF5A1F" /><path d="M8 13v8M11 10v14M23 10v14M26 13v8M11 17h12" stroke="#111" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <span>ОРЛОВ<b>FIT</b></span>
        </Link>
        <nav className={'main-nav' + (open ? ' open' : '')} id="main-nav" aria-label="Главное меню" onClick={(e) => { if ((e.target as HTMLElement).tagName === 'A') setOpen(false); }}>
          {NAV.map(([id, label]) => <Link key={id} to={`/#${id}`}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <a className="header-phone" href={telHref(site.phone)} onClick={() => goal('phone_click')}>{site.phone}</a>
          <button type="button" className="btn btn-accent btn-sm" onClick={() => openModal()}>Записаться</button>
          <button type="button" className="burger" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { PublicData } from './types';

/* ---------- Данные сайта (настройки + услуги, тарифы, отзывы из БД) ---------- */
const PublicCtx = createContext<PublicData | null>(null);
export const usePublic = (): PublicData => useContext(PublicCtx) as PublicData;

export function PublicProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => { setError(false); api<PublicData>('/public').then(setData).catch(() => setError(true)); }, []);
  useEffect(load, [load]);

  if (error) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 className="page-title">Не удалось загрузить сайт</h1>
        <p className="muted">Проверьте соединение или повторите попытку.</p>
        <button className="btn btn-accent" onClick={load}>Повторить</button>
      </div>
    );
  }
  if (!data) return <div className="container" style={{ padding: '80px 20px' }} aria-busy="true"><p className="muted">Загрузка…</p></div>;
  return <PublicCtx.Provider value={data}>{children}</PublicCtx.Provider>;
}

/* ---------- Выбор тарифа и модальное окно записи ---------- */
export interface Chosen { id: string; service: string; title: string }
const EMPTY: Chosen = { id: '', service: '', title: '' };

interface LeadCtx {
  chosen: Chosen;
  choose: (c: Chosen) => void;
  clearChosen: () => void;
  modal: { open: boolean; service: string; key: number };
  openModal: (serviceId?: string) => void;
  closeModal: () => void;
}
const LeadContext = createContext<LeadCtx | null>(null);
export const useLead = (): LeadCtx => useContext(LeadContext) as LeadCtx;

export function LeadProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Chosen>(EMPTY);
  const [modal, setModal] = useState({ open: false, service: '', key: 0 });
  const value = useMemo<LeadCtx>(() => ({
    chosen,
    choose: setChosen,
    clearChosen: () => setChosen(EMPTY),
    modal,
    openModal: (serviceId = '') => setModal((m) => ({ open: true, service: serviceId, key: m.key + 1 })),
    closeModal: () => setModal((m) => ({ ...m, open: false })),
  }), [chosen, modal]);
  return <LeadContext.Provider value={value}>{children}</LeadContext.Provider>;
}

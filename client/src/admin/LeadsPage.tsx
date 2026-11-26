import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { fmtDt } from '../utils';
import { useAdmin } from './AdminApp';

const STATUSES: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Обработана', rejected: 'Отклонена' };

interface Lead {
  id: number; name: string; phone: string; comment: string; status: string; created_at: string;
  service_title: string | null; tariff_title: string | null; processed_name: string | null;
}

export default function LeadsPage() {
  const { can, flash } = useAdmin();
  const [sp] = useSearchParams();
  const filter = sp.get('status') && sp.get('status')! in STATUSES ? sp.get('status')! : '';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    api<{ leads: Lead[]; counts: Record<string, number> }>('/admin/leads' + (filter ? `?status=${filter}` : ''))
      .then((r) => { setLeads(r.leads); setCounts(r.counts); setDraft({}); })
      .catch((e) => flash(e instanceof ApiError ? e.message : 'Не удалось загрузить заявки', 'err'));
  }, [filter, flash]);
  useEffect(load, [load]);

  const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
  const save = async (l: Lead) => {
    const status = draft[l.id] ?? l.status;
    try {
      const r = await api<{ message: string }>(`/admin/leads/${l.id}`, { method: 'PATCH', body: { status } });
      flash(r.message); load();
    } catch (e) { flash(e instanceof ApiError ? e.message : 'Ошибка', 'err'); }
  };

  return (
    <>
      <div className="filters">
        <Link to="/admin/leads" className={filter === '' ? 'on' : ''}>Все ({total})</Link>
        {Object.entries(STATUSES).map(([k, label]) => <Link key={k} to={`/admin/leads?status=${k}`} className={filter === k ? 'on' : ''}>{label} ({counts[k] ?? 0})</Link>)}
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>№</th><th>Дата</th><th>Имя</th><th>Телефон</th><th>Услуга / тариф</th><th>Комментарий</th><th>Статус</th><th>Обработал</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td className="nowrap">{fmtDt(l.created_at)}</td>
                <td>{l.name}</td>
                <td className="nowrap"><a href={'tel:+' + l.phone.replace(/\D/g, '')}>{l.phone}</a></td>
                <td>{l.service_title || '—'}{l.tariff_title && <><br /><small>Тариф: {l.tariff_title}</small></>}</td>
                <td className="audit-val">{l.comment || '—'}</td>
                <td>
                  <span className={`status status-${l.status}`}>{STATUSES[l.status]}</span>
                  {can('leads.edit') && (
                    <div className="inline-form" style={{ marginTop: 6 }}>
                      <label htmlFor={`st${l.id}`} style={{ position: 'absolute', left: -9999 }}>Статус заявки {l.id}</label>
                      <select id={`st${l.id}`} value={draft[l.id] ?? l.status} onChange={(e) => setDraft({ ...draft, [l.id]: e.target.value })}>
                        {Object.entries(STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                      </select>{' '}
                      <button className="btn btn-outline-dark btn-sm" type="button" style={{ padding: '6px 10px' }} onClick={() => save(l)}>OK</button>
                    </div>
                  )}
                </td>
                <td>{l.processed_name || '—'}</td>
              </tr>
            ))}
            {!leads.length && <tr><td colSpan={8} className="muted">Заявок пока нет.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

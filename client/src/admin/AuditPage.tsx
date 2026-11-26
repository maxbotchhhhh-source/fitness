import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { fmtDt } from '../utils';

const TABLES: Record<string, string> = { leads: 'Заявки', services: 'Услуги', tariffs: 'Тарифы', reviews: 'Отзывы', users: 'Пользователи' };
const ACTIONS: Record<string, string> = { create: 'создание', update: 'изменение', delete: 'удаление', login: 'вход', logout: 'выход' };

interface Row {
  id: number; user_id: number | null; action: string; table_name: string; record_id: number | null;
  field_name: string | null; old_value: string | null; new_value: string | null; created_at: string;
  login: string | null; full_name: string | null;
}

export default function AuditPage() {
  const [sp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('p')) || 1);
  const [data, setData] = useState<{ rows: Row[]; total: number; pages: number }>({ rows: [], total: 0, pages: 1 });
  useEffect(() => { api<typeof data>(`/admin/audit?p=${page}`).then(setData).catch(() => undefined); }, [page]);

  return (
    <>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Дата и время</th><th>Кто</th><th>Действие</th><th>Таблица</th><th>ID записи</th><th>Поле</th><th>Было</th><th>Стало</th></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">{fmtDt(r.created_at, true)}</td>
                <td>{r.user_id ? <>{r.full_name} <small>({r.login})</small></> : <span className="muted">посетитель сайта</span>}</td>
                <td>{ACTIONS[r.action] ?? r.action}</td>
                <td>{TABLES[r.table_name] ?? r.table_name}</td>
                <td>{r.record_id ?? ''}</td>
                <td>{r.field_name ?? ''}</td>
                <td className="audit-val">{r.old_value ?? ''}</td>
                <td className="audit-val">{r.new_value ?? ''}</td>
              </tr>
            ))}
            {!data.rows.length && <tr><td colSpan={8} className="muted">Записей нет.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pager">
        {page > 1 && <Link className="btn btn-outline-dark btn-sm" to={`/admin/audit?p=${page - 1}`}>← Новее</Link>}
        <span className="muted">Стр. {page} из {data.pages} · записей: {data.total}</span>
        {page < data.pages && <Link className="btn btn-outline-dark btn-sm" to={`/admin/audit?p=${page + 1}`}>Старше →</Link>}
      </div>
    </>
  );
}
